// El mapa entero como un solo lienzo de pixel art (32 px por casilla).
//
// Lecciones de otros juegos (ver docs/diseno.md, sección 19):
// - Carcassonne y Wesnoth: las casillas encajan porque el terreno sigue al
//   otro lado del borde. Aquí el suelo, los campos y los bosques se dibujan en
//   coordenadas del mundo, así que continúan de una casilla a la vecina, y en
//   los bordes entre terrenos distintos hay una transición tramada.
// - Wesnoth: lo alto (montañas, copas, torres) puede asomar sobre la casilla de
//   arriba; se dibuja de arriba abajo para que lo de delante tape lo de atrás.
// - Catan y Carcassonne en BGA: el contraste manda. Cada terreno tiene su forma
//   y su textura, no solo su color.
// - Into the Breach y Diplomacy: lo que pasa se ve en el mapa. Las tropas son
//   figuras, las murallas una empalizada, y la última batalla deja humo y
//   tierra quemada.
//
// Todo es determinista: la misma partida da el mismo dibujo. El dibujo tiene
// dos fotogramas (agua, banderas, humo) que el cliente alterna.

import type { TileType } from "@reyes/engine";
import type { Palette } from "./Pixels";
import { WORLD, noise, shade } from "./tiles";

export const CELL = 32;

export interface WorldCell {
  x: number;
  y: number;
  type: TileType;
  /** Color (hex) de la casa dueña: bandera, tabardos de las tropas. */
  owner?: string | null;
  /** Tropas a la vista (null si no se ven). */
  troops?: number | null;
  fortified?: boolean;
  /** Hubo batalla aquí en la última resolución. */
  battle?: boolean;
  /** Fuera de la vista de la casa. */
  fogged?: boolean;
}

export interface WorldOptions {
  cols: number;
  rows: number;
  cells: WorldCell[];
  /** Borde de tierra alrededor del tablero, en píxeles. */
  margin?: number;
  frame?: 0 | 1;
  seed?: number;
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
}

const FLAG_MAIN = "αβγδεζηθ";
const FLAG_SHADE = "ΑΒΓΔΕΖΗΘ";

type Ramp = [string, string, string, string];
type Ground = "meadow" | "forest" | "highland" | "dust";

const GROUND_OF: Record<TileType, Ground> = {
  campos: "meadow",
  castillo: "meadow",
  puerto: "meadow",
  bosque: "forest",
  montana: "highland",
  cantera: "dust",
  fortaleza: "dust",
};

const RAMPS: Record<Ground, Ramp> = {
  meadow: ["2", "3", "4", "5"],
  forest: ["1", "2", "3", "4"],
  highland: ["2", "4", "F", "5"],
  dust: ["E", "f", "F", "a"],
};

const DARKER: Record<string, string> = {
  "6": "4", "5": "3", "4": "2", "3": "2", "2": "1", "1": "1",
  F: "f", f: "E", E: "e", e: "e", a: "A", A: "f", u: "T", T: "t", t: "S", S: "s",
  Y: "y", y: "W", W: "w", c: "B", C: "c", B: "b", D: "C", j: "H", J: "j",
};

/** Lienzo de letras con capas que se pegan con contorno. */
class Canvas {
  data: string[];
  constructor(
    public w: number,
    public h: number,
    fill = ".",
  ) {
    this.data = new Array<string>(w * h).fill(fill);
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
          const k2 = (y + dy) * w + (x + dx);
          if (!this.pts.has(k2) && x + dx >= 0 && x + dx < w) cv.set(x + dx, y + dy, edge);
        }
      }
    }
    for (const [key, c] of this.pts) cv.set(key % w, Math.floor(key / w), c);
  }
}

// ---------------------------------------------------------------------------

