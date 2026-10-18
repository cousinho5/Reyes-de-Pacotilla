// El mapa entero como un solo lienzo de pixel art (64 px por casilla).
//
// Lecciones de otros juegos (ver docs/diseno.md, sección 19):
// - Carcassonne y Wesnoth: las casillas encajan porque el terreno sigue al
//   otro lado del borde. El suelo, los campos y los bosques se dibujan en
//   coordenadas del mundo, así que continúan en la casilla vecina, y entre
//   terrenos distintos hay una transición tramada.
// - Wesnoth: lo alto (montañas, copas, torres) puede asomar sobre la casilla
//   de arriba; se dibuja de arriba abajo para que lo de delante tape.
// - Catan y Carcassonne en BGA: el contraste manda. Cada terreno tiene su
//   forma y su textura, no solo su color.
// - Into the Breach y Diplomacy: lo que pasa se ve en el mapa. Las tropas son
//   figuras, las murallas una empalizada y la última batalla deja humo.
//
// Todo es determinista: la misma partida da el mismo dibujo. Sin animación:
// el mapa está quieto y solo cambia cuando cambia la partida.

import { GRID, roadEdges as engineRoadEdges, type TileType } from "@reyes/engine";
import { CELL } from "./cell";
import { edgeDistance, makeGeo, type Geo, type GridKind } from "./grid";
import type { Palette } from "./Pixels";
import { WORLD, noise, shade } from "./tiles";

export { CELL };

export interface WorldCell {
  x: number;
  y: number;
  type: TileType;
  /** Color (hex) de la casa dueña: banderas y tabardos de las tropas. */
  owner?: string | null;
  /** Tropas a la vista (null si no se ven). */
  troops?: number | null;
  /** De esas tropas, jinetes y catapultas. */
  jinetes?: number;
  catapultas?: number;
  fortified?: boolean;
  /** Hubo batalla aquí en la última resolución. */
  battle?: boolean;
  /** Color (hex) de la casa que la tiene sitiada: tiendas de campaña alrededor. */
  besieger?: string | null;
  /** Fuera de la vista de la casa. */
  fogged?: boolean;
}

export interface WorldOptions {
  cols: number;
  rows: number;
  cells: WorldCell[];
  /** Borde de tierra alrededor del tablero, en píxeles. */
  margin?: number;
  seed?: number;
  /** Forma de las casillas (por defecto, la del motor: GRID). */
  grid?: GridKind;
}

export interface WorldImage {
  width: number;
  height: number;
  margin: number;
  /** Una letra por píxel, fila a fila. */
  pixels: string[];
  palette: Palette;
  cols: number;
  rows: number;
  /** Niebla por casilla: fog[y][x]. */
  fog: boolean[][];
  grid: GridKind;
}

/** Geometría de un mundo ya dibujado (centros de casilla, contornos). */
export function geoOf(img: Pick<WorldImage, "grid" | "cols" | "rows" | "margin">): Geo {
  return makeGeo(img.grid, img.cols, img.rows, img.margin);
}

const FLAG_MAIN = "αβγδεζηθ";
const FLAG_SHADE = "ΑΒΓΔΕΖΗΘ";

type Ramp = [string, string, string, string];
type Ground = "meadow" | "forest" | "highland" | "dust" | "barren";

const GROUND_OF: Record<TileType, Ground> = {
  campos: "meadow",
  castillo: "meadow",
  puerto: "meadow",
  bosque: "forest",
  montana: "highland",
  cantera: "dust",
  fortaleza: "dust",
  paramo: "barren",
};

const RAMPS: Record<Ground, Ramp> = {
  meadow: ["2", "3", "4", "5"],
  forest: ["1", "2", "3", "4"],
  highland: ["2", "4", "F", "5"],
  dust: ["E", "f", "F", "a"],
  // Tierra reseca y pálida.
  barren: ["f", "F", "a", "A"],
};

const DARKER: Record<string, string> = {
  "6": "4", "5": "3", "4": "2", "3": "2", "2": "1", "1": "1",
  F: "f", f: "E", E: "e", e: "e", a: "A", A: "f", u: "T", T: "t", t: "S", S: "s",
  Y: "y", y: "W", W: "w", c: "B", C: "c", B: "b", D: "C", j: "H", J: "j", v: "V", q: "R",
};

/** Lienzo de letras. */
class Canvas {
  data: string[];
  constructor(
    public w: number,
    public h: number,
  ) {
    this.data = new Array<string>(w * h).fill(".");
  }
  inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): string | undefined {
    x = Math.round(x);
    y = Math.round(y);
    return this.inside(x, y) ? this.data[y * this.w + x] : undefined;
  }
  set(x: number, y: number, c: string) {
    x = Math.round(x);
    y = Math.round(y);
    if (this.inside(x, y)) this.data[y * this.w + x] = c;
  }
  darken(x: number, y: number) {
    const c = this.get(x, y);
    if (c && DARKER[c]) this.set(x, y, DARKER[c]!);
  }
  shadow(cx: number, cy: number, rx: number, ry: number) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.darken(x, y);
      }
    }
  }
}

/** Capa de un objeto: se pinta aparte y se pega con contorno oscuro. */
class Layer {
  pts = new Map<number, string>();
  constructor(private w: number) {}
  set(x: number, y: number, c: string) {
    this.pts.set(Math.round(y) * this.w + Math.round(x), c);
  }
  has(x: number, y: number) {
    return this.pts.has(Math.round(y) * this.w + Math.round(x));
  }
  stamp(art: readonly string[], x0: number, y0: number, flip = false) {
    art.forEach((line, dy) =>
      [...line].forEach((c, dx) => {
        if (c !== ".") this.set(flip ? x0 + line.length - 1 - dx : x0 + dx, y0 + dy, c);
      }),
    );
  }
  rect(x0: number, y0: number, w: number, h: number, fill: (x: number, y: number) => string) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, fill(x, y));
  }
  paint(cv: Canvas, edge: string | null = "k") {
    const w = this.w;
    if (edge) {
      for (const key of this.pts.keys()) {
        const x = key % w;
        const y = Math.floor(key / w);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          if (x + dx < 0 || x + dx >= w) continue;
          if (!this.pts.has((y + dy) * w + (x + dx))) cv.set(x + dx, y + dy, edge);
        }
      }
    }
    for (const [key, c] of this.pts) cv.set(key % w, Math.floor(key / w), c);
  }
}

// ---------------------------------------------------------------------------

