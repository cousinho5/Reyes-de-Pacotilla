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

/** La luz del día en la escena, según la hora de la partida (bloque 2). */
export type Light = "dia" | "amanecer" | "atardecer" | "noche";

export function lightAt(hour: number): Light {
  if (hour >= 7 && hour < 9) return "amanecer";
  if (hour >= 9 && hour < 18) return "dia";
  if (hour >= 18 && hour < 21) return "atardecer";
  return "noche";
}

/** El cielo del fondo (letras a, b, c, d, n y N) a cada hora; de día, el del dibujo. */
const SKY: Record<Exclude<Light, "dia">, Record<string, string>> = {
  amanecer: { a: "#3d4a8a", b: "#7a6aa8", c: "#c98aa0", d: "#f0b090", n: "#f7d0a8", N: "#fff0c8" },
  atardecer: { a: "#2e2f6b", b: "#6a3f7a", c: "#b8577a", d: "#e88a6a", n: "#f5b56f", N: "#ffe0a0" },
  noche: { a: "#0b1030", b: "#121a44", c: "#1a2552", d: "#24325f", n: "#2f3f6e", N: "#45568a" },
};
/** Cómo tiñe la luz lo demás (rojo, verde, azul). */
const TINT: Record<Light, [number, number, number]> = {
  dia: [1, 1, 1],
  amanecer: [1, 0.9, 0.88],
  atardecer: [1, 0.82, 0.72],
  noche: [0.42, 0.48, 0.72],
};

export interface CastleSceneInput {
  stage: number;
  levels: Record<BuildingKind, number>;
  /** Color (hex) de la casa. */
  color: string;
  /** El escudo de la casa (16x18, de shield.ts), que cuelga del torreón. */
  shield?: Sprite;
  /** La hora del día (por defecto, de día). */
  light?: Light;
  /** Color (hex) de la casa que te sitia: sus tiendas acampan delante. */
  besieger?: string | null;
}

/** Qué es cada píxel para las animaciones. */
export const enum Stuff {
  None = 0,
  Fire = 1,
  Water = 2,
  Cloth = 3,
  Sky = 4,
}

export interface CastleSceneImage {
  /** RGBA, fila a fila. */
  rgba: Uint8ClampedArray;
  /** Qué pieza pintó cada píxel (índice en TARGETS, o -1 si es el fondo). */
  owner: Int8Array;
  /** Qué es cada píxel (fuego, agua, tela de la casa, cielo), para animarlo. */
  stuff: Uint8Array;
  /** Caja de cada pieza en el lienzo: [x, y, ancho, alto]. */
  boxes: Record<SceneTarget, [number, number, number, number]>;
  light: Light;
  /** Chimeneas de las que sale humo: [x, y]. */
  smoke: [number, number][];
}

export const TARGETS: SceneTarget[] = ["castillo", "granja", "aserradero", "cantera", "mina", "mercado"];

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const STUFF: Record<string, Stuff> = { K: Stuff.Fire, I: Stuff.Fire, z: Stuff.Water, Z: Stuff.Water, P: Stuff.Water, O: Stuff.Water, "7": Stuff.Cloth, "8": Stuff.Cloth, "9": Stuff.Cloth };
const SKY_KEYS = new Set(["a", "b", "c", "d", "n", "N"]);

function paint(img: CastleSceneImage, s: Sprite, x0: number, y0: number, extra: Record<string, string>, who: number, sky = false) {
  const colors = new Map<string, [number, number, number]>();
  for (const [k, v] of Object.entries({ ...s.palette, ...extra })) colors.set(k, rgb(v));
  const [tr, tg, tb] = TINT[img.light];
  s.grid.forEach((row, y) => {
    const py = y0 + y;
    if (py < 0 || py >= SCENE_H) return;
    for (let x = 0; x < row.length; x++) {
      const key = row[x]!;
      const c = colors.get(key);
      const px = x0 + x;
      if (!c || px < 0 || px >= SCENE_W) continue;
      const i = py * SCENE_W + px;
      const isSky = sky && SKY_KEYS.has(key);
      const kind = isSky ? Stuff.Sky : STUFF[key] ?? Stuff.None;
      // El cielo ya trae su color de la hora; el fuego luce igual de noche.
      const k = isSky || kind === Stuff.Fire ? [1, 1, 1] : [tr, tg, tb];
      img.rgba[i * 4] = Math.round(c[0] * k[0]!);
      img.rgba[i * 4 + 1] = Math.round(c[1] * k[1]!);
      img.rgba[i * 4 + 2] = Math.round(c[2] * k[2]!);
      img.rgba[i * 4 + 3] = 255;
      img.owner[i] = who;
      img.stuff[i] = kind;
    }
  });
}

/** Dónde acampan las tiendas de quien te sitia (centro de su base). */
const TENTS: [number, number][] = [
  [62, 116],
  [134, 114],
  [76, 127],
  [120, 126],
];

