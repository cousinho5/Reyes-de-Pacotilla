// Sprites del juego como rejillas de texto: cada letra es un color de la
// paleta y '.' es transparente. Las casillas se componen pegando sellos
// pequeños (árboles, rocas, barcas) sobre un fondo.

import type { Resource, TileType } from "@reyes/engine";
import type { Palette } from "./Pixels";

export interface Sprite {
  grid: string[];
  palette: Palette;
}

type Stamp = readonly string[];

/** Fondo de w x h con la letra `bg` y unas motas `speck` repartidas sin azar. */
function field(w: number, h: number, bg: string, speck?: string, seed = 7): string[][] {
  const out: string[][] = [];
  for (let y = 0; y < h; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) row.push(speck && (x * 7 + y * 13 + seed) % 23 === 0 ? speck : bg);
    out.push(row);
  }
  return out;
}

function stamp(cells: string[][], art: Stamp, x0: number, y0: number): void {
  art.forEach((line, dy) =>
    [...line].forEach((ch, dx) => {
      if (ch !== "." && cells[y0 + dy]?.[x0 + dx] != null) cells[y0 + dy]![x0 + dx] = ch;
    }),
  );
}

const rows = (cells: string[][]) => cells.map((r) => r.join(""));

// ---------------------------------------------------------------------------
// Casillas (16x16)

const TREE: Stamp = ["..t..", ".tTt.", ".tTt.", "tTTTt", "tTTTt", "ttTtt", "..w..", "..w.."];
const SMALL_TREE: Stamp = [".t.", "tTt", "tTt", ".w."];
const WHEAT: Stamp = ["y.y.y", "YyYyY", "YYYYY"];
const ROCK: Stamp = ["..LLL.", ".LlllL", "LlllLd", "LllLdd", ".dddd."];
const BLOCK: Stamp = ["llllL", "lLLLd", "lLLLd", "Ldddd"];
const MOUNTAIN: Stamp = [
  ".....s.....",
  "....sSs....",
  "...sSppP...",
  "...pppPPP..",
  "..ppppPPPP.",
  ".pppppPPPPP",
  "pppppPPPPPP",
];
const SMALL_MOUNTAIN: Stamp = ["...s...", "..sSp..", ".ppPPP.", "pppPPPP"];
const BOAT: Stamp = ["...k....", "...kSS..", "...kSSS.", "...kSSSS", "wwwwwwww", ".wWWWWw."];
const WAVE: Stamp = ["b.b", ".b."];
const CASTLE: Stamp = [
  ".k..........",
  ".kFF........",
  ".kFF........",
  ".k..........",
  "S.S......S.S",
  "SSS......SSS",
  "SdSS.S.S.SdS",
  "SSSSSSSSSSSS",
  "SdSSSSSSSSdS",
  "SSSSSddSSSSS",
  "SSSSddddSSSS",
  "ssssddddssss",
];
const FORT: Stamp = [
  "S.S.S.S.S.",
  "SSSSSSSSSS",
  "SsSSSSSSsS",
  "SsdSSSSdsS",
  "SsdSSSSdsS",
  "SsSSSSSSsS",
  "SsSSddSSsS",
  "SsSddddSsS",
  "ssSddddSss",
];

function campos(): string[] {
  const c = field(16, 16, "g", "G", 3);
  for (let y = 1; y < 16; y += 5) for (let x = 0; x < 16; x += 6) stamp(c, WHEAT, x + (y % 2), y);
  for (let y = 4; y < 16; y += 5) for (let x = 0; x < 16; x++) c[y]![x] = "b";
  return rows(c);
}

function bosque(): string[] {
  const c = field(16, 16, "G", "g", 1);
  stamp(c, TREE, 0, 0);
  stamp(c, TREE, 10, 1);
  stamp(c, SMALL_TREE, 6, 3);
  stamp(c, TREE, 4, 7);
  stamp(c, TREE, 11, 8);
  stamp(c, SMALL_TREE, 0, 11);
  return rows(c);
}

function cantera(): string[] {
  const c = field(16, 16, "q", "Q", 5);
  stamp(c, ROCK, 0, 1);
  stamp(c, BLOCK, 9, 2);
  stamp(c, BLOCK, 3, 9);
  stamp(c, BLOCK, 9, 10);
  stamp(c, ROCK, 10, 5);
  return rows(c);
}

function montana(): string[] {
  const c = field(16, 16, "h", "H", 2);
  stamp(c, SMALL_MOUNTAIN, 9, 2);
  stamp(c, MOUNTAIN, 1, 5);
  stamp(c, SMALL_MOUNTAIN, 9, 10);
  return rows(c);
}