export function renderWorld(opts: WorldOptions): WorldImage {
  const { cols, rows, cells } = opts;
  const M = opts.margin ?? 20;
  const seed = opts.seed ?? 7;
  const kind = opts.grid ?? GRID.kind;
  const geo = makeGeo(kind, cols, rows, M);
  const W = geo.width;
  const H = geo.height;
  const cv = new Canvas(W, H);
  const byPos = new Map(cells.map((c, i) => [`${c.x},${c.y}`, i]));
  const at = (x: number, y: number) => {
    const i = byPos.get(`${x},${y}`);
    return i == null ? undefined : cells[i];
  };

  // Banderas: una pareja de letras por color de casa.
  const palette: Palette = { ...WORLD };
  const flagChars = new Map<string, [string, string]>();
  for (const c of cells) {
    if (c.owner && !flagChars.has(c.owner) && flagChars.size < FLAG_MAIN.length) {
      const i = flagChars.size;
      flagChars.set(c.owner, [FLAG_MAIN[i]!, FLAG_SHADE[i]!]);
      palette[FLAG_MAIN[i]!] = c.owner;
      palette[FLAG_SHADE[i]!] = shade(c.owner, -0.35);
    }
  }
  const flagOf = (c: WorldCell): [string, string] => (c.owner ? flagChars.get(c.owner) ?? ["x", "X"] : ["x", "X"]);

  // 0. A qué casilla pertenece cada píxel y a qué distancia está del borde:
  // del más cercano (para la transición del suelo) y del más cercano con otro
  // terreno o con el final del mapa (para que lo de cada casilla no se salga).
  const cellOf = new Int32Array(W * H).fill(-1);
  const inside = new Uint8Array(W * H);
  const nearD = new Float32Array(W * H);
  const nearNb = new Int32Array(W * H).fill(-1);
  const diffD = new Float32Array(W * H);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const [gx, gy] = geo.cellAt(px, py);
      const idx = byPos.get(`${gx},${gy}`);
      const i = py * W + px;
      if (idx == null) continue;
      cellOf[i] = idx;
      let nd = Infinity;
      let nb = -1;
      let dd = Infinity;
      let outside = false;
      for (const [nx, ny] of geo.neighbours(gx, gy)) {
        const d = edgeDistance(geo, px, py, gx, gy, nx, ny);
        const n = byPos.get(`${nx},${ny}`);
        if (n == null) {
          if (d < 0) outside = true;
          dd = Math.min(dd, d);
          continue;
        }
        if (d < nd) [nd, nb] = [d, n];
        if (cells[n]!.type !== cells[idx]!.type) dd = Math.min(dd, d);
      }
      inside[i] = outside ? 0 : 1;
      nearD[i] = nd;
      nearNb[i] = nb;
      diffD[i] = dd;
    }
  }

  // 1. Suelo continuo, con transición tramada entre terrenos.
  const BLEND = 12;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const i = py * W + px;
      const here = cellOf[i]! >= 0 ? cells[cellOf[i]!] : undefined;
      let ground: Ground = here ? GROUND_OF[here.type] : "meadow";
      const nb = nearNb[i]! >= 0 ? cells[nearNb[i]!] : undefined;
      if (here && inside[i] && nb) {
        const d = nearD[i]!;
        if (d < BLEND && GROUND_OF[nb.type] !== ground) {
          const wave = (noise(Math.floor(px / 4), Math.floor(py / 4), seed + 8) - 0.5) * 0.4;
          if (noise(px, py, seed + 3) < (1 - d / BLEND) * 0.55 + wave * (1 - d / BLEND)) ground = GROUND_OF[nb.type];
        }
      }
      const [dk, md, lt, hi] = RAMPS[ground];
      // Manchas grandes (dos escalas) y poco grano fino: se lee como prado, no como ruido.
      const big = noise(Math.floor(px / 12), Math.floor(py / 10), seed + 11) - 0.5;
      const mid = noise(Math.floor(px / 5), Math.floor(py / 4), seed + 12) - 0.5;
      const v = 0.5 + big * 0.7 + mid * 0.35 + (noise(px, py, seed) - 0.5) * 0.22;
      cv.data[i] = v < 0.2 ? dk : v > 0.8 ? (v > 0.9 && noise(px, py, seed + 1) > 0.5 ? hi : lt) : md;
    }
  }
  // Matas de hierba y alguna flor.
  for (let i = 0; i < (W * H) / 70; i++) {
    const x = Math.floor(noise(i, 1, seed + 21) * W);
    const y = Math.floor(noise(i, 2, seed + 21) * H);
    const g = cv.get(x, y);
    if (g === "3" || g === "4" || g === "2") {
      const flower = noise(i, 3, seed + 21);
      if (flower > 0.93) {
        cv.set(x, y, flower > 0.97 ? "v" : flower > 0.95 ? "Y" : "q");
      } else {
        cv.set(x, y, "5");
        cv.set(x - 1, y + 1, "4");
        cv.set(x + 1, y + 1, "4");
        cv.set(x, y + 1, "2");
      }
    }
  }

  // 2. Agua: los puertos forman bahías que se unen entre sí y con el mar del borde.
  const water = new Uint8Array(W * H);
  const wobble = (px: number, py: number) => (noise(Math.floor(px / 5), Math.floor(py / 5), seed + 5) - 0.5) * 0.35;
  for (const p of cells.filter((c) => c.type === "puerto")) {
    const [cx, cy] = geo.center(p.x, p.y);
    // La bahía, algo más alta que baja: abajo queda la orilla del muelle.
    for (let py = Math.floor(cy - 30); py < cy + 30; py++) {
      for (let px = Math.floor(cx - 30); px < cx + 30; px++) {
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const ry = py < cy ? 24 : 14;
        if (Math.abs((px - cx) / 25) ** 2.6 + Math.abs((py - cy) / ry) ** 2.6 < 0.8 + wobble(px, py)) water[py * W + px] = 1;
      }
    }
    // Canales hacia los puertos vecinos y hacia el mar, fuera del mapa.
    for (const [nx, ny] of geo.neighbours(p.x, p.y)) {
      const n = at(nx, ny);
      if (n && n.type !== "puerto") continue;
      const [ex, ey] = geo.center(nx, ny);
      const far = n ? 1 : 1 + M / CELL;
      const bx = cx + (ex - cx) * far;
      const by = cy + (ey - cy) * far;
      const len2 = (bx - cx) ** 2 + (by - cy) ** 2;
      const r = n ? 15 : 22;
      for (let py = Math.floor(Math.min(cy, by) - r - 4); py < Math.max(cy, by) + r + 4; py++) {
        for (let px = Math.floor(Math.min(cx, bx) - r - 4); px < Math.max(cx, bx) + r + 4; px++) {
          if (px < 0 || py < 0 || px >= W || py >= H) continue;
          const t = Math.max(0, Math.min(1, ((px - cx) * (bx - cx) + (py - cy) * (by - cy)) / len2));
          const d = Math.hypot(px - (cx + (bx - cx) * t), py - (cy + (by - cy) * t));
          if (d < r * (1 + wobble(px, py))) water[py * W + px] = 1;
        }
      }
    }
  }
  const isWater = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && water[Math.round(y) * W + Math.round(x)] === 1;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const i = py * W + px;
      if (water[i]) {
        // Orilla clara, aguas profundas en el centro, crestas cortas y espaciadas.
        let shore = 0;
        for (let r = 1; r <= 4 && !shore; r++) {
          if (!isWater(px + r, py) || !isWater(px - r, py) || !isWater(px, py + r) || !isWater(px, py - r)) shore = r;
        }
        const band = py % 8;
        const crest = band === 0 && (px + Math.floor(py / 8) * 7) % 15 < 4;
        const under = band === 1 && (px + Math.floor(py / 8) * 7) % 15 === 1;
        cv.data[i] =
          shore === 1 ? "D" : shore === 2 ? "C" : crest ? "C" : under ? "c" : shore ? "c" : noise(Math.floor(px / 3), Math.floor(py / 2), seed + 2) > 0.8 ? "b" : "B";
      } else {
        for (let r = 1; r <= 3; r++) {
          if (isWater(px + r, py) || isWater(px - r, py) || isWater(px, py + r) || isWater(px, py - r)) {
            cv.data[i] = r === 1 ? (noise(px, py, 4) > 0.7 ? "A" : "a") : r === 2 ? (noise(px, py, 6) > 0.3 ? "a" : "A") : noise(px, py, 7) > 0.5 ? "a" : cv.data[i]!;
            break;
          }
        }
      }
    }
  }

  // 3. Caminos entre castillos y fortalezas: siguen de una casilla a otra.
  const road = new Uint8Array(W * H);
  for (const [a, b] of roadEdges(cols, rows, cells, kind)) {
    const [ax, ay0] = geo.center(a.x, a.y);
    const [bx, by0] = geo.center(b.x, b.y);
    const ay = ay0 + 10;
    const by = by0 + 10;
    const len = Math.hypot(bx - ax, by - ay);
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    for (let s = 0; s <= len; s += 0.5) {
      const t = s / len;
      const wob = Math.sin(t * Math.PI) * Math.sin(t * Math.PI * 2 + a.x + b.y) * 6;
      const x = ax + (bx - ax) * t + nx * wob;
      const y = ay + (by - ay) * t + ny * wob;
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          if (ox * ox + oy * oy > 5) continue;
          const rx = Math.round(x + ox);
          const ry = Math.round(y + oy);
          if (!cv.inside(rx, ry) || water[ry * W + rx]) continue;
          road[ry * W + rx] = 1;
        }
      }
    }
  }
  for (let i = 0; i < W * H; i++) {
    if (!road[i]) continue;
    const x = i % W;
    const y = Math.floor(i / W);
    const edge = !road[i - 1] || !road[i + 1] || !road[i - W] || !road[i + W];
    // Roderas: dos líneas algo más oscuras en el centro del camino.
    cv.data[i] = edge ? "E" : noise(x, y, 9) > 0.8 ? "F" : noise(x, y, 10) > 0.85 ? "E" : "f";
  }
  const onRoad = (x: number, y: number) => cv.inside(x, y) && road[Math.round(y) * W + Math.round(x)] === 1;

  // 3b. Linde entre casillas: un punteado oscuro muy fino sobre el suelo, para
  // que se lea cada casilla sin dibujar una rejilla.
  for (let i = 0; i < W * H; i++) {
    if (!inside[i] || nearNb[i]! < 0 || nearD[i]! >= 1 || road[i] || water[i]) continue;
    const x = i % W;
    const y = Math.floor(i / W);
    if ((x + y) % 4 !== 0) cv.darken(x, y);
  }

  // 4. Lo que hay en cada casilla, de arriba abajo para que lo de delante tape.
  const order = cells.map((c, i) => ({ c, i })).sort((a, b) => a.c.y - b.c.y || a.c.x - b.c.x);
  const boxOf = (c: WorldCell): [number, number] => {
    const [cx, cy] = geo.center(c.x, c.y);
    return [cx - CELL / 2, cy - CELL / 2];
  };
  for (const { c, i } of order) {
    const [x0, y0] = boxOf(c);
    const s = seed * 97 + i * 31 + c.x * 7 + c.y * 13;
    // (dx, dy): lado izquierdo, derecho, de arriba o de abajo. En hexágonos,
    // arriba y abajo hay dos vecinas: basta con que una sea del mismo terreno.
    const same = (dx: number, dy: number) => {
      if (dy === 0 || kind === "square") return at(c.x + dx, c.y + dy)?.type === c.type;
      return geo.neighbours(c.x, c.y).some(([nx, ny]) => ny === c.y + dy && at(nx, ny)?.type === c.type);
    };
    const mine = (px: number, py: number) => {
      if (!cv.inside(px, py)) return false;
      const k = Math.round(py) * W + Math.round(px);
      return cellOf[k] === i && inside[k] === 1;
    };
    const border = (px: number, py: number) => (cv.inside(px, py) ? diffD[Math.round(py) * W + Math.round(px)]! : -1);
    DRAW[c.type]({ cv, W, x0, y0, s, same, mine, border, onRoad, isWater, flag: flagOf(c) });
  }

  // 5. Lo que cambia con la partida: empalizadas, batallas y tropas.
  for (const { c } of order) {
    const [x0, y0] = boxOf(c);
    if (c.fortified && c.type !== "castillo") palisade(cv, W, geo.outline(c.x, c.y, 4));
    if (c.battle) battlefield(cv, W, x0, y0, seed + c.x * 5 + c.y * 3);
    if (c.besieger) camp(cv, W, x0, y0, flagChars.get(c.besieger) ?? ["x", "X"], isWater);
    if (c.troops != null && c.troops > 0)
      soldiers(cv, W, x0, y0, c.troops, c.owner ? flagOf(c) : null, seed + c.x + c.y * 9, isWater, c.jinetes ?? 0, c.catapultas ?? 0);
  }

  // 6. El margen se oscurece hacia fuera, como un mapa sobre la mesa.
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const d = Math.min(px, py, W - 1 - px, H - 1 - py);
      if (d < 6 && noise(px, py, 77) < (6 - d) / 7) cv.darken(px, py);
      if (d < 2) cv.darken(px, py);
    }
  }

  const pixels: string[] = [];
  for (let y = 0; y < H; y++) pixels.push(cv.data.slice(y * W, (y + 1) * W).join(""));
  const fog = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => !!at(x, y)?.fogged));
  return { width: W, height: H, margin: M, pixels, palette, cols, rows, fog, grid: kind };
}

