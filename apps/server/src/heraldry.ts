// Colores, formas y símbolos de los escudos (diseño, sección 4).

import type { HouseRow } from "./state";

export const COLORS = ["gules", "azur", "sinople", "sable", "purpura", "naranjado", "aguamarina", "leonado"] as const;
export const SHAPES = ["espanol", "apuntado", "almendrado", "rodela", "estandarte"] as const;
export const SYMBOLS = [
  "leon", "aguila", "torre", "espada", "corona", "llave", "lobo", "dragon",
  "gallina", "cerdo", "nabo", "caracol", "pato", "queso", "bota", "cuchara",
] as const;

/** Escudo provisional (el creador de escudos llega en la versión 1): la primera combinación libre. */
export function pickShield(houses: Pick<HouseRow, "shield_shape" | "symbol">[]): { shape: string; symbol: string } {
  const used = new Set(houses.map((h) => `${h.shield_shape}:${h.symbol}`));
  const i = houses.length;
  const shape: string = SHAPES[i % SHAPES.length]!;
  let symbol: string = SYMBOLS[(i * 3) % SYMBOLS.length]!;
  for (let k = 0; used.has(`${shape}:${symbol}`); k++) symbol = SYMBOLS[k % SYMBOLS.length]!;
  return { shape, symbol };
}
