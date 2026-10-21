// Ríos (bloque 1, fase 2): nacen junto a una montaña y bajan hasta la costa por los lados entre casillas, siempre hacia lo más bajo.
// Se calculan una vez, al generar el mapa, y se guardan en cada casilla como
// un bit por lado (`Tile.river`, en el orden de `neighbourCoords`).
//
// Geometría de hexágonos "odd-r" con el pico arriba, en unidades en las que
// dos centros vecinos están a 1: cada vértice lo comparten tres casillas
// (algunas, fuera del mapa) y cada tramo de río es el lado entre dos de ellas.

import { neighbourCoords, sideTowards } from "./map";
import { GRID } from "./rules";
import type { TileType } from "./types";

type Cell = [number, number];

export interface RiverInput {
  cols: number;
  rows: number;
  /** Lados con costa: fuera del mapa por ahí está el mar. */
  coast: "oeste-este" | "norte-sur";
  /** Tipo de cada casilla del mapa (los castillos incluidos). */
  typeAt: (x: number, y: number) => TileType;
  /** Altura de 0 a 1 de cada casilla del mapa. */
  heightAt: (x: number, y: number) => number;
  count: number;
}

const H = Math.sqrt(3) / 2;
const R = 1 / Math.sqrt(3);
/** Esquinas del hexágono, empezando arriba a la derecha y en el sentido de las agujas del reloj. */
const CORNERS: [number, number][] = [0, 1, 2, 3, 4, 5].map((k) => {
  const a = ((60 * k - 30) * Math.PI) / 180;
  return [R * Math.cos(a), R * Math.sin(a)];
});

const centerOf = ([x, y]: Cell): [number, number] => [x + 0.5 * (y & 1), y * H];
const keyOf = (px: number, py: number) => `${Math.round(px * 1000)},${Math.round(py * 1000)}`;

/**
 * Ríos del mapa: bits de río por casilla ("x,y" → bits). Vacío si la
 * cuadrícula no es de hexágonos o no cabe ningún río.
 */
export function traceRivers(input: RiverInput): Map<string, number> {
  const bits = new Map<string, number>();
  if (GRID.kind !== "hex" || input.count <= 0) return bits;
  const { cols, rows, coast } = input;
  const inMap = ([x, y]: Cell) => x >= 0 && y >= 0 && x < cols && y < rows;
  const sea = ([x, y]: Cell) => !inMap([x, y]) && (coast === "oeste-este" ? x < 0 || x >= cols : y < 0 || y >= rows);

  // Vértices: qué casillas los tocan y con qué vértices se unen.
  const cellsAt = new Map<string, Cell[]>();
  const links = new Map<string, Set<string>>();
  for (let y = -1; y <= rows; y++) {
    for (let x = -1; x <= cols; x++) {
      const [cx, cy] = centerOf([x, y]);
      const keys = CORNERS.map(([dx, dy]) => keyOf(cx + dx, cy + dy));
      keys.forEach((k, i) => {
        if (!cellsAt.has(k)) cellsAt.set(k, []);
        cellsAt.get(k)!.push([x, y]);
        const next = keys[(i + 1) % 6]!;
        if (!links.has(k)) links.set(k, new Set());
        if (!links.has(next)) links.set(next, new Set());
        links.get(k)!.add(next);
        links.get(next)!.add(k);
      });
    }
  }
  const touchesMap = (v: string) => cellsAt.get(v)!.some(inMap);
  const isLake = (c: Cell) => inMap(c) && input.typeAt(c[0], c[1]) === "lago";
  // Los ríos acaban en el mar; los lagos no los paran (pueden bordearlos).
  const terminal = (v: string) => cellsAt.get(v)!.some(sea);
  // Altura de un vértice: la media de sus casillas (el mar, muy bajo; fuera
  // del mapa por los lados sin costa hay montañas, muy alto).
  const height = (v: string) => {
    const cs = cellsAt.get(v)!;
    return cs.reduce((a, c) => a + (inMap(c) ? input.heightAt(c[0], c[1]) - (isLake(c) ? 0.2 : 0) : sea(c) ? -1 : 1.5), 0) / cs.length;
  };
  /** Las dos casillas a los lados del tramo entre dos vértices. */
  const sideCells = (a: string, b: string) => {
    const cb = cellsAt.get(b)!;
    return cellsAt.get(a)!.filter((c) => cb.some((d) => d[0] === c[0] && d[1] === c[1]));
  };

  const used = new Set<string>();
  const starts = [...cellsAt.keys()]
    .filter((v) => touchesMap(v) && !terminal(v) && cellsAt.get(v)!.some((c) => inMap(c) && input.typeAt(c[0], c[1]) === "montana"))
    .sort((a, b) => height(b) - height(a) || (a < b ? -1 : 1));
  let made = 0;
  for (const start of starts) {
    if (made >= input.count) break;
    // Lejos de los ríos que ya hay: ninguna casilla en común.
    const startCells = cellsAt.get(start)!;
    if ([...used].some((v) => cellsAt.get(v)!.some((c) => startCells.some((d) => d[0] === c[0] && d[1] === c[1])))) continue;
    const path = [start];
    const seen = new Set(path);
    let ok = false;
    for (let step = 0; step < 4 * (cols + rows); step++) {
      const here = path[path.length - 1]!;
      const options = [...links.get(here)!].filter((v) => !seen.has(v) && touchesMap(v));
      if (!options.length) break;
      const next = options.reduce((a, b) => (height(b) < height(a) - 1e-9 || (Math.abs(height(b) - height(a)) <= 1e-9 && b < a) ? b : a));
      path.push(next);
      seen.add(next);
      if (terminal(next) || used.has(next)) {
        ok = true;
        break;
      }
    }
    // Un río que no llega o que apenas cruza el mapa no se queda.
    const crossings = path.slice(1).filter((v, i) => sideCells(path[i]!, v).filter(inMap).length === 2).length;
    if (!ok || crossings < 3) continue;
    made++;
    for (let i = 1; i < path.length; i++) {
      const [p, q] = sideCells(path[i - 1]!, path[i]!);
      if (!p || !q) continue;
      for (const [a, b] of [
        [p, q],
        [q, p],
      ] as [Cell, Cell][]) {
        if (!inMap(a)) continue;
        const side = sideTowards({ x: a[0], y: a[1] }, { x: b[0], y: b[1] });
        if (side < 0) continue;
        const k = `${a[0]},${a[1]}`;
        bits.set(k, (bits.get(k) ?? 0) | (1 << side));
      }
    }
    for (const v of path) used.add(v);
  }
  return bits;
}

/** Los lados con río de una casilla, como casillas vecinas (pueden caer fuera del mapa). */
export function riverSides(t: { x: number; y: number; river?: number }): { x: number; y: number }[] {
  if (!t.river) return [];
  return neighbourCoords(t).filter((_, i) => (t.river! & (1 << i)) !== 0);
}
