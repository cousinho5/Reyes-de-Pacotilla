import type { Tile } from "./types";

/** Dos casillas son adyacentes si comparten lado (sin diagonales). */
export function areAdjacent(a: Pick<Tile, "x" | "y">, b: Pick<Tile, "x" | "y">): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

/** Tamaño del mapa según el número de casas (máximo 6 columnas para móvil). */
export function mapSize(players: number): { cols: number; rows: number } {
  if (players < 4 || players > 8) throw new Error("El juego es para 4-8 casas");
  if (players === 4) return { cols: 5, rows: 4 };
  if (players === 5) return { cols: 6, rows: 4 };
  if (players <= 7) return { cols: 6, rows: 5 };
  return { cols: 6, rows: 6 };
}
