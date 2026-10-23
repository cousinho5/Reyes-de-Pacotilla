// Bloque 7: el panorama de Aldricia en la portada. Cinco planos (cielo, montes,
// colinas, la capital y el pueblo) que se mueven a distinto ritmo al deslizar,
// teñidos según la hora del móvil. Los dibujos vienen de pxl (`portada.ts`); el
// cielo, el sol, la luna, las nubes y las estrellas se pintan aquí.

import type { HomeHour } from "../home";
import type { Sprite } from "./sprites";
import * as P from "./portada";

export const PANO_W = 196;
export const PANO_H = 252;
/** Los planos van esta altura por debajo del borde de arriba (el cielo es más alto). */
const TOP = 36;

interface HourLight {
  /** Cielo: arriba, en medio y en el horizonte. */
  sky: [string, string, string];
  tint: string;
  strength: number;
  haze: string;
  dark: number;
  /** Cuánto se encienden las ventanas (llaves z y Z de la paleta). */
  windows: number;
  clouds: [string, string];
  sun?: [number, number, string];
  moon?: [number, number];
}

export const HOURS: Record<HomeHour, HourLight> = {
  amanecer: { sky: ["#2f3f78", "#c97f8f", "#f7c98e"], tint: "#f2a37a", strength: 0.16, haze: "#e9b3a2", dark: 0.06, windows: 0.4, clouds: ["#fbe0cf", "#d99aa0"], sun: [150, 92, "#ffe2a0"] },
  dia: { sky: ["#4f86cc", "#93c1ec", "#d7ecf9"], tint: "#ffffff", strength: 0, haze: "#c7dcef", dark: 0, windows: 0, clouds: ["#ffffff", "#c6d7ea"], sun: [176, 24, "#fff6c8"] },
  atardecer: { sky: ["#272a66", "#a8507d", "#f59a4c"], tint: "#ff8a4a", strength: 0.22, haze: "#d98a7a", dark: 0.12, windows: 0.8, clouds: ["#ffc08a", "#a8507d"], sun: [30, 96, "#ffcf70"] },
  noche: { sky: ["#070b26", "#16255a", "#34497f"], tint: "#2a3d78", strength: 0.45, haze: "#2e4378", dark: 0.3, windows: 1, clouds: ["#3a4a7a", "#232f5a"], moon: [172, 26] },
};

// ------------------------------------------------------------------ color

const rgbOf = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const;
const hexOf = (a: readonly number[]) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export const mix = (a: string, b: string, t: number) => {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return hexOf(x.map((v, i) => v + (y[i]! - v) * t));
};
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * La paleta de un plano a una hora: el tinte de la hora, la bruma según lo lejos
 * que está (`depth`, de 0 a 1) y las ventanas encendidas al caer la tarde.
 */
export function tint(palette: Record<string, string>, depth: number, hour: HomeHour): Record<string, string> {
  const H = HOURS[hour];
  const out: Record<string, string> = {};
  for (const [k, c] of Object.entries(palette)) {
    const glass = k === "z" || k === "Z";
    let v = c;
    if (H.strength && !glass) v = mix(v, H.tint, H.strength);
    if (H.dark) v = mix(v, "#000000", H.dark * (1 - depth * 0.3));
    v = mix(v, H.haze, depth * 0.42);
    if (glass && H.windows) v = mix(v, k === "z" ? "#ffb84a" : "#ffe9a8", H.windows);
    out[k] = v;
  }
  return out;
}

// ------------------------------------------------------------------ rejillas a lienzo

function paint(s: Sprite, palette: Record<string, string>): HTMLCanvasElement {
  const w = s.grid[0]!.length;
  const h = s.grid.length;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const d = g.createImageData(w, h);
  const rgb: Record<string, readonly number[]> = {};
  for (let y = 0; y < h; y++) {
    const row = s.grid[y]!;
    for (let x = 0; x < w; x++) {
      const k = row[x]!;
      if (k === "." || !palette[k]) continue;
      const v = (rgb[k] ??= rgbOf(palette[k]!));
      const o = (y * w + x) * 4;
      d.data[o] = v[0]!;
      d.data[o + 1] = v[1]!;
      d.data[o + 2] = v[2]!;
      d.data[o + 3] = 255;
    }
  }
  g.putImageData(d, 0, 0);
  return c;
}

const cache = new Map<string, HTMLCanvasElement>();
type Art = Exclude<keyof typeof P, "default">;
function sprite(name: Art, depth: number, hour: HomeHour, frame = 0) {
  const key = `${name}|${hour}|${depth}|${frame}`;
  let c = cache.get(key);
  if (!c) {
    const a = P[name] as Sprite | Sprite[];
    const s = Array.isArray(a) ? a[frame % a.length]! : a;
    c = paint(s, tint(s.palette, depth, hour));
    cache.set(key, c);
  }
  return c;
}
/** El fantasma no se tiñe: brilla con luz propia. */
let ghosts: HTMLCanvasElement[] | null = null;
const ghost = (i: number) => (ghosts ??= P.fantasma.map((f) => paint(f, f.palette)))[i]!;

