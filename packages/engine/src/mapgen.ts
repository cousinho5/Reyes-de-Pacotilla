// Generación del mapa a partir de una semilla (diseño, sección 6).
// - Castillos repartidos a distancias iguales por el borde.
// - Neutrales con la mezcla de TILE_MIX; las fortalezas nunca junto a un castillo.
// - Se prueban muchas colocaciones y se elige la más justa: cada castillo debe
//   tener alrededor un valor parecido y la mayor variedad de recursos posible.

import { mapSize } from "./map";
import { TILE_NAMES } from "./names";
import { seededRandom, shuffle } from "./random";
import { NEUTRAL_GARRISON, STARTING_TROOPS, TILE_MIX } from "./rules";
import type { HouseId, Tile, TileType } from "./types";

export type NeutralType = Exclude<TileType, "castillo">;

export interface GeneratedTile extends Omit<Tile, "id"> {
  name: string;
  note: string | null;
}

export interface GeneratedMap {
  cols: number;
  rows: number;
  tiles: GeneratedTile[];
  /** Puntuación de justicia de la colocación elegida (menor es más justa). */
  unfairness: number;
  /** Diferencia de valor de los alrededores entre el castillo mejor y el peor situado. */
  spread: number;
}

const ATTEMPTS = 600;
const CORNER_PENALTY = 3;
const TYPE_VALUE: Record<NeutralType, number> = {
  campos: 1,
  bosque: 1,
  cantera: 1,
  montana: 1,
  puerto: 1.2,
  fortaleza: 0.6,
};
const PRODUCING: NeutralType[] = ["campos", "bosque", "cantera", "montana", "puerto"];

/** Casillas del borde en orden de las agujas del reloj, empezando por (0,0). */
export function perimeter(cols: number, rows: number): [number, number][] {
  const out: [number, number][] = [];
  for (let x = 0; x < cols; x++) out.push([x, 0]);
  for (let y = 1; y < rows; y++) out.push([cols - 1, y]);
  for (let x = cols - 2; x >= 0; x--) out.push([x, rows - 1]);
  for (let y = rows - 2; y > 0; y--) out.push([0, y]);
  return out;
}

/** Cuántas casillas de cada tipo neutral hay en un mapa con `count` neutrales. */
export function neutralMix(count: number): NeutralType[] {
  const types = Object.keys(TILE_MIX) as NeutralType[];
  const exact = types.map((t) => ({ t, n: TILE_MIX[t] * count }));
  const bag = exact.flatMap(({ t, n }) => Array<NeutralType>(Math.floor(n)).fill(t));
  // Reparte los huecos que quedan por orden de mayor parte decimal.
  const rest = [...exact].sort((a, b) => (b.n % 1) - (a.n % 1) || types.indexOf(a.t) - types.indexOf(b.t));
  for (let i = 0; bag.length < count; i++) bag.push(rest[i % rest.length]!.t);
  return bag;
}

export function generateMap(seed: string, houses: HouseId[]): GeneratedMap {
  const { cols, rows } = mapSize(houses.length);
  const rand = seededRandom(seed);
  const ring = perimeter(cols, rows);

  const castleOrder = shuffle(houses, rand);
  const corners = new Set([`0,0`, `${cols - 1},0`, `0,${rows - 1}`, `${cols - 1},${rows - 1}`]);

  // Se prueban muchas colocaciones: castillos a distancias iguales por el borde
  // (con un desfase al azar) y neutrales mezcladas. Gana la más justa.
  let best: { castlePos: [number, number][]; free: [number, number][]; types: NeutralType[]; score: number } | null = null;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const offset = Math.floor(rand() * ring.length);
    const castlePos = houses.map(
      (_, i) => ring[(offset + Math.round((i * ring.length) / houses.length)) % ring.length]!,
    );
    const castleKey = new Set(castlePos.map(([x, y]) => `${x},${y}`));
    const free: [number, number][] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!castleKey.has(`${x},${y}`)) free.push([x, y]);
    const nearCastle = (x: number, y: number) =>
      castlePos.some(([cx, cy]) => Math.abs(cx - x) + Math.abs(cy - y) === 1);
    const types = shuffle(neutralMix(free.length), rand);
    if (types.some((t, i) => t === "fortaleza" && nearCastle(...free[i]!))) continue;
    // Las esquinas solo tienen dos vecinas: penalizan.
    const cornerPenalty = castlePos.filter(([x, y]) => corners.has(`${x},${y}`)).length;
    const score = unfairness(free, types, castlePos).score + cornerPenalty * CORNER_PENALTY;
    if (!best || score < best.score) best = { castlePos, free, types, score };
  }
  if (!best) throw new Error("No se encontró una colocación válida del mapa");
  const { castlePos, free } = best;

  const tiles: GeneratedTile[] = [];
  castlePos.forEach(([x, y], i) => {
    const house = castleOrder[i]!;
    tiles.push({ x, y, type: "castillo", owner: house, castleOf: house, troops: STARTING_TROOPS, name: "", note: null });
  });
  const usedNames = new Map<NeutralType, number>();
  const namePools = Object.fromEntries(
    (Object.keys(TILE_NAMES) as NeutralType[]).map((t) => [t, shuffle(TILE_NAMES[t], rand)]),
  ) as Record<NeutralType, typeof TILE_NAMES.campos>;
  free.forEach(([x, y], i) => {
    const type = best!.types[i]!;
    const n = usedNames.get(type) ?? 0;
    usedNames.set(type, n + 1);
    const pool = namePools[type];
    const entry = pool[n % pool.length]!;
    const name = n < pool.length ? entry.name : `${entry.name} ${toRoman(Math.floor(n / pool.length) + 1)}`;
    tiles.push({ x, y, type, owner: null, troops: NEUTRAL_GARRISON[type], name, note: entry.note });
  });
  tiles.sort((a, b) => a.y - b.y || a.x - b.x);
  return { cols, rows, tiles, unfairness: best.score, spread: unfairness(free, best.types, castlePos).spread };
}

/** Diferencia de valor entre castillos y recursos que le faltan a cada uno cerca. */
function unfairness(
  free: [number, number][],
  types: NeutralType[],
  castles: [number, number][],
): { score: number; spread: number } {
  const values: number[] = [];
  let missing = 0;
  for (const [cx, cy] of castles) {
    let value = 0;
    const seen = new Set<NeutralType>();
    free.forEach(([x, y], i) => {
      const d = Math.abs(cx - x) + Math.abs(cy - y);
      if (d > 2) return;
      const t = types[i]!;
      value += TYPE_VALUE[t] * (d === 1 ? 1 : 0.5);
      seen.add(t);
    });
    values.push(value);
    missing += PRODUCING.filter((t) => !seen.has(t)).length;
  }
  const spread = Math.max(...values) - Math.min(...values);
  return { score: spread * 2 + missing * 0.5, spread };
}

function toRoman(n: number): string {
  return ["", "I", "II", "III", "IV", "V"][n] ?? String(n);
}
