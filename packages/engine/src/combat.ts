// Resolución de la campaña (movimientos y combates). Función pura y
// determinista: el mismo estado y las mismas órdenes dan siempre el mismo
// resultado. La usan el servidor (resolución real) y el botón Simular.
//
// Reglas (documento de diseño v2, sección 8):
// - Fuerza de ataque = tropas que atacan + tropas que lo apoyan.
// - Fuerza de defensa = tropas que defienden x bonificación + apoyos a la defensa.
// - Gana quien supera estrictamente a los demás. Si el defensor empata en
//   cabeza, gana el defensor. Si empatan dos atacantes, nadie entra (rebote).
// - El ganador conserva tropas x (1 - segunda fuerza / su fuerza), redondeando
//   hacia arriba y con un mínimo de 1.
// - Un atacante que falla se repliega a su origen con la mitad (hacia abajo).
//   Si su origen ya no es suyo, esas tropas se pierden.
// - Un defensor que pierde pierde todas sus tropas y la casilla.
// - Los apoyos nunca sufren bajas. Un ataque a la casilla de quien apoya corta
//   el apoyo, salvo que venga de la casilla contra la que se apoya.
// - Dos grupos que se cambian de casilla chocan a medio camino sin
//   bonificación; el ganador sigue y el perdedor se repliega.

import { ANY_ORIGIN, BATTLE_TWEAKS, CAPTAIN, DEFENSE_BONUS, GLORY, RIVERS, SIEGE, UNITS } from "./rules";
import {
  addUnits,
  canEnter,
  isPlain,
  keepUnits,
  orderUnits,
  rawStrength,
  retreatUnits,
  setUnits,
  subUnits,
  totalUnits,
  unitsOf,
  type Units,
} from "./units";
import { areAdjacent } from "./map";
import { crossesRiver, crossingPoint, marchKind, marchPath, terrainDefense } from "./terrain";
import type {
  CampaignEvent,
  CampaignInput,
  Captain,
  CampaignResult,
  HouseId,
  MoveOrder,
  Order,
  SiegeOrder,
  SupportOrder,
  Tile,
  TileId,
} from "./types";

const EPS = 1e-9;

interface Move {
  house: HouseId;
  from: TileId;
  to: TileId;
  troops: number;
  units: Units;
  failed: boolean;
  /** El Capitán de la casa va con este grupo. */
  captain?: boolean;
}

/** La casilla tiene murallas: fortificada o fortaleza (ahí no cargan los jinetes). */
export function walled(tile: Tile, resolution: number): boolean {
  return tile.type === "fortaleza" || (tile.fortifiedUntil != null && tile.fortifiedUntil >= resolution);
}

/**
 * Multiplicador de defensa. `breach`: lo que las catapultas del atacante quitan
 * al bono de fortificación y de fortaleza (nunca a lo demás).
 */
export function defenseMultiplier(tile: Tile, resolution: number, absent: boolean, extra = 0, breach = 0): number {
  let bonus = DEFENSE_BONUS.base + extra;
  let walls = 0;
  if (tile.fortifiedUntil != null && tile.fortifiedUntil >= resolution) walls += DEFENSE_BONUS.fortified;
  if (tile.type === "fortaleza") walls += DEFENSE_BONUS.fortress;
  bonus += Math.max(0, walls - breach);
  // Terreno (diseño v3): bosque y cantera +25%, montaña +50%.
  bonus += terrainDefense(tile.type);
  if (absent) bonus += DEFENSE_BONUS.absent;
  return 1 + Math.min(bonus, DEFENSE_BONUS.max);
}

/** Tropas que conserva el ganador tras vencer con fuerza `own` a una fuerza `rival`. */
export function survivors(troops: number, own: number, rival: number): number {
  if (troops <= 0) return 0;
  if (rival <= EPS) return troops;
  return Math.max(1, Math.ceil(troops * (1 - rival / own) - EPS));
}

