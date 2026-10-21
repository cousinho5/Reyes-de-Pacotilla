// Generación del mapa a partir de una semilla (diseño, sección 6).
// - Castillos repartidos a distancias iguales por el borde.
// - Con geografía (bloque 1, MAP_GEN.geography): dos campos de ruido, altura y
//   humedad, deciden dónde cae cada tipo (costa en dos lados opuestos con los
//   puertos en la orilla, montañas en lo alto, canteras en las laderas, bosques
//   en lo húmedo, Prado entre bosques y campos) y un ajuste de salida da a cada
//   castillo los recursos básicos a 2 pasos. Las cantidades de cada tipo no
//   cambian: solo dónde cae cada casilla.
// - Neutrales con la mezcla de TILE_MIX; las fortalezas nunca junto a un castillo.
// - Se prueban muchas colocaciones y se elige la más justa: cada castillo debe
//   tener alrededor un valor parecido y la mayor variedad de recursos posible.

import { distance, mapSize } from "./map";
import { TILE_NAMES } from "./names";
import { seededRandom, shuffle } from "./random";
import { GRID, MAP_GEN, mapLayout, NEUTRAL_GARRISON, STARTING_TROOPS, TILE_MIX } from "./rules";
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
  /** Lados con costa (generación con geografía); null en los mapas de antes. */
  coast: Coast | null;
}

/** Costa en los lados izquierdo y derecho ("oeste-este") o arriba y abajo ("norte-sur"). */
export type Coast = "oeste-este" | "norte-sur";

const ATTEMPTS = 600;
const CORNER_PENALTY = 3;
const TYPE_VALUE: Record<NeutralType, number> = {
  campos: 1,
  bosque: 1,
  cantera: 1,
  montana: 1,
  puerto: 1.2,
  fortaleza: 0.6,
  paramo: 0,
  prado: 0,
};
const BASIC: NeutralType[] = ["campos", "bosque", "cantera", "montana"];
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
export function neutralMix(count: number, mix: Record<NeutralType, number> = TILE_MIX): NeutralType[] {
  const types = (Object.keys(mix) as NeutralType[]).filter((t) => mix[t] > 0);
  const exact = types.map((t) => ({ t, n: mix[t] * count }));
  const bag = exact.flatMap(({ t, n }) => Array<NeutralType>(Math.floor(n)).fill(t));
  // Reparte los huecos que quedan por orden de mayor parte decimal.
  const rest = [...exact].sort((a, b) => (b.n % 1) - (a.n % 1) || types.indexOf(a.t) - types.indexOf(b.t));
  for (let i = 0; bag.length < count; i++) bag.push(rest[i % rest.length]!.t);
  return bag;
}

/** Tamaño y páramos de un mapa (por defecto, los de MAP_LAYOUT o MAP_LAYOUT_HEX). */
export interface MapLayoutOverride {
  cols: number;
  rows: number;
  paramos: number;
}

export function generateMap(seed: string, houses: HouseId[], layout?: MapLayoutOverride): GeneratedMap {
  return MAP_GEN.geography ? generateGeographicMap(seed, houses, layout) : generateClassicMap(seed, houses, layout);
}

/** Generador de antes del bloque 1: cada casilla al azar, sin mirar a sus vecinas. */
export function generateClassicMap(seed: string, houses: HouseId[], layout?: MapLayoutOverride): GeneratedMap {
  const { cols, rows } = layout ?? mapSize(houses.length);
  const paramos = layout?.paramos ?? (houses.length >= 4 && houses.length <= 8 ? mapLayout(houses.length as 4 | 5 | 6 | 7 | 8).paramos : 0);
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
      castlePos.some(([cx, cy]) => distance({ x: cx, y: cy }, { x, y }) === 1);
    // Fortalezas y páramos nunca junto a un castillo (los páramos quedan entre
    // castillos, como tierra de nadie, sin castigar ninguna salida): se colocan
    // primero en huecos lejos de los castillos y el resto se reparte al azar.
    const mix = neutralMix(free.length - paramos);
    const special = [...Array<NeutralType>(paramos).fill("paramo"), ...mix.filter((t) => t === "fortaleza")];
    const rest = shuffle(mix.filter((t) => t !== "fortaleza"), rand);
    const far = shuffle(free.map((_, i) => i).filter((i) => !nearCastle(...free[i]!)), rand);
    if (far.length < special.length) continue;
    const types: NeutralType[] = new Array(free.length);
    special.forEach((t, k) => (types[far[k]!] = t));
    let r = 0;
    for (let i = 0; i < free.length; i++) if (!types[i]) types[i] = rest[r++]!;
    // Las esquinas solo tienen dos vecinas: penalizan.
    const cornerPenalty = castlePos.filter(([x, y]) => corners.has(`${x},${y}`)).length;
    const score = unfairness(free, types, castlePos).score + cornerPenalty * CORNER_PENALTY;
    if (!best || score < best.score) best = { castlePos, free, types, score };
  }
  if (!best) throw new Error("No se encontró una colocación válida del mapa");
  const { castlePos, free } = best;
  return {
    cols,
    rows,
    tiles: buildTiles(rand, houses, castleOrder, castlePos, free, best.types),
    unfairness: best.score,
    spread: unfairness(free, best.types, castlePos).spread,
    coast: null,
  };
}

