// Alianzas (bloque 8, `docs/alianzas.md`). Cada alianza es entre dos casas.
// Mientras está en vigor hay paso libre por las casillas del aliado (nunca su
// castillo), visión compartida, no agresión y ataque conjunto. Durante el
// aviso tras romperla siguen sin poder atacarse, pero ya no se puede entrar
// en las casillas del otro (solo salir). Al terminar el aviso, las tropas de
// paso vuelven a la casilla propia más cercana.

import { distance } from "./map";
import { ALLIANCE } from "./rules";
import { addUnits, totalUnits, unitFields, unitsOf, type Units } from "./units";
import type { Alliance, Captain, Guest, HouseId, Tile, TileId } from "./types";

const NONE: Units = { mesnada: 0, jinetes: 0, catapultas: 0 };

/** Las alianzas que cuentan (ninguna si están apagadas en `rules.ts`). */
export function inForce(list: Alliance[] | undefined): Alliance[] {
  return ALLIANCE.enabled ? (list ?? []) : [];
}

export function allianceOf(list: Alliance[], a: HouseId, b: HouseId): Alliance | undefined {
  if (a === b) return undefined;
  return list.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
}

/** Alianza en vigor (no en aviso): paso libre, visión compartida y ataque conjunto. */
export function allied(list: Alliance[], a: HouseId | null, b: HouseId | null): boolean {
  if (a == null || b == null) return false;
  return allianceOf(list, a, b)?.status === "active";
}

/** Hay alianza, en vigor o en aviso: no se pueden atacar, sitiar ni apoyar ataques contra el otro. */
export function bound(list: Alliance[], a: HouseId | null, b: HouseId | null): boolean {
  if (a == null || b == null) return false;
  return allianceOf(list, a, b) != null;
}

/** Aliados en vigor de una casa. */
export function alliesOf(list: Alliance[], house: HouseId): HouseId[] {
  return list.filter((x) => x.status === "active" && (x.a === house || x.b === house)).map((x) => (x.a === house ? x.b : x.a));
}

/** La alianza sigue existiendo al terminar la resolución `resolution`. */
export function survives(al: Alliance, resolution: number): boolean {
  return al.status === "active" || al.endsAt == null || al.endsAt > resolution;
}

/**
 * Última resolución del aviso al romper una alianza antes de la resolución
 * `next`: esa noche cuenta como la primera de `ALLIANCE.noticeResolutions`.
 */
export function noticeEnd(next: number): number {
  return next + ALLIANCE.noticeResolutions - 1;
}

/** Tropas de paso de una casa en una casilla. */
export function guestUnits(tile: Pick<Tile, "guests">, house: HouseId): Units {
  const g = tile.guests?.find((x) => x.house === house);
  return g ? unitsOf(g) : { ...NONE };
}

/** Todas las tropas de paso de una casa en el mapa. */
export function guestTroops(tiles: Pick<Tile, "guests">[], house: HouseId): number {
  let n = 0;
  for (const t of tiles) for (const g of t.guests ?? []) if (g.house === house) n += g.troops;
  return n;
}

/** Lista de tropas de paso, ordenada por casa y sin grupos vacíos. */
export function guestList(map: Map<HouseId, Units>): Guest[] | undefined {
  const out: Guest[] = [];
  for (const [house, u] of [...map.entries()].sort((a, b) => a[0] - b[0])) {
    if (totalUnits(u) > 0) out.push({ house, ...unitFields(u) });
  }
  return out.length > 0 ? out : undefined;
}

/** Casilla propia más cercana (por distancia de hexágonos; en empate, la de id más bajo). */
export function nearestOwnTile<T extends Tile>(tiles: T[], house: HouseId, from: Pick<Tile, "x" | "y">): T | undefined {
  let best: T | undefined;
  let bestD = Infinity;
  for (const t of tiles) {
    if (t.owner !== house) continue;
    const d = distance(t, from);
    if (d < bestD || (d === bestD && best && t.id < best.id)) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

/** Distancia de una casilla a la casilla propia más cercana de la casa (para «salir» durante el aviso). */
export function exitDistance(tiles: Tile[], house: HouseId, at: Pick<Tile, "x" | "y">): number {
  const t = nearestOwnTile(tiles, house, at);
  return t ? distance(t, at) : Infinity;
}

/**
 * Reparte `kept` tropas entre varios grupos en proporción a lo que tenía cada
 * uno (restos mayores). Los grupos van por prioridad: en empate de restos se
 * queda la tropa el que va antes, así que pierde una más el de detrás (el que
 * dio la orden más tarde).
 */
export function shareKept(troops: number[], kept: number): number[] {
  const total = troops.reduce((a, b) => a + b, 0);
  if (total <= 0) return troops.map(() => 0);
  if (kept >= total) return [...troops];
  const exact = troops.map((t) => (t * kept) / total);
  const out = exact.map((x) => Math.floor(x + 1e-9));
  let left = kept - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x + 1e-9) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    if (out[i]! < troops[i]!) {
      out[i]!++;
      left--;
    }
  }
  return out;
}

/**
 * Bandos de un ataque: las casas que atacan la misma casilla se juntan si son
 * aliadas en vigor entre todas. Se juntan primero las alianzas más antiguas,
 * así que si A es aliada de B y de C, pero B y C no, A va con la más antigua y
 * la otra lucha por su cuenta.
 */
