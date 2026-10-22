// Usos del Oro (hoja de ruta, bloque 5): cambio con la Corona y mercenarios.
// El bot compra a la Corona de uno en uno mientras le compense.

import { CROWN_GOODS, crownQuote, crownUnitPrice } from "../crown";
import { MERCENARIES, TROOP_COST } from "../rules";
import type { Resource, Resources } from "../types";
import { militaryWant } from "./orders";
import { valueOf, valuesWith, type Situation } from "./view";

export interface CrownPlan {
  /** Unidades que compra de cada recurso. */
  units: Resources;
  /** Oro que paga, ya redondeado (cada recurso por su lado, como compras separadas). */
  gold: number;
}

/**
 * Compras a la Corona de hoy. `realm`: lo que guarda el reino (solo lo usa el
 * precio: el bot, como una persona, solo ve lo que cuesta cada unidad).
 * `bought`: unidades compradas a la Corona en los últimos 7 días.
 */
export function planCrown(s: Situation, realm: Resources, bought: Resources): CrownPlan {
  const have = { ...s.view.resources };
  const units = { pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 0 } as Resources;
  const gold = () => CROWN_GOODS.reduce((a, r) => a + crownQuote(realm, r, bought[r], units[r]), 0);
  for (let i = 0; i < 80; i++) {
    const v = valuesWith(s, have);
    let best: { r: Resource; gain: number } | null = null;
    for (const r of CROWN_GOODS) {
      const price = crownUnitPrice(realm, r, bought[r] + units[r]);
      units[r]++;
      const affordable = gold() <= s.view.resources.oro;
      units[r]--;
      if (!affordable) continue;
      // Lo que vale la unidad frente al Oro que cuesta (con un margen).
      const gain = v[r] - price * v.oro * 1.1;
      if (gain > 0 && (!best || gain > best.gain)) best = { r, gain };
    }
    if (!best) break;
    have.oro -= crownUnitPrice(realm, best.r, bought[best.r] + units[best.r]);
    units[best.r]++;
    have[best.r]++;
  }
  return { units, gold: gold() };
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
