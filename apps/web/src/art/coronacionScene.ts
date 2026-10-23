// Bloque 13: los dibujos de la coronación sobre el lienzo de 160x176. Las
// campanas al amanecer, el podio con los escudos de las tres primeras casas y
// el fantasma de Aldric bajando la corona sobre el escudo del ganador. Los
// dibujos vienen de pxl (coronacion.px.js, aldric.px.js, salon.px.js) y el
// podio de madera del bloque 11 (podio.px.js); aquí se colocan y se mueven.

import { CINE_H, CINE_W, clamp, ease, hash, lerp, type Painter } from "./cinema";
import * as cor from "./coronacion";
import * as rey from "./aldric";
import * as salon from "./salon";
import { podio } from "./podio";
import { torches } from "./prologo";
import type { Sprite } from "./sprites";

const CONFETTI = ["#e8b83a", "#f2e6cc", "#b3291d", "#2e5aa8", "#246b2a", "#a23c9e"];
/** Confeti que cae desde arriba, `u` segundos después de empezar. */
function confetti(p: Painter, u: number) {
  if (u <= 0) return;
  for (let i = 0; i < 46; i++) {
    const st = hash(i, 1) * 2;
    if (u < st) continue;
    const q = ((u - st) * (0.35 + hash(i, 2) * 0.3)) % 1.15;
    p.px(hash(i, 3) * CINE_W + Math.sin(u * 3 + i) * 5, -6 + q * 190, CONFETTI[i % 6]!, i % 3 ? 2 : 1, i % 2 ? 2 : 1);
  }
}

/** Escena 1: las campanas del campanario al amanecer, los pájaros y la bandera morada. */
export function bells(p: Painter, t: number) {
  p.img(cor.amanecer, 0, 0);
  p.rot(cor.campana, 59, 51, Math.sin(t * 3.2) * 0.55, 12, 2);
  p.rot(cor.campana, 77, 51, Math.sin(t * 3.2 + 1.4) * 0.5, 12, 2);
  // Los pájaros salen espantados del campanario.
  for (let i = 0; i < 14; i++) {
    const st = 0.6 + hash(i, 1) * 1.6;
    if (t < st) continue;
    const u = t - st;
    const ang = -0.4 - hash(i, 2) * 2.4;
    const x = 80 + Math.cos(ang) * u * (30 + hash(i, 3) * 20);
    const y = 70 + Math.sin(ang) * u * 26 + Math.sin(u * 6 + i) * 2;
    const f = Math.floor(t * 8 + i) % 2;
    const ink = "#1a1418";
    p.px(x - 2, y + (f ? 0 : -1), ink);
    p.px(x - 1, y + (f ? 1 : 0), ink);
    p.px(x, y + 1, ink);
    p.px(x + 1, y + (f ? 1 : 0), ink);
    p.px(x + 2, y + (f ? 0 : -1), ink);
  }
  // La bandera del difunto rey en la veleta.
  const f = Math.floor(t * 4) % 2;
  for (let i = 0; i < 12; i++) p.px(81 + i, Math.round(Math.sin(i * 0.6 + t * 6) * (f + 1) * 0.5), "#5b2a86", 1, 6);
}

/** Fondo liso de las hojas de objetivos y títulos (el texto va encima, en HTML). */
export function sheetBackdrop(p: Painter) {
  p.g.fillStyle = "#1c120b";
  p.g.fillRect(0, 0, CINE_W, CINE_H);
}

const PODIUM_X = 8;
const PODIUM_Y = 122;
/** Donde va el escudo de cada puesto (1.º, 2.º, 3.º): centro y altura del escalón, a escala 2. */
export const PODIUM_STEPS: [number, number][] = [
  [PODIUM_X + 36 * 2, PODIUM_Y + 2 * 2],
  [PODIUM_X + 11.5 * 2, PODIUM_Y + 8 * 2],
  [PODIUM_X + 60 * 2, PODIUM_Y + 13 * 2],
];

