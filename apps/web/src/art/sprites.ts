// Iconos de recursos (16x16) y Fray Abundio (32x32), dibujados con código:
// formas con luz arriba a la izquierda, sombra abajo a la derecha y contorno.
// Las casillas están en tiles.ts y los escudos en shield.ts.

import type { Resource } from "@reyes/engine";
import type { Palette } from "./Pixels";
import { WORLD, noise } from "./tiles";

export interface Sprite {
  grid: string[];
  palette: Palette;
}

type Grid = string[][];

function blank(w: number, h: number): Grid {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => "."));
}

function set(g: Grid, x: number, y: number, c: string) {
  x = Math.round(x);
  y = Math.round(y);
  if (y >= 0 && y < g.length && x >= 0 && x < g[0]!.length) g[y]![x] = c;
}

/** Contorno de una capa: cada hueco que toca lo pintado se vuelve `edge`. */
function outline(g: Grid, edge = "k"): Grid {
  const painted = (x: number, y: number) => (g[y]?.[x] ?? ".") !== "." && g[y]![x] !== edge;
  return g.map((row, y) =>
    row.map((c, x) => (c !== "." ? c : painted(x - 1, y) || painted(x + 1, y) || painted(x, y - 1) || painted(x, y + 1) ? edge : ".")),
  );
}

/** Elipse sombreada con una rampa de [oscuro, medio, claro, brillo]. */
function blob(g: Grid, cx: number, cy: number, rx: number, ry: number, ramp: [string, string, string, string], seed = 1, grain = 0.3) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const lit = -dx * 0.7 - dy * 0.8 + (noise(x, y, seed) - 0.5) * grain;
      set(g, x, y, lit > 0.75 ? ramp[3] : lit > 0.15 ? ramp[2] : lit > -0.55 ? ramp[1] : ramp[0]);
    }
  }
}

const rows = (g: Grid) => g.map((r) => r.join(""));

// ---------------------------------------------------------------------------
// Recursos

function pan(): string[] {
  const g = blank(16, 16);
  blob(g, 7.5, 8.5, 6.6, 4.6, ["E", "f", "F", "a"], 3, 0.15);
  // Cortes en la corteza.
  for (const [x, y] of [[4, 6], [5, 7], [7, 5], [8, 6], [10, 6], [11, 7]] as const) set(g, x, y, "Y");
  for (const [x, y] of [[5, 6], [8, 5], [11, 6]] as const) set(g, x, y, "v");
  return rows(outline(g));
}

function madera(): string[] {
  const g = blank(16, 16);
  // Tres troncos vistos por la punta: dos abajo y uno encima.
  const log = (cx: number, cy: number) => {
    for (let y = cy - 3; y <= cy + 3; y++) {
      for (let x = cx - 3; x <= cx + 3; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > 3.2) continue;
        set(g, x, y, d > 2.4 ? (x + y < cx + cy ? "j" : "h") : d > 1.6 ? "J" : d > 0.8 ? "j" : "J");
      }
    }
  };
  log(4.5, 10.5);
  log(11.5, 10.5);
  log(8, 5);
  return rows(outline(g));
}

function piedra(): string[] {
  const g = blank(16, 16);
  blob(g, 9.5, 10, 5, 4, ["s", "S", "t", "T"], 4, 0.25);
  blob(g, 6, 8.5, 4.6, 5, ["S", "t", "T", "u"], 2, 0.25);
  set(g, 5, 7, "S");
  set(g, 6, 8, "S");
  set(g, 6, 9, "t");
  return rows(outline(g));
}

function hierro(): string[] {
  const g = blank(16, 16);
  // Dos lingotes trapezoidales apilados.
  const ingot = (x0: number, y0: number, w: number) => {
    for (let i = 0; i < 4; i++) {
      for (let x = x0 + (3 - i); x < x0 + w - (3 - i); x++) {
        set(g, x, y0 + i, i === 0 ? "u" : x === x0 + (3 - i) ? "T" : x >= x0 + w - (3 - i) - 2 ? "S" : "t");
      }
    }
    for (let x = x0; x < x0 + w; x++) set(g, x, y0 + 4, x < x0 + 3 ? "t" : "S");
  };
  ingot(1, 9, 13);
  ingot(3, 4, 11);
  return rows(outline(g));
}

