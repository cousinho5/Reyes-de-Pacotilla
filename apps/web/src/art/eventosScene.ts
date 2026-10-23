// Bloque 13: las viñetas propias de los eventos de la semana, la última semana,
// el fantasma de Aldric y el aniversario de la muerte del rey, sobre el lienzo
// de 160x176. Los dibujos vienen de pxl (eventos.px.js → eventos.ts, ultima.px.js
// → ultima.ts, y el salón y el rey del prólogo); aquí se colocan y se mueven en
// función del tiempo t. El bando va encima en HTML y tapa el tercio de arriba,
// así que lo que pasa va de y = 55 hacia abajo.

import { CINE_H, CINE_W, clamp, ease, hash, lerp, painter, type Painter } from "./cinema";
import * as ev from "./eventos";
import * as ul from "./ultima";
import * as rey from "./aldric";
import * as salon from "./salon";
import * as pregon from "./pregonero";
import { bird, hall } from "./prologo";
import type { Sprite } from "./sprites";

const CONFETTI = ["#e8b83a", "#f2e6cc", "#b3291d", "#2e5aa8", "#246b2a", "#a23c9e"];
const frameOf = (s: Sprite[], t: number, fps: number) => s[Math.floor(t * fps) % s.length]!;

/** Posición de quien cruza la escena una y otra vez, de izquierda a derecha. */
function lane(t: number, i: number, speed: number) {
  return ((t * speed + hash(i, 8) * 200) % 200) - 30;
}

/** Banderines de colores colgados de una cuerda entre (x0, y0) y (x1, y0). */
function bunting(p: Painter, x0: number, x1: number, y0: number, sag: number, t: number) {
  const n = Math.floor((x1 - x0) / 7);
  for (let i = 0; i <= n; i++) {
    const x = x0 + i * 7;
    const y = y0 + Math.sin((i / n) * Math.PI) * sag;
    p.px(x, y, "#3a2414", 7, 1);
    const sway = Math.round(Math.sin(t * 3 + i) * 0.6);
    const col = CONFETTI[i % CONFETTI.length]!;
    for (let k = 0; k < 4; k++) p.px(x + 1 + k / 2 + sway * (k / 4), y + 1 + k, col, 4 - k, 1);
  }
}

function confetti(p: Painter, u: number, n = 40) {
  if (u <= 0) return;
  for (let i = 0; i < n; i++) {
    const st = hash(i, 1) * 2;
    if (u < st) continue;
    const q = ((u - st) * (0.35 + hash(i, 2) * 0.3)) % 1.15;
    p.px(hash(i, 3) * CINE_W + Math.sin(u * 3 + i) * 5, 40 + q * 150, CONFETTI[i % 6]!, i % 3 ? 2 : 1, i % 2 ? 2 : 1);
  }
}

/** Fuego artificial que estalla en (x, y) a los `at` segundos. */
function firework(p: Painter, t: number, at: number, x: number, y: number, col: string) {
  const u = t - at;
  if (u < 0 || u > 1.6) return;
  if (u < 0.5) return p.px(x, y + (0.5 - u) * 60, "#fff2c0", 1, 2);
  const r = (u - 0.5) * 22;
  const a = 1 - (u - 0.5) / 1.1;
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    p.px(x + Math.cos(ang) * r, y + Math.sin(ang) * r + (u - 0.5) * 6, col.replace("A", String(a)));
  }
}

// ---------------------------------------------------------------------------
// La Gran Plaga de Ratas: el pan desaparece de los estantes y las ratas corren con él.

export function plague(p: Painter, t: number) {
  p.img(ev.granero, 0, 0);
  p.glow(88, 30, 50, "rgba(150,170,255,A)", 0.12);
  for (let i = 0; i < 11; i++) if (t < 1.5 + hash(i, 4) * 5.5) p.img(ev.pan, 4 + i * 14, 50 + (i % 2));
  for (let i = 0; i < 10; i++) if (t < 1 + hash(i, 5) * 6) p.img(ev.pan, 6 + i * 15, 94 + (i % 2));
  for (let i = 0; i < 16; i++) {
    const floor = [150, 158, 166, 60, 104][i % 5]!;
    const st = hash(i, 7) * 3.5;
    if (t < st) continue;
    const x = lane(t - st, i, 26 + hash(i, 6) * 30);
    const f = Math.floor(t * 10 + i) % 2;
    const back = i % 3 === 0;
    const rx = back ? CINE_W - x - 18 : x;
    p.img(salon.rata[f]!, rx, floor - 8 + f, { flip: back });
    if (i % 2) p.img(ev.pan, back ? rx - 6 : rx + 10, floor - 13);
  }
  p.vignette(0.6);
}

