// Gran Subasta: el puesto del subastador con la vela «a la candela», los tres
// lotes sobre la mesa y los sobres lacrados de las pujas, en un lienzo de 160x88.
// Los dibujos salen de pxl (docs/maquetas/bloque10/pxl/subasta.px.js →
// subasta.ts); aquí solo se colocan y se apunta qué lote hay en cada píxel.

import type { Resource } from "@reyes/engine";
import * as art from "./subasta";
import type { Sprite } from "./sprites";
import { housePalette } from "./castleScene";

export const AUCTION_W = 160;
export const AUCTION_H = 88;
/** Fila del tablero de la mesa: los lotes, la vela y el subastador se apoyan en ella. */
const TABLE = 61;
/** Centro de cada lote (1, 2 y 3). */
export const LOT_X = [74, 107, 139];
const CANDLE_X = 13;
const AUCTIONEER_X = 40;
/** Sobres que caben dibujados por lote; los demás se cuentan en el texto. */
export const MAX_ENVELOPES = 5;

const CANDLES: Sprite[] = [
  art.vela_0, art.vela_1, art.vela_2, art.vela_3, art.vela_4, art.vela_5, art.vela_6,
  art.vela_7, art.vela_8, art.vela_9, art.vela_10, art.vela_11, art.vela_12,
];
const SACKS: Record<Exclude<Resource, "oro">, Sprite> = {
  pan: art.saco_pan,
  madera: art.saco_madera,
  piedra: art.saco_piedra,
  hierro: art.saco_hierro,
};

export interface AuctionLotArt {
  /** Recursos del lote, o null si es una carta. */
  recursos: Partial<Record<Resource, number>> | null;
  /** Sobres (pujas) que tiene. */
  sobres: number;
  /** Si uno de ellos es el tuyo. */
  tuyo: boolean;
  /** Escudo de quien lo ganó, ya montado (al cerrar la subasta). */
  ganador?: { grid: string[]; palette: Record<string, string> } | null;
}

export interface AuctionSceneInput {
  lots: AuctionLotArt[];
  /** Cuánto queda de vela, de 1 (entera) a 0 (apagada). */
  candle: number;
  /** Color (hex) de tu casa: el lacre de tu sobre. */
  color: string;
  /** El mazo cae (la subasta ha terminado). */
  hammer: boolean;
  /** Fotograma de la llama o del humo. */
  frame: number;
}