export function renderWorld(opts: WorldOptions): WorldImage {
  const { cols, rows, cells } = opts;
  const M = opts.margin ?? 12;
  const frame = opts.frame ?? 0;
  const seed = opts.seed ?? 7;
  const W = cols * CELL + 2 * M;
  const H = rows * CELL + 2 * M;
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

  // 1. Suelo continuo, con transición tramada entre terrenos.
  const BLEND = 7;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const inGrid = px >= M && py >= M && px < W - M && py < H - M;
      const gx = Math.min(cols - 1, Math.max(0, Math.floor((px - M) / CELL)));
      const gy = Math.min(rows - 1, Math.max(0, Math.floor((py - M) / CELL)));
      const here = at(gx, gy);
      let ground: Ground = here ? GROUND_OF[here.type] : "meadow";
      if (here && inGrid) {
        // Distancia al borde más cercano y terreno del vecino de ese lado.
        const lx = px - M - gx * CELL;
        const ly = py - M - gy * CELL;
        const sides: [number, number, number][] = [
          [lx, -1, 0],
          [CELL - 1 - lx, 1, 0],
          [ly, 0, -1],
          [CELL - 1 - ly, 0, 1],
        ];
        sides.sort((a, b) => a[0] - b[0]);
        const [d, dx, dy] = sides[0]!;
        const nb = at(gx + dx, gy + dy);
        if (nb && d < BLEND && GROUND_OF[nb.type] !== ground) {
          const p = (1 - d / BLEND) * 0.55;
          if (noise(px, py, seed + 3) < p) ground = GROUND_OF[nb.type];
        }
      }
      const [dk, md, lt, hi] = RAMPS[ground];
      // Manchas grandes (dos escalas) y poco grano fino: se lee como prado, no como ruido.
      const big = noise(Math.floor(px / 7), Math.floor(py / 6), seed + 11) - 0.5;
      const mid = noise(Math.floor(px / 3), Math.floor(py / 3), seed + 12) - 0.5;
      const v = 0.5 + big * 0.7 + mid * 0.35 + (noise(px, py, seed) - 0.5) * 0.25;
      cv.data[py * W + px] = v < 0.2 ? dk : v > 0.8 ? (v > 0.9 && noise(px, py, seed + 1) > 0.5 ? hi : lt) : md;
    }
  }

  // Matas de hierba sueltas.
  for (let i = 0; i < (W * H) / 90; i++) {
    const x = Math.floor(noise(i, 1, seed + 21) * W);
    const y = Math.floor(noise(i, 2, seed + 21) * H);
    const g = cv.get(x, y);
    if (g === "3" || g === "4" || g === "2") {
      cv.set(x, y, "5");
      cv.set(x - 1, y + 1, "4");
      cv.set(x + 1, y + 1, "4");
      cv.set(x, y + 1, "2");
    }
  }

  // 2. Agua: los puertos forman bahías que se unen entre sí y con el mar del borde.
  const water = new Uint8Array(W * H);
  const ports = cells.filter((c) => c.type === "puerto");
  for (const p of ports) {
    const cx = M + p.x * CELL + CELL / 2;
    const cy = M + p.y * CELL + CELL / 2;
    // Zona de agua: un óvalo en el centro, prolongado hacia los puertos vecinos y hacia el mar.
    const reach = (dx: number, dy: number) => {
      const n = at(p.x + dx, p.y + dy);
      if (n?.type === "puerto") return CELL / 2 + 2;
      if (!n) return CELL / 2 + M;
      return 0;
    };
    const ext = { l: reach(-1, 0), r: reach(1, 0), u: reach(0, -1), d: reach(0, 1) };
    // Si el puerto no da a nada, el agua se recoge en el centro; la orilla queda abajo.
    for (let py = cy - CELL / 2 - M; py < cy + CELL / 2 + M; py++) {
      for (let px = cx - CELL / 2 - M; px < cx + CELL / 2 + M; px++) {
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const dx = px - cx;
        const dy = py - cy;
        const rx = dx < 0 ? Math.max(14, ext.l) : Math.max(14, ext.r);
        const ry = dy < 0 ? Math.max(13, ext.u) : Math.max(8, ext.d);
        const wob = (noise(Math.floor(px / 3), Math.floor(py / 3), seed + 5) - 0.5) * 0.35;
        // Óvalo blando (superelipse) para que la orilla sea orgánica.
        if (Math.abs(dx / rx) ** 2.6 + Math.abs(dy / ry) ** 2.6 < 0.82 + wob) water[py * W + px] = 1;
      }
    }
  }
  const isWater = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && water[y * W + x] === 1;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const i = py * W + px;
      if (water[i]) {
        // Orilla clara, fondo con motas y crestas que se mueven entre fotogramas.
        const nearLand = !isWater(px + 1, py) || !isWater(px - 1, py) || !isWater(px, py + 1) || !isWater(px, py - 1);
        const near2 = !isWater(px + 2, py) || !isWater(px - 2, py) || !isWater(px, py + 2) || !isWater(px, py - 2);
        const band = py % 6;
        const crest = band === 0 && (px + Math.floor(py / 6) * 5 + frame * 2) % 11 < 3;
        cv.data[i] = nearLand ? "D" : near2 ? "C" : crest ? "C" : noise(px, py, seed + 2) > 0.93 ? "b" : "B";
        if (!nearLand && !near2 && band === 1 && (px + Math.floor(py / 6) * 5 + frame * 2) % 11 === 1) cv.data[i] = "c";
      } else {
        // Arena junto al agua.
        for (let r = 1; r <= 2; r++) {
          if (isWater(px + r, py) || isWater(px - r, py) || isWater(px, py + r) || isWater(px, py - r)) {
            cv.data[i] = r === 1 ? (noise(px, py, 4) > 0.7 ? "A" : "a") : noise(px, py, 6) > 0.5 ? "a" : cv.data[i]!;
            break;
          }
        }
      }
    }
  }

  // 3. Caminos entre castillos y fortalezas (como en Carcassonne, siguen de una casilla a otra).
  const road = new Uint8Array(W * H);
  for (const [a, b] of roadEdges(cols, rows, cells)) {
    const ax = M + a.x * CELL + CELL / 2;
    const ay = M + a.y * CELL + CELL / 2 + 4;
    const bx = M + b.x * CELL + CELL / 2;
    const by = M + b.y * CELL + CELL / 2 + 4;
    const len = Math.hypot(bx - ax, by - ay);
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    for (let s = 0; s <= len; s += 0.5) {
      const t = s / len;
      const wob = Math.sin(t * Math.PI) * Math.sin(t * Math.PI * 2 + a.x + b.y) * 3;
      const x = ax + (bx - ax) * t + nx * wob;
      const y = ay + (by - ay) * t + ny * wob;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
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
    cv.data[i] = edge ? "E" : noise(x, y, 9) > 0.75 ? "F" : "f";
  }
  const onRoad = (x: number, y: number) => cv.inside(x, y) && road[Math.round(y) * W + Math.round(x)] === 1;

  // 4. Lo que hay en cada casilla, de arriba abajo para que lo de delante tape.
  const order = cells.map((c, i) => ({ c, i })).sort((a, b) => a.c.y - b.c.y || a.c.x - b.c.x);
  for (const { c, i } of order) {
    const x0 = M + c.x * CELL;
    const y0 = M + c.y * CELL;
    const s = seed * 97 + i * 31 + c.x * 7 + c.y * 13;
    const same = (dx: number, dy: number) => at(c.x + dx, c.y + dy)?.type === c.type;
    const ctx: CellCtx = { cv, W, x0, y0, s, same, onRoad, isWater, flag: flagOf(c), frame };
    DRAW[c.type](ctx);
  }

  // 5. Lo que cambia con la partida: empalizadas, batallas y tropas.
  for (const { c } of order) {
    const x0 = M + c.x * CELL;
    const y0 = M + c.y * CELL;
    if (c.fortified && c.type !== "castillo") palisade(cv, W, x0, y0);
    if (c.battle) battlefield(cv, W, x0, y0, seed + c.x * 5 + c.y * 3, frame);
    if (c.troops != null && c.troops > 0) soldiers(cv, W, x0, y0, c.troops, c.owner ? flagOf(c) : null, seed + c.x + c.y * 9);
  }

  // 6. Bordes del margen: se oscurecen hacia fuera, como un mapa sobre la mesa.
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const d = Math.min(px, py, W - 1 - px, H - 1 - py);
      if (d < 4 && noise(px, py, 77) < (4 - d) / 5) cv.darken(px, py);
      if (d < 2) cv.darken(px, py);
    }
  }

  const pixels: string[] = [];
  for (let y = 0; y < H; y++) pixels.push(cv.data.slice(y * W, (y + 1) * W).join(""));
  const fog = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => !!at(x, y)?.fogged));
  return { width: W, height: H, margin: M, pixels, palette, cols, rows, fog };
}

