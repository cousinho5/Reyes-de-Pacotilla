// Bots de las partidas de prueba. Juegan con reglas simples y deterministas:
// por las mañanas usan el piloto automático (construir, fortificar, reclutar)
// y antes de cada resolución atacan casillas vecinas que puedan ganar.
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
}

/** Órdenes de ataque de un bot: como mucho una por casilla de origen y por destino. */
export function planBotOrders(input: BotOrdersInput): MoveOrder[] {
  const absent = new Set(input.absentHouses ?? []);
  const own = input.tiles.filter((t) => t.owner === input.house).sort((a, b) => a.id - b.id);
  const targeted = new Set<number>();
  const orders: MoveOrder[] = [];

  for (const from of own) {
    const keep = from.type === "castillo" ? BOT.castleGarrison : 1;
    const available = from.troops - keep;
    if (available <= 0) continue;

    const options = input.tiles
      .filter((t) => t.owner !== input.house && t.type !== "castillo" && !targeted.has(t.id) && areAdjacent(from, t))
      .map((t) => {
        const defense = t.troops * defenseMultiplier(t, input.resolution, t.owner != null && absent.has(t.owner));
        const margin = t.owner == null ? BOT.marginNeutral : BOT.marginHouse;
        // Tropas necesarias para superar la defensa con margen (y siempre estrictamente).
        const need = Math.max(Math.floor(defense * margin) + 1, Math.floor(defense) + 1);
        return { tile: t, need };
      })
      .filter((o) => o.need <= available)
      .sort((a, b) => VALUE[b.tile.type] - VALUE[a.tile.type] || a.need - b.need || a.tile.id - b.tile.id);

    const best = options[0];
    if (!best) continue;
    targeted.add(best.tile.id);
    orders.push({ kind: "move", house: input.house, from: from.id, to: best.tile.id, troops: available });
  }
  return orders;
}

/** ¿Acepta un bot una oferta dirigida? Si sale ganando (o igual) y puede pagarla. */
export function botAcceptsOffer(give: Partial<Resources>, want: Partial<Resources>, resources: Resources): boolean {
  for (const [r, v] of Object.entries(want) as [keyof Resources, number][]) if (resources[r] < v) return false;
  return totalOf(give) >= totalOf(want) * BOT.tradeRatio;
}
