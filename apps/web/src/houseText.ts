// Bloque 3: las casas que nombra Fray Abundio, en su color en el pergamino y
// con un cuadradito de color delante en el texto para WhatsApp.

import type { HouseInfo } from "./api";

/** Un cuadradito por esmalte (aguamarina no tiene cuadrado: va un rombo). */
export const COLOR_SQUARE: Record<string, string> = {
  gules: "🟥",
  azur: "🟦",
  sinople: "🟩",
  sable: "\u2b1b", // el cuadrado negro, escrito así para que no entre en las letras recortadas
  purpura: "🟪",
  naranjado: "🟧",
  aguamarina: "🔷",
  leonado: "🟫",
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Patrón que encuentra el nombre de cualquier casa, con la primera letra en mayúscula o no ("Los Pocapena" y "los Pocapena"). */
function housePattern(houses: Pick<HouseInfo, "nombre">[]): RegExp | null {
  const names = houses.map((h) => h.nombre).filter((n) => n.length > 0);
  if (names.length === 0) return null;
  // Los nombres más largos primero, para que «Casa del Nabo Real» no se quede en «Casa del Nabo».
  const parts = [...names]
    .sort((a, b) => b.length - a.length)
    .map((n) => `[${escape(n[0]!.toLowerCase())}${escape(n[0]!.toUpperCase())}]${escape(n.slice(1))}`);
  return new RegExp(`(${parts.join("|")})(?![\\p{L}])`, "gu");
}

export type Segment = string | { house: HouseInfo; text: string };

/** Parte una línea en trozos de texto y nombres de casa. */
export function splitByHouses(text: string, houses: HouseInfo[]): Segment[] {
  const re = housePattern(houses);
  if (!re) return [text];
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index!;
    const house = houses.find((h) => h.nombre.toLowerCase() === m[0].toLowerCase());
    if (!house) continue;
    if (at > last) out.push(text.slice(last, at));
    out.push({ house, text: m[0] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** El texto para WhatsApp con el cuadradito del color de cada casa delante de su nombre. */
export function withSquares(text: string, houses: HouseInfo[]): string {
  return splitByHouses(text, houses)
    .map((s) => (typeof s === "string" ? s : `${COLOR_SQUARE[s.house.color] ?? "\u25aa\ufe0f"}${s.text}`))
    .join("");
}
