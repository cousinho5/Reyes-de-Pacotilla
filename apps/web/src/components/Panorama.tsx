// Bloque 7: la escena de la portada. Un lienzo por plano para que, al deslizar
// la página, cada uno se quede atrás a su ritmo (paralaje). Se mueve a 14
// imágenes por segundo, se para si la pestaña no se ve o la escena queda fuera
// de la pantalla, y con «reducir movimiento» queda quieta y sin paralaje.

import { useEffect, useRef } from "react";
import { LAYERS, MOVING_LAYERS, PANO_H, PANO_W, drawLayer } from "../art/panorama";
import type { HomeHour } from "../home";

const FPS = 14;
const still = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Panorama({ hour }: { hour: HomeHour }) {
  const box = useRef<HTMLDivElement>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const ctxs = canvases.current.map((c) => c?.getContext("2d") ?? null);
    const moving = !still();
    const paint = (t: number, all: boolean) =>
      LAYERS.forEach((l, i) => {
        const g = ctxs[i];
        if (g && (all || MOVING_LAYERS.has(l.id))) drawLayer(g, l.id, t, hour, moving);
      });
    paint(0, true);
    // Que el primer dibujo se pueda medir (bloque 6: npm run medir-movil).
    performance.mark?.("portada-dibujada");
    if (!moving) return;

    let raf = 0;
    let last = 0;
    let visible = true;
    const t0 = performance.now();
    const loop = (now: number) => {
      raf = 0;
      if (!visible || document.visibilityState !== "visible") return;
      if (now - last >= 1000 / FPS) {
        last = now;
        paint((now - t0) / 1000, false);
      }
      raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (!raf && visible && document.visibilityState === "visible") raf = requestAnimationFrame(loop);
    };
    const io =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(([e]) => {
            visible = !!e?.isIntersecting;
            wake();
          })
        : null;
    if (box.current) io?.observe(box.current);
    document.addEventListener("visibilitychange", wake);
    wake();

    // Paralaje: al bajar por la página, los planos lejanos se quedan atrás.
    const onScroll = () => {
      const y = Math.min(window.scrollY, box.current?.offsetHeight ?? 600);
      canvases.current.forEach((c, i) => {
        if (c) c.style.transform = `translate3d(0, ${(y * LAYERS[i]!.parallax).toFixed(1)}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("scroll", onScroll);
    };
  }, [hour]);

  return (
    <div className="panorama" ref={box} role="img" aria-label="Aldricia vista desde el camino real, con la capital al fondo">
      {LAYERS.map((l, i) => (
        <canvas key={l.id} ref={(c) => void (canvases.current[i] = c)} width={PANO_W} height={PANO_H} className="pano-layer" />
      ))}
    </div>
  );
}

export default Panorama;