/**
 * Red de caminos: cada castillo se une a la fortaleza más cercana (o al
 * centro del mapa) por el camino más corto que evita montañas y puertos.
 */
export function roadEdges(cols: number, rows: number, cells: WorldCell[]): [WorldCell, WorldCell][] {
  const at = new Map(cells.map((c) => [`${c.x},${c.y}`, c]));
  const forts = cells.filter((c) => c.type === "fortaleza");
  const goals = forts.length ? forts : cells.filter((c) => c.x === Math.floor(cols / 2) && c.y === Math.floor(rows / 2));
  const edges = new Map<string, [WorldCell, WorldCell]>();
  for (const start of cells.filter((c) => c.type === "castillo")) {
    const prev = new Map<string, string | null>([[`${start.x},${start.y}`, null]]);
    const queue: WorldCell[] = [start];
    let found: WorldCell | null = null;
    while (queue.length && !found) {
      const cur = queue.shift()!;
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
        const n = at.get(`${cur.x + dx},${cur.y + dy}`);
        const key = `${cur.x + dx},${cur.y + dy}`;
        if (!n || prev.has(key)) continue;
        const goal = goals.includes(n);
        if (!goal && (n.type === "montana" || n.type === "puerto" || n.type === "castillo")) continue;
        prev.set(key, `${cur.x},${cur.y}`);
        if (goal) {
          found = n;
          break;
        }
        queue.push(n);
      }
    }
    let key: string | null | undefined = found ? `${found.x},${found.y}` : null;
    while (key) {
      const from: string | null | undefined = prev.get(key);
      if (!from) break;
      const a = at.get(from)!;
      const b = at.get(key)!;
      edges.set([from, key].sort().join("|"), [a, b]);
      key = from;
    }
  }
  return [...edges.values()];
}

// ---------------------------------------------------------------------------
// Terrenos

interface CellCtx {
  cv: Canvas;
  W: number;
  x0: number;
  y0: number;
  s: number;
  same: (dx: number, dy: number) => boolean;
  onRoad: (x: number, y: number) => boolean;
  isWater: (x: number, y: number) => boolean;
  flag: [string, string];
  frame: 0 | 1;
}

/** Margen interior hacia los lados donde el vecino es de otro terreno. */
function inset(ctx: CellCtx, lx: number, ly: number, m: number): boolean {
  return (
    (!ctx.same(-1, 0) && lx < m) ||
    (!ctx.same(1, 0) && lx > CELL - 1 - m) ||
    (!ctx.same(0, -1) && ly < m) ||
    (!ctx.same(0, 1) && ly > CELL - 1 - m)
  );
}