/**
 * Red de caminos: la del motor (terrain.ts), que es la que cuenta en la guerra
 * (por los caminos se avanzan dos casillas por noche). Se dibuja tal cual.
 */
export function roadEdges(_cols: number, _rows: number, cells: WorldCell[], _grid: GridKind = GRID.kind): [WorldCell, WorldCell][] {
  return engineRoadEdges(cells);
}

// ---------------------------------------------------------------------------
// Piezas

interface CellCtx {
  cv: Canvas;
  W: number;
  x0: number;
  y0: number;
  s: number;
  same: (dx: number, dy: number) => boolean;
  /** El píxel es de esta casilla (dentro de su hexágono o cuadrado). */
  mine: (px: number, py: number) => boolean;
  /** Distancia del píxel al borde con otro terreno o con el final del mapa. */
  border: (px: number, py: number) => number;
  onRoad: (x: number, y: number) => boolean;
  isWater: (x: number, y: number) => boolean;
  flag: [string, string];
}

/** ¿Está (lx, ly) fuera de la casilla o cerca de un lado cuyo vecino es de otro terreno? */
function inset(ctx: CellCtx, lx: number, ly: number, m: number): boolean {
  const px = ctx.x0 + lx;
  const py = ctx.y0 + ly;
  return !ctx.mine(px, py) || ctx.border(px, py) < m;
}

/** Árbol de copa redonda con luz arriba a la izquierda y follaje con grano. */
function tree(ctx: CellCtx, cx: number, cy: number, r: number, seed: number) {
  const { cv, W } = ctx;
  cv.shadow(cx + r * 0.5, cy + r + 2, r + 1, 2.2);
  const layer = new Layer(W);
  for (let y = Math.round(cy + r * 0.5); y <= cy + r + 3; y++) {
    layer.set(cx - 1, y, "j");
    layer.set(cx, y, "H");
    layer.set(cx + 1, y, "h");
  }
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      // Copa en racimos: tres bultos para que no sea un círculo perfecto.
      const lobes = Math.min(Math.hypot(dx, dy * 1.05), Math.hypot(dx + r * 0.45, dy - r * 0.25) + r * 0.15, Math.hypot(dx - r * 0.45, dy - r * 0.2) + r * 0.15);
      if (lobes > r + (noise(x, y, seed + 9) - 0.5) * 1.2) continue;
      const leaf = noise(Math.floor(x / 2), Math.floor(y / 2), seed) - 0.5;
      const lit = (-dx * 0.8 - dy) / (r * 1.5) + leaf * 0.6;
      layer.set(x, y, lit > 0.62 ? "6" : lit > 0.32 ? "5" : lit > 0 ? "4" : lit > -0.35 ? "3" : lit > -0.7 ? "2" : "1");
    }
  }
  layer.paint(cv, "1");
}

/** Conífera de pisos. */
function conifer(ctx: CellCtx, cx: number, base: number, h: number) {
  ctx.cv.shadow(cx + 2, base + 1, h / 3, 1.4);
  const layer = new Layer(ctx.W);
  for (let i = 0; i < h; i++) {
    const tier = i % 4;
    const half = Math.floor(((i + 1) / h) * (h / 3)) + (tier === 3 ? 1 : 0);
    for (let dx = -half; dx <= half; dx++) layer.set(cx + dx, base - h + i, dx < -half / 3 ? "4" : dx < half / 3 ? "3" : "2");
  }
  layer.set(cx, base, "H");
  layer.set(cx, base + 1, "h");
  layer.paint(ctx.cv, "1");
}

function bush(ctx: CellCtx, cx: number, cy: number, r: number) {
  const layer = new Layer(ctx.W);
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      const dx = (x - cx) / (r + 1);
      const dy = (y - cy) / r;
      if (dx * dx + dy * dy > 1) continue;
      layer.set(x, y, dx + dy < -0.4 ? "5" : dx + dy < 0.4 ? "4" : "3");
    }
  }
  layer.paint(ctx.cv, "2");
}

function rock(ctx: CellCtx, cx: number, cy: number, r: number, seed: number) {
  ctx.cv.shadow(cx + 1, cy + r, r + 1, 1.2);
  const layer = new Layer(ctx.W);
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      const dx = (x - cx) / (r + 1);
      const dy = (y - cy) / r;
      if (dx * dx + dy * dy > 1 + (noise(x, y, seed) - 0.5) * 0.4) continue;
      const lit = -dx - dy + (noise(x, y, seed + 1) - 0.5) * 0.4;
      layer.set(x, y, lit > 0.7 ? "u" : lit > 0 ? "T" : lit > -0.7 ? "t" : "S");
    }
  }
  layer.paint(ctx.cv, "s");
}

