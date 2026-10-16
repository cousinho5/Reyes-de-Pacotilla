// Bots de las partidas de prueba. Juegan con reglas simples y deterministas:
// por las mañanas usan el piloto automático (construir, fortificar, reclutar)
// y antes de cada resolución atacan casillas vecinas que puedan ganar y
// llevan las tropas del interior hacia la frontera.
// Solo miran casillas adyacentes a las suyas, que también verían con la niebla.

import { defenseMultiplier } from "./combat";
import { areAdjacent } from "./map";
import { BOT } from "./rules";
import { totalOf } from "./trade";
import type { HouseId, MoveOrder, Resources, Tile, TileType } from "./types";

const VALUE: Record<TileType, number> = {
  fortaleza: 3,
  puerto: 2,
  cantera: 1,
  montana: 1,
  campos: 0,
  bosque: 0,
  castillo: -1,
};

export interface BotOrdersInput {
  house: HouseId;
  tiles: Tile[];
  /** Resolución para la que se dan las órdenes. */
  resolution: number;
  /** Casas en piloto automático (defienden con +25%). */
  absentHouses?: HouseId[];
  /** Márgenes de ataque (por defecto, los de BOT en rules.ts). */
  margins?: { neutral: number; house: number };
  /** Si es false, solo atacan casillas neutrales. */
  attackHouses?: boolean;
}

/**
 * Órdenes de un bot: como mucho un ataque por casilla de origen y por destino;
 * las casillas del interior mandan sus tropas hacia la frontera.
 */
export function planBotOrders(input: BotOrdersInput): MoveOrder[] {
  const absent = new Set(input.absentHouses ?? []);
  const margins = input.margins ?? { neutral: BOT.marginNeutral, house: BOT.marginHouse };
  const attackable = (t: Tile) =>
    t.owner !== input.house && t.type !== "castillo" && (input.attackHouses !== false || t.owner == null);
  const own = input.tiles.filter((t) => t.owner === input.house).sort((a, b) => a.id - b.id);
  const targeted = new Set<number>();
  const orders: MoveOrder[] = [];
  const distance = frontierDistance(own, input.tiles, attackable);

  for (const from of own) {
    const keep = from.type === "castillo" ? BOT.castleGarrison : 1;
    const available = from.troops - keep;
    if (available <= 0) continue;

    const options = input.tiles
      .filter((t) => attackable(t) && !targeted.has(t.id) && areAdjacent(from, t))
      .map((t) => {
        const defense = t.troops * defenseMultiplier(t, input.resolution, t.owner != null && absent.has(t.owner));
        const margin = t.owner == null ? margins.neutral : margins.house;
        // Tropas necesarias para superar la defensa con margen (y siempre estrictamente).
        const need = Math.max(Math.floor(defense * margin) + 1, Math.floor(defense) + 1);
        return { tile: t, need };
      })
      .filter((o) => o.need <= available)
      .sort((a, b) => VALUE[b.tile.type] - VALUE[a.tile.type] || a.need - b.need || a.tile.id - b.tile.id);

    const best = options[0];
    if (best) {
      targeted.add(best.tile.id);
      orders.push({ kind: "move", house: input.house, from: from.id, to: best.tile.id, troops: available });
      continue;
    }
    // Sin nada que atacar desde aquí: si es interior, sus tropas avanzan hacia la frontera.
    const d = distance.get(from.id);
    if (d == null || d === 0) continue;
    const step = own
      .filter((t) => areAdjacent(from, t) && (distance.get(t.id) ?? Infinity) < d)
      .sort((a, b) => distance.get(a.id)! - distance.get(b.id)! || a.id - b.id)[0];
    if (step) orders.push({ kind: "move", house: input.house, from: from.id, to: step.id, troops: available });
  }
  return orders;
}

/** Distancia (en casillas propias) de cada casilla propia a la frontera; 0 = frontera. */
function frontierDistance(own: Tile[], tiles: Tile[], attackable: (t: Tile) => boolean): Map<number, number> {
  const dist = new Map<number, number>();
  let queue = own.filter((t) => tiles.some((o) => attackable(o) && areAdjacent(o, t)));
  for (const t of queue) dist.set(t.id, 0);
  for (let d = 1; queue.length > 0; d++) {
    const next: Tile[] = [];
    for (const t of queue) {
      for (const n of own) {
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

/** ¿Acepta un bot una oferta dirigida? Si sale ganando (o igual) y puede pagarla. */
export function botAcceptsOffer(give: Partial<Resources>, want: Partial<Resources>, resources: Resources): boolean {
  for (const [r, v] of Object.entries(want) as [keyof Resources, number][]) if (resources[r] < v) return false;
  return totalOf(give) >= totalOf(want) * BOT.tradeRatio;
}