export interface AuctionSceneImage {
  rgba: Uint8ClampedArray;
  /** Qué lote (0, 1 o 2) hay en cada píxel, o -1. */
  owner: Int8Array;
  /** Caja de cada lote: x, y, ancho y alto. */
  boxes: [number, number, number, number][];
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const width = (s: Sprite) => Math.max(...s.grid.map((r) => r.length));

/** Pinta un dibujo con su base en (cx, bottom); devuelve su caja. */
function paint(img: AuctionSceneImage, s: Sprite, cx: number, bottom: number, who = -1, extra: Record<string, string> = {}) {
  const w = width(s);
  const h = s.grid.length;
  const x0 = cx - Math.floor(w / 2);
  const y0 = bottom - h;
  const colors = new Map<string, [number, number, number]>();
  for (const [k, v] of Object.entries({ ...s.palette, ...extra })) colors.set(k, rgb(v));
  s.grid.forEach((row, y) => {
    const py = y0 + y;
    if (py < 0 || py >= AUCTION_H) return;
    for (let x = 0; x < row.length; x++) {
      const c = colors.get(row[x]!);
      const px = x0 + x;
      if (!c || px < 0 || px >= AUCTION_W) continue;
      const i = py * AUCTION_W + px;
      img.rgba.set([c[0], c[1], c[2], 255], i * 4);
      if (who >= 0) img.owner[i] = who;
    }
  });
  return [x0, y0, w, h] as [number, number, number, number];
}

/** Los dibujos de un lote de recursos: dos sacos del mismo, o uno de cada (el Oro, en montón). */
function lotPieces(recursos: Partial<Record<Resource, number>>): [Sprite, number][] {
  const rs = (Object.keys(recursos) as Resource[]).filter((r) => (recursos[r] ?? 0) > 0);
  const piece = (r: Resource, alone: boolean) => (r === "oro" ? (alone ? art.lote_oro : art.monton_oro) : SACKS[r]);
  if (rs.length === 1) return rs[0] === "oro" ? [[art.lote_oro, 0]] : [[piece(rs[0]!, true), -6], [piece(rs[0]!, true), 5]];
  return rs.slice(0, 2).map((r, i) => [piece(r, false), i === 0 ? -7 : 7]);
}

/** Monta la escena. Determinista: la misma entrada da la misma imagen. */
export function renderAuctionScene(input: AuctionSceneInput): AuctionSceneImage {
  const img: AuctionSceneImage = {
    rgba: new Uint8ClampedArray(AUCTION_W * AUCTION_H * 4),
    owner: new Int8Array(AUCTION_W * AUCTION_H).fill(-1),
    boxes: [],
  };
  paint(img, art.subasta_fondo, AUCTION_W / 2, AUCTION_H);
  paint(img, input.hammer ? art.subastador_golpe : art.subastador, AUCTIONEER_X, TABLE + 1);
  // La vela: 13 alturas; encima, la llama o, apagada, el humo.
  const n = Math.max(0, Math.min(CANDLES.length - 1, Math.round(input.candle * (CANDLES.length - 1))));
  const candle = CANDLES[n]!;
  paint(img, candle, CANDLE_X, TABLE + 1);
  const wick = TABLE + 1 - candle.grid.length + (30 - (2 + Math.round((22 * n) / 12)));
  const out = input.candle <= 0;
  const flame = out ? art.humo[input.frame % art.humo.length]! : art.llama[input.frame % art.llama.length]!;
  paint(img, flame, CANDLE_X, wick);

  input.lots.forEach((lot, i) => {
    const x = LOT_X[i]!;
    const boxes: [number, number, number, number][] = [];
    if (lot.recursos) for (const [s, dx] of lotPieces(lot.recursos)) boxes.push(paint(img, s, x + dx, TABLE + 1, i));
    else boxes.push(paint(img, art.lote_carta, x, TABLE + 1, i));
    // Sobres en el paño, debajo del lote; el tuyo, delante.
    const shown = Math.min(MAX_ENVELOPES, lot.sobres);
    const order = [...Array(shown).keys()].sort((a, b) => Number(lot.tuyo && a === 0) - Number(lot.tuyo && b === 0));
    for (const k of order) {
      const s = lot.tuyo && k === 0 ? art.sobre_tuyo : art.sobre;
      // El tuyo, un poco más arriba que los demás.
      const up = lot.tuyo && k === 0 ? 2 : 0;
      boxes.push(paint(img, s, x - 11 + k * 6, TABLE + 15 + (k % 2) * 3 - up, i, housePalette(input.color)));
    }
    if (lot.ganador) boxes.push(paint(img, lot.ganador, x, TABLE - 24, i));
    const x0 = Math.min(...boxes.map((b) => b[0]));
    const y0 = Math.min(...boxes.map((b) => b[1]));
    const x1 = Math.max(...boxes.map((b) => b[0] + b[2]));
    const y1 = Math.max(...boxes.map((b) => b[1] + b[3]));
    img.boxes.push([x0, y0, x1 - x0, y1 - y0]);
  });
  return img;
}

/** Qué lote hay en un punto (en píxeles del dibujo), o null. Un dedo no es un píxel: vale lo más cercano. */
export function lotAt(img: AuctionSceneImage, x: number, y: number, reach = 5): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (let dy = -reach; dy <= reach; dy++)
    for (let dx = -reach; dx <= reach; dx++) {
      const qx = Math.floor(x) + dx;
      const qy = Math.floor(y) + dy;
      const d = dx * dx + dy * dy;
      if (qx < 0 || qy < 0 || qx >= AUCTION_W || qy >= AUCTION_H || d >= bestD) continue;
      const who = img.owner[qy * AUCTION_W + qx]!;
      if (who >= 0) {
        best = who;
        bestD = d;
      }
    }
  return best;
}