// ---------------------------------------------------------------------------
// La Fiesta de San Aldric: la estatua dorada, banderines, baile y fuegos.

export function feast(p: Painter, t: number) {
  p.img(pregon.plaza, 0, 0);
  bunting(p, -2, 162, 58, 10, t);
  bunting(p, -2, 162, 80, 7, t + 1);
  p.shadow(80, 161, 20, 2.5);
  p.img(ev.estatua, 59, 86);
  p.glow(80, 108, 30, "rgba(255,220,120,A)", 0.25 + Math.sin(t * 4) * 0.08);
  // los aldeanos bailan a saltitos alrededor
  const hop = (i: number) => Math.abs(Math.sin(t * 5 + i * 1.3)) * 5;
  p.img(pregon.aldeano_asiente[0]!, 14 + Math.sin(t * 2) * 6, 124 - hop(0));
  p.img(pregon.aldeana, 124 - Math.sin(t * 2) * 6, 124 - hop(1));
  p.img(pregon.aldeano_asiente[1]!, 36 + Math.sin(t * 2 + 2) * 4, 128 - hop(2), { flip: true });
  p.img(pregon.aldeana, 104 + Math.sin(t * 2 + 1) * 4, 128 - hop(3), { flip: true });
  // destellos de la estatua
  for (let i = 0; i < 4; i++) {
    const q = (t * 0.8 + i / 4) % 1;
    if (q < 0.25) p.px(64 + hash(i, 2) * 30, 92 + hash(i, 3) * 40, "#fffbe0", 1, 1);
  }
  confetti(p, t - 2.5, 30);
  p.vignette(0.35);
}

// ---------------------------------------------------------------------------
// Tormenta en la Costa: lluvia, rayos y el barco amarrado que se mece.

export function storm(p: Painter, t: number) {
  const flash = [2.2, 5.1].some((at) => t > at && t < at + 0.18);
  p.img(ev.puerto, 0, 0);
  // olas que se mueven sobre el mar
  for (let i = 0; i < 30; i++) {
    const y = 100 + (i % 10) * 7.5;
    const x = ((hash(i, 1) * 200 + t * (14 + (i % 4) * 6)) % 190) - 15;
    p.px(x, y, "rgba(220,236,242,0.7)", 4 + (i % 3), 1);
  }
  // el faro barre la noche
  p.glow(145, 37, 26, "rgba(255,230,140,A)", 0.35 + Math.sin(t * 3) * 0.2);
  // el barco, amarrado junto al muelle
  p.rot(ev.barco, 74, 92 + Math.sin(t * 2.2) * 2, Math.sin(t * 1.8) * 0.16, 22, 36);
  // lluvia en diagonal
  p.g.fillStyle = "rgba(190,210,230,0.55)";
  for (let i = 0; i < 70; i++) {
    const q = (t * 2.2 + hash(i, 4)) % 1;
    const x = ((hash(i, 5) * 190 + q * 30) % 190) - 10;
    const y = q * 190 - 10;
    p.g.fillRect(Math.round(x), Math.round(y), 1, 4);
  }
  if (flash) {
    p.g.fillStyle = "rgba(255,255,255,0.55)";
    p.g.fillRect(0, 0, CINE_W, CINE_H);
    // el rayo, en zigzag
    p.g.strokeStyle = "#fffbe0";
    p.g.lineWidth = 2;
    p.g.beginPath();
    let x = t < 3 ? 104 : 30;
    p.g.moveTo(x, 40);
    for (let y = 46; y < 96; y += 7) p.g.lineTo((x += (hash(y, t < 3 ? 1 : 2) - 0.5) * 12), y);
    p.g.stroke();
  } else p.shade(0.15);
  p.vignette(0.55);
}

// ---------------------------------------------------------------------------
// Los Bandidos del Camino: la carreta se para y los bandidos salen de los matorrales.

