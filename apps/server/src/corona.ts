// Cambio con la Corona (bloque 5): precios y compras, para las personas
// (app.ts) y los bots de las partidas de prueba (pruebas.ts). El precio se
// calcula aquí con lo que guarda todo el reino; al cliente solo le llega el precio.

import { CROWN, CROWN_GOODS, crownPrices, crownQuote, type Resource, type Resources } from "@reyes/engine";
import { gameNow, type GameRow, type HouseRow } from "./state";

export interface CrownMarket {
  /** Lo que guardan entre todas las casas. Nunca sale del servidor. */
  realm: Resources;
  /** Unidades compradas a la Corona en los últimos 7 días, entre todas las casas. */
  bought: Resources;
}

const zero = (): Resources => ({ pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 0 });

export async function crownMarket(db: D1Database, game: GameRow, houses: HouseRow[]): Promise<CrownMarket> {
  const realm = zero();
  for (const h of houses) for (const r of Object.keys(realm) as Resource[]) realm[r] += h[r];
  const since = new Date(gameNow(game).getTime() - CROWN.demandDays * 864e5).toISOString();
  const { results } = await db
    .prepare("SELECT resource, SUM(units) AS units FROM crown_purchases WHERE game_id = ? AND at > ? GROUP BY resource")
    .bind(game.id, since)
    .all<{ resource: Resource; units: number }>();
  const bought = zero();
  for (const row of results) bought[row.resource] = row.units;
  return { realm, bought };
}

/** Lo que ve una casa: el Oro que cuesta la próxima unidad de cada recurso, con dos decimales. */
export function crownPriceView(market: CrownMarket): Record<Exclude<Resource, "oro">, number> {
  const prices = crownPrices(market.realm, market.bought);
  return Object.fromEntries(CROWN_GOODS.map((r) => [r, Math.round(prices[r] * 100) / 100])) as Record<Exclude<Resource, "oro">, number>;
}

export function crownCost(market: CrownMarket, resource: Resource, units: number): number {
  return crownQuote(market.realm, resource, market.bought[resource], units);
}

/**
 * El lote de una compra: cobra el Oro, entrega el recurso y apunta la compra.
 * Si falta Oro, el CHECK de la base de datos deshace el lote entero.
 */
export function crownPurchaseStatements(
  db: D1Database,
  game: GameRow,
  houseId: number,
  resource: Resource,
  units: number,
  gold: number,
): D1PreparedStatement[] {
  if (!CROWN_GOODS.includes(resource)) throw new Error(`La Corona no vende ${resource}`);
  return [
    db.prepare(`UPDATE houses SET oro = oro - ?, ${resource} = ${resource} + ? WHERE id = ?`).bind(gold, units, houseId),
    db.prepare("INSERT INTO crown_purchases (game_id, house_id, resource, units, gold, at) VALUES (?, ?, ?, ?, ?, ?)").bind(
      game.id,
      houseId,
      resource,
      units,
      gold,
      gameNow(game).toISOString(),
    ),
  ];
}
