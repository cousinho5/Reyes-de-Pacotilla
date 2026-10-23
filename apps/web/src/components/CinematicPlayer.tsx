// Bloque 13: el reproductor de cinemáticas, a pantalla completa. Arriba el
// escenario en pixel art (160x176) con su capa de texto, debajo el pergamino de
// Fray Abundio. Se toca la escena para pasar a la siguiente, «Saltar» la cierra
// y con «reducir movimiento» cada escena es una viñeta quieta.

import { useEffect, useRef, useState } from "react";
import { FrayAbundio } from "../art";
import { CINE_H, CINE_W, clamp, painter } from "../art/cinema";
import type { Cinematic } from "../cinematics";

const still = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CinematicPlayer({ cinematic, onClose }: { cinematic: Cinematic; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const reduced = still();
  const scenes = cinematic.scenes;
  const scene = scenes[index]!;
  const last = index === scenes.length - 1;

  // El dibujo de la escena: cada fotograma en función del tiempo; quieto, el último instante.
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const p = painter(ctx);
    const paint = (t: number) => {
      ctx.clearRect(0, 0, CINE_W, CINE_H);
      scene.draw(p, Math.min(t, scene.dur));
      if (bar.current) bar.current.style.width = `${clamp(t / scene.dur) * 100}%`;
    };
    if (reduced) {
      paint(scene.dur);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      // El primer fotograma puede llevar una hora algo anterior a t0.
      const t = Math.max(0, (now - t0) / 1000);
      paint(t);
      if (t > scene.dur + 0.4 && !last) {
        setIndex((i) => i + 1);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [scene, last, reduced]);

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, scenes.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, scenes.length]);

  const advance = () => (last ? onClose() : setIndex(index + 1));

  return (
    <div className="cinematic" role="dialog" aria-modal="true" aria-label={cinematic.titulo} ref={dialog} tabIndex={-1}>
      <div className="cine-player">
        <div className="cine-top">
          <h2>{cinematic.titulo}</h2>
          <button className="cine-skip" onClick={onClose}>
            Saltar
          </button>
        </div>
        <div className="cine-stage" onClick={advance} role="img" aria-label={scene.label}>
          <canvas ref={canvas} width={CINE_W} height={CINE_H} />
          {/* Se monta de nuevo en cada escena para que sus animaciones empiecen de cero. */}
          <div className="cine-over" key={index}>
            {scene.overlay}
          </div>
        </div>
        <div className="cine-bar" aria-hidden="true">
          <i ref={bar} style={reduced ? { width: "100%" } : undefined} />
        </div>
        <div className="cine-caption" aria-live="polite">
          <span className="cine-fray">
            <FrayAbundio mood={scene.fray} size={72} anim={scene.fray === "dormido" ? "cabecea" : "habla"} />
          </span>
          <p>{scene.text}</p>
          {scene.foot && <small>{scene.foot}</small>}
        </div>
        <div className="cine-nav">
          {scenes.length > 1 ? (
            <>
              <button onClick={() => setIndex(Math.max(index - 1, 0))} disabled={index === 0} aria-label="Escena anterior">
                ‹
              </button>
              <span className="cine-dots" aria-hidden="true">
                {scenes.map((_, i) => (
                  <i key={i} className={i === index ? "on" : undefined} />
                ))}
              </span>
              <span className="cine-count">
                {index + 1} de {scenes.length}
              </span>
            </>
          ) : (
            <span className="cine-dots" />
          )}
          <button className={last ? "cine-done" : undefined} onClick={advance} aria-label={last ? undefined : "Escena siguiente"}>
            {last ? "Continuar" : "›"}
          </button>
        </div>
      </div>
    </div>
  );
}
