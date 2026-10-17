// Escudos en D1: de la fila de la casa al escudo del motor y al JSON del cliente.

import { HOUSE_COLORS, freeShield, type Shield } from "@reyes/engine";
import type { HouseRow } from "./state";

export const COLORS = HOUSE_COLORS;

export type ShieldFields = Pick<HouseRow, "color" | "shield_shape" | "shield_division" | "color2" | "symbol" | "metal">;

export function shieldOf(h: ShieldFields): Shield {
  return {
    color: h.color as Shield["color"],
    shape: h.shield_shape as Shield["shape"],
    division: (h.shield_division ?? "pleno") as Shield["division"],
    color2: (h.color2 ?? null) as Shield["color2"],
    symbol: h.symbol as Shield["symbol"],
    metal: (h.metal ?? "oro") as Shield["metal"],
  };
}

/** El escudo tal como lo recibe el cliente. */
export function shieldView(h: ShieldFields) {
  const s = shieldOf(h);
  return { forma: s.shape, division: s.division, color2: s.color2, simbolo: s.symbol, metal: s.metal };
}

/** Primer escudo libre, para los bots. */
export function pickShield(houses: HouseRow[]): Shield {
  return freeShield(houses.map(shieldOf));
}