/** El fotograma de una animación en el instante `t` (segundos); `pingpong`, de ida y vuelta. */
export function frameAt(count: number, t: number, fps: number, pingpong = false) {
  const i = Math.floor(t * fps);
  const mod = (a: number, n: number) => ((a % n) + n) % n;
  if (!pingpong) return mod(i, count);
  const m = mod(i, 2 * count - 2);
  return m < count ? m : 2 * count - 2 - m;
}



// ------------------------------------------------------------------ los planos

export const LAYERS = [
  { id: "cielo", parallax: 0.55, depth: 0 },
  { id: "lejos", parallax: 0.42, depth: 1 },
  { id: "colinas", parallax: 0.3, depth: 0.6 },
  { id: "capital", parallax: 0.18, depth: 0.3 },
  { id: "pueblo", parallax: 0.05, depth: 0 },
] as const;
export type LayerId = (typeof LAYERS)[number]["id"];

const hash = (i: number, k: number) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};
const STARS = Array.from({ length: 80 }, (_, i) => [Math.floor(hash(i, 1) * PANO_W), Math.floor(Math.pow(hash(i, 2), 1.4) * 120), Math.floor(hash(i, 3) * 7)] as const);
/** Nubes: x de salida, altura, ancho y velocidad. */
const CLOUDS = [
  [20, 18, 22, 0.9],
  [120, 34, 30, 0.7],
  [70, 8, 16, 1.1],
  [168, 52, 18, 0.8],
] as const;

function cloud(g: CanvasRenderingContext2D, cx: number, cy: number, width: number, H: HourLight) {
  const [light, shadow] = H.clouds;
  for (const [color, dy, grow] of [
    [shadow, 1, 1],
    [light, -1, 0],
  ] as const) {
    g.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const px = cx + (i * width) / 5 - width / 2;
      const r = 3 + ((i * 7) % 4) + (i === 2 ? 3 : 0);
      const py = cy - (i === 2 ? 2 : 0);
      g.beginPath();
      g.ellipse(Math.round(px), Math.round(py + dy), r + grow, r * (grow ? 0.6 : 0.55) + grow, 0, 0, 7);
      g.fill();
    }
  }
}

function sky(g: CanvasRenderingContext2D, t: number, H: HourLight, moving: boolean) {
  const grad = g.createLinearGradient(0, 0, 0, 150);
  grad.addColorStop(0, H.sky[0]);
  grad.addColorStop(0.55, H.sky[1]);
  grad.addColorStop(1, H.sky[2]);
  g.fillStyle = grad;
  g.fillRect(0, 0, PANO_W, PANO_H);
  if (H.moon) {
    for (const [sx, sy, f] of STARS) {
      if (Math.sin(t * (1 + f * 0.3) + f) <= -0.2) continue;
      g.fillStyle = f % 3 ? "#c9d4ff" : "#ffffff";
      g.fillRect(sx, sy, 1, 1);
      if (f === 0 && Math.sin(t * 2 + sx) > 0.7) {
        g.fillRect(sx - 1, sy, 3, 1);
        g.fillRect(sx, sy - 1, 1, 3);
      }
    }
    const [mx, my] = H.moon;
    const halo = g.createRadialGradient(mx, my, 2, mx, my, 26);
    halo.addColorStop(0, "rgba(220,230,255,.35)");
    halo.addColorStop(1, "rgba(220,230,255,0)");
    g.fillStyle = halo;
    g.fillRect(mx - 30, my - 30, 60, 60);
    g.fillStyle = "#f4f1dc";
    g.beginPath();
    g.arc(mx, my, 7, 0, 7);
    g.fill();
    // Creciente: un mordisco del color del cielo.
    g.fillStyle = H.sky[0];
    g.beginPath();
    g.arc(mx + 4, my - 2, 6, 0, 7);
    g.fill();
  } else if (H.sun) {
    const [sx, sy, col] = H.sun;
    const halo = g.createRadialGradient(sx, sy, 3, sx, sy, 46);
    halo.addColorStop(0, col + "cc");
    halo.addColorStop(1, col + "00");
    g.fillStyle = halo;
    g.fillRect(sx - 50, sy - 50, 100, 100);
    g.fillStyle = col;
    g.beginPath();
    g.arc(sx, sy, 8, 0, 7);
    g.fill();
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(sx - 2, sy - 2, 3, 0, 7);
    g.fill();
  }
  for (const [x0, y0, w, v] of CLOUDS) {
    const L = PANO_W + 60;
    const cx = ((x0 + (moving ? t * v * 1.6 : 0)) % L) - 30;
    cloud(g, cx, y0 + 6, w, H);
  }
}