export function bandits(p: Painter, t: number) {
  p.img(ev.camino, 0, 0);
  const stop = 3;
  const cx = t < stop ? lerp(-60, 52, ease(t / stop)) : 52 + (t > 5.4 ? (t - 5.4) * -50 : 0);
  const back = t > 5.4;
  const bump = t < stop || back ? Math.abs(Math.sin(t * 9)) : 0;
  p.shadow(cx + 26, 155, 26, 3);
  p.img(ev.carro, cx, 120 - bump, { flip: back });
  const spin = t < stop ? t * 7 : back ? -t * 7 : stop * 7;
  p.rot(ev.rueda, cx + 6, 140 - bump, spin, 8, 8);
  p.rot(ev.rueda, cx + 34, 140 - bump, spin, 8, 8);
  // los bandidos saltan de los matorrales
  const jump = (i: number, x0: number, x1: number, at: number, flip: boolean) => {
    const u = clamp((t - at) / 0.6);
    if (t < at) return;
    const x = lerp(x0, x1, u);
    const y = 122 - Math.sin(u * Math.PI) * 18;
    p.shadow(x + 12, 158, 7, 1.5);
    p.img(frameOf(ev.bandido, t + i, 4), x, y, { flip });
  };
  jump(0, 18, 26, 3.1, false);
  jump(1, 124, 112, 3.4, true);
  jump(2, 134, 132, 3.8, true);
  // polvo de la frenada
  if (t > stop - 0.3 && t < stop + 1)
    for (let i = 0; i < 8; i++) {
      const q = clamp((t - stop + 0.3) / 1.3);
      p.px(cx + 4 - q * 14 - i * 2, 152 - q * 8 - hash(i, 2) * 6, `rgba(220,190,150,${1 - q})`, 2, 2);
    }
  p.vignette(0.5);
}

// ---------------------------------------------------------------------------
// El Rey Ha Perdido las Llaves: el fantasma busca bajo el cojín mientras una
// rata se lleva la llave del tesoro; al final caen unas monedas.

export function keys(p: Painter, t: number) {
  hall(p, t, true);
  // el cojín se levanta y se cae cuando el fantasma mira debajo
  const lift = t > 1.6 && t < 3.6 ? Math.sin(((t - 1.6) / 2) * Math.PI) * 14 : 0;
  p.img(salon.cojin, 65, 96 - lift);
  const gx = t < 1.5 ? lerp(-50, 54, ease(t / 1.5)) : t < 4 ? 54 + Math.sin(t * 2) * 3 : lerp(54, 2, ease((t - 4) / 2));
  const gy = 40 + Math.sin(t * 2.2) * 3;
  p.img(rey.fantasma_opina, gx, gy, { alpha: 0.82, flip: t > 4 });
  // la rata cruza el salón con la llave
  if (t > 2.4) {
    const x = lerp(-20, 170, (t - 2.4) / 3.6);
    const f = Math.floor(t * 10) % 2;
    p.img(salon.rata[f]!, x, 152 + f);
    p.img(salon.llave, x + 13, 147);
  }
  // signos de pregunta sobre el fantasma
  if (t > 2 && t < 5.5) {
    const k = Math.floor(t * 2) % 2;
    p.g.fillStyle = "#f4fcff";
    p.g.font = "bold 10px serif";
    p.g.fillText("?", gx + 46 + k, gy + 4 - k);
  }
  // el Oro para quien más tratos cerró
  if (t > 5.2)
    for (let i = 0; i < 12; i++) {
      const q = clamp((t - 5.2 - hash(i, 1) * 0.8) / 1.1);
      if (q <= 0) continue;
      const x = 66 + hash(i, 2) * 30;
      p.px(x, 60 + q * 100, "#e8b83a", 3, 2);
      p.px(x, 60 + q * 100, "#fbe39a", 1, 1);
    }
  p.vignette(0.4);
}

// ---------------------------------------------------------------------------
// El Torneo Real: los dos caballeros cargan, chocan y el azul pierde el yelmo.

export function tournament(p: Painter, t: number) {
  p.img(ev.liza, 0, 0);
  // el público salta en las gradas
  for (let i = 0; i < 46; i++) {
    const row = i % 4;
    const x = 4 + ((i * 37) % 152);
    if (x > 56 && x < 104 && row < 1) continue;
    const jump = t > 3.4 && t < 6 ? Math.abs(Math.sin(t * 8 + i)) * 2 : 0;
    const y = 64 + row * 9 - jump;
    p.px(x, y, ["#f8d4b0", "#ebb48a", "#c4855a"][i % 3]!, 3, 3);
    p.px(x, y + 3, CONFETTI[i % 6]!, 3, 4);
  }
  const hit = 3.2;
  const v = clamp(t / hit);
  const bob = Math.abs(Math.sin(t * 10)) * 2;
  const redX = t < hit ? lerp(-64, 44, ease(v)) : 44 + (t - hit) * 40;
  const blueX = t < hit ? lerp(160, 52, ease(v)) : 52 - (t - hit) * 40;
  p.shadow(redX + 30, 157, 22, 2.5);
  p.shadow(blueX + 34, 157, 22, 2.5);
  p.img(t < hit ? ev.caballero_azul : ev.caballero_azul_sin_yelmo, blueX, 112 - bob, { flip: true });
  p.img(ev.caballero_rojo, redX, 114 - bob);
  // el choque: chispas y astillas, y el yelmo sale volando
  if (t > hit && t < hit + 0.8) {
    const u = (t - hit) / 0.8;
    for (let i = 0; i < 14; i++) {
      const ang = hash(i, 3) * Math.PI * 2;
      p.px(104 + Math.cos(ang) * u * 26, 124 + Math.sin(ang) * u * 18, i % 2 ? "#fff2b0" : "#e8dcc0", 2, 1);
    }
  }
  if (t > hit) {
    const u = clamp((t - hit) / 1.6);
    p.rot(ev.yelmo, lerp(92, 132, u), 108 - Math.sin(u * Math.PI) * 50 + u * 48, (t - hit) * 10, 7, 7);
  }
  if (t > hit + 0.4) confetti(p, t - hit - 0.4, 24);
  p.vignette(0.35);
}

