import { GRID, mapLayout } from "./rules";
import type { Tile } from "./types";

type Pos = Pick<Tile, "x" | "y">;

/** Coordenadas axiales de una casilla hexagonal "odd-r" (redblobgames.com/grids/hexagons). */
function axial(p: Pos): { q: number; r: number } {
  return { q: p.x - (p.y - (p.y & 1)) / 2, r: p.y };
}

/** Pasos entre dos casillas (sin diagonales en la cuadrícula; 6 vecinas en hexágonos). */
export function distance(a: Pos, b: Pos): number {
  if (GRID.kind === "square") return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const p = axial(a);
  const o = axial(b);
  const dq = p.q - o.q;
  const dr = p.r - o.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

/**
 * Las vecinas de una casilla, en un orden fijo (pueden caer fuera del mapa).
 * Hexágonos "odd-r": oeste, este, noroeste, noreste, suroeste y sureste.
 * Cuadrícula: oeste, este, norte y sur.
 */
export function neighbourCoords(p: Pos): Pos[] {
  if (GRID.kind === "square") {
    return [
      { x: p.x - 1, y: p.y },
      { x: p.x + 1, y: p.y },
      { x: p.x, y: p.y - 1 },
      { x: p.x, y: p.y + 1 },
    ];
  }
  const s = p.y & 1 ? 0 : -1;
  return [
    { x: p.x - 1, y: p.y },
    { x: p.x + 1, y: p.y },
    { x: p.x + s, y: p.y - 1 },
    { x: p.x + s + 1, y: p.y - 1 },
    { x: p.x + s, y: p.y + 1 },
    { x: p.x + s + 1, y: p.y + 1 },
  ];
}

/** Lado de `a` que da a `b` (índice en `neighbourCoords`), o -1 si no se tocan. */
export function sideTowards(a: Pos, b: Pos): number {
  return neighbourCoords(a).findIndex((n) => n.x === b.x && n.y === b.y);
}

/** Hay un río entre dos casillas vecinas. */
export function riverBetween(a: Pick<Tile, "x" | "y" | "river">, b: Pos): boolean {
  if (!a.river) return false;
  const side = sideTowards(a, b);
  return side >= 0 && (a.river & (1 << side)) !== 0;
}

/** Dos casillas son adyacentes si comparten lado. */
export function areAdjacent(a: Pos, b: Pos): boolean {
  return distance(a, b) === 1;
}

/** Tamaño del mapa según el número de casas y la forma de las casillas (rules.ts). */
export function mapSize(players: number): { cols: number; rows: number } {
  if (players < 4 || players > 8) throw new Error("El juego es para 4-8 casas");
  const { cols, rows } = mapLayout(players as 4 | 5 | 6 | 7 | 8);
  return { cols, rows };
}