function tree(ctx: CellCtx, cx: number, cy: number, r: number, seed: number) {
  const { cv, W } = ctx;
  cv.shadow(cx + r * 0.5, cy + r + 1.5, r + 0.8, 1.8);
  const layer = new Layer(W);
  for (let y = Math.round(cy + r * 0.6); y <= cy + r + 2; y++) {
    layer.set(cx - 1, y, "j");
    layer.set(cx, y, "H");
    layer.set(cx + 1, y, "h");
  }
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const wobble = (noise(x, y, seed + 9) - 0.5) * 1.1;
      if (Math.hypot(dx, dy * 1.08) > r + wobble * 0.6) continue;
      const lit = (-dx * 0.8 - dy) / (r * 1.5) + (noise(x, y, seed) - 0.5) * 0.55;
      layer.set(x, y, lit > 0.62 ? "6" : lit > 0.32 ? "5" : lit > 0 ? "4" : lit > -0.35 ? "3" : lit > -0.7 ? "2" : "1");
    }
  }
  layer.paint(cv, "1");
}

function pine(ctx: CellCtx, cx: number, base: number, h: number) {
  const layer = new Layer(ctx.W);
  for (let i = 0; i < h; i++) {
    const half = Math.floor((i + 1) / 2);
    for (let dx = -half; dx <= half; dx++) layer.set(cx + dx, base - h + i, dx < 0 ? "3" : dx === 0 && i % 2 ? "4" : "2");
  }
  layer.set(cx, base, "H");
  layer.paint(ctx.cv, "1");
}

function masonry(layer: Layer, x0: number, y0: number, w: number, h: number, light = "T", mid = "t", dark = "S") {
  layer.rect(x0, y0, w, h, (x, y) => {
    const course = Math.floor((y - y0) / 3);
    const joint = (y - y0) % 3 === 2 || (x - x0 + (course % 2) * 2) % 4 === 3;
    if (x === x0) return light;
    if (x === x0 + w - 1) return dark;
    if (joint) return dark;
    return noise(x, y, 5) > 0.8 ? light : mid;
  });
}

function crenels(layer: Layer, x0: number, y: number, w: number) {
  for (let x = x0; x < x0 + w; x++) {
    if ((x - x0) % 3 !== 2) {
      layer.set(x, y, x === x0 ? "u" : "T");
      layer.set(x, y - 1, (x - x0) % 3 === 0 ? "u" : "T");
    }
  }
}

function cone(layer: Layer, cx: number, baseY: number, half: number, h: number) {
  for (let i = 0; i <= h; i++) {
    const w = (half * i) / h;
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const left = x < cx;
      layer.set(x, baseY - h + i, i === h ? "r" : left ? (x < cx - w / 2 ? "q" : "R") : x === Math.round(cx) ? "R" : "r");
    }
  }
}

/** Mástil con bandera; en el fotograma 1 la tela ondea al otro lado. */
function flagPole(layer: Layer, x: number, top: number, pole: number, flag: [string, string], frame: 0 | 1) {
  const [m, d] = flag;
  for (let y = top; y < top + pole + 3; y++) layer.set(x, y, "h");
  const cloth = frame ? [`${m}${m}${m}${d}`, `${m}${m}${d}${d}`, `${m}${d}..`] : [`${m}${m}${m}${m}`, `${m}${m}${m}${d}`, `${m}${m}${d}.`];
  layer.stamp(cloth, x + 1, top);
}

function door(layer: Layer, cx: number, bottom: number, w: number, h: number) {
  const x0 = cx - Math.floor(w / 2);
  for (let y = bottom - h + 1; y <= bottom; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (y === bottom - h + 1 && (x === x0 || x === x0 + w - 1)) continue;
      layer.set(x, y, y === bottom - h + 1 ? "h" : x % 2 ? "H" : "j");
    }
  }
}