export function resolveCampaign(input: CampaignInput): CampaignResult {
  const { resolution } = input;
  const tiles = new Map<TileId, Tile>(input.tiles.map((t) => [t.id, { ...t }]));
  // Composición de cada casilla (Mesnada, Jinetes, Catapultas); al final se escribe en la casilla.
  const comp = new Map<TileId, Units>(input.tiles.map((t) => [t.id, unitsOf(t)]));
  const setComp = (id: TileId, u: Units) => {
    comp.set(id, u);
    tiles.get(id)!.troops = totalUnits(u);
  };
  const absent = new Set(input.absentHouses ?? []);
  const events: CampaignEvent[] = [];

  // Capitanes: los presos que cumplen su plazo se escapan a su castillo.
  const captains: Captain[] = (input.captains ?? []).map((c) => ({ ...c }));
  const capOf = new Map(captains.map((c) => [c.house, c]));
  const castleOf = (house: HouseId) => input.tiles.find((t) => t.castleOf === house)?.id ?? null;
  for (const c of captains) {
    if (c.tile == null && c.freeAt != null && c.freeAt <= resolution) {
      c.tile = castleOf(c.house);
      c.capturedBy = null;
      c.freeAt = null;
      events.push({ type: "capitan_libre", house: c.house, reason: "fuga" });
    }
  }
  const capture = (house: HouseId, by: HouseId | null, tile: TileId) => {
    const c = capOf.get(house);
    if (!c) return;
    if (by == null) {
      // Contra una guarnición neutral no hay a quién rendirse: vuelve al castillo.
      c.tile = castleOf(house);
      events.push({ type: "capitan_libre", house, reason: "huida" });
      return;
    }
    c.tile = null;
    c.capturedBy = by;
    c.freeAt = resolution + CAPTAIN.escapeAfter;
    events.push({ type: "capitan_preso", house, by, tile, freeAt: c.freeAt });
  };
  /** Capitán que defiende una casilla: el de su dueño, si está allí y no se ha ido. */
  const defenderCaptain = (tileId: TileId, owner: HouseId | null) => {
    if (!CAPTAIN.enabled || owner == null) return false;
    const c = capOf.get(owner);
    return !!c && c.tile === tileId && !moves.some((m) => m.captain && m.house === owner);
  };

  // 1. Validar órdenes y repartir las tropas de cada casilla.
  const moves: Move[] = [];
  const supports: SupportOrder[] = [];
  const sieges: SiegeOrder[] = [];
  const checked = checkOrders(input.tiles, input.orders, resolution);
  for (const { order, reason } of checked.invalid) events.push({ type: "orden_invalida", order, reason });
  // Tregua: los ataques contra esas casillas no salen (las tropas se quedan donde estaban).
  // La Paz del Rey hace lo mismo con todos los ataques a casillas de otras casas.
  const truce = new Set(input.truceTiles ?? []);
  const stopped = new Map<TileId, Set<HouseId>>();
  const peaceStopped = new Map<TileId, Set<HouseId>>();
  for (const order of checked.valid) {
    const target = order.kind === "move" ? tiles.get(order.to)! : null;
    if (order.kind === "move" && truce.has(order.to) && target!.owner !== order.house) {
      stopped.set(order.to, (stopped.get(order.to) ?? new Set()).add(order.house));
      continue;
    }
    if (order.kind === "move" && input.peace && target!.owner != null && target!.owner !== order.house) {
      peaceStopped.set(order.to, (peaceStopped.get(order.to) ?? new Set()).add(order.house));
      continue;
    }
    if (order.kind === "move") {
      // Varias órdenes iguales de la misma casa se agrupan.
      const same = moves.find((m) => m.house === order.house && m.from === order.from && m.to === order.to);
      const u = orderUnits(order);
      // El Capitán solo va si está en la casilla de salida (y con un único grupo).
      const withCaptain =
        CAPTAIN.enabled && !!order.captain && capOf.get(order.house)?.tile === order.from && !moves.some((m) => m.captain && m.house === order.house);
      // El Capitán solo (bloque 4): si ya no está en la casilla de salida, no sale nadie.
      if (order.troops === 0 && !withCaptain) continue;
      if (same) {
        same.troops += order.troops;
        same.units = addUnits(same.units, u);
        if (withCaptain) same.captain = true;
      } else
        moves.push({ house: order.house, from: order.from, to: order.to, troops: order.troops, units: u, failed: false, captain: withCaptain });
    } else if (order.kind === "siege") {
      sieges.push(order);
    } else {
      supports.push(order);
    }
  }

  for (const [tile, houses] of [...stopped.entries()].sort((a, b) => a[0] - b[0])) {
    events.push({ type: "tregua", tile, houses: [...houses].sort((a, b) => a - b) });
  }
  for (const [tile, houses] of [...peaceStopped.entries()].sort((a, b) => a[0] - b[0])) {
    events.push({ type: "paz", tile, houses: [...houses].sort((a, b) => a - b) });
  }

  // 2. Las tropas que salen dejan su casilla (si fallan, vuelven al final).
  for (const m of moves) setComp(m.from, subUnits(comp.get(m.from)!, m.units));

  // 3. Apoyos cortados.
  const activeSupports = supports.filter((s) => {
    const cut = moves.some((m) => m.to === s.from && m.house !== s.house && m.from !== s.target);
    if (cut) events.push({ type: "apoyo_cortado", house: s.house, from: s.from, target: s.target });
    return !cut;
  });

  // Con BATTLE_TWEAKS.supportAnyOrigin, un apoyo con origen ANY_ORIGIN suma una
  // sola vez a la casa que apoya: al primero de sus ataques que siga en pie.
  const attackSupport = (m: Move) =>
    activeSupports.filter((s) => {
      if (s.target !== m.to || isOwnTileAgainst(s, m, tiles)) return false;
      if (s.supportedFrom === m.from) return true;
      if (!BATTLE_TWEAKS.supportAnyOrigin || s.supportedFrom !== ANY_ORIGIN || s.house !== m.house) return false;
      return moves.find((x) => x.house === m.house && x.to === m.to && !x.failed) === m;
    });
  // Tambores de guerra: la fuerza de los ataques de esa casa sube un porcentaje.
  // Los jinetes cargan (fuerza 2) contra una casilla llana sin murallas.
  const attackStrength = (m: Move) => {
    const target = tiles.get(m.to)!;
    const charge = isPlain(target.type) && !walled(target, resolution);
    const own = rawStrength(m.units, target, { charge }) + (m.captain ? CAPTAIN.strength : 0);
    const helped = sum(attackSupport(m).map((s) => rawStrength(orderUnits(s), target)));
    return (own + helped) * (1 + (input.attackBonus?.[m.house] ?? 0) + (input.attackBonusAll ?? 0));
  };
  // En un choque frontal no hay terreno: cada tropa vale lo suyo sin cargas.
  const clashStrength = (m: Move) =>
    (rawStrength(m.units, { type: "campos" }) + (m.captain ? CAPTAIN.strength : 0)) *
    (1 + (input.attackBonus?.[m.house] ?? 0) + (input.attackBonusAll ?? 0));

  // 4. Choques frontales: dos casas que se cambian de casilla. Con
  // BATTLE_TWEAKS.crossingClash, también las que se cruzan por el camino: una
  // marcha de dos casillas que recorre al revés un tramo de la otra.
  const paths = new Map<Move, TileId[]>(
    moves.map((m) => [m, marchPath(input.tiles.find((t) => t.id === m.from)!, input.tiles.find((t) => t.id === m.to)!, input.tiles, m.house, m.units).map((t) => t.id)]),
  );
  const crossing = (a: Move, b: Move) => crossingPoint(paths.get(a)!, paths.get(b)!);
  for (const a of moves) {
    for (const b of moves) {
      if (a === b || a.failed || b.failed || a.house === b.house) continue;
      const swap = a.from === b.to && a.to === b.from;
      const via = swap || !BATTLE_TWEAKS.crossingClash ? null : crossing(a, b);
      if (swap ? a.from > b.from : !(via != null && moves.indexOf(a) < moves.indexOf(b))) continue;
      const sa = clashStrength(a);
      const sb = clashStrength(b);
      let winner: HouseId | null = null;
      if (Math.abs(sa - sb) <= EPS) {
        a.failed = true;
        b.failed = true;
      } else if (sa > sb) {
        a.units = keepUnits(a.units, survivors(a.troops, sa, sb));
        a.troops = totalUnits(a.units);
        b.failed = true;
        winner = a.house;
        if (b.captain) {
          capture(b.house, a.house, b.from);
          b.captain = false;
        }
      } else {
        b.units = keepUnits(b.units, survivors(b.troops, sb, sa));
        b.troops = totalUnits(b.units);
        a.failed = true;
        winner = b.house;
        if (a.captain) {
          capture(a.house, b.house, a.from);
          a.captain = false;
        }
      }
      events.push({
        type: "choque_frontal",
        tiles: [a.from, b.from],
        ...(via != null ? { via } : {}),
        winner,
        sides: [
          { house: a.house, strength: sa },
          { house: b.house, strength: sb },
        ],
      });
    }
  }

  // 5. Resolver cada casilla de destino, en orden de id para ser deterministas.
  const destinations = [...new Set(moves.filter((m) => !m.failed).map((m) => m.to))].sort((x, y) => x - y);
  for (const tileId of destinations) {
    const tile = tiles.get(tileId)!;
    const incoming = moves.filter((m) => m.to === tileId && !m.failed);
    const owner = tile.owner;

    // Refuerzos propios: llegan siempre y se suman a la defensa.
    const reinforcements = incoming.filter((m) => owner !== null && m.house === owner);
    const hostile = incoming.filter((m) => !(owner !== null && m.house === owner));
    const defUnits = reinforcements.reduce((u, m) => addUnits(u, m.units), comp.get(tileId)!);
    const defTroops = totalUnits(defUnits);
    for (const r of reinforcements) {
      events.push({ type: "movimiento", house: r.house, from: r.from, to: r.to, troops: r.troops });
    }

    // El Capitán que llega con refuerzos se queda en la casilla.
    for (const r of reinforcements) if (r.captain) capOf.get(r.house)!.tile = tileId;

    if (hostile.length === 0) {
      setComp(tileId, defUnits);
      continue;
    }

    const defSupports = activeSupports.filter(
      (s) => s.target === tileId && s.supportedFrom === null && !hostile.some((m) => m.house === s.house),
    );
    // Las catapultas de los atacantes abren brecha en las murallas, y cada noche
    // de asedio las debilita un poco más.
    const breach =
      (UNITS.enabled ? sum(hostile.map((m) => m.units.catapultas)) * UNITS.catapultas.breach : 0) +
      (tile.besiegedBy != null ? (tile.siegeNights ?? 0) * SIEGE.wallsPerNight : 0);
    const defCaptain = defenderCaptain(tileId, owner);
    const defStrength =
      (rawStrength(defUnits, tile) + (defCaptain ? CAPTAIN.strength : 0)) *
        defenseMultiplier(tile, resolution, owner !== null && absent.has(owner), input.defenseBonus ?? 0, breach) +
      sum(defSupports.map((s) => rawStrength(orderUnits(s), tile)));

    // Ríos (bloque 1): quien entra cruzando un río sin puente lucha contra una
    // defensa con RIVERS.defense más (el tope x2 sigue). Cada grupo cuenta lo
    // suyo: es como dividir su fuerza por lo que sube la defensa.
    const absentOwner = owner !== null && absent.has(owner);
    const plainMult = defenseMultiplier(tile, resolution, absentOwner, input.defenseBonus ?? 0, breach);
    const riverMult = defenseMultiplier(tile, resolution, absentOwner, (input.defenseBonus ?? 0) + RIVERS.defense, breach);
    const tileById = new Map(input.tiles.map((t) => [t.id, t]));
    const crossing = (m: Move) => crossesRiver(paths.get(m)!.map((id) => tileById.get(id)!), input.tiles);
    const riverFactor = (m: Move) => (crossing(m) ? plainMult / riverMult : 1);

    // Agrupar los ataques por casa.
    const byHouse = new Map<HouseId, Move[]>();
    for (const m of hostile) byHouse.set(m.house, [...(byHouse.get(m.house) ?? []), m]);
    const attackers = [...byHouse.entries()].map(([house, ms]) => ({
      house,
      moves: ms,
      units: ms.reduce((u, m) => addUnits(u, m.units), { mesnada: 0, jinetes: 0, catapultas: 0 } as Units),
      troops: sum(ms.map((m) => m.troops)),
      strength: sum(ms.map((m) => attackStrength(m) * riverFactor(m))),
      supporters: unique(ms.flatMap((m) => attackSupport(m).map((s) => s.house))),
      river: ms.some(crossing),
    }));

    const top = Math.max(defStrength, ...attackers.map((a) => a.strength));
    const defenderOnTop = Math.abs(defStrength - top) <= EPS;
    const topAttackers = attackers.filter((a) => Math.abs(a.strength - top) <= EPS);

    const sides = [
      {
        house: owner,
        role: "defensa" as const,
        strength: defStrength,
        troops: defTroops,
        supporters: unique(defSupports.map((s) => s.house)),
      },
      ...attackers.map((a) => ({
        house: a.house as HouseId | null,
        role: "ataque" as const,
        strength: a.strength,
        troops: a.troops,
        supporters: a.supporters,
        from: unique(a.moves.map((m) => m.from)),
        ...(a.river ? { river: true } : {}),
      })),
    ];

    // Con BATTLE_TWEAKS.fortifyUntilAttacked, el ataque gasta la fortificación.
    if (BATTLE_TWEAKS.fortifyUntilAttacked) tile.fortifiedUntil = null;

    if (defenderOnTop) {
      // Gana el defensor (también en empate).
      const rival = Math.max(...attackers.map((a) => a.strength));
      setComp(tileId, keepUnits(defUnits, survivors(defTroops, defStrength, rival)));
      for (const a of attackers) a.moves.forEach((m) => (m.failed = true));
      // Los Capitanes que atacaban caen presos (o huyen, si defendía una guarnición neutral).
      for (const m of hostile.filter((x) => x.captain)) {
        capture(m.house, owner, tileId);
        m.captain = false;
      }
      events.push({
        type: "combate",
        tile: tileId,
        winner: owner,
        previousOwner: owner,
        conquered: false,
        survivors: tile.troops,
        sides,
      });
    } else if (topAttackers.length > 1) {
      // Rebote: nadie entra y el defensor no sufre bajas.
      setComp(tileId, defUnits);
      for (const a of attackers) a.moves.forEach((m) => (m.failed = true));
      events.push({ type: "rebote", tile: tileId, houses: topAttackers.map((a) => a.house), strength: top });
    } else {
      const winner = topAttackers[0]!;
      const rival = Math.max(defStrength, ...attackers.filter((a) => a !== winner).map((a) => a.strength));
      const kept = survivors(winner.troops, winner.strength, rival);
      for (const a of attackers) if (a !== winner) a.moves.forEach((m) => (m.failed = true));
      events.push({
        type: "combate",
        tile: tileId,
        winner: winner.house,
        previousOwner: owner,
        conquered: true,
        survivors: kept,
        sides,
      });
      // El Capitán del defensor y los de los demás atacantes caen presos del vencedor.
      if (defCaptain) capture(owner!, winner.house, tileId);
      for (const m of hostile.filter((x) => x.captain && x.house !== winner.house)) {
        capture(m.house, winner.house, tileId);
        m.captain = false;
      }
      for (const m of winner.moves) if (m.captain) capOf.get(m.house)!.tile = tileId;
      tile.owner = winner.house;
      setComp(tileId, keepUnits(winner.units, kept));
      tile.fortifiedUntil = null;
    }
  }

  // 6. Repliegues: la mitad de las tropas vuelve a su origen, si sigue siendo suyo.
  for (const m of moves) {
    if (!m.failed) continue;
    // Vuelve la mitad de la Mesnada y de los Jinetes; las Catapultas se pierden.
    const backUnits = retreatUnits(m.units);
    const back = totalUnits(backUnits);
    const origin = tiles.get(m.from)!;
    const arrived = origin.owner === m.house;
    if (arrived) setComp(m.from, addUnits(comp.get(m.from)!, backUnits));
    // El Capitán vuelve con los suyos (o a su castillo, si su casilla se perdió).
    if (m.captain) capOf.get(m.house)!.tile = arrived ? m.from : castleOf(m.house);
    events.push({ type: "repliegue", house: m.house, from: m.to, to: m.from, troops: back, arrived });
  }

  // 7. Asedios: siguen si quien sitia conserva su casilla y nadie la ha atacado.
  resolveSieges(input.tiles, tiles, sieges, moves, events);

  // 8. Un Capitán que se queda en una casilla que ha cambiado de manos sin luchar
  // (por ejemplo, si salieron todas sus tropas y otro entró) cae preso igualmente:
  // ya se resolvió arriba cuando hubo combate; aquí solo se cubre el caso sin combate.
  for (const c of captains) {
    if (c.tile == null) continue;
    const t = tiles.get(c.tile);
    if (t && t.owner !== c.house && t.owner != null) capture(c.house, t.owner, t.id);
  }

  return {
    tiles: input.tiles.map((t) => setUnits(tiles.get(t.id)!, comp.get(t.id)!)),
    events,
    captains,
  };
}

