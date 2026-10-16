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

import { DEFENSE_BONUS } from "./rules";
import { areAdjacent } from "./map";
import type {
  CampaignEvent,
  CampaignInput,
  CampaignResult,
  HouseId,
  MoveOrder,
  Order,
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
  failed: boolean;
}

export function defenseMultiplier(tile: Tile, resolution: number, absent: boolean): number {
  let bonus = DEFENSE_BONUS.base;
  if (tile.fortifiedUntil != null && tile.fortifiedUntil >= resolution) bonus += DEFENSE_BONUS.fortified;
  if (tile.type === "fortaleza") bonus += DEFENSE_BONUS.fortress;
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
  const absent = new Set(input.absentHouses ?? []);
  const events: CampaignEvent[] = [];

  // 1. Validar órdenes y repartir las tropas de cada casilla.
  const moves: Move[] = [];
  const supports: SupportOrder[] = [];
  const checked = checkOrders(input.tiles, input.orders);
  for (const { order, reason } of checked.invalid) events.push({ type: "orden_invalida", order, reason });
  for (const order of checked.valid) {
    if (order.kind === "move") {
      // Varias órdenes iguales de la misma casa se agrupan.
      const same = moves.find((m) => m.house === order.house && m.from === order.from && m.to === order.to);
      if (same) same.troops += order.troops;
      else moves.push({ house: order.house, from: order.from, to: order.to, troops: order.troops, failed: false });
    } else {
      supports.push(order);
    }
  }

  // 2. Las tropas que salen dejan su casilla (si fallan, vuelven al final).
  for (const m of moves) tiles.get(m.from)!.troops -= m.troops;

  // 3. Apoyos cortados.
  const activeSupports = supports.filter((s) => {
    const cut = moves.some((m) => m.to === s.from && m.house !== s.house && m.from !== s.target);
    if (cut) events.push({ type: "apoyo_cortado", house: s.house, from: s.from, target: s.target });
    return !cut;
  });

  const attackSupport = (m: Move) =>
    activeSupports.filter((s) => s.target === m.to && s.supportedFrom === m.from && !isOwnTileAgainst(s, m, tiles));
  const attackStrength = (m: Move) => m.troops + sum(attackSupport(m).map((s) => s.troops));

  // 4. Choques frontales: dos casas que se cambian de casilla.
  for (const a of moves) {
    for (const b of moves) {
      if (a === b || a.failed || b.failed || a.house === b.house) continue;
      if (a.from !== b.to || a.to !== b.from || a.from > b.from) continue;
      const sa = attackStrength(a);
      const sb = attackStrength(b);
      let winner: HouseId | null = null;
      if (Math.abs(sa - sb) <= EPS) {
        a.failed = true;
        b.failed = true;
      } else if (sa > sb) {
        a.troops = survivors(a.troops, sa, sb);
        b.failed = true;
        winner = a.house;
      } else {
        b.troops = survivors(b.troops, sb, sa);
        a.failed = true;
        winner = b.house;
      }
      events.push({
        type: "choque_frontal",
        tiles: [a.from, b.from],
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
    const defTroops = tile.troops + sum(reinforcements.map((m) => m.troops));
    for (const r of reinforcements) {
      events.push({ type: "movimiento", house: r.house, from: r.from, to: r.to, troops: r.troops });
    }

    if (hostile.length === 0) {
      tile.troops = defTroops;
      continue;
    }

    const defSupports = activeSupports.filter(
      (s) => s.target === tileId && s.supportedFrom === null && !hostile.some((m) => m.house === s.house),
    );
    const defStrength =
      defTroops * defenseMultiplier(tile, resolution, owner !== null && absent.has(owner)) +
      sum(defSupports.map((s) => s.troops));

    // Agrupar los ataques por casa.
    const byHouse = new Map<HouseId, Move[]>();
    for (const m of hostile) byHouse.set(m.house, [...(byHouse.get(m.house) ?? []), m]);
    const attackers = [...byHouse.entries()].map(([house, ms]) => ({
      house,
      moves: ms,
      troops: sum(ms.map((m) => m.troops)),
      strength: sum(ms.map(attackStrength)),
      supporters: unique(ms.flatMap((m) => attackSupport(m).map((s) => s.house))),
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
      })),
    ];

    if (defenderOnTop) {
      // Gana el defensor (también en empate).
      const rival = Math.max(...attackers.map((a) => a.strength));
      tile.troops = survivors(defTroops, defStrength, rival);
      for (const a of attackers) a.moves.forEach((m) => (m.failed = true));
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
      tile.troops = defTroops;
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
      tile.owner = winner.house;
      tile.troops = kept;
      tile.fortifiedUntil = null;
    }
  }

  // 6. Repliegues: la mitad de las tropas vuelve a su origen, si sigue siendo suyo.
  for (const m of moves) {
    if (!m.failed) continue;
    const back = Math.floor(m.troops / 2);
    const origin = tiles.get(m.from)!;
    const arrived = origin.owner === m.house;
    if (arrived) origin.troops += back;
    events.push({ type: "repliegue", house: m.house, from: m.to, to: m.from, troops: back, arrived });
  }

  return {
    tiles: input.tiles.map((t) => tiles.get(t.id)!),
    events,
  };
}

/**
 * Separa las órdenes válidas de las inválidas, con el motivo. Una casilla no
 * puede comprometer más tropas de las que tiene (se aceptan en orden).
 */
export function checkOrders(
  tileList: Tile[],
  orders: Order[],
): { valid: Order[]; invalid: { order: Order; reason: string }[] } {
  const tiles = new Map<TileId, Tile>(tileList.map((t) => [t.id, t]));
  const committed = new Map<TileId, number>();
  const valid: Order[] = [];
  const invalid: { order: Order; reason: string }[] = [];
  for (const order of orders) {
    const reason = validate(order, tiles);
    if (reason) {
      invalid.push({ order, reason });
      continue;
    }
    const from = tiles.get(order.from)!;
    const used = committed.get(order.from) ?? 0;
    if (used + order.troops > from.troops) {
      invalid.push({ order, reason: "no hay tropas suficientes en la casilla" });
      continue;
    }
    committed.set(order.from, used + order.troops);
    valid.push(order);
  }
  return { valid, invalid };
}

function validate(order: Order, tiles: Map<TileId, Tile>): string | null {
  if (!Number.isInteger(order.troops) || order.troops <= 0) return "el número de tropas debe ser un entero positivo";
  const from = tiles.get(order.from);
  if (!from) return "la casilla de origen no existe";
  if (from.owner !== order.house) return "la casilla de origen no es de esa casa";
  if (order.kind === "move") return validateMove(order, from, tiles);
  return validateSupport(order, from, tiles);
}

function validateMove(order: MoveOrder, from: Tile, tiles: Map<TileId, Tile>): string | null {
  const to = tiles.get(order.to);
  if (!to) return "la casilla de destino no existe";
  if (!areAdjacent(from, to)) return "el destino no es adyacente";
  if (to.type === "castillo" && to.castleOf !== order.house) return "los castillos no se pueden atacar";
  return null;
}

function validateSupport(order: SupportOrder, from: Tile, tiles: Map<TileId, Tile>): string | null {
  const target = tiles.get(order.target);
  if (!target) return "la casilla apoyada no existe";
  if (!areAdjacent(from, target)) return "la casilla apoyada no es adyacente";
  if (target.type === "castillo") return "los castillos no se pueden atacar ni hace falta defenderlos";
  if (order.supportedFrom !== null) {
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
