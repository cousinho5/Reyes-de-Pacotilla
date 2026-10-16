// Gran Subasta y cartas para los bots: cuánto vale cada lote para ellos,
// cuánto pujan y cuándo usan cada carta.

import { checkCard, type CardContext, type CardKey, type CardParams } from "../cards";
import { upgradeCost } from "../economy";
import type { Lot } from "../auction";
import { defenseMultiplier } from "../combat";
import { CARD_VALUES, FORTIFY_COST, OBJECTIVE_TARGETS, PRESTIGE, TROOP_COST } from "../rules";
import { BUILDINGS, RESOURCES, type Resource } from "../types";
import { targets } from "./orders";
import { PRESTIGE_UNIT, valueOf, type Situation } from "./view";

/** Valor (en recursos) que tiene para el bot una carta en su mano. */
export function cardValue(s: Situation, card: CardKey): number {
  const { values, own, p } = s;
  const threatened = own.filter((t) => t.type !== "castillo" && (s.threat.get(t.id) ?? 0) > 0);
  switch (card) {
    case "mercenarios":
      return CARD_VALUES.mercenaries * valueOf(values, TROOP_COST) * (0.6 + 0.4 * p.military);
    case "diezmo":
      return own.filter((t) => t.type !== "castillo").length * CARD_VALUES.tithePerTile * values.oro;
    case "carreta": {
      const sorted = [...RESOURCES].sort((a, b) => values[a] - values[b]);
      return CARD_VALUES.cart * (values[sorted[sorted.length - 1]!] - values[sorted[0]!]);
    }
    case "maestro_obras": {
      const costs = BUILDINGS.filter((b) => s.view.buildings[b] <= 3).map((b) => valueOf(values, upgradeCost(s.view.buildings[b]) ?? {}));
      return costs.length ? Math.max(...costs) * 0.8 + PRESTIGE_UNIT : 0;
    }
    case "muralla":
      return valueOf(values, FORTIFY_COST) * (threatened.length > 0 ? 2 : 0.5);
    case "tregua":
      return threatened.length > 0 ? PRESTIGE.perTile * PRESTIGE_UNIT * 0.6 : 5;
    case "tambores":
      return 10 + 15 * p.military * p.houseBias;
    case "espia":
      return 5 + 5 * p.caution;
  }
}

export function lotValue(s: Situation, lot: Lot): number {
  const base = lot.kind === "card" ? cardValue(s, lot.card) : valueOf(s.values, lot.resources);
  const won = s.view.auctionsWon ?? 0;
  // Ganar la subasta da Prestigio (logro, hasta 3 veces) y puede cumplir su objetivo.
  let bonus = won < PRESTIGE.auctionAchievementMax ? PRESTIGE.achievement.ganador_subasta * PRESTIGE_UNIT : 0;
  const goal = OBJECTIVE_TARGETS.auctionsWon;
  if (s.view.objective === "subastas" && won < goal) bonus += (PRESTIGE.secretObjective * PRESTIGE_UNIT) / (goal - won);
  return base + bonus;
}

/** Pujas ciegas del bot (en Oro): una parte de lo que vale el lote, sin pasarse de lo que tiene. */
export function planBids(s: Situation, lots: Lot[]): { slot: number; amount: number }[] {
  const oroValue = Math.max(0.3, s.values.oro);
  let budget = Math.floor(s.view.resources.oro * (0.4 + 0.3 * s.p.trade));
  const bids: { slot: number; amount: number }[] = [];
  const ranked = lots.map((lot) => ({ lot, value: lotValue(s, lot) })).sort((a, b) => b.value - a.value || a.lot.slot - b.lot.slot);
  for (const { lot, value } of ranked) {
    // Como mucho la mitad de lo que le queda en cada lote: así puja por varios.
    const amount = Math.min(Math.ceil(budget / 2), Math.floor((value / oroValue) * 0.5));
    if (amount < 3) continue;
    bids.push({ slot: lot.slot, amount });
    budget -= amount;
  }
  return bids.sort((a, b) => a.slot - b.slot);
}

/**
 * Cartas que el bot usa ahora. `resolutionDay`: es el día de una resolución
 * (Tregua y Tambores solo se usan entonces, justo antes de dar órdenes).
 */
export function planCards(s: Situation, hand: CardKey[], resolutionDay: boolean): { card: CardKey; params: CardParams }[] {
  const { view, values, own } = s;
  const ctx: CardContext = {
    house: view.house,
    tiles: view.tiles,
    buildings: view.buildings,
    resources: view.resources,
    houses: view.prestige.map((p) => p.house),
    nextResolution: view.nextResolution,
  };
  const out: { card: CardKey; params: CardParams }[] = [];
  const mostThreatened = own
    .filter((t) => t.type !== "castillo")
    .map((t) => ({ t, gap: (s.threat.get(t.id) ?? 0) - t.troops * defenseMultiplier(t, view.nextResolution, false) }))
    .sort((a, b) => b.gap - a.gap || a.t.id - b.t.id)[0];
  for (const card of [...new Set(hand)]) {
    let params: CardParams | null = null;
    switch (card) {
      case "mercenarios":
      case "diezmo":
        params = {};
        break;
      case "maestro_obras": {
        const b = [...BUILDINGS].filter((k) => view.buildings[k] <= 3).sort((x, y) => view.buildings[y] - view.buildings[x])[0];
        if (b) params = { edificio: b };
        break;
      }
      case "carreta": {
        const sorted = [...RESOURCES].sort((a, b) => values[a] - values[b]);
        const da = sorted.find((r) => view.resources[r] >= CARD_VALUES.cart) as Resource | undefined;
        const recibe = sorted[sorted.length - 1]!;
        if (da && da !== recibe && values[recibe] > values[da] * 1.5) params = { da, recibe };
        break;
      }
      case "muralla":
        if (mostThreatened && mostThreatened.gap > 0) params = { casilla: mostThreatened.t.id };
        break;
      case "espia":
        if (s.leader != null) params = { casa: s.leader };
        break;
      case "tregua":
        if (resolutionDay && mostThreatened && mostThreatened.gap > 0) params = { casilla: mostThreatened.t.id };
        break;
      case "tambores":
        if (resolutionDay && targets(s).some((t) => t.tile.owner != null || t.need > 6)) params = {};
        break;
    }
    if (params && checkCard(card, params, ctx).ok) out.push({ card, params });
  }
  return out;
}