function oro(): string[] {
  const g = blank(16, 16);
  // Monedas apiladas y una de canto delante.
  for (let i = 0; i < 4; i++) {
    const y = 12 - i * 2;
    for (let x = 2; x < 10; x++) set(g, x, y, x < 4 ? "Y" : x > 7 ? "W" : "y");
    for (let x = 2; x < 10; x++) set(g, x, y + 1, "w");
  }
  for (let x = 3; x < 9; x++) set(g, x, 5, x < 5 ? "Y" : "y");
  blob(g, 11, 10, 3.6, 3.8, ["W", "y", "Y", "v"], 5, 0.1);
  set(g, 11, 9, "W");
  set(g, 11, 10, "W");
  set(g, 11, 11, "W");
  return rows(outline(g));
}

export const RESOURCE_SPRITES: Record<Resource, Sprite> = {
  pan: { grid: pan(), palette: WORLD },
  madera: { grid: madera(), palette: WORLD },
  piedra: { grid: piedra(), palette: WORLD },
  hierro: { grid: hierro(), palette: WORLD },
  oro: { grid: oro(), palette: WORLD },
};

// ---------------------------------------------------------------------------
// Fray Abundio (32x32): monje mayor, tonsura despeinada, gafas de culo de
// botella y una pluma exageradamente larga. Cinco caras.

export type FrayMood = "solemne" | "adulador" | "escandalizado" | "dormido" | "monedas";

const FRAY_PALETTE: Palette = {
  ...WORLD,
  k: "#21160f",
  s: "#efc39a",
  S: "#d29a6e",
  Z: "#a96f4c",
  p: "#e98a7a",
  h: "#f1ede4",
  H: "#a9a398",
  g: "#2b2a30",
  w: "#cfe6f2",
  O: "#ffffff",
  e: "#1a1a1a",
  M: "#6e2219",
  m: "#c75b4c",
  r: "#6b4a2b",
  R: "#4a3119",
  o: "#87613a",
  y: "#cfa65a",
  f: "#fbfaf5",
  F: "#c4beb1",
  b: "#73b8ec",
};

