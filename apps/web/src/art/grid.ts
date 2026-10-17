// Geometría del mapa dibujado: dónde cae el centro de cada casilla, qué
// casilla hay bajo un píxel y a qué distancia está el borde con cada vecina.
//
// - "square": casillas de 64x64 en cuadrícula, 4 vecinas.
// - "hex": hexágonos con el pico arriba, filas impares desplazadas media
//   casilla a la derecha ("odd-r", como el motor). Cada casilla mide 56 de
//   ancho y unos 64 de alto; las filas se solapan 16 px. Así cada casilla sigue
//   teniendo una caja de 64x64 alrededor de su centro donde se dibujan sus
//   cosas, y lo que asoma fuera de su hexágono (copas, torres) tapa un poco a
//   la vecina, como en Wesnoth.

import { CELL } from "./cell";

export type GridKind = "square" | "hex";

/** Separación entre centros en hexágonos: horizontal y entre filas. */
export const HEX_W = 56;
export const HEX_H = 48;

export interface Geo {
  kind: GridKind;
  cols: number;
  rows: number;
  margin: number;
  width: number;
  height: number;
  /** Centro de la casilla (x, y) en píxeles. */
  center(x: number, y: number): [number, number];
  /** Vecinas que comparten lado (pueden caer fuera del mapa). */
  neighbours(x: number, y: number): [number, number][];
  /** Casilla más cercana al píxel (siempre dentro del mapa). */
  cellAt(px: number, py: number): [number, number];
  /** Vértices del contorno de la casilla, encogido `inset` píxeles. */
  outline(x: number, y: number, inset?: number): [number, number][];
}

const SQUARE_DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export function hexNeighbours(x: number, y: number): [number, number][] {
  // Fila par: las vecinas de arriba y abajo quedan a la izquierda; impar, a la derecha.
  const s = y & 1 ? 0 : -1;
  return [
    [x - 1, y],
    [x + 1, y],
    [x + s, y - 1],
    [x + s + 1, y - 1],
    [x + s, y + 1],
    [x + s + 1, y + 1],
  ];
}

export function makeGeo(kind: GridKind, cols: number, rows: number, margin: number): Geo {
  if (kind === "square") {
    return {
      kind,
      cols,
      rows,
      margin,
      width: cols * CELL + 2 * margin,
      height: rows * CELL + 2 * margin,
      center: (x, y) => [margin + x * CELL + CELL / 2, margin + y * CELL + CELL / 2],
      neighbours: (x, y) => SQUARE_DIRS.map(([dx, dy]) => [x + dx, y + dy]),
      cellAt: (px, py) => [
        Math.min(cols - 1, Math.max(0, Math.floor((px - margin) / CELL))),
        Math.min(rows - 1, Math.max(0, Math.floor((py - margin) / CELL))),
      ],
      outline: (x, y, inset = 0) => {
        const x0 = margin + x * CELL + inset;
        const y0 = margin + y * CELL + inset;
        const s = CELL - 1 - 2 * inset;
        return [
          [x0, y0],
          [x0 + s, y0],
          [x0 + s, y0 + s],
          [x0, y0 + s],
        ];
      },
    };
  }
  const ox = margin + CELL / 2;
  const oy = margin + CELL / 2;
  const center = (x: number, y: number): [number, number] => [ox + x * HEX_W + (y & 1 ? HEX_W / 2 : 0), oy + y * HEX_H];
  return {
    kind,
    cols,
    rows,
    margin,
    width: 2 * margin + CELL + (cols - 1) * HEX_W + (rows > 1 ? HEX_W / 2 : 0),
    height: 2 * margin + CELL + (rows - 1) * HEX_H,
    center,
    neighbours: hexNeighbours,
    cellAt: (px, py) => {
      const r0 = Math.round((py - oy) / HEX_H);
      let best: [number, number] = [0, 0];
      let bestD = Infinity;
      for (let r = r0 - 1; r <= r0 + 1; r++) {
        if (r < 0 || r >= rows) continue;
        const c0 = Math.round((px - ox - (r & 1 ? HEX_W / 2 : 0)) / HEX_W);
        for (let c = c0 - 1; c <= c0 + 1; c++) {
          if (c < 0 || c >= cols) continue;
          const [cx, cy] = center(c, r);
          const d = (px - cx) ** 2 + (py - cy) ** 2;
          if (d < bestD) [bestD, best] = [d, [c, r]];
        }
      }
      if (bestD === Infinity) {
        best = [Math.min(cols - 1, Math.max(0, Math.round((px - ox) / HEX_W))), Math.min(rows - 1, Math.max(0, r0))];
      }
      return best;
    },
    outline: (x, y, inset = 0) => {
      const [cx, cy] = center(x, y);
      // Radio hasta el vértice: el lado plano queda a HEX_W/2 del centro.
      const rad = HEX_W / Math.sqrt(3) - inset;
      return Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * (HEX_H / (HEX_W * 0.866))] as [number, number];
      });
    },
  };
}

/**
 * Distancia del píxel al lado de su casilla que da a la vecina (nx, ny):
 * positiva dentro, negativa fuera. Es la mediatriz entre los dos centros.
 */
export function edgeDistance(geo: Geo, px: number, py: number, x: number, y: number, nx: number, ny: number): number {
  const [cx, cy] = geo.center(x, y);
  const [mx, my] = geo.center(nx, ny);
  const dx = mx - cx;
  const dy = my - cy;
  const len = Math.hypot(dx, dy);
  return len / 2 - ((px - cx) * dx + (py - cy) * dy) / len;
}

/** Los dos vértices del lado que la casilla (x, y) comparte con la vecina (nx, ny). */
export function sharedEdge(geo: Geo, x: number, y: number, nx: number, ny: number, inset = 0): [[number, number], [number, number]] {
  const pts = geo.outline(x, y, inset);
  const [cx, cy] = geo.center(x, y);
  const [mx, my] = geo.center(nx, ny);
  const tx = (cx + mx) / 2;
  const ty = (cy + my) / 2;
  let best = 0;
  let bestD = Infinity;
  pts.forEach(([ax, ay], i) => {
    const [bx, by] = pts[(i + 1) % pts.length]!;
    const d = ((ax + bx) / 2 - tx) ** 2 + ((ay + by) / 2 - ty) ** 2;
    if (d < bestD) [bestD, best] = [d, i];
  });
  return [pts[best]!, pts[(best + 1) % pts.length]!];
}

/** Caja (izquierda, arriba, ancho, alto) que ocupa la casilla: 56x64 en hexágonos, 64x64 en cuadrícula. */
export function cellBox(geo: Geo, x: number, y: number): [number, number, number, number] {
  const [cx, cy] = geo.center(x, y);
  const w = geo.kind === "hex" ? HEX_W : CELL;
  return [cx - w / 2, cy - CELL / 2, w, CELL];
}
