// Bloque 13: los dibujos del prólogo sobre el lienzo de 160x176. El salón del
// trono, el banquete, el ave, el testamento y el fondo de los pretendientes.
// Los dibujos vienen de pxl (aldric.px.js → aldric.ts, salon.px.js → salon.ts);
// aquí se colocan, se mueven y se iluminan en función del tiempo t (segundos).
// Las coordenadas son las de la maqueta (docs/maquetas/bloque13/scenes.js),
// restando el píxel de contorno que pxl añade a cada dibujo.

import { shieldGrid } from "./shield";
import { CINE_H, CINE_W, clamp, ease, hash, lerp, type Painter } from "./cinema";
import * as rey from "./aldric";
import * as salon from "./salon";
import type { Sprite } from "./sprites";
import { shade as tint } from "./tiles";

const PURPLE = "#5b2a86";
/** El escudo del difunto rey en los estandartes: morado con corona de oro. */
export const KING_SHIELD: Sprite = {
  grid: shieldGrid("espanol", "pleno", "corona"),
  palette: {
    k: "#1a1410",
    a: PURPLE,
    b: PURPLE,
    A: tint(PURPLE, 0.28),
    B: tint(PURPLE, 0.28),
    c: tint(PURPLE, -0.3),
    d: tint(PURPLE, -0.3),
    m: "#E8B83A",
    n: "#A97E14",
    x: "#1a1410",
  },
};

/** Llama de vela o antorcha que tiembla. */
export function flame(p: Painter, x: number, y: number, t: number, seed: number, s = 1) {
  const f = Math.floor(t * 9 + seed * 3) % 3;
  const hgt = [5, 6, 4][f]! * s;
  const sway = [0, 1, -1][f]!;
  p.glow(x + 0.5, y - 2, 16 * s, "rgba(255,170,60,A)", 0.28 + f * 0.04);
  p.px(x - 1, y - hgt + 3, "#c0392b", 3, hgt - 2);
  p.px(x - 1 + sway * 0.5, y - hgt + 1, "#f08a24", 3, hgt - 2);
  p.px(x, y - hgt, "#ffd860", 1, hgt - 1);
  p.px(x + sway, y - hgt - 1, "#fff2b0");
}
export const torches = (p: Painter, t: number) => (flame(p, 28.5, 56, t, 1), flame(p, 133.5, 56, t, 2));
function candles(p: Painter, t: number, out = false) {
  if (out) return;
  flame(p, 16.5, 128, t, 3, 0.7);
  flame(p, 142.5, 128, t, 4, 0.7);
}
function moonbeam(p: Painter, a: number) {
  const g = p.g;
  g.fillStyle = `rgba(190,210,255,${a})`;
  g.beginPath();
  g.moveTo(134, 76);
  g.lineTo(154, 76);
  g.lineTo(150, 176);
  g.lineTo(96, 176);
  g.closePath();
  g.fill();
}
function motes(p: Painter, t: number, a: number) {
  for (let i = 0; i < 18; i++) {
    const ph = (t * 0.08 + hash(i, 1)) % 1;
    p.px(110 + hash(i, 2) * 40 - ph * 10, 80 + ph * 90, `rgba(255,250,220,${a * (0.5 + 0.5 * Math.sin(t * 2 + i))})`);
  }
}

/** El salón con sus estandartes y el trono vacío. */
export function hall(p: Painter, t: number, day = false) {
  p.img(day ? salon.salon_dia : salon.salon_noche, 0, 0);
  for (const bx of [32, 108]) p.img(KING_SHIELD, bx + 2, 34);
  if (!day) moonbeam(p, 0.06);
  p.img(salon.trono, 46, 45);
  torches(p, t);
}
const table = (p: Painter) => p.img(salon.mesa, -1, 125);
const KING_X = 53;
const KING_Y = 75;

/** Escena 2: el rey come contento, una y otra vez. */
export function banquet(p: Painter, t: number) {
  hall(p, t);
  const ph = t % 2.6;
  let k = rey.rey_contento;
  let bob = 0;
  if (ph < 0.55) k = rey.rey_alza;
  else if (ph < 0.95) k = rey.rey_muerde;
  else {
    const c = Math.floor(ph * 5) % 2;
    k = c ? rey.rey_mastica_b : rey.rey_mastica_a;
    bob = c;
  }
  p.img(k, KING_X, KING_Y + bob);
  // migas que caen
  for (let i = 0; i < 5; i++) {
    const q = ((t - 1) * 1.3 + i * 0.23) % 1.6;
    if (t > 1 && q < 1) p.px(78 + hash(i, 9) * 8 + q * 3, 106 + q * 30, i % 2 ? "#e0a050" : "#f2d090");
  }
  table(p);
  candles(p, t);
  p.vignette(0.5);
}