/** Casa de labranza: muros encalados, tejado rojo, puerta, ventanas y chimenea. */
function cottage(layer: Layer, x: number, y: number, w: number, roof: "rojo" | "pizarra" = "rojo") {
  const [lit, mid, dark] = roof === "rojo" ? ["q", "R", "r"] : ["t", "S", "s"];
  const rh = Math.ceil(w / 2);
  for (let i = 0; i < rh; i++) {
    for (let xx = x + rh - 1 - i; xx <= x + w - rh + i; xx++) layer.set(xx, y + i, xx < x + w / 2 - 1 ? lit : xx < x + w / 2 + 1 ? mid : dark);
  }
  // Teja: una fila más oscura cada dos.
  for (let i = 1; i < rh; i += 2) for (let xx = x + rh - 1 - i; xx <= x + w - rh + i; xx++) if ((xx + i) % 3 === 0) layer.set(xx, y + i, dark);
  layer.rect(x + w - 4, y - 2, 2, 3, () => "S");
  const wy = y + rh;
  layer.rect(x, wy, w, 6, (xx, yy) => (xx === x ? "v" : xx === x + w - 1 ? "V" : yy === wy + 5 ? "V" : "v"));
  // Vigas de madera.
  for (let xx = x; xx < x + w; xx++) layer.set(xx, wy, "j");
  layer.set(x + Math.floor(w / 2), wy + 3, "h");
  layer.set(x + Math.floor(w / 2), wy + 4, "h");
  layer.set(x + Math.floor(w / 2), wy + 5, "h");
  layer.set(x + 2, wy + 2, "C");
  layer.set(x + w - 3, wy + 2, "C");
}

function masonry(layer: Layer, x0: number, y0: number, w: number, h: number, light = "T", mid = "t", dark = "S") {
  layer.rect(x0, y0, w, h, (x, y) => {
    const course = Math.floor((y - y0) / 3);
    const joint = (y - y0) % 3 === 2 || (x - x0 + (course % 2) * 2) % 5 === 4;
    if (x === x0) return light;
    if (x >= x0 + w - 2) return dark;
    if (joint) return noise(x, y, 6) > 0.7 ? mid : dark;
    return noise(x, y, 5) > 0.82 ? light : mid;
  });
}

function crenels(layer: Layer, x0: number, y: number, w: number) {
  for (let x = x0; x < x0 + w; x++) {
    if ((x - x0) % 4 < 2 || x === x0 + w - 1) {
      layer.set(x, y, x === x0 ? "u" : "T");
      layer.set(x, y - 1, "u");
      layer.set(x, y - 2, (x - x0) % 4 === 0 ? "u" : "T");
    } else layer.set(x, y, "T");
  }
}

function cone(layer: Layer, cx: number, baseY: number, half: number, h: number) {
  for (let i = 0; i <= h; i++) {
    const w = (half * i) / h;
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const left = x < cx;
      layer.set(x, baseY - h + i, i === h ? "r" : left ? (x < cx - w / 2 ? "q" : "R") : x === Math.round(cx) ? "R" : "r");
    }
    if (i % 2 === 1) for (let x = Math.round(cx - w); x <= Math.round(cx + w); x += 2) layer.set(x, baseY - h + i, "r");
  }
}

function flagPole(layer: Layer, x: number, top: number, pole: number, flag: [string, string]) {
  const [m, d] = flag;
  for (let y = top; y < top + pole + 4; y++) layer.set(x, y, "h");
  layer.set(x, top - 1, "y");
  layer.stamp([`${m}${m}${m}${m}${m}`, `${m}${m}${m}${m}${d}`, `${m}${m}${m}${d}.`, `${m}${d}${d}..`], x + 1, top);
}

function windowSlit(layer: Layer, x: number, y: number, h = 3) {
  for (let i = 0; i < h; i++) layer.set(x, y + i, i === 0 ? "s" : "k");
}

function gate(layer: Layer, cx: number, bottom: number, w: number, h: number) {
  const x0 = cx - Math.floor(w / 2);
  for (let y = bottom - h + 1; y <= bottom; y++) {
    const row = y - (bottom - h + 1);
    for (let x = x0; x < x0 + w; x++) {
      // Arco de medio punto.
      const arc = row < 2 && (x - x0 < 2 - row || x0 + w - 1 - x < 2 - row);
      if (arc) continue;
      layer.set(x, y, row === 0 ? "h" : (x - x0) % 2 ? "H" : "j");
    }
  }
  // Rastrillo levantado.
  for (let x = x0 + 1; x < x0 + w - 1; x += 2) layer.set(x, bottom - h + 2, "s");
}

function boat(layer: Layer, x: number, y: number, size: number, flag: [string, string], sail: "rayas" | "blanca") {
  const mast = Math.round(size * 1.1);
  for (let yy = y; yy < y + mast; yy++) layer.set(x + Math.round(size * 0.45), yy, "h");
  for (let yy = y + 1; yy < y + mast - 2; yy++) {
    const w = Math.round(((yy - y) / mast) * size * 0.55);
    for (let xx = x + Math.round(size * 0.45) + 1; xx <= x + Math.round(size * 0.45) + 1 + w; xx++) {
      layer.set(xx, yy, sail === "rayas" && (yy + 1) % 4 < 2 ? "q" : xx === x + Math.round(size * 0.45) + 1 + w ? "V" : "v");
    }
  }
  layer.stamp([`${flag[0]}${flag[0]}${flag[1]}`], x + Math.round(size * 0.45) + 1, y - 1);
  const hy = y + mast;
  layer.rect(x, hy, size, 2, (_x, yy) => (yy === hy ? "J" : "j"));
  layer.rect(x + 1, hy + 2, size - 2, 1, () => "H");
  layer.rect(x + 3, hy + 3, size - 6, 1, () => "h");
}

// ---------------------------------------------------------------------------
// Terrenos

