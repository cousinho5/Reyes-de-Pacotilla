// Casillas en pixel art de 32x32. Se dibujan con código y sin azar: un suelo
// con textura (ruido fijo por coordenada), objetos con luz arriba a la
// izquierda y sombra abajo a la derecha, y un contorno oscuro alrededor de
// cada capa de objetos. El castillo y la fortaleza llevan la bandera de su dueño.

import type { TileType } from "@reyes/engine";
import type { Palette } from "./Pixels";

export const TILE_SIZE = 32;

/** Paleta común del mundo: pocas rampas de color, siempre las mismas. */
export const WORLD: Palette = {
  k: "#1c1410", // contorno
  // Hierba, de oscura a clara.
  "1": "#22401f",
  "2": "#365f2b",
  "3": "#4f8035",
  "4": "#73a443",
  "5": "#9fc558",
  "6": "#c9df7e",
  // Tierra.
  e: "#45291a",
  E: "#694328",
  f: "#8f633b",
  F: "#b98c58",
  // Trigo.
  w: "#71500f",
  W: "#ad8126",
  y: "#dcb446",
  Y: "#f3da82",
  // Piedra.
  s: "#36333d",
  S: "#57535e",
  t: "#827d8a",
  T: "#aaa5b1",
  u: "#d4d0d9",
  n: "#ffffff",
  // Agua.
  b: "#143a5e",
  B: "#1f5384",
  c: "#3477ae",
  C: "#6eb0df",
  D: "#c8e8ff",
  // Madera.
  h: "#3a2213",
  H: "#663c1f",
  j: "#956132",
  J: "#c18849",
  // Arena.
  a: "#e0c88e",
  A: "#bb9c64",
  // Tejado.
  r: "#5f1f15",
  R: "#9c3626",
  q: "#cf5639",
  // Tela clara (velas, espantapájaros).
  v: "#efe6cf",
  V: "#c2b597",
  // Bandera (se tiñe con el color de la casa).
  x: "#8f8f8f",
  X: "#5e5e5e",
};

type Grid = string[][];
const N = TILE_SIZE;

/** Ruido fijo en [0, 1) para (x, y). */
export function noise(x: number, y: number, seed: number): number {
  let h = (Math.round(x) * 374761393 + Math.round(y) * 668265263 + seed * 1013904223) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function blank(): Grid {
  return Array.from({ length: N }, () => Array.from({ length: N }, () => "."));
}

/** Suelo con textura: tono medio, motas oscuras y claras, y manchas grandes. */
function ground(ramp: [string, string, string, string], seed: number, dark = 0.12, light = 0.1): Grid {
  const [d, m, l, ll] = ramp;
  const g = blank();
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const big = noise(Math.floor(x / 4), Math.floor(y / 4), seed + 1) - 0.5;
      const v = noise(x, y, seed) + big * 0.25;
      g[y]![x] = v < dark ? d : v > 1 - light ? (v > 1 - light / 3 ? ll : l) : m;
    }
  }
  return g;
}

function set(g: Grid, x: number, y: number, c: string) {
  x = Math.round(x);
  y = Math.round(y);
  if (y >= 0 && y < g.length && x >= 0 && x < g[0]!.length) g[y]![x] = c;
}

function get(g: Grid, x: number, y: number): string | undefined {
  return g[Math.round(y)]?.[Math.round(x)];
}

function rect(g: Grid, x0: number, y0: number, w: number, h: number, fill: (x: number, y: number) => string) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(g, x, y, fill(x, y));
}

/** Pega una capa sobre otra con contorno oscuro alrededor de lo pintado. */
function compose(base: Grid, layer: Grid, edge = "k") {
  const painted = (x: number, y: number) => (layer[y]?.[x] ?? ".") !== ".";
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (painted(x, y)) base[y]![x] = layer[y]![x]!;
      else if (painted(x - 1, y) || painted(x + 1, y) || painted(x, y - 1) || painted(x, y + 1)) base[y]![x] = edge;
    }
  }
}

/** Pega un sello de texto ('.' transparente). */
function stamp(g: Grid, art: readonly string[], x0: number, y0: number) {
  art.forEach((line, dy) => [...line].forEach((c, dx) => c !== "." && set(g, x0 + dx, y0 + dy, c)));
}

