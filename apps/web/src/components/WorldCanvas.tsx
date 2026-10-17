// Pinta el mundo (art/world.ts) en un <canvas> nítido y alterna sus dos
// fotogramas: el agua, las banderas, el humo y la bruma se mueven un poco.

import { useEffect, useMemo, useRef, useState } from "react";
import { renderWorld, toImageData, type WorldOptions } from "../art/world";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function useWorld(opts: Omit<WorldOptions, "frame">) {
  const key = JSON.stringify(opts);
  return useMemo(
    () => [renderWorld({ ...opts, frame: 0 }), renderWorld({ ...opts, frame: 1 })] as const,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
}

export function WorldCanvas({ opts, className, label }: { opts: Omit<WorldOptions, "frame">; className?: string; label?: string }) {
  const frames = useWorld(opts);
  const refs = [useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null)];
  const [frame, setFrame] = useState<0 | 1>(0);

  useEffect(() => {
    frames.forEach((img, i) => {
      const c = refs[i]!.current;
      if (!c) return;
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d")?.putImageData(new ImageData(toImageData(img, i as 0 | 1), img.width, img.height), 0, 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames]);

  useEffect(() => {
    if (reducedMotion()) return;
    const t = window.setInterval(() => setFrame((f) => (f ? 0 : 1)), 750);
    return () => window.clearInterval(t);
  }, []);

  const { width, height } = frames[0];
  return (
    <div className={`world ${className ?? ""}`} style={{ aspectRatio: `${width} / ${height}` }} role={label ? "img" : undefined} aria-label={label}>
      {refs.map((ref, i) => (
        <canvas key={i} ref={ref} className="world-canvas" style={{ opacity: frame === i ? 1 : 0 }} aria-hidden />
      ))}
    </div>
  );
}
