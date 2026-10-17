// Paleta común del pixel art y utilidades de color y ruido. El mapa se pinta
// en world.ts; los iconos, en sprites.ts, shield.ts e icons.ts.

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


/** Ruido fijo en [0, 1) para (x, y). */
export function noise(x: number, y: number, seed: number): number {
  let h = (Math.round(x) * 374761393 + Math.round(y) * 668265263 + seed * 1013904223) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Aclara (+) u oscurece (-) un color en hexadecimal. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount),
  );
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
