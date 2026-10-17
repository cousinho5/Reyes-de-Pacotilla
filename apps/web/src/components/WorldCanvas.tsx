// Pinta el mundo (art/world.ts) en un <canvas> nítido. Sin animación: solo se
// vuelve a pintar cuando cambia lo que hay en el mapa.

import { useEffect, useMemo, useRef } from "react";
import { renderWorld, toImageData, type WorldImage, type WorldOptions } from "../art/world";

export function useWorld(opts: WorldOptions): WorldImage {
  const key = JSON.stringify(opts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => renderWorld(opts), [key]);
}

export function WorldCanvas({ img, className, label }: { img: WorldImage; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d")?.putImageData(new ImageData(toImageData(img), img.width, img.height), 0, 0);
  }, [img]);
  return <canvas ref={ref} className={`world-canvas ${className ?? ""}`} role={label ? "img" : undefined} aria-label={label} />;
}

/** Atajo para dibujos fijos (la portada). */
export function StaticWorld({ opts, label }: { opts: WorldOptions; label?: string }) {
  const img = useWorld(opts);
  return (
    <div className="world" style={{ aspectRatio: `${img.width} / ${img.height}` }}>
      <WorldCanvas img={img} label={label} />
    </div>
  );
}