const DRAW: Record<TileType, (ctx: CellCtx) => void> = {
  campos(ctx) {
    const { cv, x0, y0 } = ctx;
    // Parcelas en coordenadas del mundo: siguen en la casilla vecina si también es de campos.
    for (let ly = 0; ly < CELL; ly++) {
      for (let lx = 0; lx < CELL; lx++) {
        const px = x0 + lx;
        const py = y0 + ly;
        if (inset(ctx, lx, ly, 3) || ctx.onRoad(px, py) || ctx.isWater(px, py)) continue;
        const plotX = Math.floor(px / 11);
        const plotY = Math.floor(py / 9);
        const hedge = px % 11 === 0 || py % 9 === 0;
        if (hedge) {
          cv.set(px, py, noise(px, py, 2) > 0.5 ? "2" : "3");
          continue;
        }
        const kind = Math.floor(noise(plotX, plotY, 41) * 4);
        const v = noise(px, py, 5);
        let c: string;
        if (kind === 0) c = (py % 3 === 0 ? "W" : v > 0.55 ? "Y" : "y"); // trigo maduro
        else if (kind === 1) c = py % 3 === 0 ? "E" : (px + py) % 3 === 0 && py % 3 === 1 ? "4" : "f"; // arado con brotes
        else if (kind === 2) c = py % 2 === 0 ? "4" : v > 0.6 ? "5" : "3"; // cultivo verde
        else c = py % 3 === 0 ? "w" : v > 0.5 ? "W" : "y"; // trigo segado
        cv.set(px, py, c);
      }
    }
    // Una granja o un espantapájaros, según la casilla.
    const pick = noise(ctx.s, 1, 3);
    const layer = new Layer(ctx.W);
    if (pick < 0.5) {
      const hx = x0 + 6 + Math.floor(noise(ctx.s, 2, 3) * 14);
      const hy = y0 + 10 + Math.floor(noise(ctx.s, 3, 3) * 10);
      cv.shadow(hx + 5, hy + 9, 6, 1.4);
      // Casa de labranza con tejado rojo.
      for (let i = 0; i < 4; i++) for (let x = hx + 3 - i; x <= hx + 5 + i; x++) layer.set(x, hy + i, x <= hx + 4 ? (i === 3 ? "R" : "q") : "r");
      layer.rect(hx, hy + 4, 9, 4, (x, y) => (x === hx ? "v" : x === hx + 8 ? "V" : y === hy + 7 ? "V" : "v"));
      layer.set(hx + 4, hy + 6, "h");
      layer.set(hx + 4, hy + 7, "h");
      layer.set(hx + 2, hy + 5, "C");
      layer.set(hx + 6, hy + 5, "C");
    } else {
      const sx = x0 + 8 + Math.floor(noise(ctx.s, 4, 3) * 14);
      const sy = y0 + 9 + Math.floor(noise(ctx.s, 5, 3) * 10);
      cv.shadow(sx + 4, sy + 9, 3, 1);
      layer.stamp(["..yYy..", "..vvV..", "..vkv..", "hjjHjjh", "..RqR..", "..RRr..", "...h...", "...h...", "...h..."], sx, sy);
    }
    layer.paint(cv);
  },

  bosque(ctx) {
    const { x0, y0, s } = ctx;
    // Árboles en una rejilla del mundo con desplazamiento: el bosque sigue al otro lado del borde.
    const spots: [number, number, number][] = [];
    const S = 8;
    for (let gy = Math.floor(y0 / S) - 1; gy <= Math.floor((y0 + CELL) / S); gy++) {
      for (let gx = Math.floor(x0 / S) - 1; gx <= Math.floor((x0 + CELL) / S); gx++) {
        const tx = gx * S + 3 + Math.floor(noise(gx, gy, 51) * 5) + (gy % 2) * 3;
        const ty = gy * S + 2 + Math.floor(noise(gx, gy, 52) * 5);
        const lx = tx - x0;
        const ly = ty - y0;
        if (lx < 0 || ly < 0 || lx >= CELL || ly >= CELL) continue;
        if (inset(ctx, lx, ly, 4) && noise(gx, gy, 53) < 0.75) continue;
        if (ctx.onRoad(tx, ty + 4) || ctx.isWater(tx, ty + 3)) continue;
        if (noise(gx, gy, 54) < 0.12) continue; // claro
        spots.push([tx, ty, 3.3 + noise(gx, gy, 55) * 1.8]);
      }
    }
    spots.sort((a, b) => a[1] - b[1]);
    for (const [tx, ty, r] of spots) tree(ctx, tx, ty, r, s + tx);
    // Setas.
    if (noise(s, 1, 9) > 0.5) ctx.cv.set(x0 + 5 + Math.floor(noise(s, 2, 9) * 22), y0 + 29, "q");
  },

  montana(ctx) {
    const { cv, x0, y0, s } = ctx;
    const peak = (px: number, py: number, base: number, half: number, snow: number, seed: number) => {
      const layer = new Layer(ctx.W);
      for (let y = py; y <= base; y++) {
        const t = (y - py) / (base - py);
        const w = t * half;
        const ridge = px + Math.round((noise(0, y, seed) - 0.5) * 2 * t);
        for (let x = Math.ceil(px - w); x <= Math.floor(px + w); x++) {
          const left = x < ridge;
          const v = noise(x, y, seed);
          let c = left ? (v > 0.75 ? "u" : v < 0.1 ? "t" : "T") : v > 0.8 ? "t" : v < 0.12 ? "s" : "S";
          if ((x * 2 + y) % 9 === 0 && v > 0.4) c = left ? "t" : "s";
          const snowLine = py + snow + Math.round(noise(x, 1, seed) * 2);
          if (y < snowLine) c = left ? "n" : "u";
          else if (y === snowLine && v > 0.5) c = left ? "u" : "T";
          layer.set(x, y, c);
        }
      }
      cv.shadow(px + half * 0.5, base + 1, half * 0.9, 1.6);
      layer.paint(cv, "s");
    };
    // Las cumbres asoman sobre la casilla de arriba si es montaña también (una cordillera).
    const lift = ctx.same(0, -1) ? 6 : 0;
    const flip = noise(s, 7, 1) > 0.5;
    const X = (lx: number) => x0 + (flip ? CELL - lx : lx);
    peak(X(22), y0 + 4 - lift, y0 + 17, 8, 4, s + 1);
    peak(X(12), y0 + 2 - lift, y0 + 28, 12, 6, s + 2);
    peak(X(27), y0 + 18, y0 + 30, 5, 0, s + 3);
    pine(ctx, X(3), y0 + 30, 6);
    pine(ctx, X(29), y0 + 31, 7);
  },

  cantera(ctx) {
    const { cv, x0, y0, s } = ctx;
    const flip = noise(s, 3, 2) > 0.5;
    const X = (lx: number) => x0 + (flip ? CELL - 1 - lx : lx);
    // Pared de roca escalonada con estratos.
    for (let ly = 0; ly < 13; ly++) {
      for (let lx = 0; lx < CELL; lx++) {
        const stepTop = 9 - Math.floor(lx / 11) * 3;
        if (ly > stepTop + 2) continue;
        // Bordes irregulares, y hueco hacia los vecinos de otro terreno.
        const ragged = noise(lx, 0, s + 4) * 3 + noise(0, ly, s + 5) * 3;
        if (!ctx.same(0, -1) && ly < 3 - ragged / 2) continue;
        if (lx < 3 + ragged / 2 && !ctx.same(flip ? 1 : -1, 0)) continue;
        if (lx > CELL - 4 - ragged / 2 && !ctx.same(flip ? -1 : 1, 0)) continue;
        const v = noise(lx, ly, s);
        const face = ly > stepTop;
        cv.set(X(lx), y0 + ly, face ? (v > 0.5 ? "S" : "s") : ly % 4 === 3 ? "S" : v > 0.82 ? "T" : v < 0.12 ? "S" : "t");
      }
    }
    const blocks = new Layer(ctx.W);
    const block = (lx: number, ly: number, w: number, h: number) => {
      const bx = flip ? X(lx + w - 1) : X(lx);
      cv.shadow(bx + w / 2 + 1, y0 + ly + h, w / 2 + 1, 1.2);
      blocks.rect(bx, y0 + ly, w, h, (x, y) =>
        y === y0 + ly ? "u" : x === bx ? "T" : x === bx + w - 1 || y === y0 + ly + h - 1 ? "S" : noise(x, y, 2) > 0.85 ? "T" : "t",
      );
    };
    block(2, 16, 7, 5);
    block(10, 18, 6, 4);
    block(4, 23, 6, 5);
    blocks.paint(cv);
    // Carretilla con un sillar.
    const cart = new Layer(ctx.W);
    const cx = X(flip ? 28 : 19);
    cv.shadow(cx + 6, y0 + 29, 6, 1.4);
    cart.rect(cx + 2, y0 + 19, 6, 3, (x, y) => (y === y0 + 19 ? "u" : x === cx + 7 ? "S" : "t"));
    cart.rect(cx, y0 + 22, 10, 4, (x, y) => (y === y0 + 22 ? "J" : x === cx + 9 ? "h" : y === y0 + 25 ? "H" : "j"));
    cart.stamp([".hh.", "hSsh", "hssh", ".hh."], cx + 1, y0 + 25);
    cart.paint(cv);
    for (let i = 0; i < 18; i++) cv.set(x0 + Math.floor(noise(i, 1, s) * CELL), y0 + 14 + Math.floor(noise(i, 2, s) * 17), noise(i, 3, s) > 0.5 ? "T" : "t");
  },

  puerto(ctx) {
    const { cv, x0, y0, s, frame } = ctx;
    // Muelle: desde la orilla de abajo hacia el agua.
    let shoreY = y0 + CELL - 1;
    const px = x0 + 7;
    while (shoreY > y0 && ctx.isWater(px + 2, shoreY)) shoreY--;
    const pier = new Layer(ctx.W);
    let top = shoreY;
    while (top > y0 + 3 && ctx.isWater(px + 2, top - 1) && shoreY - top < 16) top--;
    for (let y = top; y <= shoreY + 2; y++) for (let x = px; x < px + 5; x++) pier.set(x, y, x === px + 4 ? "h" : y % 2 ? "j" : "J");
    for (let y = top + 2; y < shoreY; y += 6) {
      pier.set(px - 1, y, "h");
      pier.set(px + 5, y, "h");
    }
    if (shoreY - top > 4) pier.paint(cv, "h");
    // Barca de vela a rayas, que se mece entre fotogramas.
    const bx = x0 + 15;
    const by = y0 + 4 + frame;
    if (ctx.isWater(bx + 8, by + 17) && ctx.isWater(bx + 2, by + 17)) {
      const boat = new Layer(ctx.W);
      for (let y = by + 1; y < by + 14; y++) boat.set(bx + 6, y, "h");
      for (let y = by + 2; y < by + 12; y++) {
        const w = Math.round(((y - by - 2) / 10) * 7);
        for (let x = bx + 7; x <= bx + 7 + w; x++) boat.set(x, y, (y + 1) % 4 < 2 ? "v" : "q");
      }
      boat.stamp([`${ctx.flag[0]}${ctx.flag[0]}${ctx.flag[1]}`], bx + 7, by);
      boat.rect(bx, by + 14, 15, 2, (_x, y) => (y === by + 14 ? "J" : "j"));
      boat.rect(bx + 1, by + 16, 13, 1, () => "H");
      boat.paint(cv);
      for (let x = bx + 1; x < bx + 14; x += 2) if (ctx.isWater(x, by + 18)) cv.set(x, by + 18, "b");
    }
    // Choza en tierra, si hay sitio.
    const hx = x0 + 22;
    const hy = y0 + 24;
    if (!ctx.isWater(hx, hy + 6) && !ctx.isWater(hx + 7, hy + 6)) {
      const hut = new Layer(ctx.W);
      for (let i = 0; i < 4; i++) for (let x = hx + 3 - i; x <= hx + 3 + i; x++) hut.set(x, hy + i, x < hx + 3 ? "q" : "r");
      hut.rect(hx, hy + 4, 7, 4, (x, y) => (x === hx ? "J" : x === hx + 6 ? "h" : y === hy + 7 ? "H" : "j"));
      hut.set(hx + 3, hy + 6, "h");
      hut.set(hx + 3, hy + 7, "h");
      hut.paint(cv);
    }
  },

  castillo(ctx) {
    const { cv, x0, y0, flag, frame } = ctx;
    cv.shadow(x0 + 18, y0 + 27, 15, 2.2);
    const c = new Layer(ctx.W);
    masonry(c, x0 + 12, y0 + 6, 8, 9);
    crenels(c, x0 + 12, y0 + 5, 8);
    flagPole(c, x0 + 16, y0 - 2, 3, flag, frame);
    for (const x of [14, 17]) {
      c.set(x0 + x, y0 + 9, "k");
      c.set(x0 + x, y0 + 10, "k");
    }
    masonry(c, x0 + 6, y0 + 15, 20, 12);
    crenels(c, x0 + 6, y0 + 14, 20);
    for (const tx of [2, 24]) {
      masonry(c, x0 + tx, y0 + 12, 6, 16);
      cone(c, x0 + tx + 2.5, y0 + 11, 4, 5);
      flagPole(c, x0 + tx + 3, y0 + 1, 2, flag, frame);
      c.set(x0 + tx + 2, y0 + 16, "k");
      c.set(x0 + tx + 2, y0 + 17, "k");
      c.set(x0 + tx + 3, y0 + 21, "k");
      c.set(x0 + tx + 3, y0 + 22, "k");
    }
    door(c, x0 + 16, y0 + 26, 6, 7);
    for (let x = 14; x < 19; x += 2) for (let y = 21; y < 24; y++) c.set(x0 + x, y0 + y, "s");
    c.paint(cv);
  },

  fortaleza(ctx) {
    const { cv, x0, y0, flag, frame } = ctx;
    for (let ly = 24; ly < 30; ly++) {
      for (let lx = 3 + (ly - 24); lx < 29 - (ly - 24) / 2; lx++) cv.set(x0 + lx, y0 + ly, noise(lx, ly, 4) > 0.6 ? "t" : "S");
    }
    cv.shadow(x0 + 17, y0 + 29, 14, 2);
    const c = new Layer(ctx.W);
    masonry(c, x0 + 4, y0 + 12, 24, 13, "t", "S", "s");
    crenels(c, x0 + 4, y0 + 11, 24);
    for (const tx of [1, 25]) {
      masonry(c, x0 + tx, y0 + 9, 6, 17, "T", "t", "S");
      crenels(c, x0 + tx, y0 + 8, 6);
      c.set(x0 + tx + 2, y0 + 13, "k");
      c.set(x0 + tx + 2, y0 + 14, "k");
      c.set(x0 + tx + 3, y0 + 19, "k");
      c.set(x0 + tx + 3, y0 + 20, "k");
    }
    door(c, x0 + 16, y0 + 24, 6, 8);
    flagPole(c, x0 + 15, y0 + 1, 6, flag, frame);
    for (const x of [10, 21]) {
      c.set(x0 + x, y0 + 16, "k");
      c.set(x0 + x, y0 + 17, "k");
    }
    c.paint(cv);
  },
};