/** Escena 5: el podio sube, los escudos encima y la corona salta sobre el primero. */
export function podium(p: Painter, t: number, shields: Sprite[]) {
  const g = p.g;
  g.fillStyle = "#140c08";
  g.fillRect(0, 0, CINE_W, CINE_H);
  for (const [x, a] of [
    [40, 0.18],
    [80, 0.3],
    [120, 0.18],
  ] as const) {
    g.fillStyle = `rgba(255,220,150,${a * clamp(t * 2)})`;
    g.beginPath();
    g.moveTo(x - 6, 0);
    g.lineTo(x + 6, 0);
    g.lineTo(x + 22, 150);
    g.lineTo(x - 22, 150);
    g.fill();
  }
  const rise = ease(clamp(t * 1.2));
  const dy = lerp(70, 0, rise);
  p.img(podio, PODIUM_X, PODIUM_Y + dy, { scale: 2 });
  shields.slice(0, 3).forEach((s, i) => {
    const w = Math.max(...s.grid.map((r) => r.length)) * 2;
    const h = s.grid.length * 2;
    const show = ease(clamp((t - 0.9 - (2 - i) * 0.35) * 2));
    if (show <= 0) return;
    const [cx, top] = PODIUM_STEPS[i]!;
    const bob = i === 0 ? Math.abs(Math.sin(t * 3)) * 3 : 0;
    p.img(s, cx - w / 2, top + dy - h - 2 - bob - (1 - show) * 30, { scale: 2, alpha: show });
  });
  if (t > 2.4 && shields[0]) {
    const [cx, top] = PODIUM_STEPS[0]!;
    const h = shields[0].grid.length * 2;
    p.img(rey.corona, cx - 13, top - h - 16 - Math.abs(Math.sin(t * 3)) * 3);
  }
  confetti(p, t - 2.2);
}

/**
 * Escena 6: el salón de día, el escudo del ganador en el trono y el fantasma de
 * Aldric, que baja con la corona, la deja sobre el escudo y se desvanece.
 */
export function crowning(p: Painter, t: number, shield: Sprite | null) {
  const g = p.g;
  p.img(salon.salon_dia, 0, 0);
  p.glow(80, 70, 90, "rgba(255,230,160,A)", 0.35);
  g.save();
  g.globalAlpha = 0.18;
  g.translate(80, 74);
  g.rotate(t * 0.15);
  g.fillStyle = "#fff2c0";
  for (let i = 0; i < 12; i++) {
    g.rotate(Math.PI / 6);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(-6, -120);
    g.lineTo(6, -120);
    g.fill();
  }
  g.restore();
  p.img(salon.trono, 46, 45);
  // El escudo en el asiento del trono, a escala 2.
  const sw = shield ? Math.max(...shield.grid.map((r) => r.length)) * 2 : 0;
  const sh = shield ? shield.grid.length * 2 : 0;
  const sx = 80 - sw / 2;
  const sy = 98 - sh;
  if (shield) p.img(shield, sx, sy, { scale: 2 });
  // El fantasma baja, suelta la corona y sube desvaneciéndose.
  const gy = t < 3 ? lerp(-80, 0, ease(t / 3)) : t < 5.2 ? 0 : lerp(0, -90, ease((t - 5.2) / 2.5));
  const ga = t < 5.2 ? 0.85 : clamp(0.85 - (t - 5.2) / 2.5);
  const gx = 53 + Math.sin(t * 1.6) * 3;
  const wob = Math.sin(t * 2.4) * 2;
  const holding = t < 3.4;
  p.img(holding ? rey.fantasma_corona : rey.fantasma_opina, gx, gy + wob, { alpha: ga });
  if (!holding) {
    const v = ease(clamp((t - 3.4) / 1.6));
    p.img(rey.corona, lerp(gx + 14, 80 - 13, v), lerp(gy + wob + 4, sy - 12, v));
  }
  if (t > 5) {
    for (let i = 0; i < 16; i++) {
      const q = ((t - 5) * 1.2 + hash(i, 1)) % 1;
      const ang = hash(i, 2) * 6.28;
      p.px(80 + Math.cos(ang) * q * 40, sy - 6 + Math.sin(ang) * q * 30, `rgba(255,248,200,${1 - q})`);
    }
  }
  torches(p, t);
  if (t > 5.2) confetti(p, t - 5.2);
  p.vignette(0.35);
}
