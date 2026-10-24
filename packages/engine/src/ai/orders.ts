// Órdenes de un bot para la próxima resolución:
// 1. Ataques: elige objetivos por valor y los ataca desde una casilla con
//    apoyos de las demás casillas vecinas (los apoyos no se mueven, no sufren
//    bajas y siguen defendiendo su casilla, así que casi siempre compensan).
// 2. Defensa: las tropas sobrantes refuerzan o apoyan las casillas amenazadas.
// 3. Avance: lo que queda en el interior se acerca a la frontera.

import { checkOrders, defenseMultiplier, walled } from "../combat";
import { areAdjacent, riverBetween } from "../map";
import { bridgeBetween, marchKind } from "../terrain";
import { tilePrestige } from "../prestige";
import { ANY_ORIGIN, BATTLE_TWEAKS, CAPTAIN, FEATURES, OBJECTIVE_GOALS, PRESTIGE, SIEGE, STRETCH_FREE_TILES, STRETCH_PAN, TILE_PRODUCTION, TROOP_COST, RIVERS, UNITS } from "../rules";
import { isPlain, totalUnits, unitFields, unitsOf, type UnitKind, type Units } from "../units";
import { RESOURCES, type Order, type Tile, type TileId } from "../types";
import { exitDistance, guestStacks } from "../alliances";
import { PRESTIGE_UNIT, valueOf, type Situation } from "./view";
import { BOT_TWEAKS } from "./personality";

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
    // Ni lo propio ni lo de un aliado (bloque 8: no se puede atacar a un aliado, tampoco durante el aviso).
    if (s.friendly(t.owner) || t.type === "castillo" || t.type === "lago") continue;
    // La Paz del Rey: no se puede atacar a otras casas en esta resolución.
    if (view.combat?.peace && t.owner != null) continue;
    const from = own.filter((o) => areAdjacent(o, t));
    const reach = own.filter((o) => !areAdjacent(o, t) && marchKind(o, t, view.tiles, view.house, undefined, s.allies) != null);
    if (from.length === 0 && reach.length === 0) continue;
    // Las catapultas propias que pueden ir al ataque abren brecha en las murallas.
    const cats = UNITS.enabled ? [...from, ...reach].reduce((a, o) => a + unitsOf(o).catapultas, 0) : 0;
    // Río (bloque 1): si todos los ataques posibles lo cruzan sin puente, la defensa sube.
    const river =
      RIVERS.enabled && reach.length === 0 && from.every((o) => riverBetween(o, t) && !bridgeBetween(o, t, view.tiles)) ? RIVERS.defense : 0;
    // Las tropas de paso de los aliados del dueño también defienden (salvo las de mis aliados, que se quedan a un lado).
    const guests = (t.guests ?? []).filter((g) => !s.friendly(g.house)).reduce((a, g) => a + g.troops, 0);
    let defense =
      (t.troops + guests) *
      defenseMultiplier(t, view.nextResolution, false, (view.combat?.defenseBonus ?? 0) + river, cats * UNITS.catapultas.breach);
    if (t.owner != null) {
      // Puede recibir apoyos de sus casillas vecinas.
      const helpers = seen.filter((o) => o.owner === t.owner && o.id !== t.id && areAdjacent(o, t));
      defense += helpers.reduce((a, o) => a + o.troops, 0) * 0.5 * p.caution;
    }
    // Con Tambores de guerra hace falta menos tropa para la misma fuerza.
    const alone = Math.floor((defense * p.margin) / (1 + (view.attackBonus ?? 0) + (view.combat?.attackBonusAll ?? 0))) + 1;
    // Ataque conjunto (bloque 8): lo que ya mandan sus aliados a esa casilla cuenta.
    const allyHelp = (view.allyOrders ?? [])
      .filter((o) => o.kind === "move" && o.to === t.id && s.allies.includes(o.house))
      .reduce((a, o) => a + o.troops, 0);
    const need = Math.max(1, alone - allyHelp);

    // Valor: Prestigio de la casilla + lo que produce el resto de la partida.
    let value = tilePrestige(t.type) * PRESTIGE_UNIT;
    value += valueOf(s.values, TILE_PRODUCTION[t.type]) * s.daysLeft * 0.5;
    value += objectiveBonus(s, t);
    // Ruinas (bloque 1): un premio de unos pocos recursos o una carta; la Aldea, una base para reclutar en el frente.
    // Las ruinas, mejor pronto: la primera casa se lleva el premio.
    if (t.type === "ruinas") value += 2 * FEATURES.prize * (RESOURCES.reduce((a, r) => a + s.values[r], 0) / RESOURCES.length);
    if (t.type === "aldea") value += PRESTIGE_UNIT;
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
    case "puerto_y_montana":
      if (t.type === "montana" && !own.some((o) => o.type === "montana")) return big;
      return t.type === "puerto" && !own.some((o) => o.type === "puerto") ? big : 0;
    case "cinco_casillas":
      return own.filter((o) => o.type !== "castillo").length < s.goals.tiles ? big / 3 : 0;
    case "casillas_ajenas":
      return t.owner != null ? big / 2 : 0;
    default:
      return 0;
  }
}