/** Las casillas del mapa, con sus nombres, a partir de la colocación elegida. */
function buildTiles(
  rand: () => number,
  houses: HouseId[],
  castleOrder: HouseId[],
  castlePos: [number, number][],
  free: [number, number][],
  types: NeutralType[],
): GeneratedTile[] {
  void houses;
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
    const type = types[i]!;
    const n = usedNames.get(type) ?? 0;
    usedNames.set(type, n + 1);
    const pool = namePools[type];
    const entry = pool[n % pool.length]!;
    const name = n < pool.length ? entry.name : `${entry.name} ${toRoman(Math.floor(n / pool.length) + 1)}`;
    tiles.push({ x, y, type, owner: null, troops: NEUTRAL_GARRISON[type], name, note: entry.note });
  });
  tiles.sort((a, b) => a.y - b.y || a.x - b.x);
  return tiles;
}

/** Cuántos páramos y Prados lleva un mapa con geografía. */
export function wastelandSplit(paramos: number): { paramos: number; prados: number } {
  const prados = Math.round(paramos * MAP_GEN.pradoShare);
  return { paramos: paramos - prados, prados };
}

/** Generador con geografía (bloque 1, fase 1). */
export function generateGeographicMap(seed: string, houses: HouseId[], layout?: MapLayoutOverride): GeneratedMap {
  const { cols, rows } = layout ?? mapSize(houses.length);
  const sizeParamos = layout?.paramos ?? (houses.length >= 4 && houses.length <= 8 ? mapLayout(houses.length as 4 | 5 | 6 | 7 | 8).paramos : 0);
  const { paramos, prados } = wastelandSplit(sizeParamos);
  const rand = seededRandom(seed);
  const ring = perimeter(cols, rows);
  const castleOrder = shuffle(houses, rand);
  const corners = new Set([0, cols - 1, (rows - 1) * cols, rows * cols - 1]);
  const b = board(cols, rows);

  let best: { castles: number[]; free: number[]; types: Cells; score: number; coast: Coast } | null = null;
  for (let attempt = 0; attempt < MAP_GEN.attempts; attempt++) {
    const offset = Math.floor(rand() * ring.length);
    const castles = houses.map((_, i) => {
      const [x, y] = ring[(offset + Math.round((i * ring.length) / houses.length)) % ring.length]!;
      return y * cols + x;
    });
    const free = b.cells.filter((i) => !castles.includes(i));
    const coast: Coast = rand() < 0.5 ? "oeste-este" : "norte-sur";
    const geo = geography(rand, b, coast);
    const types = placeByGeography(b, free, castles, geo, coast, paramos, prados);
    if (!types) continue;
    if (MAP_GEN.balance) balanceStarts(b, free, types, castles);
    const cornerPenalty = castles.filter((c) => corners.has(c)).length;
    const scoreOf = () =>
      fairness(b, free, types, castles).score + cornerPenalty * CORNER_PENALTY - MAP_GEN.clusterWeight * clustering(b, free, types);
    let score = scoreOf();
    // Solo se pule el mapa si puede acabar entre los mejores (pulir es lento).
    if (MAP_GEN.balance && (!best || score < best.score + 2)) {
      evenOut(b, free, types, castles);
      score = scoreOf();
    }
    if (!best || score < best.score) best = { castles, free, types, score, coast };
  }
  if (!best) throw new Error("No se encontró una colocación válida del mapa");
  const xy = (i: number): [number, number] => [i % cols, Math.floor(i / cols)];
  return {
    cols,
    rows,
    tiles: buildTiles(rand, houses, castleOrder, best.castles.map(xy), best.free.map(xy), best.free.map((i) => best!.types[i]!)),
    unfairness: best.score,
    spread: fairness(b, best.free, best.types, best.castles).spread,
    coast: best.coast,
  };
}