// ---------------------------------------------------------------------------
// Capas de la partida

/** Empalizada de estacas alrededor de una casilla fortificada. */
function palisade(cv: Canvas, W: number, x0: number, y0: number) {
  const l = new Layer(W);
  const stake = (x: number, y: number) => {
    l.set(x, y, "J");
    l.set(x, y + 1, "j");
    l.set(x, y + 2, "j");
    l.set(x, y + 3, "H");
  };
  for (let x = x0 + 2; x < x0 + CELL - 2; x += 3) {
    stake(x, y0 + 1);
    stake(x, y0 + CELL - 6);
  }
  for (let y = y0 + 5; y < y0 + CELL - 7; y += 4) {
    stake(x0 + 1, y);
    stake(x0 + CELL - 3, y);
  }
  l.paint(cv, "h");
}

/** Huella de la última batalla: tierra quemada, lanzas rotas, fuego y humo. */
function battlefield(cv: Canvas, W: number, x0: number, y0: number, seed: number, frame: 0 | 1) {
  for (let i = 0; i < 70; i++) {
    const x = x0 + 4 + Math.floor(noise(i, 1, seed) * (CELL - 8));
    const y = y0 + 6 + Math.floor(noise(i, 2, seed) * (CELL - 10));
    cv.set(x, y, noise(i, 3, seed) > 0.4 ? "e" : "s");
  }
  const l = new Layer(W);
  // Lanzas clavadas.
  for (const [lx, ly] of [[7, 20], [22, 23], [14, 26]] as const) {
    for (let i = 0; i < 4; i++) l.set(x0 + lx + i, y0 + ly - i, i === 3 ? "T" : "j");
  }
  // Hogueras.
  for (const [lx, ly] of [[10, 14], [21, 12]] as const) {
    const fx = x0 + lx;
    const fy = y0 + ly;
    l.stamp(frame ? [".y.", "yqy", "qRq"] : ["y..", ".qy", "qRq"], fx, fy);
  }
  l.paint(cv, "e");
  // Humo que sube (sin contorno): cambia de forma entre fotogramas.
  for (const [lx, ly] of [[11, 10], [22, 8]] as const) {
    for (let i = 0; i < 4; i++) {
      const sx = x0 + lx + Math.round(Math.sin(i + frame) * 1.5);
      const sy = y0 + ly - i * 2 - frame;
      cv.set(sx, sy, i < 2 ? "t" : "T");
      cv.set(sx + 1, sy, "T");
      if (i > 1) cv.set(sx - 1, sy - 1, "u");
    }
  }
}