const DRAW: Record<TileType, (ctx: CellCtx) => void> = {
  paramo(ctx) {
    const { cv, x0, y0, s } = ctx;
    // Grietas de tierra seca: líneas quebradas en coordenadas del mundo.
    for (let ly = 0; ly < CELL; ly++) {
      for (let lx = 0; lx < CELL; lx++) {
        const px = x0 + lx;
        const py = y0 + ly;
        if (inset(ctx, lx, ly, 4) || ctx.onRoad(px, py) || ctx.isWater(px, py)) continue;
        const cx = Math.floor(px / 9);
        const cy = Math.floor(py / 7);
        const ox = Math.floor(noise(cx, cy, 61) * 9);
        const oy = Math.floor(noise(cx, cy, 62) * 7);
        const crack = (px % 9 === ox && noise(px, Math.floor(py / 2), 63) > 0.35) || (py % 7 === oy && noise(Math.floor(px / 2), py, 64) > 0.4);
        if (crack) cv.set(px, py, noise(px, py, 65) > 0.5 ? "f" : "E");
      }
    }
    // Hierba seca a matojos.
    for (let i = 0; i < 26; i++) {
      const gx = x0 + 3 + Math.floor(noise(s, i, 66) * 58);
      const gy = y0 + 3 + Math.floor(noise(s, i + 40, 66) * 58);
      if (ctx.onRoad(gx, gy) || ctx.isWater(gx, gy)) continue;
      cv.set(gx, gy, "W");
      cv.set(gx - 1, gy + 1, "w");
      cv.set(gx + 1, gy + 1, "W");
      cv.set(gx, gy + 1, "w");
    }
    // Piedras sueltas.
    for (let i = 0; i < 4; i++) {
      const rx = x0 + 8 + Math.floor(noise(s, i, 67) * 48);
      const ry = y0 + 10 + Math.floor(noise(s, i + 9, 67) * 46);
      if (!ctx.onRoad(rx, ry)) rock(ctx, rx, ry, 1 + Math.floor(noise(s, i + 3, 67) * 2.5), s + i);
    }
    // Un árbol seco con un buitre, o una calavera de vaca: aquí no se para nadie.
    const l = new Layer(ctx.W);
    const tx = x0 + 14 + Math.floor(noise(s, 1, 68) * 30);
    const ty = y0 + 14 + Math.floor(noise(s, 2, 68) * 18);
    if (!ctx.onRoad(tx + 6, ty + 18)) {
      ctx.cv.shadow(tx + 8, ty + 20, 6, 1.4);
      l.stamp(
        [
          "...h......h..",
          "h..hj....hh..",
          ".h.hj...hh...",
          "..hhjh.hh..k.",
          "....hjhh..kSk",
          ".....hj..kTTk",
          ".....hj...kk.",
          ".....hj......",
          "....hhjj.....",
          ".....hj......",
          ".....hj......",
          ".....hj......",
          "....hhjj.....",
          "...hh..jj....",
        ],
        tx,
        ty + 6,
      );
      // El buitre posado en la rama.
      l.stamp([".SS.", "SuSS", ".SS.", "..y."], tx + 9, ty + 2);
    }
    const kx = x0 + 40 + Math.floor(noise(s, 3, 68) * 14);
    const ky = y0 + 46 + Math.floor(noise(s, 4, 68) * 8);
    if (!ctx.onRoad(kx + 3, ky + 2)) l.stamp(["u...u", ".uuu.", ".kuk.", "..u.."], kx, ky);
    l.paint(cv);
  },

  campos(ctx) {
    const { cv, x0, y0, s } = ctx;
    // Parcelas en coordenadas del mundo, separadas por setos: siguen en la casilla vecina.
    const PW = 21;
    const PH = 15;
    for (let ly = 0; ly < CELL; ly++) {
      for (let lx = 0; lx < CELL; lx++) {
        const px = x0 + lx;
        const py = y0 + ly;
        if (inset(ctx, lx, ly, 5) || ctx.onRoad(px, py) || ctx.isWater(px, py)) continue;
        const hedge = px % PW === 0 || py % PH === 0;
        if (hedge) {
          cv.set(px, py, noise(px, py, 2) > 0.55 ? "2" : "3");
          continue;
        }
        const kind = Math.floor(noise(Math.floor(px / PW), Math.floor(py / PH), 41) * 5);
        const v = noise(px, py, 5);
        let c: string;
        if (kind === 0) c = py % 3 === 0 ? "W" : v > 0.55 ? "Y" : "y"; // trigo maduro
        else if (kind === 1) c = py % 3 === 0 ? "E" : (px + py) % 4 === 0 && py % 3 === 1 ? "4" : "f"; // arado con brotes
        else if (kind === 2) c = py % 2 === 0 ? "4" : v > 0.6 ? "5" : "3"; // hortalizas
        else if (kind === 3) c = (px + py) % 6 < 3 ? (py % 3 === 0 ? "w" : "W") : "y"; // gavillas en hileras
        else c = py % 4 === 0 ? "3" : v > 0.7 ? "6" : v > 0.3 ? "5" : "4"; // prado de siega
        cv.set(px, py, c);
      }
    }
    // Setos con arbustos sueltos en los linderos.
    for (let i = 0; i < 6; i++) {
      const bx = x0 + 6 + Math.floor(noise(s, i, 3) * 52);
      const by = y0 + 6 + Math.floor(noise(s, i + 9, 3) * 52);
      if ((bx % PW < 2 || by % PH < 2) && !ctx.onRoad(bx, by)) bush(ctx, bx, by, 2);
    }
    // Granja o molino, y un espantapájaros.
    const layer = new Layer(ctx.W);
    const pick = noise(s, 1, 3);
    const hx = x0 + 8 + Math.floor(noise(s, 2, 3) * 30);
    const hy = y0 + 14 + Math.floor(noise(s, 3, 3) * 20);
    if (pick < 0.55) {
      cv.shadow(hx + 9, hy + 16, 11, 2);
      cottage(layer, hx, hy, 16);
      // Pajar.
      layer.stamp(["..YYy..", ".YyyyW.", "YyyWyyW", "yyWyyWw", "WwwWwww"], hx + 18, hy + 9);
    } else {
      // Molino de viento.
      cv.shadow(hx + 8, hy + 22, 8, 2);
      layer.rect(hx + 4, hy + 8, 9, 14, (x, y) => (x === hx + 4 ? "v" : x >= hx + 11 ? "V" : (y - hy) % 4 === 0 ? "V" : "v"));
      for (let i = 0; i < 4; i++) for (let x = hx + 4 + i - 1; x <= hx + 12 - i + 1; x++) layer.set(x, hy + 4 + i, x < hx + 8 ? "q" : "r");
      layer.set(hx + 8, hy + 18, "h");
      layer.set(hx + 8, hy + 19, "h");
      layer.set(hx + 8, hy + 20, "h");
      layer.set(hx + 8, hy + 21, "h");
      layer.set(hx + 8, hy + 12, "k");
      // Aspas en aspa.
      for (let i = -9; i <= 9; i++) {
        if (i === 0) continue;
        layer.set(hx + 8 + i, hy + 6 + i, Math.abs(i) > 3 ? "v" : "j");
        layer.set(hx + 8 + i, hy + 6 - i, Math.abs(i) > 3 ? "V" : "j");
      }
      layer.set(hx + 8, hy + 6, "h");
    }
    layer.paint(cv);
    const sc = new Layer(ctx.W);
    const sx = x0 + 40 + Math.floor(noise(s, 4, 3) * 14);
    const sy = y0 + 36 + Math.floor(noise(s, 5, 3) * 14);
    if (!ctx.onRoad(sx + 3, sy + 8)) {
      cv.shadow(sx + 4, sy + 13, 3, 1);
      sc.stamp(["..yYy..", ".yYYYy.", "..vvV..", "..vkv..", "hjjHjjh", "..RqR..", "..RRr..", "...h...", "...h...", "...h...", "...h..."], sx, sy);
      sc.paint(cv);
    }
  },

  bosque(ctx) {
    const { x0, y0, s } = ctx;
    // Árboles en una rejilla del mundo con desplazamiento: el bosque sigue al otro lado del borde.
    const spots: [number, number, number, boolean][] = [];
    const S = 13;
    for (let gy = Math.floor(y0 / S) - 1; gy <= Math.floor((y0 + CELL) / S); gy++) {
      for (let gx = Math.floor(x0 / S) - 1; gx <= Math.floor((x0 + CELL) / S); gx++) {
        const tx = gx * S + 3 + Math.floor(noise(gx, gy, 51) * 8) + (gy % 2) * 5;
        const ty = gy * S + 3 + Math.floor(noise(gx, gy, 52) * 8);
        const lx = tx - x0;
        const ly = ty - y0;
        if (lx < 0 || ly < 0 || lx >= CELL || ly >= CELL || !ctx.mine(tx, ty)) continue;
        if (inset(ctx, lx, ly, 7) && noise(gx, gy, 53) < 0.75) continue;
        if (ctx.onRoad(tx, ty + 6) || ctx.isWater(tx, ty + 5)) continue;
        if (noise(gx, gy, 54) < 0.1) continue; // claro
        spots.push([tx, ty, 5 + noise(gx, gy, 55) * 3, noise(gx, gy, 56) < 0.25]);
      }
    }
    spots.sort((a, b) => a[1] - b[1]);
    for (const [tx, ty, r, pine] of spots) {
      if (pine) conifer(ctx, tx, ty + r + 3, Math.round(r * 2.4));
      else tree(ctx, tx, ty, r, s + tx);
    }
    // Setas y un ciervo de vez en cuando.
    for (let i = 0; i < 3; i++) {
      const mx = x0 + 6 + Math.floor(noise(s, i, 9) * 52);
      const my = y0 + 56 + Math.floor(noise(s, i + 4, 9) * 6);
      ctx.cv.set(mx, my, "q");
      ctx.cv.set(mx, my + 1, "v");
    }
    if (noise(s, 8, 9) > 0.6) {
      const d = new Layer(ctx.W);
      const dx = x0 + 10 + Math.floor(noise(s, 9, 9) * 40);
      const dy = y0 + 46;
      d.stamp(["h.h....", ".hh....", ".jJ....", ".jjjjj.", "..jJjJj", "..h...h", "..h...h"], dx, dy);
      d.paint(ctx.cv);
    }
  },

  montana(ctx) {
    const { cv, x0, y0, s } = ctx;
    const peak = (px: number, py: number, base: number, half: number, snow: number, seed: number) => {
      const layer = new Layer(ctx.W);
      for (let y = py; y <= base; y++) {
        const t = (y - py) / (base - py);
        const w = t * half + (noise(0, y, seed + 2) - 0.5) * 2 * t;
        const ridge = px + Math.round((noise(0, Math.floor(y / 2), seed) - 0.5) * 3 * t);
        for (let x = Math.ceil(px - w); x <= Math.floor(px + w); x++) {
          const left = x < ridge;
          const v = noise(Math.floor(x / 2), y, seed);
          let c = left ? (v > 0.72 ? "u" : v < 0.12 ? "t" : "T") : v > 0.8 ? "t" : v < 0.15 ? "s" : "S";
          // Vetas en diagonal que bajan por la ladera.
          if ((x * 2 + y * (left ? 1 : -1)) % 11 === 0 && v > 0.35) c = left ? "t" : "s";
          const snowLine = py + snow + Math.round(noise(Math.floor(x / 2), 1, seed) * 4);
          if (y < snowLine) c = left ? (v > 0.3 ? "n" : "u") : v > 0.5 ? "u" : "T";
          else if (y === snowLine && v > 0.4) c = left ? "u" : "T";
          layer.set(x, y, c);
        }
      }
      cv.shadow(px + half * 0.5, base + 2, half * 0.9, 2.4);
      layer.paint(cv, "s");
    };
    // Las cumbres asoman sobre la casilla de arriba si también es montaña (una cordillera).
    const lift = ctx.same(0, -1) ? 12 : 0;
    const flip = noise(s, 7, 1) > 0.5;
    const X = (lx: number) => x0 + (flip ? CELL - lx : lx);
    peak(X(45), y0 + 8 - lift, y0 + 36, 17, 8, s + 1);
    peak(X(22), y0 + 4 - lift, y0 + 56, 25, 11, s + 2);
    peak(X(54), y0 + 34, y0 + 60, 11, 3, s + 3);
    for (const [lx, h] of [[5, 13], [10, 9], [60, 12], [36, 10]] as const) conifer(ctx, X(lx), y0 + 62, h);
    rock(ctx, X(40), y0 + 58, 3, s + 5);
  },

  cantera(ctx) {
    const { cv, x0, y0, s } = ctx;
    const flip = noise(s, 3, 2) > 0.5;
    const X = (lx: number) => x0 + (flip ? CELL - 1 - lx : lx);
    // Pared de roca en terrazas con estratos, de bordes irregulares.
    for (let ly = 0; ly < 26; ly++) {
      for (let lx = 0; lx < CELL; lx++) {
        const stepTop = 18 - Math.floor(lx / 22) * 6;
        if (ly > stepTop + 4) continue;
        const ragged = noise(lx, 0, s + 4) * 5 + noise(0, ly, s + 5) * 5;
        if (!ctx.same(0, -1) && ly < 5 - ragged / 2) continue;
        if (lx < 5 + ragged / 2 && !ctx.same(flip ? 1 : -1, 0)) continue;
        if (lx > CELL - 6 - ragged / 2 && !ctx.same(flip ? -1 : 1, 0)) continue;
        if (!ctx.mine(X(lx), y0 + ly)) continue;
        const v = noise(Math.floor(lx / 2), ly, s);
        const face = ly > stepTop;
        cv.set(X(lx), y0 + ly, face ? (ly === stepTop + 1 ? "S" : v > 0.5 ? "S" : "s") : ly % 5 === 4 ? "S" : v > 0.82 ? "u" : v < 0.12 ? "S" : v > 0.5 ? "T" : "t");
      }
    }
    // Sillares cortados, apilados.
    const blocks = new Layer(ctx.W);
    const block = (lx: number, ly: number, w: number, h: number) => {
      const bx = flip ? X(lx + w - 1) : X(lx);
      cv.shadow(bx + w / 2 + 2, y0 + ly + h + 1, w / 2 + 2, 1.6);
      blocks.rect(bx, y0 + ly, w, h, (x, y) =>
        y === y0 + ly ? "u" : x === bx ? "T" : x === bx + w - 1 || y === y0 + ly + h - 1 ? "S" : noise(x, y, 2) > 0.85 ? "T" : "t",
      );
    };
    block(4, 32, 12, 8);
    block(17, 35, 10, 6);
    block(8, 44, 11, 8);
    block(6, 25 + 14, 5, 4);
    blocks.paint(cv);
    // Grúa de madera con un sillar colgando.
    const crane = new Layer(ctx.W);
    const cx = X(44);
    const dir = flip ? 1 : -1;
    for (let y = y0 + 26; y < y0 + 56; y++) crane.set(cx, y, (y - y0) % 5 === 0 ? "h" : "j");
    for (let i = 0; i < 18; i++) crane.set(cx + dir * i, y0 + 26 - Math.floor(i / 4), i % 5 === 0 ? "h" : "J");
    const hookX = cx + dir * 15;
    for (let y = y0 + 23; y < y0 + 34; y++) crane.set(hookX, y, "V");
    crane.rect(hookX - 3, y0 + 34, 7, 4, (x, y) => (y === y0 + 34 ? "u" : x === hookX + 3 ? "S" : "t"));
    for (let i = 0; i < 6; i++) {
      crane.set(cx - i, y0 + 56 - i, "j");
      crane.set(cx + i, y0 + 56 - i, "H");
    }
    cv.shadow(cx + 2, y0 + 57, 7, 1.5);
    crane.paint(cv);
    // Carretilla.
    const cart = new Layer(ctx.W);
    const kx = X(flip ? 52 : 34);
    cart.rect(kx, y0 + 50, 12, 5, (x, y) => (y === y0 + 50 ? "J" : x === kx + 11 ? "h" : y === y0 + 54 ? "H" : "j"));
    cart.rect(kx + 2, y0 + 47, 7, 3, (x, y) => (y === y0 + 47 ? "u" : "t"));
    cart.stamp([".hh.", "hSsh", "hssh", ".hh."], kx + 1, y0 + 54);
    cart.stamp([".hh.", "hSsh", "hssh", ".hh."], kx + 7, y0 + 54);
    cv.shadow(kx + 7, y0 + 58, 8, 1.4);
    cart.paint(cv);
    for (let i = 0; i < 40; i++) {
      const gx = x0 + Math.floor(noise(i, 1, s) * CELL);
      const gy = y0 + 28 + Math.floor(noise(i, 2, s) * 34);
      if (cv.get(gx, gy) === "f" || cv.get(gx, gy) === "F") cv.set(gx, gy, noise(i, 3, s) > 0.5 ? "T" : "t");
    }
  },

  puerto(ctx) {
    const { cv, x0, y0, s, flag } = ctx;
    // Muelle: de la orilla de abajo hacia el agua, sobre pilotes.
    const px = x0 + 12;
    let shoreY = y0 + CELL - 1;
    while (shoreY > y0 && ctx.isWater(px + 3, shoreY)) shoreY--;
    let top = shoreY;
    while (top > y0 + 6 && ctx.isWater(px + 3, top - 1) && shoreY - top < 30) top--;
    if (shoreY - top > 6) {
      const pier = new Layer(ctx.W);
      for (let y = top; y <= shoreY + 3; y++) for (let x = px; x < px + 7; x++) pier.set(x, y, x === px + 6 ? "h" : y % 2 ? "j" : "J");
      for (let y = top + 2; y < shoreY; y += 6) {
        pier.set(px - 1, y, "h");
        pier.set(px - 1, y + 1, "H");
        pier.set(px + 7, y, "h");
        pier.set(px + 7, y + 1, "H");
      }
      // Barriles y cajas al final.
      pier.stamp(["jHj.", "hhh.", "jHj."], px + 1, top + 1);
      pier.stamp(["JJj", "jJh", "hhh"], px + 3, top + 6);
      pier.paint(cv, "h");
    }
    // Barcas donde haya agua.
    const boats: [number, number, number, "rayas" | "blanca"][] = [
      [x0 + 28, y0 + 6, 20, "rayas"],
      [x0 + 34, y0 + 30, 14, "blanca"],
    ];
    for (const [bx, by, size, sail] of boats) {
      const hullY = by + Math.round(size * 1.1);
      if (!ctx.isWater(bx + 1, hullY + 2) || !ctx.isWater(bx + size - 1, hullY + 2)) continue;
      const b = new Layer(ctx.W);
      boat(b, bx, by, size, flag, sail);
      b.paint(cv);
      for (let x = bx + 2; x < bx + size - 1; x += 2) if (ctx.isWater(x, hullY + 5)) cv.set(x, hullY + 5, "b");
    }
    // Almacén en tierra, si hay sitio.
    const hx = x0 + 40 + Math.floor(noise(s, 1, 2) * 8);
    const hy = y0 + 44;
    if (!ctx.isWater(hx, hy + 12) && !ctx.isWater(hx + 14, hy + 12) && !ctx.isWater(hx + 7, hy + 4)) {
      const hut = new Layer(ctx.W);
      cv.shadow(hx + 8, hy + 15, 9, 1.8);
      cottage(hut, hx, hy, 14, "pizarra");
      hut.paint(cv);
    }
    // Redes secándose.
    for (let i = 0; i < 6; i++) {
      const nx = x0 + 4 + i * 2;
      if (!ctx.isWater(nx, y0 + 58)) cv.set(nx, y0 + 58, i % 2 ? "V" : "v");
    }
  },

  castillo(ctx) {
    const { cv, x0, y0, flag } = ctx;
    cv.shadow(x0 + 36, y0 + 55, 30, 3.5);
    const c = new Layer(ctx.W);
    // Torre del homenaje, detrás.
    masonry(c, x0 + 24, y0 + 10, 16, 20);
    crenels(c, x0 + 24, y0 + 9, 16);
    flagPole(c, x0 + 32, y0 - 6, 6, flag);
    for (const x of [28, 35]) windowSlit(c, x0 + x, y0 + 15, 4);
    windowSlit(c, x0 + 31, y0 + 22, 3);
    // Muralla con camino de ronda.
    masonry(c, x0 + 12, y0 + 30, 40, 22);
    crenels(c, x0 + 12, y0 + 29, 40);
    for (let x = x0 + 13; x < x0 + 51; x++) c.set(x, y0 + 32, "S");
    // Torres de las esquinas con tejado cónico y bandera.
    for (const tx of [4, 48]) {
      masonry(c, x0 + tx, y0 + 22, 12, 32);
      cone(c, x0 + tx + 5.5, y0 + 21, 8, 10);
      flagPole(c, x0 + tx + 6, y0 + 2, 4, flag);
      windowSlit(c, x0 + tx + 4, y0 + 28, 4);
      windowSlit(c, x0 + tx + 6, y0 + 40, 4);
    }
    // Puerta con rastrillo, escudo encima y antorchas.
    gate(c, x0 + 32, y0 + 51, 12, 13);
    c.stamp([`${flag[0]}${flag[0]}${flag[0]}`, `${flag[0]}y${flag[0]}`, `.${flag[1]}.`], x0 + 31, y0 + 34);
    c.set(x0 + 24, y0 + 42, "y");
    c.set(x0 + 24, y0 + 43, "h");
    c.set(x0 + 40, y0 + 42, "y");
    c.set(x0 + 40, y0 + 43, "h");
    c.paint(cv);
    // Aldea al pie de las murallas.
    const v = new Layer(ctx.W);
    if (!ctx.onRoad(x0 + 2, y0 + 58)) {
      cv.shadow(x0 + 7, y0 + 63, 7, 1.2);
      cottage(v, x0 + 0, y0 + 52, 10);
    }
    if (!ctx.onRoad(x0 + 58, y0 + 58)) {
      cv.shadow(x0 + 59, y0 + 63, 7, 1.2);
      cottage(v, x0 + 53, y0 + 52, 10, "pizarra");
    }
    v.paint(cv);
  },

  fortaleza(ctx) {
    const { cv, x0, y0, flag } = ctx;
    // Peñasco bajo los muros.
    for (let ly = 46; ly < 62; ly++) {
      for (let lx = 4 + (ly - 46); lx < 60 - (ly - 46) / 2; lx++) {
        const v = noise(Math.floor(lx / 2), ly, 4);
        cv.set(x0 + lx, y0 + ly, ly === 46 ? "T" : v > 0.65 ? "t" : v > 0.2 ? "S" : "s");
      }
    }
    cv.shadow(x0 + 36, y0 + 61, 26, 2.5);
    const c = new Layer(ctx.W);
    // Torreón central alto.
    masonry(c, x0 + 22, y0 + 8, 20, 18, "T", "t", "S");
    crenels(c, x0 + 22, y0 + 7, 20);
    flagPole(c, x0 + 31, y0 - 6, 6, flag);
    for (const x of [26, 31, 36]) windowSlit(c, x0 + x, y0 + 13, 4);
    // Muralla baja y gruesa.
    masonry(c, x0 + 8, y0 + 24, 48, 22, "t", "S", "s");
    crenels(c, x0 + 8, y0 + 23, 48);
    // Bastiones cuadrados.
    for (const tx of [2, 50]) {
      masonry(c, x0 + tx, y0 + 18, 12, 30, "T", "t", "S");
      crenels(c, x0 + tx, y0 + 17, 12);
      windowSlit(c, x0 + tx + 5, y0 + 24, 4);
      windowSlit(c, x0 + tx + 5, y0 + 36, 4);
    }
    gate(c, x0 + 32, y0 + 45, 12, 14);
    for (const x of [18, 45]) windowSlit(c, x0 + x, y0 + 32, 4);
    c.paint(cv);
  },
};

