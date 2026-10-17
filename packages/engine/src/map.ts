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
