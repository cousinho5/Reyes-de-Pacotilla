// Terreno que cuenta en la guerra (diseño v3, fase 2): caminos, travesías por
// mar y lo que cada casilla hace al combate y a la vista. Los valores, en
// rules.ts (TERRAIN).

import { areAdjacent, distance, riverBetween } from "./map";
import { RIVERS, TERRAIN, UNITS } from "./rules";
import { isPlain, type Units } from "./units";
import type { HouseId, Tile, TileId, TileType } from "./types";

type Cell = Pick<Tile, "x" | "y" | "type">;

const roadCache = new Map<string, Set<string>>();
const roadByArray = new WeakMap<object, Set<string>>();

/** Clave de una pareja de casillas, en cualquier orden. */
function pairKey(a: Pick<Tile, "x" | "y">, b: Pick<Tile, "x" | "y">): string {
  const ka = `${a.x},${a.y}`;
  const kb = `${b.x},${b.y}`;
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

/**
 * Red de caminos: cada castillo se une a la fortaleza más cercana (o al centro
 * del mapa si no hay) por el camino más corto que evita montañas, puertos y
 * otros castillos. Es la misma que se dibuja en el mapa. Depende solo del
 * terreno, así que no cambia en toda la partida.
 */
export function roadEdges<T extends Cell>(cells: T[]): [T, T][] {
  const cols = Math.max(...cells.map((c) => c.x)) + 1;
  const rows = Math.max(...cells.map((c) => c.y)) + 1;
  const forts = cells.filter((c) => c.type === "fortaleza");
  const goals = forts.length ? forts : cells.filter((c) => c.x === Math.floor(cols / 2) && c.y === Math.floor(rows / 2));
  // Vecinas en un orden fijo: de arriba abajo y de izquierda a derecha.
  const neighbours = (c: T) =>
    cells.filter((n) => areAdjacent(c, n)).sort((a, b) => a.y - b.y || a.x - b.x);
  const edges = new Map<string, [T, T]>();
  for (const start of cells.filter((c) => c.type === "castillo").sort((a, b) => a.y - b.y || a.x - b.x)) {
    const prev = new Map<T, T | null>([[start, null]]);
    const queue: T[] = [start];
    let found: T | null = null;
    while (queue.length && !found) {
      const cur = queue.shift()!;
      for (const n of neighbours(cur)) {
        if (prev.has(n)) continue;
        const goal = goals.includes(n);
        if (!goal && (n.type === "montana" || n.type === "puerto" || n.type === "castillo" || n.type === "lago")) continue;
        prev.set(n, cur);
        if (goal) {
          found = n;
          break;
        }
        queue.push(n);
      }
    }
    let cur: T | null | undefined = found;
    while (cur) {
      const from: T | null | undefined = prev.get(cur);
      if (!from) break;
      edges.set(pairKey(from, cur), [from, cur]);
      cur = from;
    }
  }
  return [...edges.values()];
}

/** Tramos de camino del mapa como claves "x,y|x,y" (con caché: el terreno no cambia). */
export function roadSet(cells: Cell[]): Set<string> {
  const known = roadByArray.get(cells);
  if (known) return known;
  const key = cells
    .map((c) => `${c.x},${c.y}${c.type[0]}${c.type[1]}`)
    .sort()
    .join(";");
  let set = roadCache.get(key);
  if (!set) {
    set = new Set(roadEdges(cells).map(([a, b]) => pairKey(a, b)));
    if (roadCache.size > 50) roadCache.clear();
    roadCache.set(key, set);
  }
  roadByArray.set(cells, set);
  return set;
}

export type MarchKind = "vecina" | "camino" | "mar" | "carga";

/**
 * Cómo puede llegar un grupo de `house` de `from` a `to` en una noche:
 * - "vecina": casillas que se tocan.
 * - "camino": dos tramos de camino seguidos con la casilla de en medio propia.
 * - "mar": de un puerto propio a otro puerto.
 * - "carga": un grupo solo de jinetes cruza dos casillas llanas, la de en medio propia.
 * null si no puede. `units`: composición del grupo (si falta, se mira solo el terreno).
 */
export function marchKind(from: Tile, to: Tile, tiles: Tile[], house: HouseId, units?: Units, friends: HouseId[] = []): MarchKind | null {
  // Alianzas (bloque 8): las casillas de los aliados en vigor cuentan como propias.
  const mine = (owner: HouseId | null) => owner === house || (owner != null && friends.includes(owner));
  if (from.id === to.id) return null;
  // En un lago no se puede entrar (bloque 1).
  if (to.type === "lago" || from.type === "lago") return null;
  if (areAdjacent(from, to)) return "vecina";
  if (TERRAIN.sea && from.type === "puerto" && to.type === "puerto" && mine(from.owner)) return "mar";
  if (TERRAIN.roads && distance(from, to) === 2) {
    const roads = roadSet(tiles);
    const mid = tiles.find(
      (m) => mine(m.owner) && areAdjacent(from, m) && areAdjacent(m, to) && roads.has(pairKey(from, m)) && roads.has(pairKey(m, to)),
    );
    if (mid) return "camino";
    const riders = units && UNITS.enabled && units.jinetes > 0 && units.mesnada === 0 && units.catapultas === 0;
    if (riders && isPlain(to.type)) {
      const plain = tiles.find((m) => mine(m.owner) && isPlain(m.type) && areAdjacent(from, m) && areAdjacent(m, to));
      if (plain) return "carga";
    }
  }
  return null;
}

/**
 * Casillas que recorre una marcha, de salida a llegada: [from, to] si se tocan
 * (o por mar), [from, en medio, to] por camino o a la carga. La casilla de en
 * medio se elige como en `marchKind`.
 */
export function marchPath(from: Tile, to: Tile, tiles: Tile[], house: HouseId, units?: Units, friends: HouseId[] = []): Tile[] {
  const mine = (owner: HouseId | null) => owner === house || (owner != null && friends.includes(owner));
  const kind = marchKind(from, to, tiles, house, units, friends);
  if (kind === "camino") {
    const roads = roadSet(tiles);
    const mid = tiles.find(
      (m) => mine(m.owner) && areAdjacent(from, m) && areAdjacent(m, to) && roads.has(pairKey(from, m)) && roads.has(pairKey(m, to)),
    );
    if (mid) return [from, mid, to];
  }
  if (kind === "carga") {
    const mid = tiles.find((m) => mine(m.owner) && isPlain(m.type) && areAdjacent(from, m) && areAdjacent(m, to));
    if (mid) return [from, mid, to];
  }
  return [from, to];
}

/**
 * Dos marchas se cruzan por el camino (bloque 4): una recorre al revés un tramo
 * de la otra y al menos una es de dos casillas (si las dos son de una casilla,
 * es un cambio de casilla, que se trata aparte). Devuelve la casilla de en
 * medio de la marcha larga, donde se dibuja el choque, o null si no se cruzan.
 */
export function crossingPoint(pa: TileId[], pb: TileId[]): TileId | null {
  if (pa.length < 3 && pb.length < 3) return null;
  for (let i = 0; i + 1 < pa.length; i++) {
    for (let j = 0; j + 1 < pb.length; j++) {
      if (pa[i] === pb[j + 1] && pa[i + 1] === pb[j]) return pa.length === 3 ? pa[1]! : pb[1]!;
    }
  }
  return null;
}

/** Hay un puente entre dos casillas vecinas: un camino cruza el río que las separa. */
export function bridgeBetween(a: Tile, b: Tile, tiles: Tile[]): boolean {
  return riverBetween(a, b) && TERRAIN.roads && roadSet(tiles).has(pairKey(a, b));
}

/**
 * El ataque entra en su destino cruzando un río sin puente (bloque 1): se
 * mira el último tramo de la marcha (`marchPath`). El defensor suma RIVERS.defense.
 */
export function crossesRiver(path: Tile[], tiles: Tile[]): boolean {
  if (!RIVERS.enabled || path.length < 2) return false;
  const a = path[path.length - 2]!;
  const b = path[path.length - 1]!;
  return riverBetween(a, b) && !bridgeBetween(a, b, tiles);
}

/** Bonificación de defensa del terreno de una casilla. */
export function terrainDefense(type: TileType): number {
  return TERRAIN.defense[type] ?? 0;
}