// ---------------------------------------------------------------------------
// La Paz del Rey: los soldados bajan las lanzas y pasa la paloma.

export function peace(p: Painter, t: number) {
  p.img(ev.prado, 0, 0);
  const calm = t > 3 ? 1 : 0;
  p.shadow(50, 159, 10, 1.5);
  p.shadow(110, 159, 10, 1.5);
  p.img(ev.soldado_rojo[calm]!, 36, 114);
  p.img(ev.soldado_azul[calm]!, 96, 114, { flip: true });
  // la paloma cruza y deja la ramita
  const u = clamp(t / 3.2);
  const dx = lerp(-20, 72, u);
  const dy = lerp(70, 100, u) - Math.sin(u * Math.PI) * 10;
  if (t < 3.2) p.img(frameOf(ev.paloma, t, 6), dx, dy);
  else p.img(ev.paloma[0]!, lerp(72, 180, clamp((t - 4) / 2.5)), lerp(100, 40, clamp((t - 4) / 2.5)) + Math.sin(t * 6) * 1);
  // corazones de paz
  if (t > 3.2)
    for (let i = 0; i < 6; i++) {
      const q = ((t - 3.2) * 0.5 + i / 6) % 1;
      const x = 76 + Math.sin(q * 6 + i) * 8;
      p.px(x, 120 - q * 40, `rgba(226,88,94,${1 - q})`, 2, 2);
    }
  p.vignette(0.3);
}

// ---------------------------------------------------------------------------
// Carnaval: la plaza de noche con farolillos, el cabezudo del rey y caretas.

export function carnival(p: Painter, t: number) {
  p.img(pregon.plaza, 0, 0);
  p.shade(0.5);
  // farolillos
  for (let i = 0; i < 12; i++) {
    const x = 6 + i * 13.5;
    const y = 66 + Math.sin((i / 11) * Math.PI) * 10;
    const col = ["rgba(255,120,80,A)", "rgba(255,210,90,A)", "rgba(140,200,255,A)"][i % 3]!;
    p.glow(x, y, 9, col, 0.6 + Math.sin(t * 3 + i) * 0.2);
    p.px(x - 1, y - 2, col.replace("A", "1"), 3, 4);
  }
  p.glow(80, 140, 60, "rgba(255,180,90,A)", 0.25);
  // el cabezudo da vueltas y se balancea
  const sway = Math.sin(t * 2.4) * 0.12;
  p.shadow(80, 161, 16, 2);
  p.rot(ev.cabezudo, 57 + Math.sin(t * 1.2) * 10, 86 - Math.abs(Math.sin(t * 4)) * 3, sway, 23, 74);
  // aldeanos con careta
  const people: [Sprite, number, number, boolean][] = [
    [pregon.aldeano_asiente[0]!, 14, 124, false],
    [pregon.aldeana, 126, 124, true],
    [pregon.aldeano_asiente[1]!, 32, 130, false],
    [pregon.aldeana, 108, 130, false],
  ];
  people.forEach(([s, x, y, flip], i) => {
    const hop = Math.abs(Math.sin(t * 4 + i)) * 4;
    p.img(s, x, y - hop, { flip });
    p.img(ev.careta, x + 4, y - hop + 6);
  });
  // panes que vuelan de la tahona (el Pan del Carnaval)
  for (let i = 0; i < 6; i++) {
    const q = clamp((t - 1.5 - i * 0.6) / 1.4);
    if (q <= 0 || q >= 1) continue;
    p.rot(ev.pan, lerp(60, 20 + i * 24, q), 110 - Math.sin(q * Math.PI) * 50 + q * 30, q * 8, 7, 4);
  }
  confetti(p, t - 1, 36);
  firework(p, t, 2.6, 30, 70, "rgba(255,120,80,A)");
  firework(p, t, 4.1, 130, 66, "rgba(140,200,255,A)");
  firework(p, t, 5.4, 84, 60, "rgba(255,220,120,A)");
  p.vignette(0.5);
}

