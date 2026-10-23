// Iconos de recursos (16x16), dibujados con código:
// formas con luz arriba a la izquierda, sombra abajo a la derecha y contorno.
// Las casillas están en tiles.ts y los escudos en shield.ts.

import type { Resource } from "@reyes/engine";
import type { Palette } from "./Pixels";
import { WORLD, noise } from "./tiles";
import { adulador, cabecea, dormido, escandalizado, habla, moja, monedas, parpadea, solemne, tintinea } from "./cronista";

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
// Fray Abundio (bloque 3): 48x48 de medio cuerpo tras su pupitre, dibujado en pxl
// (docs/maquetas/bloque3/pxl/fray.px.js → cronista.ts). Cinco caras y sus animaciones.

export type FrayMood = "solemne" | "adulador" | "escandalizado" | "dormido" | "monedas";

export const FRAY_SPRITES: Record<FrayMood, Sprite> = { solemne, adulador, escandalizado, dormido, monedas };

/** Animaciones cortas, con lo que dura cada fotograma (ms). */
export const FRAY_ANIMS = {
  parpadea: { frames: parpadea, ms: [2400, 90, 120, 90] },
  habla: { frames: habla, ms: [143] },
  moja: { frames: moja, ms: [167] },
  cabecea: { frames: cabecea, ms: [333] },
  tintinea: { frames: tintinea, ms: [125, 125, 125, 125, 125, 900] },
} as const;
export type FrayAnim = keyof typeof FRAY_ANIMS;