function puerto(): string[] {
  const c = field(16, 16, "B");
  stamp(c, WAVE, 1, 1);
  stamp(c, WAVE, 10, 3);
  stamp(c, WAVE, 2, 8);
  stamp(c, WAVE, 12, 11);
  stamp(c, BOAT, 6, 5);
  // Muelle de tablones abajo.
  for (let y = 13; y < 16; y++) for (let x = 0; x < 16; x++) c[y]![x] = y === 13 ? "W" : x % 4 === 0 ? "k" : "w";
  return rows(c);
}

function castillo(): string[] {
  const c = field(16, 16, "g", "G", 4);
  stamp(c, CASTLE, 2, 2);
  return rows(c);
}

function fortaleza(): string[] {
  const c = field(16, 16, "h", "H", 6);
  stamp(c, FORT, 3, 4);
  stamp(c, SMALL_TREE, 0, 12);
  return rows(c);
}

const GREEN = { g: "#8fb35a", G: "#7aa04a", t: "#24502a", T: "#3f8a3c", w: "#6b4423" };

export const TILE_SPRITES: Record<TileType, Sprite> = {
  campos: { grid: campos(), palette: { ...GREEN, y: "#b98a2c", Y: "#e2c25a", b: "#9a7848" } },
  bosque: { grid: bosque(), palette: { ...GREEN, G: "#5e9c48", g: "#6faa52" } },
  cantera: { grid: cantera(), palette: { q: "#b8aa90", Q: "#a69676", l: "#e0dace", L: "#b0a898", d: "#6e685f" } },
  montana: { grid: montana(), palette: { h: "#9aa36a", H: "#8a945c", p: "#8a8580", P: "#5e5a57", s: "#f4f4f4", S: "#cfcfd6" } },
  puerto: { grid: puerto(), palette: { B: "#3d7fb5", b: "#8cc0e6", k: "#3b2a1a", S: "#f4efe2", w: "#8a5a32", W: "#b07a48" } },
  castillo: { grid: castillo(), palette: { ...GREEN, S: "#ded6c4", s: "#a89e8c", d: "#3a2e26", k: "#2a2420", F: "#8a8a8a" } },
  fortaleza: { grid: fortaleza(), palette: { ...GREEN, h: "#a2a27a", H: "#929268", S: "#b9b3a6", s: "#857e72", d: "#2f2a26" } },
};

// ---------------------------------------------------------------------------
// Recursos (9x9)

export const RESOURCE_SPRITES: Record<Resource, Sprite> = {
  pan: {
    grid: [
      ".........",
      "...kkkk..",
      ".kkYyYykk",
      "kYYyYYyYk",
      "kYyYYyYYk",
      "kYYYYYYYk",
      ".kddddddk",
      "..kkkkkk.",
      ".........",
    ],
    palette: { k: "#5a3410", Y: "#e0a956", y: "#f3d08c", d: "#b9782f" },
  },
  madera: {
    grid: [
      ".........",
      ".kkkkkkk.",
      "kbBbBbkok",
      "kBbBbBkrk",
      ".kkkkkkk.",
      "kbBbBbkok",
      "kBbBbBkrk",
      ".kkkkkkk.",
      ".........",
    ],
    palette: { k: "#3b2414", b: "#8a5a32", B: "#a8743f", o: "#e0b47a", r: "#c38f55" },
  },
  piedra: {
    grid: [
      ".........",
      "...kkk...",
      "..kLLlk..",
      ".kLLLllk.",
      "kLLLlllk.",
      "kLLllldk.",
      ".kldddk..",
      "..kkkk...",
      ".........",
    ],
    palette: { k: "#3e3a36", L: "#d6d0c4", l: "#aaa395", d: "#7b756b" },
  },
  hierro: {
    grid: [
      ".........",
      "..kkkkk..",
      ".kHHHHhk.",
      "kHHHHhhhk",
      "kHhhhhhdk",
      "kkkkkkkkk",
      ".........",
      ".........",
      ".........",
    ].slice(0),
    palette: { k: "#26282e", H: "#c9d0da", h: "#8e97a5", d: "#5d6573" },
  },
  oro: {
    grid: [
      ".........",
      "..kkkkk..",
      ".kYYYYyk.",
      "kYYyyyYdk",
      "kYyYYYydk",
      "kYYyyyYdk",
      ".kyYYYdk.",
      "..kkkkk..",
      ".........",
    ],
    palette: { k: "#6b4a06", Y: "#f2cd4a", y: "#c8971c", d: "#a37a10" },
  },
};
// El lingote de hierro queda centrado.
RESOURCE_SPRITES.hierro.grid = [".........", ".........", ...RESOURCE_SPRITES.hierro.grid.slice(1, 6), ".........", "........."];

