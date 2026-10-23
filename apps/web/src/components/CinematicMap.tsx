// Bloque 13: el mapa de la partida dentro de una cinemática. Es el mismo dibujo
// del mundo que la pestaña Mapa (en segundo plano y guardado), sin tropas ni
// niebla: de quién es cada casilla ya es público. «titulo» lo recorre en sepia;
// «revelar» le devuelve el color, enciende los castillos uno a uno y acerca el
// tuyo. Se mueve con su propio reloj desde que aparece; quieto, en su final.

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameState } from "../api";
import { geoOf } from "../art/world";
import { clamp, ease, lerp } from "../art/cinema";
import { HOUSE_COLORS } from "../ui";
import { WorldCanvas, useWorldMeta } from "./WorldCanvas";

const still = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CinematicMap({ state, mode, dur }: { state: GameState; mode: "titulo" | "revelar"; dur: number }) {
  const tiles = state.casillas ?? [];
  const colorOf = (house: number | null | undefined) => {
    const h = house != null ? state.casas.find((c) => c.id === house) : undefined;
    return h ? (HOUSE_COLORS[h.color]?.hex ?? null) : null;
  };
  const opts = useMemo(
    () => ({
      cols: state.partida.columnas ?? 5,
      rows: state.partida.filas ?? 5,
      seed: state.partida.id,
      coast: state.partida.costa ?? null,
      cells: tiles.map((t) => ({
        x: t.x,
        y: t.y,
        type: t.type,
        owner: colorOf(t.owner),
        river: t.river ?? 0,
        stage: t.type === "castillo" ? state.casas.find((h) => h.id === t.castleOf)?.etapa : undefined,
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.partida.id, JSON.stringify(tiles.map((t) => [t.id, t.owner, t.type]))],
  );
  const meta = useWorldMeta(opts);
  const geo = useMemo(() => geoOf(meta), [meta]);
  const castles = useMemo(
    () =>
      tiles
        .filter((t) => t.type === "castillo" && t.castleOf != null)
        .map((t) => ({ house: t.castleOf!, color: colorOf(t.castleOf) ?? "#f1cf7d", at: geo.center(t.x, t.y) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opts, geo],
  );
  const mine = castles.find((c) => c.house === state.yo.casa);

  const box = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLCanvasElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<[number, number] | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setSize([el.clientWidth, el.clientHeight]);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size) return;
    const [W, H] = size;
    const MW = meta.width;
    const MH = meta.height;
    const cover = Math.max(W / MW, H / MH);
    const place = (fx: number, fy: number, sc: number): [number, number] => [
      Math.min(0, Math.max(W - MW * sc, W / 2 - fx * sc)),
      Math.min(0, Math.max(H - MH * sc, H / 2 - fy * sc)),
    ];
    const v = veil.current!;
    v.width = MW;
    v.height = MH;
    const g = v.getContext("2d")!;
    const frame = (t: number) => {
      let sc: number, fx: number, fy: number, sepia: number;
      g.clearRect(0, 0, MW, MH);
      if (mode === "titulo") {
        const k = t / dur;
        sc = cover * lerp(1.25, 1.4, k);
        fx = lerp(0.55, 0.42, k) * MW;
        fy = lerp(0.45, 0.55, k) * MH;
        sepia = 1;
      } else {
        const z = ease(clamp((t - 4.8) / 2));
        sc = lerp(cover, cover * 2.2, z);
        fx = lerp(MW / 2, mine?.at[0] ?? MW / 2, z);
        fy = lerp(MH / 2, mine?.at[1] ?? MH / 2, z);
        sepia = 1 - clamp((t - 1.6) / 1.4);
        castles.forEach((c, i) => {
          const st = 2.6 + i * 0.28;
          if (t < st) return;
          const q = clamp((t - st) / 0.6);
          g.save();
          g.globalAlpha = q;
          g.strokeStyle = c.color;
          g.lineWidth = 4;
          g.shadowColor = c.color;
          g.shadowBlur = 14;
          g.beginPath();
          g.arc(c.at[0], c.at[1], 18 + (1 - q) * 30, 0, Math.PI * 2);
          g.stroke();
          g.restore();
        });
        if (mine && t > 6.8) {
          g.save();
          g.strokeStyle = "#f1cf7d";
          g.lineWidth = 3;
          g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5);
          g.beginPath();
          g.arc(mine.at[0], mine.at[1], 30, 0, Math.PI * 2);
          g.stroke();
          g.restore();
        }
      }
      const [tx, ty] = place(fx, fy, sc);
      if (world.current) {
        world.current.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
        world.current.style.filter = sepia > 0 ? `sepia(${0.75 * sepia}) brightness(${1 - 0.4 * sepia})` : "none";
      }
      if (label.current && mine) {
        label.current.style.left = `${tx + mine.at[0] * sc}px`;
        label.current.style.top = `${ty + mine.at[1] * sc}px`;
        label.current.style.opacity = t > 6.9 ? "1" : "0";
      }
    };
    if (still()) {
      frame(dur);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.max(0, (now - t0) / 1000);
      frame(Math.min(t, dur + 3));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, meta, mode, dur, castles, mine]);

  return (
    <div className="cine-map" ref={box}>
      <div className="cine-map-world" ref={world} style={{ width: meta.width, height: meta.height }}>
        <WorldCanvas opts={opts} />
        <canvas ref={veil} className="cine-map-veil" />
      </div>
      {mode === "revelar" && mine && (
        <span className="cine-yours" ref={label}>
          Tu castillo
        </span>
      )}
    </div>
  );
}