/**
 * Gloria de una resolución (diseño v3): +1 por cada batalla ganada a otra casa
 * (atacando o defendiendo) y +1 a quien pierde defendiendo contra el doble de
 * fuerza o más ("cayó con honor"). Las batallas contra neutrales no cuentan.
 */
export function gloryFromEvents(events: CampaignEvent[]): Map<HouseId, number> {
  const out = new Map<HouseId, number>();
  if (!GLORY.enabled) return out;
  const add = (h: HouseId, n: number) => out.set(h, (out.get(h) ?? 0) + n);
  for (const e of events) {
    if (e.type === "choque_frontal" && e.winner != null) add(e.winner, GLORY.perVictory);
    if (e.type !== "combate" || e.winner == null) continue;
    const rivals = e.sides.filter((s) => s.house != null && s.house !== e.winner);
    if (rivals.length === 0) continue;
    add(e.winner, GLORY.perVictory);
    const def = e.sides.find((s) => s.role === "defensa");
    const top = Math.max(...e.sides.filter((s) => s.house === e.winner).map((s) => s.strength));
    if (e.conquered && def && def.house != null && def.strength * 2 <= top) add(def.house, GLORY.honor);
  }
  return out;
}

/**
 * Separa las órdenes válidas de las inválidas, con el motivo. Una casilla no
 * puede comprometer más tropas de las que tiene (se aceptan en orden).
 */