const DARKER: Record<string, string> = {
  "6": "4", "5": "3", "4": "2", "3": "2", "2": "1", "1": "1",
  F: "f", f: "E", E: "e", a: "A", A: "f", u: "T", T: "t", t: "S", S: "s",
  Y: "y", y: "W", W: "w", c: "B", C: "c", B: "b",
};

/** Sombra en el suelo: oscurece lo que haya debajo. */
function shadow(g: Grid, cx: number, cy: number, rx: number, ry: number) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 > 1) continue;
      const c = get(g, x, y);
      if (c && DARKER[c]) set(g, x, y, DARKER[c]!);
    }
  }
}

function rows(g: Grid): string[] {
  return g.map((r) => r.join(""));
}

// ---------------------------------------------------------------------------
// Piezas

/** Árbol de copa redonda, con luz arriba a la izquierda y follaje con grano. */
function tree(g: Grid, cx: number, cy: number, r: number, seed: number) {
  shadow(g, cx + r * 0.5, cy + r + 1.5, r + 0.8, 1.8);
  const layer = blank();
  for (let y = Math.round(cy + r * 0.6); y <= cy + r + 2; y++) {
    set(layer, cx - 1, y, "j");
    set(layer, cx, y, "H");
    set(layer, cx + 1, y, "h");
  }
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) {
    for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      // Borde algo irregular para que no parezca un círculo perfecto.
      const wobble = (noise(x, y, seed + 9) - 0.5) * 1.1;
      if (Math.hypot(dx, dy * 1.08) > r + wobble * 0.6) continue;
      const lit = (-dx * 0.8 - dy) / (r * 1.5) + (noise(x, y, seed) - 0.5) * 0.55;
      set(layer, x, y, lit > 0.62 ? "6" : lit > 0.32 ? "5" : lit > 0 ? "4" : lit > -0.35 ? "3" : lit > -0.7 ? "2" : "1");
    }
  }
  compose(g, layer, "1");
}

/** Pino pequeño (para la falda de la montaña). */
function pine(g: Grid, cx: number, base: number, h: number) {
  const layer = blank();
  for (let i = 0; i < h; i++) {
    const half = Math.floor((i + 1) / 2);
    for (let dx = -half; dx <= half; dx++) set(layer, cx + dx, base - h + i, dx < 0 ? "3" : dx === 0 && i % 2 ? "4" : "2");
  }
  set(layer, cx, base, "H");
  compose(g, layer, "1");
}

/** Muro de sillería: hiladas con juntas, luz a la izquierda y sombra a la derecha. */
function masonry(layer: Grid, x0: number, y0: number, w: number, h: number, light = "T", mid = "t", dark = "S") {
  rect(layer, x0, y0, w, h, (x, y) => {
    const course = Math.floor((y - y0) / 3);
    const joint = (y - y0) % 3 === 2 || (x - x0 + (course % 2) * 2) % 4 === 3;
    if (x === x0) return light;
    if (x === x0 + w - 1) return dark;
    if (joint) return dark;
    return noise(x, y, 5) > 0.8 ? light : mid;
  });
}

/** Almenas sobre la fila y. */
function crenels(layer: Grid, x0: number, y: number, w: number) {
  for (let x = x0; x < x0 + w; x++) {
    if ((x - x0) % 3 !== 2) {
      set(layer, x, y, x === x0 ? "u" : "T");
      set(layer, x, y - 1, (x - x0) % 3 === 0 ? "u" : "T");
    }
  }
}

/** Tejado cónico de torre. */
function cone(layer: Grid, cx: number, baseY: number, half: number, h: number) {
  for (let i = 0; i <= h; i++) {
    const w = (half * i) / h;
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      const left = x < cx;
      set(layer, x, baseY - h + i, i === h ? "r" : left ? (x < cx - w / 2 ? "q" : "R") : x === Math.round(cx) ? "R" : "r");
    }
  }
}

/** Mástil con bandera ondeando. */
function flag(layer: Grid, x: number, top: number, pole = 4) {
  for (let y = top; y < top + pole + 3; y++) set(layer, x, y, "h");
  stamp(layer, ["xxxx", "xxxX", "xxX."], x + 1, top);
}

function door(layer: Grid, cx: number, bottom: number, w: number, h: number) {
  const x0 = cx - Math.floor(w / 2);
  for (let y = bottom - h + 1; y <= bottom; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const corner = y === bottom - h + 1 && (x === x0 || x === x0 + w - 1);
      if (corner) continue;
      set(layer, x, y, y === bottom - h + 1 ? "h" : x % 2 ? "H" : "j");
    }
  }
}