/**
 * Tropas como figuras: una por cada 3 tropas (hasta 5), con el tabardo de su
 * casa, y un abanderado si son 6 o más. Las neutrales visten de gris.
 */
function soldiers(cv: Canvas, W: number, x0: number, y0: number, troops: number, flag: [string, string] | null, seed: number) {
  const n = Math.min(5, Math.ceil(troops / 3));
  const [m, d] = flag ?? ["t", "S"];
  const body = [
    "..TT..u",
    ".TuTT.T",
    ".ssSs.j",
    "..sS..j",
    `.${m}${m}${d}${m}sj`,
    `${m}${m}${d}${m}${d}.j`,
    `.${m}${d}${m}${d}.j`,
    `.${d}${d}${d}${d}.j`,
    ".h..h..",
    ".h..h..",
  ];
  // Formación en cuña, de atrás adelante.
  const slots: [number, number][] = [
    [13, 14],
    [7, 17],
    [19, 17],
    [3, 20],
    [23, 20],
  ];
  const l = new Layer(W);
  for (const [lx, ly] of slots.slice(0, n)) {
    const jx = Math.floor(noise(lx, ly, seed) * 2);
    cv.shadow(x0 + lx + jx + 3, y0 + ly + 10, 3, 0.9);
    l.stamp(body, x0 + lx + jx, y0 + ly);
  }
  if (troops >= 6 && flag) {
    const bx = x0 + 13 + 6;
    for (let y = y0 + 6; y < y0 + 14; y++) l.set(bx, y, "h");
    l.stamp([`${m}${m}${m}`, `${m}${d}${m}`, `${m}${m}.`], bx + 1, y0 + 6);
  }
  l.paint(cv);
}

