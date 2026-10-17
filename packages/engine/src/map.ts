import { MAP_LAYOUT } from "./rules";
import type { Tile } from "./types";

/** Dos casillas son adyacentes si comparten lado (sin diagonales). */
export function areAdjacent(a: Pick<Tile, "x" | "y">, b: Pick<Tile, "x" | "y">): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/** Tamaño del mapa según el número de casas (rules.ts, MAP_LAYOUT). */
export function mapSize(players: number): { cols: number; rows: number } {
  if (players < 4 || players > 8) throw new Error("El juego es para 4-8 casas");
  const { cols, rows } = MAP_LAYOUT[players as 4 | 5 | 6 | 7 | 8];
  return { cols, rows };
}
