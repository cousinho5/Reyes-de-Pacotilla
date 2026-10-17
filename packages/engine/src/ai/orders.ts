// Órdenes de un bot para la próxima resolución:
// 1. Ataques: elige objetivos por valor y los ataca desde una casilla con
//    apoyos de las demás casillas vecinas (los apoyos no se mueven, no sufren
//    bajas y siguen defendiendo su casilla, así que casi siempre compensan).
// 2. Defensa: las tropas sobrantes refuerzan o apoyan las casillas amenazadas.
// 3. Avance: lo que queda en el interior se acerca a la frontera.

import { checkOrders, defenseMultiplier } from "../combat";
import { areAdjacent } from "../map";
import { marchKind } from "../terrain";
import { tilePrestige } from "../prestige";
import { OBJECTIVE_TARGETS, PRESTIGE, STRETCH_FREE_TILES, STRETCH_PAN, TILE_PRODUCTION, TROOP_COST } from "../rules";
import type { Order, Tile, TileId } from "../types";
import { PRESTIGE_UNIT, valueOf, type Situation } from "./view";

export interface Target {
  tile: Tile;
  /** Fuerza estimada que hay que superar. */
  defense: number;
  /** Fuerza que el bot quiere reunir (defensa x margen, estrictamente mayor). */
  need: number;
  /** Valor neto de tomarla, en recursos. */
  value: number;
  /** Casillas propias desde las que se puede atacar o apoyar. */
  from: Tile[];
  /** Casillas propias desde las que se llega por camino o por mar (sin apoyos). */
  reach: Tile[];
}

/** Casillas que se pueden atacar este turno, con su valor y la fuerza necesaria. */
export function targets(s: Situation): Target[] {
  const { view, p, seen, own } = s;
  const out: Target[] = [];
  const controlled = own.filter((t) => t.type !== "castillo").length;
  const troopValue = valueOf(s.values, TROOP_COST);
  const weeksLeft = s.daysLeft / 7;
  for (const t of seen) {
    if (t.owner === view.house || t.type === "castillo") continue;
    // La Paz del Rey: no se puede atacar a otras casas en esta resolución.
    if (view.combat?.peace && t.owner != null) continue;
    const from = own.filter((o) => areAdjacent(o, t));
    const reach = own.filter((o) => !areAdjacent(o, t) && marchKind(o, t, view.tiles, view.house) != null);
    if (from.length === 0 && reach.length === 0) continue;
    let defense = t.troops * defenseMultiplier(t, view.nextResolution, false, view.combat?.defenseBonus ?? 0);
    if (t.owner != null) {
      // Puede recibir apoyos de sus casillas vecinas.
      const helpers = seen.filter((o) => o.owner === t.owner && o.id !== t.id && areAdjacent(o, t));
      defense += helpers.reduce((a, o) => a + o.troops, 0) * 0.5 * p.caution;
    }
    // Con Tambores de guerra hace falta menos tropa para la misma fuerza.
    const need = Math.floor((defense * p.margin) / (1 + (view.attackBonus ?? 0) + (view.combat?.attackBonusAll ?? 0))) + 1;

    // Valor: Prestigio de la casilla + lo que produce el resto de la partida.
    let value = tilePrestige(t.type) * PRESTIGE_UNIT;
    value += valueOf(s.values, TILE_PRODUCTION[t.type]) * s.daysLeft * 0.5;
    value += objectiveBonus(s, t);
    if (t.owner != null) {
      // Quitarle una casilla a otra casa también le resta Prestigio a ella.
      value = (value + PRESTIGE.perTile * PRESTIGE_UNIT * 0.5) * p.houseBias;
      if (t.owner === s.leader) value += p.leaderHatred * 2 * PRESTIGE_UNIT;
    }
    // Estirarse cuesta Pan cada semana.
    if (controlled >= STRETCH_FREE_TILES) value -= STRETCH_PAN * weeksLeft * s.values.pan;
    // Bajas previstas: lo que se pierde al ganar por la mínima.
    value -= Math.max(1, defense) * 0.6 * troopValue;
    if (value > 0) out.push({ tile: t, defense, need, value, from, reach });
  }
  return out.sort((a, b) => b.value / b.need - a.value / a.need || a.tile.id - b.tile.id);
}

