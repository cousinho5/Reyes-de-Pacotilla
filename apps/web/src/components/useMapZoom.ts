// Zoom del mapa (bloque 6): tres niveles (todo el reino, normal y cerca); normal y
// cerca encajan en píxeles enteros de la pantalla para que el pixel art se vea nítido. Se cambia
// (bloque 9: ya sin botón) con la pinza (el dibujo sigue a los dedos y al soltar encaja en el
// nivel más cercano) y con dos toques seguidos (acerca, y desde cerca vuelve al reino).
// Arrastrar con un dedo sigue siendo el desplazamiento del navegador.

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export type ZoomLevel = 0 | 1 | 2;

/** Píxeles de pantalla (CSS) por píxel del dibujo en los niveles normal y cerca. */
const NORMAL = 2;
const CLOSE = 3;
/** Dos toques valen como doble toque si llegan en este tiempo y a esta distancia. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 30;
/** Un toque que se mueve más que esto es un arrastre. */
const TAP_SLOP_PX = 10;

/** Un punto del dibujo (en sus píxeles) que debe quedar en un punto de la ventana. */
type Anchor = { ax: number; ay: number; offX: number; offY: number };

export function useMapZoom(viewport: RefObject<HTMLDivElement | null>, wrap: RefObject<HTMLDivElement | null>, W: number) {
  const [viewW, setViewW] = useState(360);
  const [level, setLevelState] = useState<ZoomLevel>(1);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewW(el.clientWidth));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, [viewport]);

  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  /** A píxeles enteros de la pantalla, hacia abajo. */
  const snap = (s: number) => Math.max(1, Math.floor(s * dpr + 1e-6)) / dpr;
  const fit = viewW / W;
  // Todo el reino, ajustado al ancho tal cual: encajarlo en píxeles enteros lo dejaría en un tercio menos.
  const scales: [number, number, number] = [fit, snap(Math.max(NORMAL, fit)), snap(Math.max(CLOSE, fit * 1.5))];
  const scale = scales[level];

  const anchor = useRef<Anchor | null>(null);
  const lastChange = useRef(0);
  /** Cambia de nivel dejando quieto el punto del dibujo que está bajo (x, y) de la pantalla (o el centro). */
  const setLevel = (next: ZoomLevel, at?: { clientX: number; clientY: number } | Anchor) => {
    const el = viewport.current;
    if (el && next !== level) {
      if (at && "ax" in at) {
        anchor.current = at;
      } else {
        const r = el.getBoundingClientRect();
        const offX = at ? at.clientX - r.left : el.clientWidth / 2;
        const offY = at ? at.clientY - r.top : el.clientHeight / 2;
        anchor.current = { ax: (el.scrollLeft + offX) / scale, ay: (el.scrollTop + offY) / scale, offX, offY };
      }
      lastChange.current = Date.now();
    }
    setLevelState(next);
  };
  useLayoutEffect(() => {
    const el = viewport.current;
    const a = anchor.current;
    if (!el || !a) return;
    anchor.current = null;
    el.scrollLeft = a.ax * scale - a.offX;
    el.scrollTop = a.ay * scale - a.offY;
  }, [scale, viewport]);

  // Los gestos leen siempre lo último sin volver a poner los escuchadores.
  const live = useRef({ level, scale, scales, setLevel });
  live.current = { level, scale, scales, setLevel };

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    let pinch: { d: number; cx: number; cy: number; ax: number; ay: number; offX: number; offY: number; k: number } | null = null;
    let tap: { x: number; y: number; moved: boolean; many: boolean } | null = null;
    let lastTap: { x: number; y: number; at: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY);

    const start = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        tap = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY, moved: false, many: false };
      } else if (tap) {
        tap.many = true;
      }
      if (e.touches.length === 2) {
        const { scale } = live.current;
        const r = el.getBoundingClientRect();
        const cx = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2;
        const cy = (e.touches[0]!.clientY + e.touches[1]!.clientY) / 2;
        const offX = cx - r.left;
        const offY = cy - r.top;
        pinch = { d: dist(e.touches), cx, cy, ax: (el.scrollLeft + offX) / scale, ay: (el.scrollTop + offY) / scale, offX, offY, k: 1 };
        const w = wrap.current;
        if (w) {
          w.style.transformOrigin = `${pinch.ax * scale}px ${pinch.ay * scale}px`;
          w.style.willChange = "transform";
        }
      }
    };
    const move = (e: TouchEvent) => {
      if (tap && e.touches.length === 1 && Math.hypot(e.touches[0]!.clientX - tap.x, e.touches[0]!.clientY - tap.y) > TAP_SLOP_PX) tap.moved = true;
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const { scale, scales } = live.current;
      // Sin pasar mucho de los niveles de los extremos.
      pinch.k = Math.min(scales[2] * 1.25, Math.max(scales[0] * 0.8, (scale * dist(e.touches)) / pinch.d)) / scale;
      if (wrap.current) wrap.current.style.transform = `scale(${pinch.k})`;
    };
    const end = (e: TouchEvent) => {
      const { level, scale, scales, setLevel } = live.current;
      if (pinch && e.touches.length < 2) {
        const target = scale * pinch.k;
        // El nivel más cercano a lo que marcan los dedos, contando en proporción.
        let best: ZoomLevel = level;
        for (const l of [0, 1, 2] as const) if (Math.abs(Math.log(scales[l] / target)) < Math.abs(Math.log(scales[best] / target))) best = l;
        if (wrap.current) {
          wrap.current.style.transform = "";
          wrap.current.style.willChange = "";
        }
        setLevel(best, { ax: pinch.ax, ay: pinch.ay, offX: pinch.offX, offY: pinch.offY });
        pinch = null;
        return;
      }
      if (e.touches.length > 0 || !tap) return;
      const t = e.changedTouches[0]!;
      const single = !tap.moved && !tap.many;
      tap = null;
      if (!single) {
        lastTap = null;
        return;
      }
      const now = Date.now();
      if (lastTap && now - lastTap.at < DOUBLE_TAP_MS && Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < DOUBLE_TAP_PX) {
        lastTap = null;
        e.preventDefault();
        // Si el primer toque ya acercó el mapa (una casilla en la vista del reino), no se acerca dos veces.
        if (now - lastChange.current < DOUBLE_TAP_MS + 100) return;
        setLevel(level < 2 ? ((level + 1) as ZoomLevel) : 0, t);
        return;
      }
      lastTap = { x: t.clientX, y: t.clientY, at: now };
    };
    // En el ordenador, la pinza del panel táctil llega como rueda con Ctrl: un nivel por gesto.
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const { level, setLevel } = live.current;
      if (Date.now() - lastChange.current < 250 || e.deltaY === 0) return;
      const next = Math.min(2, Math.max(0, level + (e.deltaY < 0 ? 1 : -1))) as ZoomLevel;
      if (next !== level) setLevel(next, e);
    };
    // Con ratón, dos clics hacen lo mismo que dos toques.
    const dblclick = (e: MouseEvent) => {
      const { level, setLevel } = live.current;
      if (Date.now() - lastChange.current < DOUBLE_TAP_MS + 300) return;
      setLevel(level < 2 ? ((level + 1) as ZoomLevel) : 0, e);
    };
    el.addEventListener("dblclick", dblclick);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", end, { passive: false });
    el.addEventListener("touchcancel", end, { passive: false });
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("touchcancel", end);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("dblclick", dblclick);
    };
  }, [viewport, wrap]);

  return { level, setLevel, scale };
}