export function attackSides(houses: HouseId[], list: Alliance[]): HouseId[][] {
  const groups = houses.map((h) => [h]);
  const pairs = list
    .filter((x) => x.status === "active" && houses.includes(x.a) && houses.includes(x.b))
    .map((x, i) => ({ x, i }))
    .sort((p, q) => p.x.since - q.x.since || p.i - q.i)
    .map((p) => p.x);
  for (const al of pairs) {
    const ga = groups.find((g) => g.includes(al.a))!;
    const gb = groups.find((g) => g.includes(al.b))!;
    if (ga === gb) continue;
    if (!ga.every((h) => gb.every((k) => allied(list, h, k)))) continue;
    ga.push(...gb);
    groups.splice(groups.indexOf(gb), 1);
  }
  return groups.map((g) => [...g].sort((a, b) => a - b));
}

export interface Expulsion {
  house: HouseId;
  from: TileId;
  to: TileId;
  troops: number;
}

/**
 * Tropas de paso que ya no pueden quedarse: las de alianzas que terminan en
 * esta resolución y las que están en una casilla de una casa que no es su
 * aliada (por ejemplo, tras una conquista). Vuelven al momento a la casilla
 * propia más cercana. Los Capitanes que estaban con ellas vuelven con ellas, y
 * también el que estaba solo en una casilla de la casa con la que termina la
 * alianza. No modifica la entrada.
 */
export function expelGuests<T extends Tile>(
  tiles: T[],
  list: Alliance[],
  resolution: number,
  captains: Captain[] = [],
): { tiles: T[]; captains: Captain[]; expelled: Expulsion[] } {
  const stays = (house: HouseId, owner: HouseId | null) => {
    if (owner == null || owner === house) return false;
    const al = allianceOf(list, house, owner);
    return !!al && survives(al, resolution);
  };
  const out = tiles.map((t) => ({ ...t }));
  const byId = new Map(out.map((t) => [t.id, t]));
  const expelled: Expulsion[] = [];
  const arrivals = new Map<TileId, Units>();
  for (const t of out) {
    if (!t.guests?.length) continue;
    const keep: Guest[] = [];
    for (const g of t.guests) {
      if (stays(g.house, t.owner)) {
        keep.push(g);
        continue;
      }
      const home = nearestOwnTile(out, g.house, t);
      if (home) arrivals.set(home.id, addUnits(arrivals.get(home.id) ?? { ...NONE }, unitsOf(g)));
      expelled.push({ house: g.house, from: t.id, to: home?.id ?? t.id, troops: g.troops });
    }
    t.guests = keep.length > 0 ? keep : undefined;
  }
  for (const [id, u] of arrivals) {
    const t = byId.get(id)!;
    Object.assign(t, unitFields(addUnits(unitsOf(t), u)));
    if (!t.jinetes) delete t.jinetes;
    if (!t.catapultas) delete t.catapultas;
  }
  const caps = captains.map((c) => {
    if (c.tile == null) return c;
    const t = byId.get(c.tile);
    if (!t || t.owner == null || t.owner === c.house || stays(c.house, t.owner)) return c;
    const withTroops = expelled.some((e) => e.house === c.house && e.from === t.id);
    if (!withTroops && !allianceOf(list, c.house, t.owner)) return c;
    const home = nearestOwnTile(out, c.house, t);
    return home ? { ...c, tile: home.id } : c;
  });
  return { tiles: out, captains: caps, expelled };
}

/** Tropas de paso de una casa, con la casilla donde están. */
export function guestStacks<T extends Tile>(tiles: T[], house: HouseId): { tile: T; guest: Guest }[] {
  return tiles.flatMap((t) => (t.guests ?? []).filter((g) => g.house === house).map((guest) => ({ tile: t, guest })));
}

/**
 * Quita `n` tropas de paso de una casa, grupo a grupo en el orden de `order`
 * (casillas). Se van primero los de la Mesnada; si no queda, Jinetes y
 * Catapultas. Devuelve las casillas nuevas y cuántas quitó.
 */
export function takeGuests<T extends Tile>(tiles: T[], house: HouseId, n: number, order: TileId[]): { tiles: T[]; removed: number } {
  const cut = new Map<TileId, number>();
  let left = n;
  for (const id of order) {
    if (left <= 0) break;
    const t = tiles.find((x) => x.id === id);
    const g = t?.guests?.find((x) => x.house === house);
    if (!g) continue;
    const k = Math.min(g.troops, left);
    if (k > 0) cut.set(id, k);
    left -= k;
  }
  const out = tiles.map((t) => {
    const k = cut.get(t.id);
    if (!k) return t;
    const map = new Map((t.guests ?? []).map((g) => [g.house, unitsOf(g)]));
    map.set(house, dropUnits(map.get(house)!, k));
    const list = guestList(map);
    const copy = { ...t };
    if (list) copy.guests = list;
    else delete copy.guests;
    return copy;
  });
  return { tiles: out, removed: n - left };
}

/** Quita `k` tropas: primero Mesnada, luego Jinetes y por último Catapultas. */
function dropUnits(u: Units, k: number): Units {
  const mesnada = Math.min(u.mesnada, k);
  const jinetes = Math.min(u.jinetes, k - mesnada);
  const catapultas = Math.min(u.catapultas, k - mesnada - jinetes);
  return { mesnada: u.mesnada - mesnada, jinetes: u.jinetes - jinetes, catapultas: u.catapultas - catapultas };
}