// ---------------------------------------------------------------------------
// Fray Abundio (24x24): monje mayor, tonsura despeinada, gafas de culo de
// botella y una pluma exageradamente larga. Cinco expresiones.

export type FrayMood = "solemne" | "adulador" | "escandalizado" | "dormido" | "monedas";

const FRAY_BASE = [
  "....................fF..",
  ".........kkkkkk.....fF..",
  ".......kksssssskk..ffF..",
  ".....hkssssssssssk" + "h..fF.",
  ".....khhsssssssshhk.fF..",
  "....hkhsssssssssshkh.fF.",
  ".....kgggggssgggggk.ffF.",
  "....kSgwwwggggwwwgSk.fF.",
  "....kSgwwwgssgwwwgSk..F.",
  ".....kgggggssgggggk...F.",
  ".....ksssssSSsssssk...F.",
  "......kssMMMMMMssk...k..",
  ".......ksMMMMMMsk..sss..",
  "........kkkkkkkk..ssss..",
  "......kRRrrrrrrRRk.sss..",
  ".....kRrrrrrrrrrrrRkrk..",
  "....kRrrrrrrrrrrrrrRrk..",
  "...kRrrrrrrrrrrrrrrrRk..",
  "...kRrrrrrrrrrrrrrrrRk..",
  "..kRrrrrrrrrrrrrrrrrrRk.",
  "..kRyyyyyyyyyyyyyyyyyRk.",
  "..kRrrrrrrrrryrrrrrrrRk.",
  ".kRrrrrrrrrrryrrrrrrrrRk",
  ".kkkkkkkkkkkkkkkkkkkkkkk",
];

/** Ojos (dentro de las gafas, filas 7-8) y boca (filas 11-12) de cada expresión. */
const MOODS: Record<FrayMood, { eyes: [string, string]; mouth: [string, string]; extra?: [Stamp, number, number][]; brows?: boolean }> = {
  solemne: { eyes: ["SSS", "wew"], mouth: ["sMMMMs", "ssssss"] },
  adulador: { eyes: ["wew", "ewe"], mouth: ["Mssssm", "sMMMMs"], extra: [[["p"], 6, 10], [["p"], 17, 10]] },
  escandalizado: { eyes: ["wew", "wew"], mouth: ["ssMMss", "ssMMss"], brows: true, extra: [[["b", "b"], 3, 2]] },
  dormido: {
    eyes: ["www", "eee"],
    mouth: ["sssMss", "ssssss"],
    extra: [[["kkk", "..k", ".k.", "kkk"], 0, 0], [["kk", ".k", "kk"], 3, 2]],
  },
  monedas: {
    eyes: ["www", "wee"],
    mouth: ["sMMMMs", "sssmss"],
    extra: [[[".kkkk.", "kooooOk", "kOOOOOk", "kooooOk", "kOOOOOk", ".kkkkk."].map((r) => r.slice(0, 7)), 8, 17]],
  },
};

function fray(mood: FrayMood): string[] {
  const c = FRAY_BASE.map((r) => [...r.padEnd(24, ".").slice(0, 24)]);
  const m = MOODS[mood];
  for (const [dy, line] of m.eyes.entries()) {
    [...line].forEach((ch, i) => {
      c[7 + dy]![7 + i] = ch;
      c[7 + dy]![14 + i] = ch;
    });
  }
  for (const [dy, line] of m.mouth.entries()) [...line].forEach((ch, i) => (c[11 + dy]![9 + i] = ch));
  if (m.brows) {
    for (const x of [7, 8, 9, 14, 15, 16]) c[5]![x] = "H";
  }
  for (const [art, x, y] of m.extra ?? []) stamp(c, art, x, y);
  return rows(c);
}

const FRAY_PALETTE: Palette = {
  k: "#2a1d14",
  s: "#ebbd93",
  S: "#c98c63",
  h: "#e8e4dc",
  H: "#8f8a80",
  g: "#2e2e33",
  w: "#d9eef6",
  e: "#1a1a1a",
  M: "#7a2e22",
  m: "#c9665a",
  r: "#6b4a2b",
  R: "#4a3119",
  y: "#c9a15a",
  f: "#fbfaf5",
  F: "#bdb7aa",
  p: "#e98a7a",
  b: "#6fb3e8",
  o: "#f2cd4a",
  O: "#c8971c",
};

export const FRAY_SPRITES: Record<FrayMood, Sprite> = {
  solemne: { grid: fray("solemne"), palette: FRAY_PALETTE },
  adulador: { grid: fray("adulador"), palette: FRAY_PALETTE },
  escandalizado: { grid: fray("escandalizado"), palette: FRAY_PALETTE },
  dormido: { grid: fray("dormido"), palette: FRAY_PALETTE },
  monedas: { grid: fray("monedas"), palette: FRAY_PALETTE },
};