/** El camino real del dibujo, por donde suben la carreta y baja el aldeano. */
const road = (y: number) => {
  const t = (y - 155) / (216 - 155);
  return 98 + Math.sin(t * 3.6) * 22 * t;
};
const CHIMNEYS = [
  [-3, 177],
  [31, 171],
  [150, 171],
  [176, 177],
] as const;

/**
 * Pinta un plano en el instante `t` (segundos). `moving` falso deja la escena
 * quieta («reducir movimiento»): cada cosa en su sitio, sin rata ni nubes que pasan.
 */
export function drawLayer(g: CanvasRenderingContext2D, id: LayerId, t: number, hour: HomeHour, moving: boolean) {
  const H = HOURS[hour];
  const night = !!H.moon;
  const depth = LAYERS.find((l) => l.id === id)!.depth;
  g.clearRect(0, 0, PANO_W, PANO_H);
  g.imageSmoothingEnabled = false;
  if (id === "cielo") return sky(g, t, H, moving);
  const off = id === "capital" ? -1 : 0;
  g.drawImage(sprite(id, depth, hour), off, TOP + off);
  const T = moving ? t : 0;
  if (id === "colinas") g.drawImage(sprite("aspas", depth, hour, frameAt(P.aspas.length, T, 5)), 21, TOP + 116);
  if (id === "capital") {
    g.drawImage(sprite("bandera", depth, hour, frameAt(P.bandera.length, T, 8)), 98, TOP + 25);
    if (night) {
      g.globalAlpha = 0.55 + 0.35 * Math.sin(t * 1.3);
      g.drawImage(ghost(frameAt(P.fantasma.length, T, 5, true)), 112, TOP + 44 + Math.round(Math.sin(T * 0.8) * 3));
      g.globalAlpha = 1;
    }
  }
  if (id === "pueblo") {
    for (const [cx, cy] of CHIMNEYS) g.drawImage(sprite("humo", night ? 0.5 : 0.2, hour, frameAt(P.humo.length, T + cx, 10)), cx, TOP + cy - 24);
    // La carreta sube por el camino en 36 s; el aldeano baja en 28 s.
    const pc = moving ? (t / 36) % 1 : 0.45;
    const yc = lerp(214, 166, pc);
    g.globalAlpha = clamp((1 - pc) * 8) * clamp(pc * 12);
    g.drawImage(sprite("carreta", 0, hour, frameAt(P.carreta.length, T, 6)), Math.round(road(yc) - 6), TOP + Math.round(yc) - 16);
    const pa = moving ? ((t + 9) / 28) % 1 : 0.3;
    const ya = lerp(160, 216, pa);
    g.globalAlpha = clamp(pa * 10) * clamp((1 - pa) * 10);
    g.drawImage(sprite("aldeano", 0, hour, frameAt(P.aldeano.length, T, 6)), Math.round(road(ya) - 14), TOP + Math.round(ya) - 15);
    g.globalAlpha = 1;
    // Una rata cruza el camino cada 14 s.
    const pr = ((t + 5) % 14) / 2.2;
    if (moving && pr < 1) g.drawImage(sprite("rata", 0, hour, frameAt(P.rata.length, t, 10)), Math.round(lerp(-10, PANO_W + 10, pr)), TOP + 202);
    // Pájaros de día; de noche, los mismos en oscuro (murciélagos).
    for (let i = 0; i < 3; i++) {
      const v = 9 + i * 2;
      const bx = ((T * v + i * 70) % (PANO_W + 40)) - 20;
      const by = 40 + i * 9 + Math.sin(T * 2 + i) * 3;
      g.drawImage(sprite("pajaro", night ? 0.2 : 0.5, hour, frameAt(P.pajaro.length, T + i * 0.3, 8)), Math.round(bx), Math.round(by));
    }
    // Luciérnagas junto a los árboles.
    if (night) {
      g.fillStyle = "#f6f2a0";
      for (let i = 0; i < 14; i++) {
        if (Math.sin(t * 3 + i * 1.7) <= 0.2) continue;
        const fx = [64, 132, 14, 186][i % 4]! + Math.sin(T * 0.7 + i) * 8;
        const fy = TOP + 168 + Math.cos(T * 0.9 + i * 2) * 6;
        g.fillRect(Math.round(fx), Math.round(fy), 1, 1);
      }
    }
  }
}

/** Los planos que cambian con el tiempo (los montes lejanos se pintan una vez por hora). */
export const MOVING_LAYERS: ReadonlySet<LayerId> = new Set(["cielo", "colinas", "capital", "pueblo"]);