export function checkOrders(
  tileList: Tile[],
  orders: Order[],
  /** Resolución que se va a ejecutar (para saber qué casillas siguen fortificadas). */
  resolution?: number,
): { valid: Order[]; invalid: { order: Order; reason: string }[] } {
  const tiles = new Map<TileId, Tile>(tileList.map((t) => [t.id, t]));
  const committed = new Map<TileId, Units>();
  const valid: Order[] = [];
  const invalid: { order: Order; reason: string }[] = [];
  for (const order of orders) {
    const reason = validate(order, tiles, resolution);
    if (reason) {
      invalid.push({ order, reason });
      continue;
    }
    const from = tiles.get(order.from)!;
    const used = addUnits(committed.get(order.from) ?? { mesnada: 0, jinetes: 0, catapultas: 0 }, orderUnits(order));
    const have = unitsOf(from);
    if (used.mesnada > have.mesnada || used.jinetes > have.jinetes || used.catapultas > have.catapultas) {
      invalid.push({ order, reason: "no hay tropas suficientes en la casilla" });
      continue;
    }
    committed.set(order.from, used);
    valid.push(order);
  }
  return { valid, invalid };
}

/**
 * Asedios de la noche. Un asedio se corta si atacan la casilla desde la que se
 * sitia (aunque el ataque fracase) o si se pierde. Una casilla sigue sitiada
 * mientras alguien la siga rodeando; un castillo, solo si lo rodean desde
 * SIEGE.castleSides casillas de la misma casa. Si la casilla cambia de manos,
 * el asedio se acaba.
 */