// ---------------------------------------------------------------------------

/**
 * Colores RGBA para un <canvas>. La niebla de guerra se aplica aquí: su borde
 * se difumina con trama entre casillas vistas y no vistas (sin cortes rectos)
 * y por encima pasan jirones de bruma que se mueven con el fotograma.
 */
export function toImageData(img: WorldImage, frame: 0 | 1 = 0): Uint8ClampedArray<ArrayBuffer> {
  const { width: W, height: H, pixels, palette, margin: M, cols, rows, fog } = img;
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
  const fogAt = (gx: number, gy: number) =>
    fog[Math.min(rows - 1, Math.max(0, gy))]![Math.min(cols - 1, Math.max(0, gx))] ? 1 : 0;
  for (let y = 0; y < H; y++) {
    const row = pixels[y]!;
    for (let x = 0; x < W; x++) {
      let [r, g, b] = rgb(row[x]!);
      if (anyFog) {
        // Interpolación entre los centros de las casillas, con una rampa corta.
        const fx = (x - M) / CELL - 0.5;
        const fy = (y - M) / CELL - 0.5;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const tx = fx - ix;
        const ty = fy - iy;
        const f =
          fogAt(ix, iy) * (1 - tx) * (1 - ty) + fogAt(ix + 1, iy) * tx * (1 - ty) + fogAt(ix, iy + 1) * (1 - tx) * ty + fogAt(ix + 1, iy + 1) * tx * ty;
        const k = Math.min(1, Math.max(0, (f - 0.5) * 4 + 0.5));
        if (k > 0 && noise(x, y, 31) < k) {
          // Lo que no se ve queda como un mapa viejo en sepia, con jirones de bruma.
          const grey = r * 0.3 + g * 0.59 + b * 0.11;
          const cloud = noise(Math.floor((x + frame * 3) / 6), Math.floor(y / 4), 99);
          const mist = cloud > 0.8 ? 26 : cloud > 0.72 && (x + y) % 2 ? 14 : 0;
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