/** Tropas que le faltan al bot para defenderse y para su mejor ataque. */
export function militaryNeed(s: Situation): number {
  const troops = s.own.reduce((a, t) => a + t.troops, 0);
  // Nunca más tropas de las que puede alimentar, salvo las que le faltan para su
  // ambición de las 40 tropas en los últimos días (ya no habrá muchos domingos que pagar).
  const need = Math.max(0, Math.min(Math.max(0, s.sustainableTroops - troops), militaryWant(s)));
  return Math.max(need, troopsGoal(s));
}

/** Tropas que le faltan para la ambición «tropas_40» si la partida acaba pronto (0 si no es la suya). */
export function troopsGoal(s: Situation): number {
  if (s.view.objective !== "tropas_40" || s.daysLeft > OBJECTIVE_GOALS.troopsDays) return 0;
  return Math.max(0, s.goals.troops - s.own.reduce((a, t) => a + t.troops, 0) - s.away);
}

/** Tropas que querría tener de más, sin mirar si puede alimentarlas. */
export function militaryWant(s: Situation): number {
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
  return Math.max(0, Math.round((defense + attack) * s.p.military), baseline);
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
    // Con apoyo libre, también se apoyan las marchas por camino o a la carga.
    const helpers = (main.far && !BATTLE_TWEAKS.supportAnyOrigin ? [] : target.from)
      .filter((t) => t.id !== main.t.id)
      .map((t) => ({ t, n: room(t) }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n || a.t.id - b.t.id);
    const strength =
      main.n + helpers.reduce((a, h) => a + h.n, 0) + (CAPTAIN.enabled && view.captainTile === main.t.id ? CAPTAIN.strength : 0);
    if (strength < target.need) continue;
    // El Capitán va con el primer ataque que sale de su casilla (suma fuerza, pero puede caer preso).
    const withCaptain = CAPTAIN.enabled && view.captainTile === main.t.id && !orders.some((o) => o.kind === "move" && o.captain);
    orders.push({ kind: "move", house, from: main.t.id, to: target.tile.id, troops: main.n, ...(withCaptain ? { captain: true } : {}) });
    moved.set(main.t.id, (moved.get(main.t.id) ?? 0) + main.n);
    free.set(main.t.id, Math.max(0, (free.get(main.t.id) ?? 0) - main.n));
    // Solo los apoyos necesarios, empezando por los más grandes.
    let missing = target.need - main.n;
    for (const h of helpers) {
      if (missing <= 0) break;
      const n = Math.min(h.n, missing + 1);
      const supportedFrom = BATTLE_TWEAKS.supportAnyOrigin ? ANY_ORIGIN : main.t.id;
      orders.push({ kind: "support", house, from: h.t.id, target: target.tile.id, supportedFrom, troops: n });
      supportUsed.set(h.t.id, (supportUsed.get(h.t.id) ?? 0) + n);
      // Lo que apoya ya no puede moverse a otro sitio.
      free.set(h.t.id, Math.max(0, Math.min(free.get(h.t.id) ?? 0, room(h.t))));
      missing -= n;
    }
  }

  // 1b. Asedios: las tropas se quedan en su casilla (y la defienden), así que
  // sitiar sale casi gratis. Castillos ajenos que se puedan rodear desde dos
  // casillas propias (dan Prestigio) y murallas que hoy no se pueden asaltar.
  if (SIEGE.enabled) {
    const attacked = new Set(orders.filter((o) => o.kind === "move").map((o) => (o as { to: TileId }).to));
    const besiege = (from: Tile, target: Tile) => {
      const n = room(from);
      if (n < SIEGE.minTroops) return false;
      orders.push({ kind: "siege", house, from: from.id, target: target.id, troops: n });
      supportUsed.set(from.id, (supportUsed.get(from.id) ?? 0) + n);
      free.set(from.id, 0);
      return true;
    };
    for (const c of s.seen.filter((t) => t.type === "castillo" && t.owner != null && t.owner !== house).sort((a, b) => a.id - b.id)) {
      const sides = own
        .filter((o) => o.type !== "castillo" && areAdjacent(o, c) && room(o) >= SIEGE.minTroops)
        .sort((a, b) => room(b) - room(a) || a.id - b.id);
      if (sides.length < SIEGE.castleSides) continue;
      for (const o of sides.slice(0, SIEGE.castleSides)) besiege(o, c);
    }
    for (const target of targets(s)) {
      if (attacked.has(target.tile.id) || !walled(target.tile, view.nextResolution)) continue;
      if (!SIEGE.fortifiedTargets && target.tile.type !== "fortaleza") continue;
      const from = target.from.filter((o) => room(o) >= SIEGE.minTroops).sort((a, b) => room(b) - room(a) || a.id - b.id)[0];
      if (from) besiege(from, target.tile);
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

  // 2b. Bloque 8: apoyar la defensa de las casillas de un aliado que corren peligro
  // (el apoyo no sale de su casilla, así que no deja la propia desguarnecida).
  for (const t of s.seen.filter((o) => o.owner != null && s.allies.includes(o.owner) && o.type !== "castillo").sort((a, b) => a.id - b.id)) {
    const danger =
      s.seen
        .filter((o) => areAdjacent(o, t) && o.owner != null && !s.friendly(o.owner) && !(t.owner != null && o.owner === t.owner))
        .reduce((a, o) => a + o.troops, 0) * s.p.caution;
    const held = (t.troops + (t.guests ?? []).reduce((a, g) => a + g.troops, 0)) * defenseMultiplier(t, view.nextResolution, false);
    let missing = danger - held;
    if (missing <= 0) continue;
    for (const n of own.filter((o) => areAdjacent(o, t)).sort((a, b) => a.id - b.id)) {
      if (missing <= 0) break;
      const avail = Math.min(free.get(n.id) ?? 0, room(n));
      if (avail <= 0) continue;
      const amount = Math.min(avail, Math.ceil(missing));
      orders.push({ kind: "support", house, from: n.id, target: t.id, supportedFrom: null, troops: amount });
      supportUsed.set(n.id, (supportUsed.get(n.id) ?? 0) + amount);
      free.set(n.id, avail - amount);
      missing -= amount;
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
      .filter((o) => (areAdjacent(o, t) || marchKind(t, o, view.tiles, house, undefined, s.allies) === "camino") && (distance.get(o.id) ?? Infinity) < d)
      .sort((a, b) => (s.threat.get(b.id) ?? 0) - (s.threat.get(a.id) ?? 0) || distance.get(a.id)! - distance.get(b.id)! || a.id - b.id)[0];
    if (step) {
      // Variante: el Capitán acompaña a las tropas que avanzan al frente.
      const withCaptain =
        CAPTAIN.enabled && BOT_TWEAKS.captain !== "ataques" && view.captainTile === t.id && !orders.some((o) => o.kind === "move" && o.captain);
      orders.push({ kind: "move", house, from: t.id, to: step.id, troops: n, ...(withCaptain ? { captain: true } : {}) });
      free.set(t.id, 0);
    }
  }

  // Variante: el Capitán va solo hacia la casilla del frente con más tropas.
  if (CAPTAIN.enabled && BATTLE_TWEAKS.captainAlone && BOT_TWEAKS.captain === "solo" && view.captainTile != null && !orders.some((o) => o.kind === "move" && o.captain)) {
    const here = own.find((t) => t.id === view.captainTile);
    const d = here ? distance.get(here.id) : undefined;
    if (here && d != null) {
      const front = own.filter((t) => distance.get(t.id) === 0 && t.type !== "castillo");
      const best = front.sort((a, b) => b.troops - a.troops || a.id - b.id)[0];
      if (best && best.id !== here.id) {
        const step = own
          .filter((o) => o.id !== here.id && marchKind(here, o, view.tiles, house) != null && (distance.get(o.id) ?? Infinity) <= d)
          .sort((a, b) => (distance.get(a.id) ?? 99) - (distance.get(b.id) ?? 99) || (a.id === best.id ? -1 : b.id === best.id ? 1 : 0) || b.troops - a.troops || a.id - b.id)[0];
        if (step) orders.push({ kind: "move", house, from: here.id, to: step.id, troops: 0, captain: true });
      }
    }
  }

  // Bloque 8: las tropas de paso vuelven a casa (por una casilla propia vecina o
  // acercándose por las del aliado). Mientras tanto, defienden donde están.
  const home: Order[] = [];
  for (const { tile, guest } of guestStacks(view.tiles, house)) {
    const near = view.tiles
      .filter((o) => areAdjacent(o, tile) && o.type !== "lago")
      .filter((o) => o.owner === house || (o.owner === tile.owner && o.type !== "castillo"))
      .filter((o) => o.owner === house || exitDistance(view.tiles, house, o) < exitDistance(view.tiles, house, tile))
      .sort((a, b) => Number(b.owner === house) - Number(a.owner === house) || exitDistance(view.tiles, house, a) - exitDistance(view.tiles, house, b) || a.id - b.id)[0];
    if (!near) continue;
    const go: Order = { kind: "move", house, from: tile.id, to: near.id, troops: guest.troops, guest: true };
    if (guest.jinetes) go.jinetes = guest.jinetes;
    if (guest.catapultas) go.catapultas = guest.catapultas;
    if (CAPTAIN.enabled && view.captainTile === tile.id && !orders.some((o) => o.kind === "move" && o.captain)) go.captain = true;
    home.push(go);
  }

  // Por si acaso: nunca dar órdenes inválidas.
  return checkOrders(view.tiles, [...assignUnits(orders, s), ...home], view.nextResolution, view.alliances).valid;
}

/**
 * Elige qué tropas van en cada orden: los jinetes cargan contra lo llano sin
 * murallas, la Mesnada va al bosque y a la montaña (los jinetes no suben) y
 * las catapultas acompañan los ataques contra murallas y los avances.
 */
function assignUnits(orders: Order[], s: Situation): Order[] {
  if (!UNITS.enabled) return orders;
  const byId = new Map(s.view.tiles.map((t) => [t.id, t]));
  const pool = new Map<TileId, Units>(s.own.map((t) => [t.id, unitsOf(t)]));
  const res = s.view.nextResolution;
  const out: Order[] = [];
  const take = (from: TileId, kind: UnitKind, n: number) => {
    const u = pool.get(from)!;
    const k = Math.min(u[kind], n);
    u[kind] -= k;
    return k;
  };
  // Primero los ataques (lo más importante), luego apoyos y el resto.
  const ranked = orders
    .map((o, i) => ({ o, i, rank: o.kind === "move" && byId.get(o.to)?.owner !== s.view.house ? 0 : o.kind === "support" ? 1 : 2 }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i);
  for (const { o } of ranked) {
    if (!pool.has(o.from)) continue;
    if (o.kind === "move" && o.troops === 0 && o.captain) {
      out.push(o);
      continue;
    }
    const dest = byId.get(o.kind === "move" ? o.to : o.target)!;
    const hostile = o.kind === "move" && dest.owner !== s.view.house;
    const charge = hostile && isPlain(dest.type) && !walled(dest, res);
    const order: UnitKind[] =
      o.kind === "move" && dest.type === "montana"
        ? ["mesnada"]
        : charge || (o.kind === "move" && !hostile && dest.type !== "bosque")
          ? ["jinetes", "mesnada"]
          : ["mesnada", "jinetes"];
    const u: Units = { mesnada: 0, jinetes: 0, catapultas: 0 };
    let left = o.troops;
    for (const kind of order) {
      const k = take(o.from, kind, left);
      u[kind] += k;
      left -= k;
    }
    // Catapultas: con los ataques a casillas con murallas y con los avances (no a la montaña).
    if (o.kind === "move" && dest.type !== "montana" && (!hostile || walled(dest, res))) {
      u.catapultas += take(o.from, "catapultas", Infinity);
    }
    if (totalUnits(u) === 0) continue;
    out.push({ ...o, ...unitFields(u) } as Order);
  }
  return out;
}

/** Distancia (en casillas propias) a la frontera: casillas propias junto a algo atacable o amenazadas. */
function frontierDistance(s: Situation): Map<TileId, number> {
  const dist = new Map<TileId, number>();
  const border = (t: Tile) =>
    (s.threat.get(t.id) ?? 0) > 0 ||
    s.seen.some((o) => o.owner !== s.view.house && o.type !== "castillo" && o.type !== "lago" && areAdjacent(o, t));
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