function resolveSieges(
  before: Tile[],
  tiles: Map<TileId, Tile>,
  sieges: SiegeOrder[],
  moves: Move[],
  events: CampaignEvent[],
): void {
  if (!SIEGE.enabled) return;
  const active: SiegeOrder[] = [];
  for (const s of sieges) {
    const from = tiles.get(s.from)!;
    const attacked = moves.some((m) => m.to === s.from && m.house !== s.house);
    if (from.owner !== s.house || attacked) {
      events.push({ type: "asedio_roto", house: s.house, tile: s.target, reason: "cortado" });
      continue;
    }
    active.push(s);
  }
  const ids = new Set<TileId>([...before.filter((t) => t.besiegedBy != null).map((t) => t.id), ...sieges.map((s) => s.target)]);
  for (const id of [...ids].sort((a, b) => a - b)) {
    const old = before.find((t) => t.id === id)!;
    const tile = tiles.get(id)!;
    const prev = old.besiegedBy ?? null;
    if (tile.owner !== old.owner) {
      if (prev != null) events.push({ type: "asedio_roto", house: prev, tile: id, reason: "tomada" });
      tile.besiegedBy = null;
      tile.siegeNights = 0;
      continue;
    }
    const castle = tile.type === "castillo";
    const byHouse = new Map<HouseId, SiegeOrder[]>();
    for (const s of active.filter((x) => x.target === id && x.house !== tile.owner)) {
      byHouse.set(s.house, [...(byHouse.get(s.house) ?? []), s]);
    }
    const eligible = [...byHouse.entries()]
      .filter(([, ss]) => !castle || new Set(ss.map((x) => x.from)).size >= SIEGE.castleSides)
      .map(([house, ss]) => ({ house, ss, troops: sum(ss.map((x) => x.troops)) }))
      .sort((a, b) => Number(b.house === prev) - Number(a.house === prev) || b.troops - a.troops || a.house - b.house);
    const winner = eligible[0];
    if (!winner) {
      if (prev != null && !events.some((e) => e.type === "asedio_roto" && e.tile === id && e.house === prev)) {
        events.push({ type: "asedio_roto", house: prev, tile: id, reason: "levantado" });
      }
      tile.besiegedBy = null;
      tile.siegeNights = 0;
      continue;
    }
    const nights = winner.house === prev ? (old.siegeNights ?? 0) + 1 : 1;
    tile.besiegedBy = winner.house;
    tile.siegeNights = nights;
    events.push({
      type: "asedio",
      house: winner.house,
      tile: id,
      nights,
      castle,
      from: unique(winner.ss.map((x) => x.from)).sort((a, b) => a - b),
    });
  }
}

