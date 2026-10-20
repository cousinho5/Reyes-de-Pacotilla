// Usos del Oro en estudio (hoja de ruta, bloque 5): cambio con la Corona y
// mercenarios. El bot compra y vende de uno en uno mientras le compense.

import type { CrownPrices } from "../crown";
import { MERCENARIES, TROOP_COST } from "../rules";
import { RESOURCES, type Resource, type Resources } from "../types";
import { militaryWant } from "./orders";
import { valueOf, valuesWith, type Situation } from "./view";

export interface CrownPlan {
  /** Unidades compradas (+) o vendidas (-) de cada recurso. */
  units: Resources;
  /** Oro que paga (+) o cobra (-), ya redondeado. */
  gold: number;
}

/** `room`: lo que aún puede comprar y vender esta semana de cada recurso. */
export function planCrown(s: Situation, prices: CrownPrices, room: { buy: Resources; sell: Resources }): CrownPlan {
  const have = { ...s.view.resources };
  const units = { pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 0 } as Resources;
  let cost = 0;
  let income = 0;
  for (let i = 0; i < 80; i++) {
    const v = valuesWith(s, have);
    let best: { r: Resource; side: 1 | -1; gain: number } | null = null;
    for (const r of RESOURCES) {
      if (r === "oro") continue;
      // Comprar: lo que vale la unidad frente al Oro que cuesta (con un margen).
      if (units[r] < room.buy[r] && have.oro - Math.ceil(cost + prices.sell[r]) + Math.floor(income) >= 0) {
        const gain = v[r] - prices.sell[r] * v.oro * 1.1;
        if (gain > 0 && (!best || gain > best.gain)) best = { r, side: 1, gain };
      }
      if (-units[r] < room.sell[r] && have[r] >= 1) {
        const gain = prices.buy[r] * v.oro - v[r] * 1.1;
        if (gain > 0 && (!best || gain > best.gain)) best = { r, side: -1, gain };
      }
    }
    if (!best) break;
    units[best.r] += best.side;
    have[best.r] += best.side;
    if (best.side === 1) {
      cost += prices.sell[best.r];
      have.oro -= prices.sell[best.r];
    } else {
      income += prices.buy[best.r];
      have.oro += prices.buy[best.r];
    }
  }
  return { units, gold: Math.ceil(cost) - Math.floor(income) };
}

/**
 * Mercenarios que contrata hoy: los que le falten para el ejército que quiere
 * (sin mirar el Pan, porque no comen), si el Oro le vale menos que la tropa.
 */
export function planMercenaries(s: Situation, mode: "alquiler" | "soldada", recruitedToday: number, room: number): number {
  const missing = militaryWant(s) - recruitedToday;
  if (missing <= 0 || room <= 0) return 0;
  const v = s.values;
  const troopValue = valueOf(v, TROOP_COST);
  const weeksLeft = Math.max(1, Math.ceil(s.daysLeft / 7));
  // Una tropa de alquiler vale lo que una propia por el tiempo que se queda.
  const worth = mode === "alquiler" ? troopValue * Math.min(1, MERCENARIES.days / Math.max(1, s.daysLeft)) : troopValue;
  const price = mode === "alquiler" ? MERCENARIES.hire : MERCENARIES.signOn + MERCENARIES.wage * Math.min(weeksLeft, 3);
  if (price * v.oro >= worth) return 0;
  const upfront = mode === "alquiler" ? MERCENARIES.hire : MERCENARIES.signOn + MERCENARIES.wage;
  return Math.max(0, Math.min(missing, room, Math.floor(s.view.resources.oro / upfront)));
}