/** Escena 3: muerde, tose, se ahoga y cae tras la mesa; el muslo y la corona salen volando. */
export function bird(p: Painter, t: number) {
  const g = p.g;
  const sx = t > 3.75 && t < 4.3 ? Math.round(Math.sin(t * 90) * 2) : 0;
  g.save();
  g.translate(sx, 0);
  hall(p, t);
  const out = t > 4.1;
  const shake = Math.floor(t * 16) % 2 ? 1 : -1;
  if (t < 0.6) p.img(rey.rey_alza, KING_X, KING_Y);
  else if (t < 1.1) p.img(rey.rey_muerde, KING_X, KING_Y);
  else if (t < 1.6) p.img(Math.floor(t * 8) % 2 ? rey.rey_tose_a : rey.rey_tose_b, KING_X, KING_Y);
  else if (t < 2.0) p.img(rey.rey_ahoga, KING_X + shake, KING_Y);
  else if (t < 3.0) p.img(rey.rey_ahoga_sin_corona, KING_X + shake, KING_Y);
  else if (t < 3.8) {
    const v = ease((t - 3) / 0.8);
    p.rot(rey.rey_ahoga_sin_corona, KING_X - v * 8, KING_Y + v * 48, -v * 1.2, 27, 57);
  }
  // las botas asoman por encima de la mesa
  if (t > 4.0) p.img(salon.botas, 65 + (Math.floor(t * 4) % 2), 115 + Math.max(0, (4.4 - t) * 30));
  // el muslo sale volando
  if (t >= 1.1) {
    const v = clamp((t - 1.1) / 1.2);
    const x = lerp(82, 150, v);
    const y = 94 - Math.sin(v * Math.PI) * 50 + v * 60;
    p.rot(rey.muslo, x, Math.min(y, 164), t * 9, 6, 8);
  }
  // la corona salta, bota y rueda
  if (t >= 2.0) {
    const u = t - 2.0;
    let x: number, y: number, a: number;
    if (u < 0.9) {
      const v = u / 0.9;
      x = lerp(68, 120, v);
      y = 76 - Math.sin(v * Math.PI) * 44 + v * 78;
      a = v * 7;
    } else if (u < 1.3) {
      const v = (u - 0.9) / 0.4;
      x = lerp(120, 130, v);
      y = 162 - Math.sin(v * Math.PI) * 10;
      a = 7 + v * 2;
    } else {
      const v = clamp((u - 1.3) / 1.2);
      x = lerp(130, 138, ease(v));
      y = 162;
      a = 9 + v * 1.4;
    }
    p.rot(rey.corona, x, y, a, 13, 7);
    if (u > 0.9 && u < 1.6)
      for (let i = 0; i < 6; i++) {
        const r = (u - 0.9) * 22;
        p.px(x + 12 + Math.cos(i) * r, y + 6 + Math.sin(i) * r * 0.5, "#fff2b0");
      }
  }
  table(p);
  candles(p, t, out);
  // humo de las velas apagadas
  if (out)
    for (let i = 0; i < 8; i++) {
      const q = ((t - 4.1) * 0.6 + i * 0.13) % 1.2;
      for (const cx of [16.5, 142.5]) p.px(cx + Math.sin(q * 8 + i) * 2, 124 - q * 30, `rgba(200,200,210,${0.5 * (1 - q)})`);
    }
  // polvo al caer
  if (t > 2.2)
    for (let i = 0; i < 10; i++) {
      const q = clamp((t - 3.8 - i * 0.02) / 0.8);
      if (q > 0 && q < 1) p.px(60 + i * 4, 136 - q * 10 - hash(i, 3) * 6, `rgba(220,200,170,${1 - q})`, 2, 2);
    }
  if (out) p.shade(0.3);
  p.vignette(0.55);
  g.restore();
}

/** Escena 4: el trono vacío con la corona en su cojín y una rata que se lleva una llave. */
export function testament(p: Painter, t: number) {
  const g = p.g;
  p.img(salon.salon_noche, 0, 0);
  for (const bx of [32, 108]) p.img(KING_SHIELD, bx + 2, 34);
  p.shade(0.35);
  moonbeam(p, 0.1);
  motes(p, t, 0.9);
  torches(p, t);
  p.img(salon.trono, 46, 45);
  p.img(salon.cojin, 65, 91);
  p.img(rey.corona, 67, 81);
  if (Math.floor(t * 2) % 3 === 0) p.px(72, 84, "#fff");
  // el tablero de las llaves, vacío
  g.fillStyle = "#5a3a1c";
  g.fillRect(118, 96, 30, 16);
  g.fillStyle = "#3a2414";
  g.fillRect(118, 96, 30, 1);
  g.fillRect(118, 111, 30, 1);
  for (let i = 0; i < 4; i++) {
    p.px(122 + i * 7, 99, "#a0a0a8");
    p.img(salon.llave, 119 + i * 7, 100, { alpha: 0.18 });
  }
  if (t > 3.6) {
    const x = lerp(-30, 190, (t - 3.6) / 3.2);
    const f = Math.floor(t * 10) % 2;
    p.img(salon.llave, x - 15, 162 + f);
    p.img(salon.rata[f]!, x - 1, 157);
  }
  p.vignette(0.6);
}

/** Escena 5: el salón a oscuras, con luz sobre el trono, detrás de los escudos. */
export function suitorsBackdrop(p: Painter, t: number) {
  p.img(salon.salon_noche, 0, 0);
  for (const bx of [32, 108]) p.img(KING_SHIELD, bx + 2, 34);
  p.shade(0.55);
  p.img(salon.trono, 46, 45);
  p.shade(0.3);
  p.glow(80, 70, 60, "rgba(255,220,140,A)", 0.25);
  torches(p, t);
  p.vignette(0.7);
}

/** Fondo de las escenas del mapa (el mapa va encima, en HTML). */
export function mapBackdrop(p: Painter) {
  p.g.fillStyle = "#141c12";
  p.g.fillRect(0, 0, CINE_W, CINE_H);
}