function validate(order: Order, tiles: Map<TileId, Tile>, resolution?: number): string | null {
  const captainAlone = BATTLE_TWEAKS.captainAlone && order.kind === "move" && order.troops === 0 && !!order.captain;
  if (captainAlone) {
    const to = tiles.get(order.to);
    if (!tiles.get(order.from) || tiles.get(order.from)!.owner !== order.house) return "la casilla de origen no es de esa casa";
    if (!to || to.owner !== order.house) return "el Capitán solo puede ir solo a una casilla propia";
    return marchKind(tiles.get(order.from)!, to, [...tiles.values()], order.house) ? null : "el destino no es adyacente ni se llega por camino";
  }
  if (!Number.isInteger(order.troops) || order.troops <= 0) return "el número de tropas debe ser un entero positivo";
  const j = order.jinetes ?? 0;
  const c = order.catapultas ?? 0;
  if (!Number.isInteger(j) || !Number.isInteger(c) || j < 0 || c < 0 || j + c > order.troops) return "los tipos de tropa no cuadran con el total";
  if (!UNITS.enabled && j + c > 0) return "no hay tipos de tropa en esta partida";
  const from = tiles.get(order.from);
  if (!from) return "la casilla de origen no existe";
  if (from.owner !== order.house) return "la casilla de origen no es de esa casa";
  if (order.kind === "move") return validateMove(order, from, tiles);
  if (order.kind === "siege") return validateSiege(order, from, tiles, resolution);
  return validateSupport(order, from, tiles);
}