// ---------------------------------------------------------------------------
// Casillas

function campos(): string[] {
  const g = ground(["2", "3", "4", "5"], 11, 0.1, 0.08);
  // Parcela de trigo: espigas con cabeza clara y tallo oscuro.
  for (let y = 2; y < 15; y++) {
    for (let x = 1; x < 19; x++) {
      const band = (y + (x % 2)) % 4;
      const v = noise(x, y, 5);
      set(g, x, y, band === 0 ? (v > 0.4 ? "Y" : "y") : band === 1 ? "y" : band === 2 ? "W" : v > 0.5 ? "w" : "W");
    }
  }
  for (let x = 1; x < 19; x++) set(g, x, 15, "w");
  // Tierra arada con brotes.
  for (let y = 19; y < 30; y++) {
    for (let x = 12; x < 31; x++) {
      const furrow = y % 3 === 0;
      const sprout = y % 3 === 1 && (x + y) % 3 === 0;
      set(g, x, y, sprout ? (noise(x, y, 3) > 0.4 ? "5" : "4") : furrow ? "E" : noise(x, y, 4) > 0.8 ? "F" : "f");
    }
  }
  for (let x = 12; x < 31; x++) set(g, x, 30, "e");
  // Gavillas.
  const sheaf = blank();
  stamp(sheaf, ["..Y..", ".YyY.", "YyWyY", ".yWy.", ".WwW.", "WwWwW"], 22, 3);
  stamp(sheaf, ["..Y..", ".YyY.", "YyWyY", ".yWy.", ".WwW.", "WwWwW"], 25, 9);
  shadow(g, 25, 9, 3, 1);
  shadow(g, 28, 15, 3, 1);
  compose(g, sheaf, "w");
  // Espantapájaros.
  const crow = blank();
  stamp(crow, ["..yYy..", "..vvV..", "..vkv..", "hjjHjjh", "..RqR..", "..RRr..", "...h...", "...h...", "...h..."], 3, 18);
  shadow(g, 7, 28, 3, 1);
  compose(g, crow);
  // Valla de troncos.
  const fence = blank();
  for (let x = 0; x < 11; x++) set(fence, x, 29, x % 4 === 1 ? "h" : "J");
  for (let x = 1; x < 11; x += 4) {
    set(fence, x, 28, "j");
    set(fence, x, 30, "h");
  }
  compose(g, fence, "h");
  return rows(g);
}

function bosque(): string[] {
  const g = ground(["1", "2", "3", "4"], 21, 0.18, 0.08);
  // Setas.
  stamp(g, ["q.", "v."], 26, 29);
  stamp(g, [".q", ".v"], 4, 30);
  // De atrás adelante.
  tree(g, 6, 5, 4.6, 1);
  tree(g, 21, 3, 4.2, 2);
  tree(g, 29, 9, 3.8, 3);
  tree(g, 14, 11, 5.4, 4);
  tree(g, 4, 18, 4.4, 5);
  tree(g, 25, 18, 5, 6);
  tree(g, 13, 24, 5, 7);
  tree(g, 28, 27, 3.4, 8);
  return rows(g);
}

function montana(): string[] {
  const g = ground(["2", "3", "4", "F"], 31, 0.14, 0.14);
  const peak = (px: number, py: number, base: number, half: number, snow: number, seed: number) => {
    const layer = blank();
    for (let y = py; y <= base; y++) {
      const t = (y - py) / (base - py);
      const w = t * half;
      // La cresta zigzaguea un poco.
      const ridge = px + Math.round((noise(0, y, seed) - 0.5) * 2 * t);
      for (let x = Math.ceil(px - w); x <= Math.floor(px + w); x++) {
        const left = x < ridge;
        const v = noise(x, y, seed);
        let c = left ? (v > 0.75 ? "u" : v < 0.1 ? "t" : "T") : v > 0.8 ? "t" : v < 0.12 ? "s" : "S";
        // Vetas de roca en diagonal.
        if ((x * 2 + y) % 9 === 0 && v > 0.4) c = left ? "t" : "s";
        const snowLine = py + snow + Math.round(noise(x, 1, seed) * 2);
        if (y < snowLine) c = left ? "n" : "u";
        else if (y === snowLine && v > 0.5) c = left ? "u" : "T";
        set(layer, x, y, c);
      }
    }
    shadow(g, px + half * 0.5, base + 1, half * 0.9, 1.6);
    compose(g, layer, "s");
  };
  peak(22, 4, 17, 8, 4, 7);
  peak(12, 3, 28, 12, 6, 3);
  peak(27, 18, 30, 5, 0, 9);
  pine(g, 3, 30, 6);
  pine(g, 24, 31, 5);
  pine(g, 29, 31, 7);
  return rows(g);
}