function objectiveBonus(s: Situation, t: Tile): number {
  const big = 4 * PRESTIGE_UNIT;
  const own = s.own;
  switch (s.view.objective) {
    case "fortaleza":
      return t.type === "fortaleza" && !own.some((o) => o.type === "fortaleza") ? big : 0;
    case "puerto_y_fortaleza":
      if (t.type === "fortaleza" && !own.some((o) => o.type === "fortaleza")) return big;
      return t.type === "puerto" && !own.some((o) => o.type === "puerto") ? big : 0;
    case "cinco_casillas":
      return own.filter((o) => o.type !== "castillo").length < OBJECTIVE_TARGETS.tiles ? big / 3 : 0;
    case "casillas_ajenas":
      return t.owner != null ? big / 2 : 0;
    default:
      return 0;
  }
}

/** Tropas que le faltan al bot para defenderse y para su mejor ataque. */
export function militaryNeed(s: Situation): number {
  let defense = 0;
  for (const t of s.own) {
    const danger = s.threat.get(t.id) ?? 0;
    const mult = defenseMultiplier(t, s.view.nextResolution, false);
    // Una casilla que haría falta defender con muchísimas tropas se da por perdida.
    const gap = Math.max(0, Math.ceil(danger / mult) - t.troops);
    if (t.type !== "castillo" && gap <= 12) defense += gap;
  }
  const best = targets(s)[0];
  let attack = 0;
  if (best) {
    const available = best.from.reduce((a, o) => a + Math.max(0, o.troops - (s.keep.get(o.id) ?? 0)), 0);
    attack = Math.max(0, best.need - available);
  }
  const troops = s.own.reduce((a, t) => a + t.troops, 0);
  // Además, cada personalidad quiere un ejército de base según lo que controla.
  const controlled = s.own.filter((t) => t.type !== "castillo").length;
  const baseline = Math.round(s.p.military * (8 + 3 * controlled)) - troops;
  const want = Math.max(Math.round((defense + attack) * s.p.military), baseline);
  // Nunca más tropas de las que puede alimentar.
  return Math.max(0, Math.min(Math.max(0, s.sustainableTroops - troops), want));
}