function validateMove(order: MoveOrder, from: Tile, tiles: Map<TileId, Tile>): string | null {
  const to = tiles.get(order.to);
  if (!to) return "la casilla de destino no existe";
  const units = orderUnits(order);
  if (!canEnter(units, to.type)) return "los jinetes y las catapultas no suben a la montaña";
  if (!marchKind(from, to, [...tiles.values()], order.house, units)) return "el destino no es adyacente ni se llega por camino, por mar o a la carga";
  if (to.type === "castillo" && to.castleOf !== order.house) return "los castillos no se pueden atacar";
  return null;
}

function validateSiege(order: SiegeOrder, from: Tile, tiles: Map<TileId, Tile>, resolution?: number): string | null {
  if (!SIEGE.enabled) return "no hay asedios en esta partida";
  const target = tiles.get(order.target);
  if (!target) return "la casilla sitiada no existe";
  if (!areAdjacent(from, target)) return "solo se puede sitiar una casilla vecina";
  if (target.owner === order.house) return "no puedes sitiar tu propia casilla";
  if (order.troops < SIEGE.minTroops) return `para sitiar hacen falta al menos ${SIEGE.minTroops} tropas`;
  const fortified = target.fortifiedUntil != null && (resolution == null || target.fortifiedUntil >= resolution);
  const walls =
    target.type === "fortaleza" ||
    target.type === "castillo" ||
    (SIEGE.fortifiedTargets && (fortified || target.besiegedBy === order.house));
  if (!walls) return SIEGE.fortifiedTargets ? "solo se sitian castillos, fortalezas y casillas fortificadas" : "solo se sitian castillos y fortalezas";
  if (target.type === "castillo" && target.castleOf == null) return "ese castillo no es de nadie";
  return null;
}