// ---------------------------------------------------------------------------
// Capas de la partida

/** Empalizada de estacas afiladas siguiendo el contorno de una casilla fortificada. */
function palisade(cv: Canvas, W: number, outline: [number, number][]) {
  const l = new Layer(W);
  const stake = (x: number, y: number) => {
    l.set(x, y, "J");
    l.set(x, y + 1, "J");
    l.set(x, y + 2, "j");
    l.set(x, y + 3, "j");
    l.set(x, y + 4, "j");
    l.set(x, y + 5, "H");
    l.set(x + 1, y + 1, "j");
    l.set(x + 1, y + 2, "H");
    l.set(x + 1, y + 3, "H");
    l.set(x + 1, y + 4, "H");
    l.set(x + 1, y + 5, "h");
  };
  // Las estacas se clavan de arriba abajo para que las de delante tapen.
  const posts: [number, number][] = [];
  outline.forEach(([ax, ay], k) => {
    const [bx, by] = outline[(k + 1) % outline.length]!;
    const len = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.round(len / 3.2));
    for (let i = 0; i < steps; i++) {
      const x = Math.round(ax + ((bx - ax) * i) / steps);
      const y = Math.round(ay + ((by - ay) * i) / steps) - 6;
      posts.push([x, y]);
      // Travesaño.
      l.set(x, y + 3, "h");
      l.set(x + 1, y + 3, "h");
    }
  });
  posts.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => stake(x, y));
  l.paint(cv, "h");
}

