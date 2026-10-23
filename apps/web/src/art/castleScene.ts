// Vista del castillo (bloque 2): el fondo, el castillo en su etapa y los cinco
// edificios en su nivel, montados en un lienzo de 195x136. Los dibujos salen de
// pxl (docs/maquetas/bloque2/pxl/castillo.px.js → castillo.ts); aquí solo se
// colocan, se tiñen con el color de la casa y se apunta qué hay en cada píxel
// para saber qué se ha tocado.

import type { BuildingKind } from "@reyes/engine";
import * as art from "./castillo";
import type { Sprite } from "./sprites";
import { shade } from "./tiles";

export const SCENE_W = 195;
export const SCENE_H = 136;

export type SceneTarget = BuildingKind | "castillo";

/** Dónde va cada pieza: el centro de su base (como el pivote "bottom" de pxl). */
export const SITES: Record<SceneTarget, [number, number]> = {
  castillo: [98, 106],
  aserradero: [30, 92],
  cantera: [166, 70],
  mina: [171, 110],
  granja: [33, 133],
  mercado: [150, 131],
};

/** Orden de pintado: lo de detrás primero. */
const ORDER: SceneTarget[] = ["aserradero", "cantera", "castillo", "mina", "granja", "mercado"];

const CASTLES: Sprite[] = [art.castillo_1, art.castillo_2, art.castillo_3, art.castillo_4, art.castillo_5];

/** Dibujo de cada edificio por nivel (1-5). */
const BUILDING_ART: Record<BuildingKind, Sprite[]> = {
  granja: [art.granja_1, art.granja_2, art.granja_3, art.granja_4, art.granja_5],
  aserradero: [art.aserradero_1, art.aserradero_2, art.aserradero_3, art.aserradero_4, art.aserradero_5],
  cantera: [art.cantera_1, art.cantera_2, art.cantera_3, art.cantera_4, art.cantera_5],
  mina: [art.mina_1, art.mina_2, art.mina_3, art.mina_4, art.mina_5],
  mercado: [art.mercado_1, art.mercado_2, art.mercado_3, art.mercado_4, art.mercado_5],
};

export function buildingSprite(kind: BuildingKind, level: number): Sprite {
  return BUILDING_ART[kind][Math.min(5, Math.max(1, level)) - 1]!;
}

export function castleSprite(stage: number): Sprite {
  return CASTLES[Math.min(5, Math.max(1, stage)) - 1]!;
}

/** Las letras 7, 8 y 9 de los dibujos son el color de la casa (claro, oscuro y brillo). */
export function housePalette(hex: string): Record<string, string> {
  return { "7": hex, "8": shade(hex, -0.38), "9": shade(hex, 0.3) };
}

/**
 * Dónde cuelga el escudo en cada etapa: esquina de arriba a la izquierda, en el
 * dibujo del castillo (ESCUDO_EN en castillo.px.js: filas por encima de la base).
 */
const SHIELD_AT: Record<number, [number, number]> = { 1: [49, 71], 2: [49, 59], 3: [49, 60], 4: [49, 54], 5: [49, 40] };

export interface CastleSceneInput {
  stage: number;
  levels: Record<BuildingKind, number>;
  /** Color (hex) de la casa. */
  color: string;
  /** El escudo de la casa (16x18, de shield.ts), que cuelga del torreón. */
  shield?: Sprite;
}

export interface CastleSceneImage {
  /** RGBA, fila a fila. */
  rgba: Uint8ClampedArray;
  /** Qué pieza pintó cada píxel (índice en TARGETS, o -1 si es el fondo). */
  owner: Int8Array;
  /** Caja de cada pieza en el lienzo: [x, y, ancho, alto]. */
  boxes: Record<SceneTarget, [number, number, number, number]>;
}

export const TARGETS: SceneTarget[] = ["castillo", "granja", "aserradero", "cantera", "mina", "mercado"];

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function paint(img: CastleSceneImage, s: Sprite, x0: number, y0: number, extra: Record<string, string>, who: number) {
  const colors = new Map<string, [number, number, number]>();
  for (const [k, v] of Object.entries({ ...s.palette, ...extra })) colors.set(k, rgb(v));
  s.grid.forEach((row, y) => {
    const py = y0 + y;
    if (py < 0 || py >= SCENE_H) return;
    for (let x = 0; x < row.length; x++) {
      const c = colors.get(row[x]!);
      const px = x0 + x;
      if (!c || px < 0 || px >= SCENE_W) continue;
      const i = py * SCENE_W + px;
      img.rgba[i * 4] = c[0];
      img.rgba[i * 4 + 1] = c[1];
      img.rgba[i * 4 + 2] = c[2];
      img.rgba[i * 4 + 3] = 255;
      img.owner[i] = who;
    }
  });
}

/** Monta la escena entera. Determinista: la misma entrada da la misma imagen. */
export function renderCastleScene(input: CastleSceneInput): CastleSceneImage {
  const img: CastleSceneImage = {
    rgba: new Uint8ClampedArray(SCENE_W * SCENE_H * 4),
    owner: new Int8Array(SCENE_W * SCENE_H).fill(-1),
    boxes: {} as CastleSceneImage["boxes"],
  };
  const house = housePalette(input.color);
  paint(img, art.fondo, 0, 0, {}, -1);
  for (const t of ORDER) {
    const s = t === "castillo" ? castleSprite(input.stage) : buildingSprite(t, input.levels[t]);
    const w = Math.max(...s.grid.map((r) => r.length));
    const h = s.grid.length;
    const [sx, sy] = SITES[t];
    const x0 = sx - Math.floor(w / 2);
    const y0 = sy - h;
    img.boxes[t] = [x0, y0, w, h];
    paint(img, s, x0, y0, house, TARGETS.indexOf(t));
    if (t === "castillo" && input.shield) {
      const [ax, ay] = SHIELD_AT[Math.min(5, Math.max(1, input.stage))]!;
      paint(img, input.shield, x0 + ax, y0 + ay, {}, TARGETS.indexOf(t));
    }
  }
  return img;
}

/**
 * Qué hay en un punto de la escena (en píxeles del dibujo), o null si es el fondo.
 * Un dedo no es un píxel: si el punto cae en un hueco, vale lo más cercano a `reach` píxeles.
 */
export function targetAt(img: CastleSceneImage, x: number, y: number, reach = 4): SceneTarget | null {
  const px = Math.floor(x);
  const py = Math.floor(y);
  let best: number | null = null;
  let bestD = Infinity;
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const qx = px + dx;
      const qy = py + dy;
      const d = dx * dx + dy * dy;
      if (qx < 0 || qy < 0 || qx >= SCENE_W || qy >= SCENE_H || d > reach * reach || d >= bestD) continue;
      const who = img.owner[qy * SCENE_W + qx]!;
      if (who < 0) continue;
      best = who;
      bestD = d;
    }
  }
  return best == null ? null : TARGETS[best]!;
}
