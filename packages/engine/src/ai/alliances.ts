// Alianzas de los bots (bloque 8, `docs/alianzas.md`, fase 5). Con lo que vería
// una persona: el registro público de alianzas, el Prestigio de cada casa, sus
// fronteras y quién le ha atacado. Proponen, aceptan y rompen según su
// personalidad; las órdenes (`orders.ts`) ya no atacan a los aliados, se suman
// a sus ataques y sacan las tropas de paso.

import { allianceOf, alliesOf, inForce } from "../alliances";
import { areAdjacent } from "../map";
import { ALLIANCE, ALLIANCE_BOTS } from "../rules";
import type { HouseId } from "../types";
import type { Situation } from "./view";

export interface DiplomacyContext {
  /** Casas que le han propuesto una alianza y esperan respuesta. */
  received: HouseId[];
  /** Casas a las que ya ha propuesto y no han contestado. */
  sent: HouseId[];
  /** No puede firmar: rompió una alianza hace menos de `ALLIANCE.cooldownDays` días. */
  cooldown: boolean;
  /** Casas que ahora no pueden firmar (por lo mismo). */
  blocked: HouseId[];
  /** Casas que le han rechazado una propuesta hace poco (no insiste). */
  refused?: HouseId[];
}

export interface DiplomacyPlan {
  accept: HouseId[];
  decline: HouseId[];
  propose: HouseId | null;
  /** Alianzas que rompe (como mucho una al día). */
  break: HouseId[];
}

/** Ganas de aliarse según la personalidad: comerciar y la manía al líder suman; las ganas de guerra restan. */
export function allianceAppetite(s: Situation): number {
  const w = ALLIANCE_BOTS.weights;
  return w.trade * s.p.trade + w.leaderHatred * s.p.leaderHatred - w.houseBias * s.p.houseBias;
}

/** Comparte frontera con la casa: alguna casilla propia es vecina de una suya. */
function borders(s: Situation, house: HouseId): boolean {
  return s.own.some((o) => s.seen.some((t) => t.owner === house && areAdjacent(o, t)));
}

/** Tropas de la casa dentro de mis casillas (tropas de paso). */
function guestsInside(s: Situation, house: HouseId): number {
  return s.own.reduce((a, t) => a + (t.guests ?? []).filter((g) => g.house === house).reduce((b, g) => b + g.troops, 0), 0);
}

function prestigeOf(s: Situation, house: HouseId): number {
  return s.view.prestige.find((x) => x.house === house)?.total ?? 0;
}

/** Por qué rompería con una casa aliada (null si no). */
export function breakReason(s: Situation, ally: HouseId): "lider" | "frontera" | "tropas" | "traicion" | null {
  if (ally === s.leader && s.p.leaderHatred >= ALLIANCE_BOTS.leaderBreak) return "lider";
  if (guestsInside(s, ally) >= ALLIANCE.warnTroops * ALLIANCE_BOTS.guestsBreak) return "tropas";
  if (s.p.houseBias >= ALLIANCE_BOTS.betrayBias && prestigeOf(s, ally) > prestigeOf(s, s.view.house) && s.daysLeft > 3) return "traicion";
  if (!borders(s, ally)) return "frontera";
  return null;
}

export function planDiplomacy(s: Situation, ctx: DiplomacyContext): DiplomacyPlan {
  const plan: DiplomacyPlan = { accept: [], decline: [], propose: null, break: [] };
  if (!ALLIANCE.enabled) return { ...plan, decline: [...ctx.received] };
  const me = s.view.house;
  const list = inForce(s.view.alliances);
  const allies = alliesOf(list, me);
  const mine = list.filter((x) => x.a === me || x.b === me).length;
  const limit = Math.min(ALLIANCE_BOTS.maxAlliances, ALLIANCE.maxPerHouse ?? Infinity);
  const attackedBy = new Set(s.view.attackedBy ?? []);

  // Romper: la primera alianza en vigor que ya no le compensa.
  const broken = allies.find((a) => breakReason(s, a) != null);
  if (broken != null) plan.break.push(broken);

  let count = mine;
  // Aceptar: si quien propone no es el líder y no le ha atacado hace poco.
  for (const from of [...ctx.received].sort((a, b) => a - b)) {
    const ok =
      !ctx.cooldown &&
      !ctx.blocked.includes(from) &&
      !allianceOf(list, me, from) &&
      from !== s.leader &&
      !attackedBy.has(from) &&
      count < limit &&
      breakReason(s, from) == null;
    if (ok) {
      plan.accept.push(from);
      count++;
    } else plan.decline.push(from);
  }

  // Proponer: a una casa vecina que no sea el líder, si le apetece.
  if (!ctx.cooldown && plan.break.length === 0 && count + ctx.sent.length < limit && allianceAppetite(s) > ALLIANCE_BOTS.proposeAbove) {
    const houses = [...new Set(s.seen.map((t) => t.owner).filter((h): h is HouseId => h != null && h !== me))];
    const leader = s.leader;
    const candidate = houses
      .filter((h) => h !== leader && !allianceOf(list, me, h) && !ctx.sent.includes(h) && !ctx.received.includes(h) && !ctx.blocked.includes(h) && !(ctx.refused ?? []).includes(h))
      .filter((h) => !attackedBy.has(h) && borders(s, h) && breakReason(s, h) == null)
      // Antes quien también linda con el líder (un enemigo común) y, luego, el más débil.
      .sort((a, b) => {
        const ca = leader != null && s.seen.some((t) => t.owner === a && s.seen.some((o) => o.owner === leader && areAdjacent(o, t)));
        const cb = leader != null && s.seen.some((t) => t.owner === b && s.seen.some((o) => o.owner === leader && areAdjacent(o, t)));
        return Number(cb) - Number(ca) || prestigeOf(s, a) - prestigeOf(s, b) || a - b;
      })[0];
    if (candidate != null) plan.propose = candidate;
  }
  return plan;
}
