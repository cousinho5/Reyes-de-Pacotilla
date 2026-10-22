// Pinta el mundo (art/world.ts) en un <canvas> nítido. Sin animación: solo se
// vuelve a pintar cuando cambia lo que hay en el mapa.
//
// Bloque 6: el dibujo se hace en segundo plano y se guarda en el móvil
// (art/worldStore.ts). La primera vez, mientras tanto, una vista previa con el
// color de cada casilla; si ya había un dibujo, se queda hasta que llega el nuevo.

import { useEffect, useMemo, useRef } from "react";
import { PREVIEW_BACKGROUND, PREVIEW_COLOR, geoOf, worldMeta, type WorldMeta, type WorldOptions } from "../art/world";
import { remembered, worldDrawing, type Drawing } from "../art/worldStore";

/** Tamaño y forma del dibujo, al momento (para colocar casillas y flechas encima). */
export function useWorldMeta(opts: WorldOptions): WorldMeta {
  const { cols, rows, margin, grid, coast } = opts;
  return useMemo(() => worldMeta({ cols, rows, margin, grid, coast, cells: [] }), [cols, rows, margin, grid, coast]);
}

function paint(c: HTMLCanvasElement, d: Drawing) {
  c.width = d.width;
  c.height = d.height;
  const ctx = c.getContext("2d");
  if (d instanceof ImageData) ctx?.putImageData(d, 0, 0);
  else ctx?.drawImage(d, 0, 0);
}

function preview(c: HTMLCanvasElement, opts: WorldOptions, meta: WorldMeta) {
  c.width = meta.width;
  c.height = meta.height;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  const geo = geoOf(meta);
  ctx.fillStyle = PREVIEW_BACKGROUND;
  ctx.fillRect(0, 0, meta.width, meta.height);
  for (const cell of opts.cells) {
    const pts = geo.outline(cell.x, cell.y);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = PREVIEW_COLOR[cell.type];
    ctx.fill();
    if (cell.fogged) {
      ctx.fillStyle = "rgba(62, 48, 30, 0.6)";
      ctx.fill();
    }
  }
}

export function WorldCanvas({ opts, className, label }: { opts: WorldOptions; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawn = useRef(false);
  const key = useMemo(() => JSON.stringify(opts), [opts]);
  const meta = useWorldMeta(opts);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let alive = true;
    const show = (d: Drawing) => {
      paint(c, d);
      drawn.current = true;
      // Para scripts/medir-movil.mjs: cuándo se ve el mapa.
      performance.mark("mapa-dibujado");
    };
    const ready = remembered(key);
    if (ready) {
      show(ready);
      return;
    }
    if (!drawn.current || c.width !== meta.width || c.height !== meta.height) {
      preview(c, opts, meta);
      performance.mark("mapa-vista-previa");
    }
    worldDrawing(opts, key).then((d) => alive && d && show(d));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <canvas ref={ref} className={`world-canvas ${className ?? ""}`} role={label ? "img" : undefined} aria-label={label} />;
}

/** Atajo para dibujos fijos (la portada). */
export function StaticWorld({ opts, label }: { opts: WorldOptions; label?: string }) {
  const meta = useWorldMeta(opts);
  return (
    <div className="world" style={{ aspectRatio: `${meta.width} / ${meta.height}` }}>
      <WorldCanvas opts={opts} label={label} />
    </div>
  );
}
