// Comercio de los bots: ofrecen lo que les sobra por lo que les falta y
// aceptan las ofertas que, según lo que valoran cada recurso, les salen a
// cuenta. Un socio nuevo también vale: da Prestigio de comercio. Si una oferta
// se queda cerca, contestan con una contraoferta; no repiten trato con la misma
// casa sin parar, retiran lo que nadie quiere y no comercian con quien les ha
// atacado hace poco (docs/bots.md, PR 3).

import { noticeText } from "../notices";
import { isValidTrade } from "../prestige";
import { BOT_TRADE, PRESTIGE } from "../rules";
import { totalOf } from "../trade";
import { RESOURCES, type HouseId, type Resource, type Resources } from "../types";
import { PRESTIGE_UNIT, clamp, valueOf, type Situation } from "./view";

export interface OfferPlan {
  give: Partial<Resources>;
  want: Partial<Resources>;
}

/**
 * Oferta pública que haría hoy el bot, o null si no le interesa comerciar.
 * Con `discount` (al volver a publicar una que nadie quiso) pide esa parte menos.
 */
export function proposeOffer(s: Situation, discount = 0): OfferPlan | null {
  const { view, p, values } = s;
  // Los menos comerciantes no ofrecen todos los días (salvo para rebajar la que ya tenían).
  const every = Math.max(1, Math.round(1 / Math.max(0.1, p.trade)));
  if (discount === 0 && (view.day + view.house) % every !== 0) return null;
  const byValue = [...RESOURCES].sort((a, b) => values[a] - values[b] || RESOURCES.indexOf(a) - RESOURCES.indexOf(b));
  const surplus = byValue.find((r) => spare(s, r) >= 25);
  const deficit = byValue[byValue.length - 1]!;
  if (!surplus || surplus === deficit || values[deficit] < values[surplus] * 1.5) return null;
  const give = clamp(Math.round(spare(s, surplus) * 0.3), 12, 40);
  const want = Math.max(10, Math.round(give * 0.8 * (1 - discount)));
  if (valueOf(values, { [deficit]: want }) <= valueOf(values, { [surplus]: give })) return null;
  return { give: { [surplus]: give }, want: { [deficit]: want } };
}

/** Lo que puede soltar de un recurso sin tocar el Pan del domingo. */
function spare(s: Situation, r: Resource): number {
  return s.view.resources[r] - (r === "pan" ? s.panReserve : 0);
}

/** ¿Le tiene rencor? No comercia con quien le ha atacado hace poco (los días de `ALLIANCE_BOTS.grudgeDays`). */
export function holdsGrudge(s: Situation, from: HouseId): boolean {
  return (s.view.attackedBy ?? []).includes(from);
}

/** Tratos con esa casa en los últimos 7 días. */
function tradesWith(s: Situation, house: HouseId): number {
  return (s.view.tradesWith ?? []).filter((h) => h === house).length;
}

/**
 * Cuánto gana el bot aceptando una oferta: recibe `give` y entrega `want`.
 * Positivo = la acepta.
 */
export function offerGain(s: Situation, give: Partial<Resources>, want: Partial<Resources>, from: HouseId): number {
  const { view, p, values } = s;
  if (holdsGrudge(s, from)) return -Infinity;
  const repeats = tradesWith(s, from);
  if (repeats >= BOT_TRADE.perPartnerWeek) return -Infinity;
  for (const [r, v] of Object.entries(want) as [Resource, number][]) {
    if (spare(s, r) < v) return -Infinity;
  }
  // Por muy buen socio que sea, no se deja timar: ha de recibir al menos `acceptFloor` de las unidades que da.
  if (totalOf(give) < totalOf(want) * BOT_TRADE.acceptFloor) return -Infinity;
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
  return gain - (1 - p.trade) * 3 - repeats * BOT_TRADE.repeatCost;
}

/**
 * Contraoferta a una oferta que no le conviene pero se queda cerca: lo que le
 * dan vale al menos `counterFloor` de lo que le piden. Pide lo mismo y entrega
 * menos de lo que le pedían, lo justo para que le salga a cuenta. Devuelve lo
 * que el bot da y pide, o null si acepta tal cual, está lejos o no le llega.
 */
export function counterOffer(s: Situation, give: Partial<Resources>, want: Partial<Resources>, from: HouseId): OfferPlan | null {
  if (holdsGrudge(s, from) || offerGain(s, give, want, from) > 0) return null;
  const got = valueOf(s.values, give);
  const paid = valueOf(s.values, want);
  if (got <= 0 || paid <= 0 || got < paid * BOT_TRADE.counterFloor) return null;
  for (let f = 1 - BOT_TRADE.counterStep; f >= BOT_TRADE.counterFloor - 1e-9; f -= BOT_TRADE.counterStep) {
    const less: Partial<Resources> = {};
    for (const [r, v] of Object.entries(want) as [Resource, number][]) {
      const n = Math.floor(v * f);
      if (n > 0) less[r] = n;
    }
    if (totalOf(less) === 0) return null;
    if (offerGain(s, give, less, from) > 0) return { give: less, want: { ...give } };
  }
  return null;
}

/**
 * ¿Retira su oferta pública? Si lleva `staleDays` días sin que nadie la quiera,
 * si ya no le llega o si ya no le compensa.
 */
export function withdrawOffer(s: Situation, give: Partial<Resources>, want: Partial<Resources>, ageDays: number): boolean {
  if (ageDays >= BOT_TRADE.staleDays) return true;
  for (const [r, v] of Object.entries(give) as [Resource, number][]) if (spare(s, r) < v) return true;
  return valueOf(s.values, want) <= valueOf(s.values, give);
}

const NAMES: Record<Resource, string> = { pan: "Pan", madera: "Madera", piedra: "Piedra", hierro: "Hierro", oro: "Oro" };

/** Nombre del recurso principal de un lote (el de más unidades). */
function mainResource(b: Partial<Resources>): string {
  const r = [...RESOURCES].sort((x, y) => (b[y] ?? 0) - (b[x] ?? 0))[0]!;
  return NAMES[r];
}

/**
 * Frase corta de la oferta de un bot (banco, sección 24): «oferta» la de cada
 * día, «rebaja» la que vuelve a publicar más barata y «contraoferta».
 * `pick` elige la variante (por ejemplo, la casa más el día).
 */
export function offerNote(kind: "oferta" | "rebaja" | "contraoferta", pick: number, plan: OfferPlan): string {
  return noticeText(`bot.${kind}`, pick, { da: mainResource(plan.give), pide: mainResource(plan.want) });
}
