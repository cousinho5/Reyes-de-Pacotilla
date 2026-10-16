// Comercio de los bots: ofrecen lo que les sobra por lo que les falta y
// aceptan las ofertas que, según lo que valoran cada recurso, les salen a
// cuenta. Un socio nuevo también vale: da Prestigio de comercio.

import { isValidTrade } from "../prestige";
import { PRESTIGE } from "../rules";
import { totalOf } from "../trade";
import { RESOURCES, type HouseId, type Resource, type Resources } from "../types";
import { PRESTIGE_UNIT, clamp, valueOf, type Situation } from "./view";

export interface OfferPlan {
  give: Partial<Resources>;
  want: Partial<Resources>;
}

/** Oferta pública que haría hoy el bot, o null si no le interesa comerciar. */
export function proposeOffer(s: Situation): OfferPlan | null {
  const { view, p, values } = s;
  // Los menos comerciantes no ofrecen todos los días.
  const every = Math.max(1, Math.round(1 / Math.max(0.1, p.trade)));
  if ((view.day + view.house) % every !== 0) return null;
  const byValue = [...RESOURCES].sort((a, b) => values[a] - values[b] || RESOURCES.indexOf(a) - RESOURCES.indexOf(b));
  const spare = (r: Resource) => view.resources[r] - (r === "pan" ? s.panReserve : 0);
  const surplus = byValue.find((r) => spare(r) >= 25);
  const deficit = byValue[byValue.length - 1]!;
  if (!surplus || surplus === deficit || values[deficit] < values[surplus] * 1.5) return null;
  const give = clamp(Math.round(spare(surplus) * 0.3), 12, 40);
  const want = Math.max(10, Math.round(give * 0.8));
  if (valueOf(values, { [deficit]: want }) <= valueOf(values, { [surplus]: give })) return null;
  return { give: { [surplus]: give }, want: { [deficit]: want } };
}

/**
 * Cuánto gana el bot aceptando una oferta: recibe `give` y entrega `want`.
 * Positivo = la acepta.
 */
export function offerGain(s: Situation, give: Partial<Resources>, want: Partial<Resources>, from: HouseId): number {
  const { view, p, values } = s;
  for (const [r, v] of Object.entries(want) as [Resource, number][]) {
    if (view.resources[r] - (r === "pan" ? s.panReserve : 0) < v) return -Infinity;
  }
  let gain = valueOf(values, give) - valueOf(values, want);
  const partnerCap = PRESTIGE.tradeMax / PRESTIGE.perTradePartner;
  if (
    isValidTrade(totalOf(give), totalOf(want)) &&
    !view.recentPartners.includes(from) &&
    view.recentPartners.length < partnerCap
  ) {
    gain += PRESTIGE.perTradePartner * PRESTIGE_UNIT * (0.3 + 0.7 * p.trade);
  }
  if (from === s.leader) gain -= p.leaderHatred * PRESTIGE_UNIT;
  return gain - (1 - p.trade) * 3;
}
