// Avisos y órdenes en cola (diseño v3, fase 5). Funciones puras:
// - threats: casillas propias que un enemigo a la vista puede atacar mañana.
// - bannersSeen: grupos ajenos que esta noche han entrado junto a tus tierras.
// - fitOrders: una orden se ajusta a las tropas que haya al salir.
// - planNights: proyecta varias noches seguidas con las órdenes de una casa.

import { resolveCampaign } from "./combat";
import { areAdjacent } from "./map";
import { projectForHouse } from "./fog";
import { QUEUE } from "./rules";
import { marchKind } from "./terrain";
import { canEnter, orderUnits, totalUnits, unitFields, unitsOf, type Units } from "./units";
import type { CampaignEvent, Captain, HouseId, Order, Tile, TileId } from "./types";

/** Las tropas que no se ven (troops null) cuentan como 0. */
type SeenTile = Omit<Tile, "troops"> & { troops: number | null };

const asTile = (t: SeenTile): Tile => ({ ...t, troops: t.troops ?? 0 });

/** Puede un grupo de la casilla `from` llegar a `to` en una noche (con lo que se ve). */
function reaches(from: Tile, to: Tile, tiles: Tile[]): boolean {
  if (from.owner == null) return false;
  const u = unitsOf(from);
  if (to.type === "castillo") return false;
  if (to.type === "montana" && u.mesnada === 0) return false;
  if (marchKind(from, to, tiles, from.owner) != null) return true;
  // A la carga solo van los jinetes, solos.
  if (u.jinetes === 0) return false;
  const riders: Units = { mesnada: 0, jinetes: u.jinetes, catapultas: 0 };
  return canEnter(riders, to.type) && marchKind(from, to, tiles, from.owner, riders) === "carga";
}

/**
 * Amenazas (borde rojo en el mapa): casillas de `house` que un grupo enemigo
 * que se ve puede atacar en la próxima resolución. Las tropas que no se ven no
 * cuentan, y los castillos no se pueden atacar.
 */
export function threats(seen: SeenTile[], house: HouseId): { tile: TileId; by: HouseId[] }[] {
  const tiles = seen.map(asTile);
  const enemies = seen.filter((t) => t.owner != null && t.owner !== house && (t.troops ?? 0) > 0).map(asTile);
  const out: { tile: TileId; by: HouseId[] }[] = [];
  for (const t of tiles) {
    if (t.owner !== house || t.type === "castillo") continue;
    const by = [...new Set(enemies.filter((e) => reaches(e, t, tiles)).map((e) => e.owner!))].sort((a, b) => a - b);
    if (by.length > 0) out.push({ tile: t.id, by });
  }
  return out;
}

export interface BannerSighting {
  /** Casa cuyos estandartes se ven. */
  house: HouseId;
  /** Casilla donde están. */
  tile: TileId;
  /** Tropas que se ven allí. */
  troops: number;
  /** Casilla propia vecina. */
  near: TileId;
}

/**
 * Estandartes a la vista (parte de las 22:00): grupos de otra casa que esta
 * noche han entrado (moviéndose o conquistando) en una casilla vecina a las de
 * `house`. Solo los que se ven: en un bosque ajeno no se sabe quién hay.
 */
export function bannersSeen(after: Tile[], events: CampaignEvent[], house: HouseId, spied: HouseId[] = []): BannerSighting[] {
  const entered = new Map<TileId, HouseId>();
  for (const e of events) {
    if (e.type === "movimiento") entered.set(e.to, e.house);
    if (e.type === "combate" && e.conquered && e.winner != null) entered.set(e.tile, e.winner);
  }
  const view = new Map(projectForHouse(after, house, spied).map((t) => [t.id, t]));
  const own = after.filter((t) => t.owner === house);
  const out: BannerSighting[] = [];
  for (const [tileId, by] of [...entered.entries()].sort((a, b) => a[0] - b[0])) {
    if (by === house) continue;
    const t = after.find((x) => x.id === tileId);
    if (!t || t.owner !== by) continue;
    const seen = view.get(tileId);
    if (!seen?.visible || seen.troops == null || seen.troops <= 0) continue;
    const near = own.find((o) => areAdjacent(o, t));
    if (!near) continue;
    out.push({ house: by, tile: tileId, troops: seen.troops, near: near.id });
  }
  return out;
}

/**
 * Órdenes en cola: cuando llega su noche, cada orden se ajusta a las tropas que
 * queden en su casilla (por tipos y en el orden en que se dieron). Si no queda
 * ninguna, la orden sigue igual y el motor la da por no válida.
 */
export function fitOrders(tiles: Tile[], orders: Order[]): Order[] {
  const left = new Map<TileId, Units>(tiles.map((t) => [t.id, unitsOf(t)]));
  return orders.map((o) => {
    const have = left.get(o.from);
    const from = tiles.find((t) => t.id === o.from);
    if (!have || !from || from.owner !== o.house) return o;
    const want = orderUnits(o);
    const take: Units = {
      mesnada: Math.min(want.mesnada, have.mesnada),
      jinetes: Math.min(want.jinetes, have.jinetes),
      catapultas: Math.min(want.catapultas, have.catapultas),
    };
    if (totalUnits(take) === 0) return o;
    left.set(o.from, {
      mesnada: have.mesnada - take.mesnada,
      jinetes: have.jinetes - take.jinetes,
      catapultas: have.catapultas - take.catapultas,
    });
    const { troops, jinetes, catapultas } = unitFields(take);
    const { jinetes: _j, catapultas: _c, ...rest } = o;
    return { ...rest, troops, ...(jinetes ? { jinetes } : {}), ...(catapultas ? { catapultas } : {}) } as Order;
  });
}

export interface PlannedNight {
  /** Resolución proyectada. */
  resolution: number;
  /** Cómo quedaría el mapa tras esa noche, si nadie más mueve. */
  tiles: Tile[];
  events: CampaignEvent[];
  /** Dónde acabaría el Capitán de la casa (null si cae preso). */
  captainTile: TileId | null;
}

/**
 * Simular varias noches: aplica, noche tras noche, las órdenes en cola de una
 * casa sobre lo que ve. Las órdenes de las demás son secretas y no entran.
 * `nights[0]` son las órdenes de la resolución `first`, `nights[1]` las de la
 * siguiente, etc.
 */
export function planNights(
  seen: SeenTile[],
  nights: Order[][],
  house: HouseId,
  captainTile: TileId | null,
  first: number,
): PlannedNight[] {
  let tiles = seen.map(asTile);
  let captain: Captain[] = captainTile != null ? [{ house, tile: captainTile }] : [];
  const out: PlannedNight[] = [];
  nights.slice(0, QUEUE.nights).forEach((orders, i) => {
    const resolution = first + i;
    const r = resolveCampaign({ resolution, tiles, orders: fitOrders(tiles, orders), captains: captain });
    tiles = r.tiles;
    captain = r.captains;
    out.push({ resolution, tiles, events: r.events, captainTile: r.captains.find((c) => c.house === house)?.tile ?? null });
  });
  return out;
}
