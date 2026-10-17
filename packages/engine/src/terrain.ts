// Terreno que cuenta en la guerra (diseño v3, fase 2): caminos, travesías por
// mar y lo que cada casilla hace al combate y a la vista. Los valores, en
// rules.ts (TERRAIN).

import { areAdjacent, distance } from "./map";
import { TERRAIN } from "./rules";
import type { HouseId, Tile, TileType } from "./types";

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
        if (!goal && (n.type === "montana" || n.type === "puerto" || n.type === "castillo")) continue;
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

export type MarchKind = "vecina" | "camino" | "mar";

/**
 * Cómo puede llegar un grupo de `house` de `from` a `to` en una noche:
 * - "vecina": casillas que se tocan.
 * - "camino": dos tramos de camino seguidos con la casilla de en medio propia.
 * - "mar": de un puerto propio a otro puerto.
 * null si no puede.
 */
export function marchKind(from: Tile, to: Tile, tiles: Tile[], house: HouseId): MarchKind | null {
  if (from.id === to.id) return null;
  if (areAdjacent(from, to)) return "vecina";
  if (TERRAIN.sea && from.type === "puerto" && to.type === "puerto" && from.owner === house) return "mar";
  if (TERRAIN.roads && distance(from, to) === 2) {
    const roads = roadSet(tiles);
    const mid = tiles.find(
      (m) => m.owner === house && areAdjacent(from, m) && areAdjacent(m, to) && roads.has(pairKey(from, m)) && roads.has(pairKey(m, to)),
    );
    if (mid) return "camino";
  }
  return null;
}

/** Bonificación de defensa del terreno de una casilla. */
export function terrainDefense(type: TileType): number {
  return TERRAIN.defense[type] ?? 0;
}