export function planOrders(s: Situation): Order[] {
  const { view, own } = s;
  const house = view.house;
  const free = new Map<TileId, number>(own.map((t) => [t.id, Math.max(0, t.troops - (s.keep.get(t.id) ?? 0))]));
  const orders: Order[] = [];

  // 1. Ataques con apoyos. Mueve las tropas libres de una casilla y apoya con
  // las de las demás vecinas: el apoyo no sale de su casilla, así que puede usar
  // también las tropas que se quedan de guardia.
  const moved = new Map<TileId, number>();
  const supportUsed = new Map<TileId, number>();
  const room = (t: Tile) => t.troops - (moved.get(t.id) ?? 0) - (supportUsed.get(t.id) ?? 0);
  for (const target of targets(s)) {
    const mains = [
      ...target.from.map((t) => {
        const f = free.get(t.id) ?? 0;
        // Si no tiene tropas libres, puede mandar un par de las de guardia como punta de lanza.
        const n = f > 0 ? f : Math.min(2, room(t) - 1);
        return { t, n, far: false };
      }),
      // Por camino o por mar solo van tropas libres, y sin apoyos.
      ...target.reach.map((t) => ({ t, n: Math.min(free.get(t.id) ?? 0, room(t)), far: true })),
    ]
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n || Number(a.far) - Number(b.far) || a.t.id - b.t.id);
    const main = mains[0];
    if (!main) continue;
    const helpers = (main.far ? [] : target.from)
      .filter((t) => t.id !== main.t.id)
      .map((t) => ({ t, n: room(t) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n || a.t.id - b.t.id);
    const strength = main.n + helpers.reduce((a, h) => a + h.n, 0);
    if (strength < target.need) continue;
    orders.push({ kind: "move", house, from: main.t.id, to: target.tile.id, troops: main.n });
    moved.set(main.t.id, (moved.get(main.t.id) ?? 0) + main.n);
    free.set(main.t.id, Math.max(0, (free.get(main.t.id) ?? 0) - main.n));
    // Solo los apoyos necesarios, empezando por los más grandes.
    let missing = target.need - main.n;
    for (const h of helpers) {
      if (missing <= 0) break;
      const n = Math.min(h.n, missing + 1);
      orders.push({ kind: "support", house, from: h.t.id, target: target.tile.id, supportedFrom: main.t.id, troops: n });
      supportUsed.set(h.t.id, (supportUsed.get(h.t.id) ?? 0) + n);
      // Lo que apoya ya no puede moverse a otro sitio.
      free.set(h.t.id, Math.max(0, Math.min(free.get(h.t.id) ?? 0, room(h.t))));
      missing -= n;
    }
  }

  // 2. Defensa: casillas amenazadas que no aguantan.
  const weak = own
    .filter((t) => t.type !== "castillo")
    .map((t) => ({ t, gap: (s.threat.get(t.id) ?? 0) - t.troops * defenseMultiplier(t, view.nextResolution, false) }))
    .filter((x) => x.gap > 0)
    .sort((a, b) => b.gap - a.gap || a.t.id - b.t.id);
  for (const { t, gap } of weak) {
    let missing = gap;
    for (const n of own.filter((o) => o.id !== t.id && areAdjacent(o, t)).sort((a, b) => a.id - b.id)) {
      if (missing <= 0) break;
      const avail = Math.min(free.get(n.id) ?? 0, room(n));
      if (avail <= 0) continue;
      // Si la vecina no corre peligro, mejor mover tropas (cuentan con la bonificación de defensa).
      const safe = (s.threat.get(n.id) ?? 0) === 0;
      const amount = Math.min(avail, Math.ceil(missing));
      if (safe) {
        orders.push({ kind: "move", house, from: n.id, to: t.id, troops: amount });
        moved.set(n.id, (moved.get(n.id) ?? 0) + amount);
        missing -= amount * defenseMultiplier(t, view.nextResolution, false);
      } else {
        orders.push({ kind: "support", house, from: n.id, target: t.id, supportedFrom: null, troops: amount });
        supportUsed.set(n.id, (supportUsed.get(n.id) ?? 0) + amount);
        missing -= amount;
      }
      free.set(n.id, avail - amount);
    }
  }

  // 3. Avance: las tropas libres del interior van hacia la frontera o la casilla más amenazada.
  const distance = frontierDistance(s);
  for (const t of own) {
    const n = Math.min(free.get(t.id) ?? 0, room(t));
    const d = distance.get(t.id);
    if (n <= 0 || d == null || d === 0) continue;
    // Por los caminos propios se avanza dos casillas en una noche.
    const step = own
      .filter((o) => (areAdjacent(o, t) || marchKind(t, o, view.tiles, house) === "camino") && (distance.get(o.id) ?? Infinity) < d)
      .sort((a, b) => (s.threat.get(b.id) ?? 0) - (s.threat.get(a.id) ?? 0) || distance.get(a.id)! - distance.get(b.id)! || a.id - b.id)[0];
    if (step) {
      orders.push({ kind: "move", house, from: t.id, to: step.id, troops: n });
      free.set(t.id, 0);
    }
  }

  // Por si acaso: nunca dar órdenes inválidas.
  return checkOrders(view.tiles, orders).valid;
}

/** Distancia (en casillas propias) a la frontera: casillas propias junto a algo atacable o amenazadas. */
function frontierDistance(s: Situation): Map<TileId, number> {
  const dist = new Map<TileId, number>();
  const border = (t: Tile) =>
    (s.threat.get(t.id) ?? 0) > 0 ||
    s.seen.some((o) => o.owner !== s.view.house && o.type !== "castillo" && areAdjacent(o, t));
  let queue = s.own.filter(border);
  for (const t of queue) dist.set(t.id, 0);
  for (let d = 1; queue.length > 0; d++) {
    const next: Tile[] = [];
    for (const t of queue) {
      for (const n of s.own) {
        if (!dist.has(n.id) && areAdjacent(n, t)) {
          dist.set(n.id, d);
          next.push(n);
        }
      }
    }
    queue = next;
  }
  return dist;
}