/** Tipo de cada casilla del tablero por índice (y * cols + x); los castillos quedan vacíos. */
type Cells = (NeutralType | undefined)[];

/** Tablero precalculado: distancias y vecinas de cada casilla (no cambian entre intentos). */
interface Board {
  cols: number;
  rows: number;
  cells: number[];
  dist: Uint8Array;
  adj: number[][];
}

const boards = new Map<string, Board>();

function board(cols: number, rows: number): Board {
  const key = `${GRID.kind}:${cols}x${rows}`;
  const known = boards.get(key);
  if (known) return known;
  const n = cols * rows;
  const cells = Array.from({ length: n }, (_, i) => i);
  const dist = new Uint8Array(n * n);
  const adj: number[][] = cells.map(() => []);
  for (const i of cells) {
    for (const j of cells) {
      const d = distance({ x: i % cols, y: Math.floor(i / cols) }, { x: j % cols, y: Math.floor(j / cols) });
      dist[i * n + j] = d;
      if (d === 1) adj[i]!.push(j);
    }
  }
  const b = { cols, rows, cells, dist, adj };
  boards.set(key, b);
  return b;
}

const between = (b: Board, i: number, j: number) => b.dist[i * b.cells.length + j]!;

/** Pasos hasta el lado con costa más cercano. */
function coastSteps(b: Board, i: number, coast: Coast): number {
  const x = i % b.cols;
  const y = Math.floor(i / b.cols);
  return coast === "oeste-este" ? Math.min(x, b.cols - 1 - x) : Math.min(y, b.rows - 1 - y);
}

/** Centro de una casilla en unidades de casilla (los hexágonos "odd-r" se desplazan media en las filas impares). */
function cellCenter(x: number, y: number): [number, number] {
  return GRID.kind === "hex" ? [x + 0.5 * (y & 1), y * 0.866] : [x, y];
}