/** Campamento de asedio: tiendas con el banderín de quien sitia, alrededor de la casilla. */
function camp(cv: Canvas, W: number, x0: number, y0: number, flag: [string, string], isWater: (x: number, y: number) => boolean) {
  const [m, d] = flag;
  const tent = ["...h....", "...h" + m + m + "..", "...h" + d + "...", "..kVk...", ".kVvVk..", "kVvhvVk.", "kkkkkkk."];
  const l = new Layer(W);
  for (const [lx, ly] of [[2, 40], [50, 40], [26, 54], [8, 6], [46, 8]] as const) {
    if (isWater(x0 + lx + 3, y0 + ly + 6)) continue;
    cv.shadow(x0 + lx + 4, y0 + ly + 7, 4.5, 1.2);
    l.stamp(tent, x0 + lx, y0 + ly);
  }
  l.paint(cv);
}

/** Huella de la última batalla: tierra quemada, lanzas y escudos rotos, hogueras y humo. */
function battlefield(cv: Canvas, W: number, x0: number, y0: number, seed: number) {
  for (let i = 0; i < 260; i++) {
    const a = noise(i, 1, seed) * Math.PI * 2;
    const r = Math.sqrt(noise(i, 2, seed)) * 24;
    const x = x0 + 32 + Math.cos(a) * r * 1.2;
    const y = y0 + 38 + Math.sin(a) * r * 0.8;
    cv.set(x, y, noise(i, 3, seed) > 0.45 ? "e" : noise(i, 4, seed) > 0.5 ? "s" : "E");
  }
  const l = new Layer(W);
  // Lanzas clavadas y un escudo en el suelo.
  for (const [lx, ly, dir] of [[12, 44, 1], [46, 48, -1], [28, 54, 1], [52, 34, -1]] as const) {
    for (let i = 0; i < 7; i++) l.set(x0 + lx + i * dir, y0 + ly - i, i === 6 ? "u" : i > 4 ? "T" : "j");
  }
  l.stamp([".SSS.", "StTtS", "StttS", ".SsS."], x0 + 20, y0 + 44);
  // Hogueras.
  for (const [lx, ly] of [[18, 30], [42, 26], [34, 42]] as const) {
    l.stamp(["..y..", ".yqy.", "yqRqy", ".qRq.", "hjhjh"], x0 + lx, y0 + ly);
  }
  l.paint(cv, "e");
  // Columnas de humo, sin contorno.
  for (const [lx, ly] of [[20, 28], [44, 24], [36, 40]] as const) {
    for (let i = 0; i < 7; i++) {
      const sx = x0 + lx + Math.round(Math.sin(i * 0.9) * 2);
      const sy = y0 + ly - i * 3;
      const r = 1 + Math.floor(i / 2);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > r) continue;
          cv.set(sx + dx, sy + dy, i < 2 ? "S" : i < 4 ? "t" : (dx + dy) % 2 ? "T" : "u");
        }
      }
    }
  }
}