function cantera(): string[] {
  const g = ground(["E", "f", "F", "a"], 41, 0.16, 0.14);
  // Pared de roca escalonada con estratos.
  for (let y = 0; y < 13; y++) {
    for (let x = 0; x < N; x++) {
      const stepTop = 9 - Math.floor(x / 11) * 3;
      if (y > stepTop + 2) continue;
      const v = noise(x, y, 6);
      const strata = y % 4 === 3;
      const face = y > stepTop;
      set(g, x, y, face ? (v > 0.5 ? "S" : "s") : strata ? "S" : v > 0.82 ? "T" : v < 0.12 ? "S" : "t");
    }
  }
  // Bloques de sillar.
  const blocks = blank();
  const block = (x: number, y: number, w: number, h: number) => {
    shadow(g, x + w / 2 + 1, y + h, w / 2 + 1, 1.2);
    rect(blocks, x, y, w, h, (bx, by) =>
      by === y ? "u" : bx === x ? "T" : bx === x + w - 1 || by === y + h - 1 ? "S" : noise(bx, by, 2) > 0.85 ? "T" : "t",
    );
  };
  block(2, 16, 7, 5);
  block(10, 18, 6, 4);
  block(4, 23, 6, 5);
  block(12, 24, 7, 5);
  compose(g, blocks);
  // Carretilla cargada con un sillar.
  const cart = blank();
  shadow(g, 26, 29, 6, 1.4);
  rect(cart, 21, 19, 6, 3, (x, y) => (y === 19 ? "u" : x === 26 ? "S" : "t"));
  rect(cart, 19, 22, 10, 4, (x, y) => (y === 22 ? "J" : x === 28 ? "h" : y === 25 ? "H" : "j"));
  for (let i = 0; i < 4; i++) set(cart, 29 + i, 22 - Math.floor(i / 2), "H");
  stamp(cart, [".hh.", "hSsh", "hssh", ".hh."], 20, 25);
  stamp(cart, ["h", "h"], 27, 26);
  compose(g, cart);
  // Grava.
  for (let i = 0; i < 24; i++) {
    set(g, Math.floor(noise(i, 1, 3) * N), 14 + Math.floor(noise(i, 2, 3) * 17), noise(i, 3, 3) > 0.5 ? "T" : "t");
  }
  return rows(g);
}

function puerto(): string[] {
  const g = blank();
  const shore = (x: number) => 22 + Math.round(Math.sin(x / 4) * 1.6 + x / 16);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const s = shore(x);
      if (y > s + 1) g[y]![x] = noise(x, y, 7) > 0.82 ? "A" : noise(x, y, 8) > 0.9 ? "F" : "a";
      else if (y > s) g[y]![x] = "D";
      else if (y === s) g[y]![x] = noise(x, 0, 2) > 0.5 ? "C" : "D";
      else {
        // Crestas cortas y espaciadas; agua más clara cerca de la orilla.
        const row = y % 5;
        const crest = row === 0 && (x + Math.floor(y / 5) * 4) % 8 < 3;
        const under = row === 1 && (x + Math.floor(y / 5) * 4) % 8 === 1;
        g[y]![x] = crest ? "C" : under ? "c" : y > s - 3 ? "c" : noise(x, y, 2) > 0.92 ? "b" : "B";
      }
    }
  }
  // Muelle sobre pilotes, con barriles al final.
  const pier = blank();
  for (let y = 9; y < 28; y++) for (let x = 3; x < 9; x++) set(pier, x, y, x === 8 ? "h" : y % 2 ? "j" : "J");
  for (const y of [10, 16, 22]) {
    for (const x of [2, 9]) {
      set(pier, x, y, "h");
      set(pier, x, y + 1, "H");
    }
  }
  stamp(pier, ["jHj", "hhh", "jHj"], 4, 24);
  compose(g, pier, "h");
  // Barca de vela a rayas.
  const boat = blank();
  for (let y = 2; y < 17; y++) set(boat, 19, y, "h");
  for (let y = 3; y < 15; y++) {
    const w = Math.round(((y - 3) / 12) * 9);
    for (let x = 20; x <= 20 + w; x++) set(boat, x, y, (y + 1) % 4 < 2 ? "v" : "q");
  }
  stamp(boat, ["xxX", "xX."], 20, 1);
  rect(boat, 12, 17, 18, 2, (_x, y) => (y === 17 ? "J" : "j"));
  rect(boat, 13, 19, 16, 1, () => "H");
  rect(boat, 15, 20, 12, 1, () => "h");
  compose(g, boat);
  for (let x = 14; x < 28; x += 2) set(g, x, 22, "b");
  // Choza en la orilla.
  const hut = blank();
  cone(hut, 26, 26, 4, 3);
  rect(hut, 23, 27, 7, 4, (x, y) => (x === 23 ? "J" : x === 29 ? "h" : y === 30 ? "H" : "j"));
  set(hut, 26, 29, "h");
  set(hut, 26, 30, "h");
  compose(g, hut);
  return rows(g);
}