function fray(mood: FrayMood): string[] {
  const W = 32;
  const g = blank(W, W);
  const cx = 15.5;
  // Hábito: capucha caída alrededor del cuello y cuerpo que se ensancha.
  for (let y = 20; y < W; y++) {
    const half = 7 + (y - 20) * 0.75;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const dx = (x - cx) / half;
      set(g, x, y, dx < -0.55 ? "o" : dx > 0.45 ? "R" : "r");
    }
  }
  // Pliegues y capucha.
  for (let x = 9; x <= 22; x++) set(g, x, 20, x < 12 || x > 19 ? "R" : "o");
  for (let x = 10; x <= 21; x++) set(g, x, 21, x < 13 || x > 18 ? "o" : "R");
  for (const x of [11, 20]) for (let y = 24; y < W; y++) if ((y + x) % 3) set(g, x, y, "R");
  // Cordón.
  for (let x = 4; x < 28; x++) set(g, x, 28, x % 3 ? "y" : "W");
  set(g, 13, 29, "y");
  set(g, 13, 30, "y");
  set(g, 14, 31, "y");

  // Cabeza: calva con luz arriba a la izquierda.
  for (let y = 3; y <= 19; y++) {
    for (let x = 7; x <= 24; x++) {
      const dx = (x - cx) / 7.6;
      const dy = (y - 11.5) / 8.2;
      if (dx * dx + dy * dy > 1) continue;
      const lit = -dx * 0.6 - dy * 0.5;
      set(g, x, y, dx > 0.62 || dy > 0.78 ? "Z" : lit > 0.45 ? "h" : lit > -0.25 ? "s" : "S");
    }
  }
  // El brillo de la calva queda en piel clara, no en pelo.
  for (let y = 3; y < 9; y++) for (let x = 8; x < 24; x++) if (g[y]![x] === "h") g[y]![x] = y < 5 && x < 13 ? "O" : "s";
  set(g, 11, 5, "O");
  set(g, 12, 5, "O");
  set(g, 11, 6, "O");
  // Orejas.
  for (const [x, c] of [[7, "s"], [6, "s"], [24, "S"], [25, "S"]] as const) for (let y = 12; y <= 14; y++) set(g, x, y, c);
  // Tonsura: cerco de pelo blanco despeinado en los lados.
  for (let y = 7; y <= 12; y++) {
    for (const x of [7, 8, 9, 22, 23, 24]) set(g, x, y, (x + y) % 3 ? "h" : "H");
  }
  for (const [x, y] of [[6, 7], [5, 8], [6, 10], [25, 7], [26, 8], [25, 10], [8, 6], [23, 6]] as const) set(g, x, y, "h");
  // Gafas de culo de botella.
  const lens = (x0: number) => {
    for (let y = 11; y <= 15; y++) {
      for (let x = x0; x <= x0 + 5; x++) {
        const corner = (y === 11 || y === 15) && (x === x0 || x === x0 + 5);
        if (corner) continue;
        const frame = y === 11 || y === 15 || x === x0 || x === x0 + 5;
        set(g, x, y, frame ? "g" : x === x0 + 1 && y === 12 ? "O" : "w");
      }
    }
  };
  lens(9);
  lens(17);
  set(g, 15, 12, "g");
  set(g, 16, 12, "g");
  // Nariz.
  set(g, 15, 15, "S");
  set(g, 16, 15, "Z");
  set(g, 15, 16, "S");
  set(g, 16, 16, "Z");

  const eyes = (pattern: [string, string, string]) => {
    for (const x0 of [10, 18]) {
      pattern.forEach((line, dy) => [...line].forEach((c, dx) => c !== "." && set(g, x0 + dx, 12 + dy, c)));
    }
  };
  const mouth = (pattern: string[]) => pattern.forEach((line, dy) => [...line].forEach((c, dx) => c !== "." && set(g, 12 + dx, 17 + dy, c)));

  switch (mood) {
    case "solemne":
      eyes(["SSSS", "Seew", "wwww"]);
      mouth(["..MMMM..", "........"]);
      break;
    case "adulador":
      eyes(["wwww", "weew", "eWWe".replace(/W/g, "w")]);
      mouth([".M....M.", "..MmmM..", "...MM..."]);
      set(g, 9, 16, "p");
      set(g, 10, 16, "p");
      set(g, 21, 16, "p");
      set(g, 22, 16, "p");
      break;
    case "escandalizado":
      eyes(["weew", "weew", "wwww"]);
      mouth(["...MM...", "..MmmM..", "...MM..."]);
      for (const x of [10, 11, 12, 19, 20, 21]) set(g, x, 9, "H");
      set(g, 5, 4, "b");
      set(g, 5, 5, "b");
      set(g, 4, 5, "b");
      break;
    case "dormido":
      eyes(["wwww", "wwww", "eeee"]);
      mouth(["....M...", "...MmM..", "....M..."]);
      for (const [x, y] of [[26, 1], [27, 1], [28, 1], [27, 2], [26, 3], [27, 3], [28, 3], [22, 0], [23, 0], [23, 1], [22, 2], [23, 2]] as const) {
        set(g, x, y, "k");
      }
      break;
    case "monedas":
      eyes(["wwww", "wwww", "weew"]);
      mouth(["..MMMM..", ".....m.."]);
      break;
  }

  // Manos: la derecha sujeta la pluma; en "monedas" sostienen una moneda.
  const hand = (x0: number, y0: number) => {
    for (let y = y0; y < y0 + 3; y++) for (let x = x0; x < x0 + 4; x++) set(g, x, y, y === y0 ? "s" : x === x0 + 3 ? "Z" : "S");
  };
  hand(25, 22);
  if (mood === "monedas") {
    hand(5, 22);
    for (let y = 18; y <= 22; y++) for (let x = 13; x <= 18; x++) if (Math.hypot(x - 15.5, y - 20) <= 2.6) set(g, x, y, x < 15 ? "Y" : x > 16 ? "W" : "y");
    set(g, 15, 20, "W");
    set(g, 16, 20, "W");
  }
  // Pluma larguísima.
  for (let y = 1; y <= 24; y++) {
    const x = 28 - Math.floor((24 - y) / 14);
    set(g, x, y, "F");
    if (y < 19) {
      set(g, x - 1, y, y % 2 ? "f" : "F");
      set(g, x + 1, y, "f");
      if (y > 3 && y < 15) set(g, x + 2, y, y % 3 ? "f" : ".");
    }
  }
  set(g, 27, 25, "k");
  return rows(outline(g));
}

export const FRAY_SPRITES: Record<FrayMood, Sprite> = {
  solemne: { grid: fray("solemne"), palette: FRAY_PALETTE },
  adulador: { grid: fray("adulador"), palette: FRAY_PALETTE },
  escandalizado: { grid: fray("escandalizado"), palette: FRAY_PALETTE },
  dormido: { grid: fray("dormido"), palette: FRAY_PALETTE },
  monedas: { grid: fray("monedas"), palette: FRAY_PALETTE },
};