/** Monta la escena entera. Determinista: la misma entrada da la misma imagen. */
export function renderCastleScene(input: CastleSceneInput): CastleSceneImage {
  const light = input.light ?? "dia";
  const img: CastleSceneImage = {
    rgba: new Uint8ClampedArray(SCENE_W * SCENE_H * 4),
    owner: new Int8Array(SCENE_W * SCENE_H).fill(-1),
    stuff: new Uint8Array(SCENE_W * SCENE_H),
    boxes: {} as CastleSceneImage["boxes"],
    light,
    smoke: [],
  };
  const house = housePalette(input.color);
  paint(img, art.fondo, 0, 0, light === "dia" ? {} : SKY[light], -1, true);
  if (light === "noche") {
    // La luna, donde de día está el sol, y estrellas, siempre en el mismo sitio.
    for (let y = 12; y < 25; y++)
      for (let x = 24; x < 37; x++) {
        const d = Math.hypot(x - 30, y - 18);
        if (d < 5) img.rgba.set(d < 4 && x - 30 + (y - 18) > 2 ? [196, 196, 182] : [238, 236, 222], (y * SCENE_W + x) * 4);
      }
    for (let k = 0; k < 40; k++) {
      const x = (k * 73 + 11) % SCENE_W;
      const y = (k * 37 + 5) % 60;
      const i = y * SCENE_W + x;
      if (img.stuff[i] === Stuff.Sky) img.rgba.set(k % 5 ? [200, 205, 230] : [255, 250, 225], i * 4);
    }
  }
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
  // Humo: la chimenea del granero (desde el nivel 3) y la de la caseta de la mina (desde el 4).
  if (input.levels.granja >= 3) img.smoke.push([img.boxes.granja[0] + 31, img.boxes.granja[1] + 4]);
  if (input.levels.mina >= 4) img.smoke.push([img.boxes.mina[0] + 50, img.boxes.mina[1] + 18]);
  if (input.besieger) {
    const enemy = housePalette(input.besieger);
    const tent = art.tienda;
    const w = Math.max(...tent.grid.map((r) => r.length));
    for (const [sx, sy] of TENTS) paint(img, tent, sx - Math.floor(w / 2), sy - tent.grid.length, enemy, -1);
  }
  return img;
}

/**
 * Un fotograma de la escena viva (bloque 2): las antorchas titilan, el agua
 * brilla y las telas de la casa ondean. `frame` cuenta desde 0; escribe en `out`.
 */
export function animateScene(img: CastleSceneImage, frame: number, out: Uint8ClampedArray) {
  out.set(img.rgba);
  for (let i = 0; i < img.stuff.length; i++) {
    const kind = img.stuff[i];
    if (kind === Stuff.None || kind === Stuff.Sky) continue;
    const x = i % SCENE_W;
    const y = (i / SCENE_W) | 0;
    let f = 1;
    if (kind === Stuff.Fire) f = ((x * 7 + y * 3 + frame) % 5 === 0 ? 0.75 : 1) * (frame % 3 === 0 ? 1.08 : 1);
    else if (kind === Stuff.Water) f = (x + y * 2 - frame) % 6 === 0 ? 1.3 : 1;
    else if (kind === Stuff.Cloth) f = 1 + Math.sin((x - frame * 1.5) / 2 + y * 0.3) * 0.14;
    if (f === 1) continue;
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.min(255, out[i * 4 + c]! * f);
  }
  // Humo de las chimeneas: bocanadas que suben y se deshacen.
  for (const [cx, cy] of img.smoke) {
    for (let p = 0; p < 4; p++) {
      const age = (frame + p * 4) % 16;
      const x = Math.round(cx + Math.sin((age + p) / 3) * 1.5 + age / 5);
      const y = cy - age;
      if (x < 0 || y < 0 || x >= SCENE_W) continue;
      const i = y * SCENE_W + x;
      const a = 1 - age / 16;
      const tone = img.light === "noche" ? 120 : 225;
      for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(out[i * 4 + c]! * (1 - a * 0.7) + tone * a * 0.7);
    }
  }
}

/**
 * La obra al mejorar (bloque 2): andamios y polvo sobre la pieza y, al final,
 * un destello. `t` va de 0 a 1. Escribe encima de `out`.
 */
export function drawWork(img: CastleSceneImage, target: SceneTarget, t: number, out: Uint8ClampedArray) {
  const who = TARGETS.indexOf(target);
  const [bx, by, bw, bh] = img.boxes[target];
  for (let y = Math.max(0, by); y < Math.min(SCENE_H, by + bh); y++) {
    for (let x = Math.max(0, bx); x < Math.min(SCENE_W, bx + bw); x++) {
      const i = y * SCENE_W + x;
      if (img.owner[i] !== who) continue;
      if (t < 0.75) {
        // Andamios: palos cada 6 píxeles y tablas cada 5 filas.
        const pole = (x - bx) % 6 === 0;
        const plank = (y - by) % 5 === 0;
        if (pole || plank) out.set(plank ? [162, 107, 62] : [77, 44, 29], i * 4);
        // Polvo que se levanta por abajo.
        else if (y > by + bh * 0.55 && ((x * 13 + y * 7 + Math.floor(t * 20)) % 7 === 0)) out.set([220, 192, 139], i * 4);
      } else {
        // Destello: el dibujo nuevo, aclarado, que se va apagando.
        const k = 1 - (t - 0.75) / 0.25;
        for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(out[i * 4 + c]! + (255 - out[i * 4 + c]!) * k * 0.8);
      }
    }
  }
}

/** Un dibujo suelto, teñido con el color de la casa (las miniaturas de la lista de edificios). */
export function spriteImage(s: Sprite, color: string): { rgba: Uint8ClampedArray; w: number; h: number } {
  const w = Math.max(...s.grid.map((r) => r.length));
  const h = s.grid.length;
  const colors = new Map<string, [number, number, number]>();
  for (const [k, v] of Object.entries({ ...s.palette, ...housePalette(color) })) colors.set(k, rgb(v));
  const rgba = new Uint8ClampedArray(w * h * 4);
  s.grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = colors.get(row[x]!);
      if (c) rgba.set([c[0], c[1], c[2], 255], (y * w + x) * 4);
    }
  });
  return { rgba, w, h };
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