function validateSupport(order: SupportOrder, from: Tile, tiles: Map<TileId, Tile>): string | null {
  const target = tiles.get(order.target);
  if (!target) return "la casilla apoyada no existe";
  if (!areAdjacent(from, target)) return "la casilla apoyada no es adyacente";
  if (target.type === "castillo") return "los castillos no se pueden atacar ni hace falta defenderlos";
  if (order.supportedFrom === ANY_ORIGIN) {
    if (!BATTLE_TWEAKS.supportAnyOrigin) return "el ataque apoyado no es posible";
    if (target.owner === order.house) return "no puedes apoyar un ataque contra tu propia casilla";
  } else if (order.supportedFrom !== null) {
    const origin = tiles.get(order.supportedFrom);
    if (!origin) return "el origen del ataque apoyado no existe";
    if (!areAdjacent(origin, target)) return "el ataque apoyado no es posible";
    if (target.owner === order.house) return "no puedes apoyar un ataque contra tu propia casilla";
  }
  return null;
}

/** Un apoyo nunca ayuda a atacar una casilla de quien apoya. */
function isOwnTileAgainst(s: SupportOrder, m: Move, tiles: Map<TileId, Tile>): boolean {
  return tiles.get(m.to)?.owner === s.house && m.house !== s.house;
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}
