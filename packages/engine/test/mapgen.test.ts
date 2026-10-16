import { describe, expect, it } from "vitest";
import { areAdjacent, generateMap, mapSize, neutralMix, perimeter } from "../src";

const housesFor = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("Generación del mapa", () => {
  it("la misma semilla da el mismo mapa y otra semilla da otro", () => {
    const a = generateMap("aldricia", housesFor(4));
    const b = generateMap("aldricia", housesFor(4));
    const c = generateMap("otra", housesFor(4));
    expect(a).toEqual(b);
    expect(JSON.stringify(a.tiles)).not.toBe(JSON.stringify(c.tiles));
  });

  for (let n = 4; n <= 8; n++) {
    it(`mapa válido y justo para ${n} casas`, () => {
      for (const seed of ["uno", "dos", "tres", "cuatro", "cinco"]) {
        const map = generateMap(`${seed}-${n}`, housesFor(n));
        const { cols, rows } = mapSize(n);
        expect(map.tiles).toHaveLength(cols * rows);

        const castles = map.tiles.filter((t) => t.type === "castillo");
        expect(castles.map((c) => c.owner).sort()).toEqual(housesFor(n));
        const border = new Set(perimeter(cols, rows).map(([x, y]) => `${x},${y}`));
        for (const c of castles) {
          expect(border.has(`${c.x},${c.y}`)).toBe(true);
          expect(c.castleOf).toBe(c.owner);
          for (const other of castles) if (other !== c) expect(areAdjacent(c, other)).toBe(false);
        }

        const neutrals = map.tiles.filter((t) => t.type !== "castillo");
        expect(neutrals.every((t) => t.owner === null && t.troops > 0 && t.name !== "")).toBe(true);
        expect(new Set(neutrals.map((t) => t.name)).size).toBe(neutrals.length);
        const fortresses = neutrals.filter((t) => t.type === "fortaleza");
        for (const f of fortresses) for (const c of castles) expect(areAdjacent(f, c)).toBe(false);

        // Justicia: la diferencia de valor alrededor de los castillos es pequeña
        // (una casilla vale 1 si es vecina y 0,5 si está a dos pasos) y ningún
        // castillo queda en una esquina con solo dos vecinas.
        expect(map.spread).toBeLessThanOrEqual(1.5);
        for (const c of castles) {
          expect(neutrals.filter((t) => areAdjacent(t, c)).length).toBeGreaterThanOrEqual(3);
        }
      }
    });
  }

  it("mezcla de neutrales: 16 casillas", () => {
    const mix = neutralMix(16);
    const count = (t: string) => mix.filter((m) => m === t).length;
    expect(mix).toHaveLength(16);
    expect(count("campos") + count("bosque") + count("cantera") + count("montana")).toBeGreaterThanOrEqual(12);
    expect(count("fortaleza")).toBeGreaterThanOrEqual(1);
  });
});
