import { describe, expect, it } from "vitest";
import { MAP_LAYOUT, areAdjacent, castleName, computePrestige, generateMap, mapSize, neutralMix, perimeter } from "../src";

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
        const fortresses = neutrals.filter((t) => t.type === "fortaleza" || t.type === "paramo");
        for (const f of fortresses) for (const c of castles) expect(areAdjacent(f, c)).toBe(false);
        // Los páramos de MAP_LAYOUT, con 2 de guarnición.
        const paramos = neutrals.filter((t) => t.type === "paramo");
        expect(paramos).toHaveLength(MAP_LAYOUT[n as 4 | 5 | 6 | 7 | 8].paramos);
        expect(paramos.every((t) => t.troops === 2)).toBe(true);
        // Ningún castillo a 2 pasos o menos de otro.
        for (const c of castles) for (const o of castles) if (o !== c) expect(Math.abs(o.x - c.x) + Math.abs(o.y - c.y)).toBeGreaterThan(2);

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

describe("Páramos", () => {
  it("no producen y dan 1 de Prestigio de territorio (las demás casillas, 3)", () => {
    const p = computePrestige({
      house: 1,
      tiles: [
        { id: 1, x: 0, y: 0, type: "paramo", owner: 1, troops: 1, fortifiedUntil: null },
        { id: 2, x: 1, y: 0, type: "campos", owner: 1, troops: 1, fortifiedUntil: null },
      ],
      buildings: { granja: 1, aserradero: 1, cantera: 1, mina: 1, mercado: 1 },
      gold: 0,
      tradePartners: 0,
      achievements: {},
    } as Parameters<typeof computePrestige>[0]);
    expect(p.territorio).toBe(4);
  });
});

describe("Nombres de castillos", () => {
  it("ponen bien la preposición", () => {
    expect(castleName("Casa del Nabo")).toBe("Castillo de la Casa del Nabo");
    expect(castleName("Los Pocapena")).toBe("Castillo de los Pocapena");
    expect(castleName("El Gran Pato")).toBe("Castillo del Gran Pato");
    expect(castleName("Gallina Bélica")).toBe("Castillo de Gallina Bélica");
  });
});
