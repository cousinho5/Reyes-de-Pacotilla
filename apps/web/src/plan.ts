// Órdenes en cola y mapa proyectado (diseño v3, fase 5). Usa el mismo motor que
// el servidor y solo lo que la casa ve: las tropas que no se ven cuentan como 0
// y las órdenes de las demás casas no entran.

import { checkOrders, fitOrders, planNights, type Order, type PlannedNight, type Tile } from "@reyes/engine";
import type { GameState, OrderView, TileView } from "./api";

/** Una casilla tal como la entiende el motor. */
export function asTile(t: TileView): Tile {
  return {
    id: t.id,
    x: t.x,
    y: t.y,
    type: t.type,
    owner: t.owner,
    troops: t.troops ?? 0,
    ...(t.jinetes ? { jinetes: t.jinetes } : {}),
    ...(t.catapultas ? { catapultas: t.catapultas } : {}),
    fortifiedUntil: t.fortifiedUntil,
    castleOf: t.castleOf ?? null,
    ...(t.besiegedBy != null ? { besiegedBy: t.besiegedBy, siegeNights: t.siegeNights ?? 0 } : {}),
  };
}

export function toOrder(o: OrderView, house: number): Order {
  const units = { ...(o.jinetes ? { jinetes: o.jinetes } : {}), ...(o.catapultas ? { catapultas: o.catapultas } : {}) };
  if (o.tipo === "mover") return { kind: "move", house, from: o.desde, to: o.hacia, troops: o.tropas, ...units, ...(o.capitan ? { captain: true } : {}) };
  if (o.tipo === "sitiar") return { kind: "siege", house, from: o.desde, target: o.hacia, troops: o.tropas, ...units };
  return { kind: "support", house, from: o.desde, target: o.hacia, supportedFrom: o.apoyaDesde, troops: o.tropas, ...units };
}

/** Primera resolución con órdenes abiertas. */
export function nextResolution(state: GameState): number {
  return state.partida.proximaResolucion ?? state.partida.resolucionActual + 1;
}

/** Noches para las que se pueden dar órdenes: esta y las de la cola, sin pasar del final. */
export function queueNights(state: GameState): number {
  const next = nextResolution(state);
  const left = state.partida.totalResoluciones - next + 1;
  return Math.max(1, Math.min(state.partida.nochesEnCola ?? 1, left));
}

export const nightOf = (o: OrderView, next: number) => o.resolucion ?? next;

export interface Projection {
  /** Mapa antes de cada noche: [0] es el de ahora, [1] tras la primera noche, etc. */
  maps: TileView[][];
  /** Lo que pasaría cada noche. */
  nights: PlannedNight[];
}

function myCaptainTile(tiles: TileView[], me: number): number | null {
  return tiles.find((t) => t.capitanes?.includes(me))?.id ?? null;
}

/** Proyecta las noches de la cola con las órdenes de la casa. */
export function project(state: GameState, draft: OrderView[]): Projection {
  const tiles = state.casillas ?? [];
  const me = state.yo.casa;
  const next = nextResolution(state);
  const n = queueNights(state);
  const byNight: Order[][] = Array.from({ length: n }, (_, k) => draft.filter((o) => nightOf(o, next) === next + k).map((o) => toOrder(o, me)));
  const nights = planNights(tiles, byNight, me, myCaptainTile(tiles, me), next);
  const maps: TileView[][] = [tiles];
  for (const night of nights) {
    const byId = new Map(night.tiles.map((t) => [t.id, t]));
    maps.push(
      tiles.map((t) => {
        const p = byId.get(t.id)!;
        // Lo tuyo se proyecta entero; de lo ajeno no se sabe más que ahora.
        const known = p.owner === me || t.troops != null;
        const { capitanes: _c, jinetes: _j, catapultas: _k, ...base } = t;
        return {
          ...base,
          owner: p.owner,
          troops: known ? p.troops : null,
          ...(known && p.jinetes ? { jinetes: p.jinetes } : {}),
          ...(known && p.catapultas ? { catapultas: p.catapultas } : {}),
          fortifiedUntil: p.fortifiedUntil ?? null,
          besiegedBy: p.besiegedBy ?? null,
          siegeNights: p.siegeNights ?? 0,
          ...(night.captainTile === t.id ? { capitanes: [me] } : {}),
        };
      }),
    );
  }
  return { maps, nights };
}

/**
 * Quita de la cola las órdenes que ya no se podrían cumplir (por ejemplo, tras
 * quitar la orden de esta noche de la que dependían). Las de la primera noche
 * no se tocan: esas las comprueba el servidor tal cual.
 */
export function pruneQueue(state: GameState, draft: OrderView[]): { draft: OrderView[]; dropped: number } {
  const next = nextResolution(state);
  const me = state.yo.casa;
  let kept = draft.filter((o) => nightOf(o, next) <= next);
  let dropped = 0;
  for (let k = 1; k < queueNights(state); k++) {
    const night = draft.filter((o) => nightOf(o, next) === next + k);
    if (night.length === 0) continue;
    const before = project(state, kept).maps[k]!;
    const captain = myCaptainTile(before, me);
    const engineTiles = before.map(asTile);
    const ok: OrderView[] = [];
    let captainUsed = false;
    // Todas las de la noche juntas, como en el servidor: se reparten las tropas en orden.
    const fitted = fitOrders(engineTiles, night.map((o) => toOrder(o, me)));
    const invalid = new Set(checkOrders(engineTiles, fitted, next + k).invalid.map((x) => x.order));
    for (const [i, o] of night.entries()) {
      if (invalid.has(fitted[i]!)) {
        dropped++;
        continue;
      }
      const withCaptain = !!o.capitan && o.desde === captain && !captainUsed;
      if (withCaptain) captainUsed = true;
      ok.push(withCaptain || !o.capitan ? o : { ...o, capitan: undefined });
    }
    kept = [...kept, ...ok];
  }
  return { draft: kept, dropped };
}