export const EVENT_SCENES: Record<string, (p: Painter, t: number) => void> = {
  plaga_ratas: plague,
  fiesta_san_aldric: feast,
  tormenta_costa: storm,
  bandidos: bandits,
  llaves_rey: keys,
  torneo_real: tournament,
  paz_del_rey: peace,
  carnaval: carnival,
};

// ---------------------------------------------------------------------------
// La última semana: el trono al fondo y el reloj de arena que se vacía.

export function lastWeek(p: Painter, t: number, dur: number) {
  const g = p.g;
  g.fillStyle = "#0e0a12";
  g.fillRect(0, 0, CINE_W, CINE_H);
  p.img(salon.trono, 47, 20, { alpha: 0.22 });
  p.glow(80, 120, 60, "rgba(255,200,120,A)", 0.18);
  const sand = clamp(t / dur);
  p.img(ul.reloj[Math.min(4, Math.floor(sand * 5))]!, 59, 88);
  // el chorro de arena por el cuello del reloj
  for (let i = 0; i < 12; i++) {
    const q = (t * 1.6 + i / 12) % 1;
    p.px(79 + (i % 2), 120 + q * 26, i % 3 ? "#e0b860" : "#c89a40");
  }
  p.vignette(0.6);
}

// ---------------------------------------------------------------------------
// El fantasma de Aldric pasa por el pasillo, delante de su retrato, y opina.

export function ghost(p: Painter, t: number) {
  p.img(ul.pasillo, 0, 0);
  const g = p.g;
  g.fillStyle = "rgba(190,210,255,.08)";
  for (const wx of [10, 128]) {
    g.beginPath();
    g.moveTo(wx, 92);
    g.lineTo(wx + 22, 92);
    g.lineTo(wx + 34, 176);
    g.lineTo(wx + 4, 176);
    g.fill();
  }
  const x = t < 1.8 ? lerp(-60, 54, ease(t / 1.8)) : 54 + Math.sin((t - 1.8) * 1.3) * 4;
  const y = 84 + Math.sin(t * 2.2) * 3;
  p.rot(t < 1.8 ? rey.fantasma_muslo : rey.fantasma_opina, x, y, Math.sin(t * 1.7) * 0.05, 27, 40, 0.82);
  for (let i = 0; i < 10; i++) {
    const q = (t * 0.7 + hash(i, 1)) % 1;
    p.px(x + 10 + hash(i, 2) * 32, y + 70 - q * 30, `rgba(220,240,255,${0.6 * (1 - q)})`);
  }
  p.vignette(0.65);
}

// ---------------------------------------------------------------------------
// El aniversario de la muerte del rey: la escena del ave en pequeño, en un
// cuadro del pasillo con el color gastado de los recuerdos.

let memory: HTMLCanvasElement | null = null;
export function anniversary(p: Painter, t: number) {
  p.img(ul.pasillo, 0, 0);
  if (!memory) {
    memory = document.createElement("canvas");
    memory.width = CINE_W;
    memory.height = CINE_H;
  }
  const m = memory.getContext("2d")!;
  bird(painter(m), clamp(t - 0.8, 0, 5.4));
  const g = p.g;
  // el marco dorado tapa el retrato; el cuadro, a 5/8 de tamaño
  const fx = 28;
  const fy = 22;
  const fw = 104;
  const fh = 114;
  g.fillStyle = "#a97e14";
  g.fillRect(fx - 4, fy - 4, fw + 8, fh + 8);
  g.fillStyle = "#e8b83a";
  g.fillRect(fx - 3, fy - 3, fw + 6, fh + 6);
  g.fillStyle = "#fbe39a";
  g.fillRect(fx - 3, fy - 3, fw + 6, 1);
  g.save();
  g.filter = "sepia(0.75) brightness(0.95)";
  g.drawImage(memory, 0, 0, CINE_W, CINE_H, fx, fy, fw, fh);
  g.restore();
  g.fillStyle = "#a97e14";
  g.fillRect(70, fy + fh + 6, 20, 4);
  p.vignette(0.6);
}
