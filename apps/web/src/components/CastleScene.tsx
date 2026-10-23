// Bloque 2: la escena de la pestaña Castillo. Un lienzo de 195x136 visto al
// doble: tocar un edificio o el castillo avisa con `onPick`. Para el teclado y
// los lectores de pantalla, cada pieza tiene además un botón invisible encima.

import { forwardRef, useEffect, useMemo, useRef } from "react";
import type { BuildingKind } from "@reyes/engine";
import { SCENE_H, SCENE_W, TARGETS, renderCastleScene, targetAt, type SceneTarget } from "../art/castleScene";
import { BUILDING_LABEL } from "../ui";

interface Props {
  stage: number;
  levels: Record<BuildingKind, number>;
  color: string;
  shield?: { grid: string[]; palette: Record<string, string> };
  selected?: SceneTarget | null;
  onPick: (t: SceneTarget) => void;
}

const LABEL = (t: SceneTarget, levels: Record<BuildingKind, number>, stage: number) =>
  t === "castillo" ? `Castillo (etapa ${stage} de 5): reclutar` : `${BUILDING_LABEL[t]}, nivel ${levels[t]}`;

export const CastleScene = forwardRef<HTMLDivElement, Props>(function CastleScene({ stage, levels, color, shield, selected, onPick }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const img = useMemo(
    () => renderCastleScene({ stage, levels, color, shield }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stage, JSON.stringify(levels), color, shield],
  );

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const rgba = new Uint8ClampedArray(img.rgba);
    // La pieza elegida lleva un borde de latón alrededor.
    const who = selected ? TARGETS.indexOf(selected) : -1;
    if (who >= 0) {
      for (let y = 0; y < SCENE_H; y++) {
        for (let x = 0; x < SCENE_W; x++) {
          const i = y * SCENE_W + x;
          if (img.owner[i] === who) continue;
          const near =
            (x > 0 && img.owner[i - 1] === who) ||
            (x < SCENE_W - 1 && img.owner[i + 1] === who) ||
            (y > 0 && img.owner[i - SCENE_W] === who) ||
            (y < SCENE_H - 1 && img.owner[i + SCENE_W] === who);
          if (!near) continue;
          rgba.set([246, 227, 160, 255], i * 4);
        }
      }
    }
    ctx.putImageData(new ImageData(rgba, SCENE_W, SCENE_H), 0, 0);
  }, [img, selected]);

  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const t = targetAt(img, ((e.clientX - r.left) / r.width) * SCENE_W, ((e.clientY - r.top) / r.height) * SCENE_H);
    if (t) onPick(t);
  };

  return (
    <div className="castle-scene" ref={ref}>
      <canvas
        ref={canvas}
        width={SCENE_W}
        height={SCENE_H}
        onClick={pick}
        role="img"
        aria-label={`Tu castillo, en la etapa ${stage} de 5, con sus edificios alrededor`}
      />
      {TARGETS.map((t) => {
        const [x, y, w, h] = img.boxes[t];
        return (
          <button
            key={t}
            className="scene-target"
            style={{
              left: `${(Math.max(0, x) / SCENE_W) * 100}%`,
              top: `${(Math.max(0, y) / SCENE_H) * 100}%`,
              width: `${(w / SCENE_W) * 100}%`,
              height: `${(Math.min(h, h + y) / SCENE_H) * 100}%`,
            }}
            aria-label={LABEL(t, levels, stage)}
            onClick={() => onPick(t)}
          />
        );
      })}
    </div>
  );
});
