import { describe, expect, it } from "vitest";
import { MAP_GEN, distance, areAdjacent, generateClassicMap, generateMap, type GeneratedMap } from "../src";

const housesFor = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/** Parte de las parejas de neutrales vecinas del mismo tipo (sin Aldeas ni Ruinas, que van sueltas a propósito). */
function sameShare(map: GeneratedMap): number {
  const neutral = map.tiles.filter((t) => t.type !== "castillo" && t.type !== "aldea" && t.type !== "ruinas");
  let same = 0;
  let pairs = 0;
  for (const a of neutral) for (const b of neutral) if (a !== b && areAdjacent(a, b)) (pairs++, a.type === b.type && same++);
  return same / pairs;
}

describe("Mapa con geografía (bloque 1, fase 1)", () => {
  it("está encendido y es determinista", () => {
    expect(MAP_GEN.geography).toBe(true);
    expect(generateMap("costa", housesFor(5))).toEqual(generateMap("costa", housesFor(5)));
  });

  for (let n = 4; n <= 8; n++) {
    it(`${n} casas: puertos en la costa y los recursos básicos a 2 pasos de cada castillo`, () => {
      for (const seed of ["uno", "dos", "tres"]) {
        const map = generateMap(`${seed}-${n}`, housesFor(n));
        expect(map.coast).not.toBeNull();
        const onShore = (t: { x: number; y: number }) =>
          map.coast === "oeste-este" ? t.x === 0 || t.x === map.cols - 1 : t.y === 0 || t.y === map.rows - 1;
        const ports = map.tiles.filter((t) => t.type === "puerto");
        expect(ports.length).toBeGreaterThan(0);
        expect(ports.every(onShore)).toBe(true);
        // Hay puertos en las dos costas.
        const side = (t: { x: number; y: number }) => (map.coast === "oeste-este" ? t.x === 0 : t.y === 0);
        expect(new Set(ports.map(side)).size).toBe(2);
        for (const c of map.tiles.filter((t) => t.type === "castillo")) {
          const near = new Set(map.tiles.filter((t) => distance(t, c) <= 2).map((t) => t.type));
          for (const basic of ["campos", "bosque", "cantera", "montana"] as const) expect(near.has(basic)).toBe(true);
        }
        expect(map.spread).toBeLessThanOrEqual(1.2);
      }
    });
  }

  it("agrupa el terreno al menos un 50% más que el generador de antes, sin perder justicia", () => {
    let geo = 0;
    let classic = 0;
    let geoSpread = 0;
    let classicSpread = 0;
    for (let s = 0; s < 8; s++) {
      for (const n of [4, 6, 8]) {
        const a = generateMap(`grupo-${s}-${n}`, housesFor(n));
        const b = generateClassicMap(`grupo-${s}-${n}`, housesFor(n));
        geo += sameShare(a);
        classic += sameShare(b);
        geoSpread += a.spread;
        classicSpread += b.spread;
      }
    }
    expect(geo).toBeGreaterThanOrEqual(classic * 1.5);
    expect(geoSpread).toBeLessThanOrEqual(classicSpread);
  }, 30_000);
});