/**
 * Tropas como figuras: una por cada 2 tropas (hasta 9), con el tabardo de su
 * casa, y un abanderado si son 6 o más. Las neutrales visten de gris.
 */
function soldiers(
  cv: Canvas,
  W: number,
  x0: number,
  y0: number,
  troops: number,
  flag: [string, string] | null,
  seed: number,
  isWater: (x: number, y: number) => boolean,
  jinetes = 0,
  catapultas = 0,
) {
  const n = Math.min(9, Math.ceil(troops / 2));
  // Cuántas figuras van a caballo: en proporción, y al menos una si hay jinetes.
  const riders = jinetes > 0 ? Math.max(1, Math.round((n * jinetes) / troops)) : 0;
  const [m, d] = flag ?? ["t", "S"];
  const body = [
    "...TT...u",
    "..TuTT..T",
    "..TTTT..j",
    "..ssSs..j",
    "..sssS..j",
    ".TT" + m + m + "TT.j",
    "T" + m + m + d + m + m + "Tsj",
    "T" + m + d + m + d + m + "T.j",
    "." + m + m + d + m + m + "..j",
    "." + d + m + m + d + d + "..j",
    ".." + d + d + d + d + "..j",
    "..hh.hh..",
    "..h...h..",
    ".hh...hh.",
  ];
  // Formación: tres filas escalonadas, de atrás adelante.
  const slots: [number, number][] = [
    [27, 26],
    [17, 28],
    [37, 28],
    [8, 33],
    [27, 34],
    [46, 33],
    [13, 41],
    [33, 42],
    [52, 40],
  ];
  const l = new Layer(W);
  // En tierra firme: en un puerto, los huecos sobre el agua se descartan (si no queda ninguno, se usan igual).
  const dry = slots.filter(([lx, ly]) => !isWater(x0 + lx + 4, y0 + ly + 13) && !isWater(x0 + lx + 4, y0 + ly + 6));
  const pool = dry.length >= Math.min(n, 3) ? [...dry, ...slots.filter((sl) => !dry.includes(sl))] : slots;
  const used = pool.slice(0, n).sort((a, b) => a[1] - b[1]);
  // Los jinetes, en las primeras filas de la formación (las de delante, abajo).
  const riderSlots = new Set([...used].sort((a, b) => b[1] - a[1]).slice(0, riders));
  for (const slot of used) {
    const [lx, ly] = slot;
    const jx = Math.floor(noise(lx, ly, seed) * 3) - 1;
    if (riderSlots.has(slot)) {
      cv.shadow(x0 + lx + jx + 6, y0 + ly + 14, 6.5, 1.3);
      l.stamp(horseman(m, d), x0 + lx + jx - 2, y0 + ly);
      continue;
    }
    cv.shadow(x0 + lx + jx + 4, y0 + ly + 14, 4.5, 1.2);
    l.stamp(body, x0 + lx + jx, y0 + ly);
  }
  // Una catapulta junto a la formación, si las hay.
  if (catapultas > 0) {
    const cx = x0 + 40;
    const cy = y0 + 44;
    if (!isWater(cx + 6, cy + 9)) {
      cv.shadow(cx + 7, cy + 11, 8, 1.4);
      l.stamp(CATAPULT, cx, cy);
    }
  }
  if (troops >= 6 && flag && used[0]) {
    const bx = x0 + used[0][0] + 9;
    const top = y0 + used[0][1] - 14;
    for (let y = top; y < top + 16; y++) l.set(bx, y, "h");
    l.set(bx, top - 1, "y");
    l.stamp([`${m}${m}${m}${m}${m}`, `${m}y${m}y${m}`, `${m}${m}${m}${m}${d}`, `${m}${d}.${d}${m}`], bx + 1, top);
  }
  l.paint(cv);
}

/** Jinete: caballo pardo y tabardo de la casa (13x14). */
function horseman(m: string, d: string): string[] {
  return [
    "....TT.......",
    "...TuTT......",
    "...TTTT......",
    "...sSs.......",
    "..T" + m + m + "T.....u",
    "..T" + m + d + m + "T...j.",
    "..." + m + m + "jj.jj..",
    ".jJ" + d + d + "JJjJj..",
    "JJjjjjJjjJ...",
    ".jJjjjjjjj...",
    "..j.h..j.h...",
    "..h.h..h.h...",
    "..h.h..h.h...",
    ".hh.hh.hh.hh.",
  ];
}

/** Catapulta de madera con la cuchara cargada (14x11). */
const CATAPULT = [
  "..........ss..",
  ".........sSSs.",
  "........jJss..",
  ".......jJ.....",
  "......jJ......",
  ".h...jJ.......",
  ".hjjjJjjjjjh..",
  "JjjjJjjjjJjjJ.",
  "hhhhhhhhhhhhh.",
  ".hSh.....hSh..",
  ".hhh.....hhh..",
];

// ---------------------------------------------------------------------------

/**
 * Colores RGBA para un <canvas>. La niebla de guerra se aplica aquí: lo que no
 * se ve queda como un mapa viejo en sepia, con el borde difuminado con trama
 * entre casillas vistas y no vistas, y algún jirón de bruma.
 */
export function toImageData(img: WorldImage): Uint8ClampedArray<ArrayBuffer> {
  const { width: W, height: H, pixels, palette, cols, rows, fog } = img;
  const geo = geoOf(img);
  const out = new Uint8ClampedArray(new ArrayBuffer(W * H * 4));
  const cache = new Map<string, [number, number, number]>();
  const rgb = (c: string): [number, number, number] => {
    let v = cache.get(c);
    if (!v) {
      const hex = palette[c] ?? "#ff00ff";
      const n = parseInt(hex.slice(1), 16);
      v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      cache.set(c, v);
    }
    return v;
  };
  const anyFog = fog.some((r) => r.some(Boolean));
  const fogAt = (gx: number, gy: number) => (fog[gy]?.[gx] ? 1 : 0);
  /** Niebla en un píxel: la de su casilla, mezclada cerca del borde con la de la vecina. */
  const SOFT = 14;
  const fogWeight = (x: number, y: number) => {
    const [gx, gy] = geo.cellAt(x, y);
    const own = fogAt(gx, gy);
    let f = own;
    let best = Infinity;
    for (const [nx, ny] of geo.neighbours(gx, gy)) {
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const other = fogAt(nx, ny);
      if (other === own) continue;
      const d = edgeDistance(geo, x, y, gx, gy, nx, ny);
      if (d < SOFT && d < best) {
        best = d;
        const w = 0.5 * (1 - Math.max(0, d) / SOFT);
        f = own * (1 - w) + other * w;
      }
    }
    return f;
  };
  for (let y = 0; y < H; y++) {
    const row = pixels[y]!;
    for (let x = 0; x < W; x++) {
      let [r, g, b] = rgb(row[x]!);
      if (anyFog) {
        const f = fogWeight(x, y);
        const k = Math.min(1, Math.max(0, (f - 0.5) * 2 + 0.5));
        if (k > 0 && noise(x, y, 31) < k) {
          const grey = r * 0.3 + g * 0.59 + b * 0.11;
          const cloud = noise(Math.floor(x / 10), Math.floor(y / 6), 99);
          const mist = cloud > 0.82 ? 22 : cloud > 0.74 && (x + y) % 2 ? 12 : 0;
          r = grey * 0.55 + 62 + mist;
          g = grey * 0.46 + 48 + mist;
          b = grey * 0.3 + 30 + mist * 0.8;
        }
      }
      const i = (y * W + x) * 4;
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = 255;
    }
  }
  return out;
}