function castillo(): string[] {
  const g = ground(["2", "3", "4", "5"], 51, 0.1, 0.06);
  // Camino de tierra hasta la puerta.
  for (let y = 26; y < N; y++) {
    for (let x = 13; x < 19 + (y - 26) / 2; x++) set(g, x, y, noise(x, y, 1) > 0.7 ? "F" : noise(x, y, 2) > 0.9 ? "E" : "f");
  }
  shadow(g, 18, 27, 15, 2.2);
  const c = blank();
  // Torre del homenaje, detrás de la muralla.
  masonry(c, 12, 6, 8, 9);
  crenels(c, 12, 5, 8);
  flag(c, 16, 0, 2);
  for (const x of [14, 17]) {
    set(c, x, 9, "k");
    set(c, x, 10, "k");
  }
  // Muralla.
  masonry(c, 6, 15, 20, 12);
  crenels(c, 6, 14, 20);
  // Torres laterales con tejado cónico y bandera.
  for (const tx of [2, 24]) {
    masonry(c, tx, 12, 6, 16);
    cone(c, tx + 2.5, 11, 4, 5);
    flag(c, tx + 3, 1, 2);
    set(c, tx + 2, 16, "k");
    set(c, tx + 2, 17, "k");
    set(c, tx + 3, 21, "k");
    set(c, tx + 3, 22, "k");
  }
  // Puerta con rastrillo.
  door(c, 16, 26, 6, 7);
  for (let x = 14; x < 19; x += 2) for (let y = 21; y < 24; y++) set(c, x, y, "s");
  compose(g, c);
  return rows(g);
}

function fortaleza(): string[] {
  const g = ground(["E", "f", "3", "F"], 61, 0.16, 0.2);
  // Peñasco bajo los muros.
  for (let y = 24; y < 30; y++) {
    for (let x = 3 + (y - 24); x < 29 - (y - 24) / 2; x++) set(g, x, y, noise(x, y, 4) > 0.6 ? "t" : "S");
  }
  shadow(g, 17, 29, 14, 2);
  const c = blank();
  masonry(c, 4, 12, 24, 13, "t", "S", "s");
  crenels(c, 4, 11, 24);
  // Torres cuadradas a los lados.
  for (const tx of [1, 25]) {
    masonry(c, tx, 9, 6, 17, "T", "t", "S");
    crenels(c, tx, 8, 6);
    set(c, tx + 2, 13, "k");
    set(c, tx + 2, 14, "k");
    set(c, tx + 3, 19, "k");
    set(c, tx + 3, 20, "k");
  }
  door(c, 16, 24, 6, 8);
  flag(c, 15, 1, 6);
  for (const x of [10, 21]) {
    set(c, x, 16, "k");
    set(c, x, 17, "k");
  }
  compose(g, c);
  return rows(g);
}

export const TILE_ART: Record<TileType, string[]> = {
  campos: campos(),
  bosque: bosque(),
  montana: montana(),
  cantera: cantera(),
  puerto: puerto(),
  castillo: castillo(),
  fortaleza: fortaleza(),
};

/** Paleta del mundo con la bandera teñida del color de una casa. */
export function flagPalette(hex: string | null | undefined): Palette {
  if (!hex) return WORLD;
  return { ...WORLD, x: hex, X: shade(hex, -0.35) };
}

/** Aclara (+) u oscurece (-) un color en hexadecimal. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount),
  );
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
