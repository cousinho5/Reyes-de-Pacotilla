// Bloque 2: la escena de la pestaña Castillo. Un lienzo de 195x136 visto al
// doble: tocar un edificio o el castillo avisa con `onPick`. Para el teclado y
// los lectores de pantalla, cada pieza tiene además un botón invisible encima.
// La escena está viva (antorchas, agua, telas y humo) y cada mejora se ve con su
// obra; sin movimiento si el móvil pide reducirlo.

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { BuildingKind } from "@reyes/engine";
import { SCENE_H, SCENE_W, TARGETS, animateScene, drawWork, renderCastleScene, targetAt, type Light, type SceneTarget } from "../art/castleScene";
import { BUILDING_LABEL } from "../ui";

interface Props {
  stage: number;
  levels: Record<BuildingKind, number>;
  color: string;
  shield?: { grid: string[]; palette: Record<string, string> };
  selected?: SceneTarget | null;
  onPick: (t: SceneTarget) => void;
  /** La hora del día en la partida. */
  light?: Light;
  /** Color (hex) de quien te sitia. */
  besieger?: string | null;
}

const WORK_MS = 1200;
const still = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const LABEL = (t: SceneTarget, levels: Record<BuildingKind, number>, stage: number) =>
  t === "castillo" ? `Castillo (etapa ${stage} de 5): reclutar` : `${BUILDING_LABEL[t]}, nivel ${levels[t]}`;

export const CastleScene = forwardRef<HTMLDivElement, Props>(function CastleScene(
  { stage, levels, color, shield, selected, onPick, light, besieger },
  ref,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const img = useMemo(
    () => renderCastleScene({ stage, levels, color, shield, light, besieger }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stage, JSON.stringify(levels), color, shield, light, besieger],
  );

  // Obra al mejorar: la pieza que acaba de subir de nivel (o el castillo de etapa).
  const before = useRef({ stage, levels });
  const [work, setWork] = useState<{ target: SceneTarget; start: number } | null>(null);
  useEffect(() => {
    const prev = before.current;
    before.current = { stage, levels };
    if (still()) return;
    const up = (Object.keys(levels) as BuildingKind[]).find((b) => levels[b] > prev.levels[b]);
    const target: SceneTarget | undefined = up ?? (stage > prev.stage ? "castillo" : undefined);
    if (target) setWork({ target, start: performance.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, JSON.stringify(levels)]);

  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (still()) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setFrame((f) => f + 1);
    }, work ? 60 : 180);
    return () => clearInterval(id);
  }, [work]);
  useEffect(() => {
    if (work && performance.now() - work.start > WORK_MS) setWork(null);
  }, [frame, work]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const rgba = new Uint8ClampedArray(img.rgba.length);
    animateScene(img, Math.floor(frame / (work ? 3 : 1)), rgba);
    if (work) drawWork(img, work.target, Math.min(1, (performance.now() - work.start) / WORK_MS), rgba);
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
  }, [img, selected, frame, work]);

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