/** Ruido de valor suave: una rejilla de números al azar interpolada. */
function valueNoise(rand: () => number, cols: number, rows: number, scale: number): (px: number, py: number) => number {
  const gw = Math.ceil(cols / scale) + 3;
  const gh = Math.ceil(rows / scale) + 3;
  const grid = Array.from({ length: gw * gh }, () => rand());
  const ox = rand() * scale;
  const oy = rand() * scale;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (px, py) => {
    const fx = (px + ox) / scale;
    const fy = (py + oy) / scale;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = smooth(fx - ix);
    const ty = smooth(fy - iy);
    const at = (i: number, j: number) => grid[Math.min(gh - 1, j) * gw + Math.min(gw - 1, i)]!;
    const top = at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx;
    const bottom = at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
}

/** Pasa los valores a su puesto entre 0 y 1, para que los umbrales no dependan del ruido. */
function rank(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out = new Array<number>(values.length);
  const n = Math.max(1, values.length - 1);
  order.forEach(([, i], k) => (out[i] = k / n));
  return out;
}

interface Geography {
  /** Altura de 0 (lo más bajo) a 1 (lo más alto), por casilla. */
  height: number[];
  /** Humedad de 0 a 1. */
  moisture: number[];
}

/** Altura y humedad de cada casilla: más alto lejos de la costa, más húmedo cerca. */
function geography(rand: () => number, b: Board, coast: Coast): Geography {
  const scale = MAP_GEN.noiseScale;
  const h1 = valueNoise(rand, b.cols, b.rows, scale);
  const h2 = valueNoise(rand, b.cols, b.rows, scale / 2);
  const m1 = valueNoise(rand, b.cols, b.rows, scale);
  const m2 = valueNoise(rand, b.cols, b.rows, scale / 2);
  const far = Math.max(1, Math.floor(((coast === "oeste-este" ? b.cols : b.rows) - 1) / 2));
  const height: number[] = [];
  const moisture: number[] = [];
  for (const i of b.cells) {
    const [px, py] = cellCenter(i % b.cols, Math.floor(i / b.cols));
    const inland = Math.min(1, coastSteps(b, i, coast) / far);
    height.push(0.6 * (0.75 * h1(px, py) + 0.25 * h2(px, py)) + 0.4 * inland);
    moisture.push(0.8 * (0.75 * m1(px, py) + 0.25 * m2(px, py)) + 0.2 * (1 - inland));
  }
  return { height: rank(height), moisture: rank(moisture) };
}

/**
 * Reparte los tipos según la geografía, con las mismas cantidades que el
 * generador de antes. null si no hay sitio para fortalezas y páramos lejos de
 * los castillos.
 */
function placeByGeography(
  b: Board,
  free: number[],
  castles: number[],
  geo: Geography,
  coast: Coast,
  paramos: number,
  prados: number,
): Cells | null {
  const mix = neutralMix(free.length - paramos - prados, MAP_GEN.mix);
  const count = (t: NeutralType) => mix.filter((m) => m === t).length + (t === "paramo" ? paramos : 0) + (t === "prado" ? prados : 0);
  const types: Cells = new Array(b.cells.length);
  const { height: h, moisture: m } = geo;
  const castleDist = new Map(free.map((i) => [i, Math.min(...castles.map((c) => between(b, c, i)))]));
  const open = () => free.filter((i) => !types[i]);
  /** Coloca `n` casillas de tipo `t` en las de mayor puntuación entre las candidatas. */
  const take = (t: NeutralType, n: number, candidates: number[], score: (i: number) => number): boolean => {
    if (candidates.length < n) return false;
    const scored = candidates.map((i) => [score(i), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (const [, i] of scored.slice(0, n)) types[i] = t;
    return true;
  };

  // Puertos en la orilla, por turnos en las dos costas y en lo más bajo.
  const shore = open().filter((i) => coastSteps(b, i, coast) === 0);
  const side = (i: number) => (coast === "oeste-este" ? (i % b.cols === 0 ? 0 : 1) : i < b.cols ? 0 : 1);
  const bySide = [0, 1].map((s) => shore.filter((i) => side(i) === s).sort((x, y) => h[x]! - h[y]! || x - y));
  let ports = count("puerto");
  for (let k = 0; ports > 0 && (bySide[0]!.length || bySide[1]!.length); k++) {
    const next = bySide[k % 2]!.shift();
    if (next == null) continue;
    types[next] = "puerto";
    ports--;
  }
  // Sin orilla libre: el resto, en lo más bajo que quede junto a la costa.
  if (ports > 0 && !take("puerto", ports, open(), (i) => -coastSteps(b, i, coast) - h[i]!)) return null;
  // Fortalezas en los altos, lejos de los castillos (nunca junto a uno) y separadas entre sí.
  const forts: number[] = [];
  for (let k = 0; k < count("fortaleza"); k++) {
    const ok = open().filter((i) => castleDist.get(i)! >= 2);
    const spaced = ok.filter((i) => forts.every((f) => between(b, f, i) >= 2));
    if (!take("fortaleza", 1, spaced.length ? spaced : ok, (i) => h[i]! + 0.15 * Math.min(castleDist.get(i)!, 4))) return null;
    forts.push(free.find((i) => types[i] === "fortaleza" && !forts.includes(i))!);
  }
  // Páramos en lo más seco, nunca junto a un castillo.
  if (!take("paramo", count("paramo"), open().filter((i) => castleDist.get(i)! >= 2), (i) => -m[i]!)) return null;
  // Montañas en lo más alto; canteras en las laderas, junto a las montañas.
  take("montana", count("montana"), open(), (i) => h[i]!);
  take("cantera", count("cantera"), open(), (i) => h[i]! + (b.adj[i]!.some((j) => types[j] === "montana") ? 0.3 : 0));
  // Bosques en lo más húmedo; el Prado entre bosques y campos, en lo bajo.
  take("bosque", count("bosque"), open(), (i) => m[i]!);
  take("prado", count("prado"), open(), (i) => m[i]! - 0.5 * h[i]!);
  for (const i of open()) types[i] = "campos";
  return types;
}

/**
 * Ajuste de salida: si a un castillo le falta un recurso básico a 2 pasos, se
 * cambia una casilla suya repetida (o un Prado) por una del tipo que falta,
 * siempre que esa no deje sin él a otro castillo. Para no romper la geografía
 * se eligen las que menos la estropean.
 */
function balanceStarts(b: Board, free: number[], types: Cells, castles: number[]): void {
  const rings = new Map(castles.map((c) => [c, free.filter((i) => between(b, c, i) <= 2)]));
  const touching = (i: number, t: NeutralType) => b.adj[i]!.filter((j) => types[j] === t).length;
  for (let pass = 0; pass < 2; pass++) {
    for (const c of castles) {
      const ring = rings.get(c)!;
      for (const missing of BASIC) {
        if (ring.some((i) => types[i] === missing)) continue;
        const counts = new Map<NeutralType, number>();
        for (const i of ring) counts.set(types[i]!, (counts.get(types[i]!) ?? 0) + 1);
        // La que se da: un Prado o una repetida, que toque el tipo que falta y poco el suyo.
        const donorScore = (i: number) =>
          (types[i] === "prado" ? 1 : 0) + (counts.get(types[i]!)! - 2) * 0.5 + touching(i, missing) - touching(i, types[i]!);
        const donors = ring.filter((i) => types[i] === "prado" || (BASIC.includes(types[i]!) && counts.get(types[i]!)! >= 2));
        if (!donors.length) continue;
        const donor = donors.reduce((x, y) => (donorScore(y) > donorScore(x) ? y : x));
        // La que se trae: cerca, suelta y rodeada del tipo que se lleva a cambio.
        // No puede ser la única de su tipo para otro castillo.
        const sources = free.filter(
          (i) =>
            types[i] === missing &&
            between(b, c, i) > 2 &&
            castles.every((o) => o === c || between(b, o, i) > 2 || rings.get(o)!.some((j) => j !== i && types[j] === missing)),
        );
        if (!sources.length) continue;
        const sourceScore = (i: number) => between(b, c, i) * 0.5 + touching(i, missing) - touching(i, types[donor]!);
        const source = sources.reduce((x, y) => (sourceScore(y) < sourceScore(x) ? y : x));
        types[source] = types[donor];
        types[donor] = missing;
      }
    }
  }
}

/**
 * Pulido de justicia: al castillo peor situado se le cambia un Prado de su
 * alrededor por una casilla productiva de fuera, mientras el mapa sea más justo.
 */
function evenOut(b: Board, free: number[], types: Cells, castles: number[]): void {
  const rings = new Map(castles.map((c) => [c, free.filter((i) => between(b, c, i) <= 2)]));
  for (let step = 0; step < 3; step++) {
    const current = fairness(b, free, types, castles).score;
    const values = castles.map((c) =>
      rings.get(c)!.reduce((v, i) => v + TYPE_VALUE[types[i]!] * (between(b, c, i) === 1 ? 1 : 0.5), 0),
    );
    const poorest = castles[values.indexOf(Math.min(...values))]!;
    let bestSwap: [number, number] | null = null;
    let bestScore = current;
    for (const d of rings.get(poorest)!.filter((i) => types[i] === "prado")) {
      for (const src of free) {
        if (!BASIC.includes(types[src]!) || between(b, poorest, src) <= 2) continue;
        const t = types[src];
        types[src] = "prado";
        types[d] = t;
        const sc = fairness(b, free, types, castles).score;
        types[d] = "prado";
        types[src] = t;
        if (sc < bestScore - 1e-9) {
          bestScore = sc;
          bestSwap = [d, src];
        }
      }
    }
    if (!bestSwap) return;
    const [d, src] = bestSwap;
    types[d] = types[src];
    types[src] = "prado";
  }
}

/** Parte de las parejas de neutrales vecinas que son del mismo tipo (0 a 1): cuánto se agrupa el terreno. */
function clustering(b: Board, free: number[], types: Cells): number {
  let same = 0;
  let pairs = 0;
  for (const i of free) {
    for (const j of b.adj[i]!) {
      if (j <= i || !types[j]) continue;
      pairs++;
      if (types[i] === types[j]) same++;
    }
  }
  return pairs ? same / pairs : 0;
}

/** Como `unfairness`, con el tablero precalculado. */
function fairness(b: Board, free: number[], types: Cells, castles: number[]): { score: number; spread: number } {
  const values: number[] = [];
  let missing = 0;
  for (const c of castles) {
    let value = 0;
    const seen = new Set<NeutralType>();
    for (const i of free) {
      const d = between(b, c, i);
      if (d > 2) continue;
      const t = types[i]!;
      value += TYPE_VALUE[t] * (d === 1 ? 1 : 0.5);
      seen.add(t);
    }
    values.push(value);
    missing += PRODUCING.filter((t) => !seen.has(t)).length;
  }
  const spread = Math.max(...values) - Math.min(...values);
  return { score: spread * 2 + missing * 0.5, spread };
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
      const d = distance({ x: cx, y: cy }, { x, y });
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
