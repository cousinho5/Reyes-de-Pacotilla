// Bloque 13: el lienzo de las cinemáticas, de 160x176 visto a pantalla completa.
// Cada escena se dibuja en función del tiempo t (segundos), así una imagen fija
// de cualquier instante sale igual que la animación (lo que se ve con «reducir
// movimiento»). Los dibujos son rejillas con paleta (`Sprite`) que se pasan a un
// lienzo pequeño una sola vez; aquí solo se colocan, se giran y se iluminan.

import type { Sprite } from "./sprites";

export const CINE_W = 160;
export const CINE_H = 176;

const cache = new WeakMap<Sprite, HTMLCanvasElement>();

/** El dibujo en un lienzo de su tamaño, hecho una vez por dibujo. */
export function spriteCanvas(s: Sprite): HTMLCanvasElement {
  let c = cache.get(s);
  if (c) return c;
  const w = Math.max(...s.grid.map((r) => r.length));
  const h = s.grid.length;
  c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const data = g.createImageData(w, h);
  s.grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const hex = s.palette[row[x]!];
      if (!hex) continue;
      const i = (y * w + x) * 4;
      data.data[i] = parseInt(hex.slice(1, 3), 16);
      data.data[i + 1] = parseInt(hex.slice(3, 5), 16);
      data.data[i + 2] = parseInt(hex.slice(5, 7), 16);
      data.data[i + 3] = 255;
    }
  });
  g.putImageData(data, 0, 0);
  cache.set(s, c);
  return c;
}

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const ease = (v: number) => {
  v = clamp(v);
  return v < 0.5 ? 2 * v * v : 1 - (-2 * v + 2) ** 2 / 2;
};
export const lerp = (a: number, b: number, v: number) => a + (b - a) * v;
/** Azar fijo de 0 a 1 para el elemento i (mismo número en cada fotograma). */
export const hash = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export interface Painter {
  g: CanvasRenderingContext2D;
  /** Un dibujo con su esquina de arriba a la izquierda en (x, y). */
  img(s: Sprite, x: number, y: number, opts?: { alpha?: number; flip?: boolean }): void;
  /** Girado `ang` radianes alrededor de (px, py), medidos dentro del dibujo. */
  rot(s: Sprite, x: number, y: number, ang: number, px: number, py: number, alpha?: number): void;
  /** Un punto (o rectángulo) de color. */
  px(x: number, y: number, color: string, w?: number, h?: number): void;
  /** Luz redonda: `color` lleva una A donde va la opacidad, "rgba(255,170,60,A)". */
  glow(x: number, y: number, r: number, color: string, a: number): void;
  /** Oscurece todo el lienzo. */
  shade(a: number): void;
  /** Oscurece los bordes. */
  vignette(a?: number): void;
  /** Sombra suave en el suelo. */
  shadow(x: number, y: number, rx: number, ry: number, a?: number): void;
}

export function painter(g: CanvasRenderingContext2D): Painter {
  g.imageSmoothingEnabled = false;
  const round = Math.round;
  return {
    g,
    img(s, x, y, opts) {
      const c = spriteCanvas(s);
      if (!opts) return g.drawImage(c, round(x), round(y));
      g.save();
      if (opts.alpha != null) g.globalAlpha = opts.alpha;
      if (opts.flip) {
        g.translate(round(x) + c.width, round(y));
        g.scale(-1, 1);
        g.drawImage(c, 0, 0);
      } else g.drawImage(c, round(x), round(y));
      g.restore();
    },
    rot(s, x, y, ang, px, py, alpha = 1) {
      const c = spriteCanvas(s);
      g.save();
      g.globalAlpha = alpha;
      g.translate(round(x + px), round(y + py));
      g.rotate(ang);
      g.drawImage(c, -px, -py);
      g.restore();
    },
    px(x, y, color, w = 1, h = 1) {
      g.fillStyle = color;
      g.fillRect(round(x), round(y), w, h);
    },
    glow(x, y, r, color, a) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, color.replace("A", String(a)));
      gr.addColorStop(1, color.replace("A", "0"));
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    },
    shade(a) {
      g.fillStyle = `rgba(8,5,12,${a})`;
      g.fillRect(0, 0, CINE_W, CINE_H);
    },
    vignette(a = 0.55) {
      const gr = g.createRadialGradient(CINE_W / 2, CINE_H / 2, CINE_H * 0.3, CINE_W / 2, CINE_H / 2, CINE_H * 0.75);
      gr.addColorStop(0, "rgba(0,0,0,0)");
      gr.addColorStop(1, `rgba(0,0,0,${a})`);
      g.fillStyle = gr;
      g.fillRect(0, 0, CINE_W, CINE_H);
    },
    shadow(x, y, rx, ry, a = 0.28) {
      g.fillStyle = `rgba(26,20,16,${a})`;
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    },
  };
}
