import { afterEach, describe, expect, it } from "vitest";
import { GRID, MAP_LAYOUT_HEX, wastelandSplit, RHYTHM, areAdjacent, distance, generateMap, mapSize, simulateGame } from "../src";

const housesFor = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

const ORIGINAL = GRID.kind;

describe("Casillas hexagonales (diseño v3)", () => {
  afterEach(() => {
    GRID.kind = ORIGINAL;
  });

  it("cada casilla interior tiene 6 vecinas, como en una rejilla odd-r", () => {
    GRID.kind = "hex";
    const around = (x: number, y: number) => {
      const out: string[] = [];
      for (let yy = y - 2; yy <= y + 2; yy++)
        for (let xx = x - 2; xx <= x + 2; xx++) if (areAdjacent({ x, y }, { x: xx, y: yy })) out.push(`${xx},${yy}`);
      return out.sort();
    };
    // Fila par: las vecinas de arriba y abajo quedan a la izquierda.
    expect(around(3, 2)).toEqual(["2,1", "2,2", "2,3", "3,1", "3,3", "4,2"].sort());
    // Fila impar: quedan a la derecha.
    expect(around(3, 3)).toEqual(["2,3", "3,2", "3,4", "4,2", "4,3", "4,4"].sort());
  });

  it("la distancia hexagonal es simétrica y cumple la desigualdad triangular", () => {
    GRID.kind = "hex";
    const pts = Array.from({ length: 30 }, (_, i) => ({ x: i % 6, y: Math.floor(i / 6) }));
    for (const a of pts)
      for (const b of pts) {
        expect(distance(a, b)).toBe(distance(b, a));
        for (const c of pts) expect(distance(a, c)).toBeLessThanOrEqual(distance(a, b) + distance(b, c));
      }
    expect(distance({ x: 0, y: 0 }, { x: 5, y: 4 })).toBe(7);
  });

  it("con GRID en cuadrícula, la adyacencia es la de siempre (sin diagonales)", () => {
    GRID.kind = "square";
    expect(areAdjacent({ x: 1, y: 1 }, { x: 2, y: 2 })).toBe(false);
    expect(distance({ x: 0, y: 0 }, { x: 2, y: 3 })).toBe(5);
  });

  for (let n = 4; n <= 8; n++) {
    it(`mapa hexagonal válido para ${n} casas: castillos a 2 pasos o más y nada especial junto a un castillo`, () => {
      GRID.kind = "hex";
      const { cols, rows } = mapSize(n);
      expect({ cols, rows }).toEqual({ cols: MAP_LAYOUT_HEX[n as 4].cols, rows: MAP_LAYOUT_HEX[n as 4].rows });
      for (const seed of ["uno", "dos", "tres"]) {
        const map = generateMap(`${seed}-${n}`, housesFor(n));
        expect(map.tiles).toHaveLength(cols * rows);
        const castles = map.tiles.filter((t) => t.type === "castillo");
        const split = wastelandSplit(MAP_LAYOUT_HEX[n as 4].paramos);
        expect(map.tiles.filter((t) => t.type === "paramo")).toHaveLength(split.paramos);
        expect(map.tiles.filter((t) => t.type === "prado").length).toBeGreaterThanOrEqual(split.prados);
        for (const c of castles) {
          for (const o of castles) if (o !== c) expect(distance(c, o)).toBeGreaterThanOrEqual(2);
          for (const t of map.tiles)
            if (t.type === "fortaleza" || t.type === "paramo") expect(areAdjacent(c, t)).toBe(false);
        }
      }
    });
  }
});

describe("Simulación con hexágonos y resolución diaria", () => {
  it("es determinista y deja GRID y RHYTHM como estaban", () => {
    GRID.kind = "square";
    const rhythm = { days: RHYTHM.days, fortify: RHYTHM.fortify };
    const opts = {
      seed: "hex-diaria",
      strategies: ["estratega", "guerrero", "mercader", "arquitecta"] as const,
      weeks: 2 as const,
      grid: "hex" as const,
      resolutionDays: [1, 3, 5],
      fortify: 3,
    };
    const a = simulateGame({ ...opts, strategies: [...opts.strategies] });
    const b = simulateGame({ ...opts, strategies: [...opts.strategies] });
    expect(a).toEqual(b);
    expect(GRID.kind).toBe("square");
    expect(RHYTHM).toEqual(rhythm);
    GRID.kind = ORIGINAL;
    // Con hexágonos, el mapa de 4 casas es el de MAP_LAYOUT_HEX.
    expect(a.finalTiles).toHaveLength(MAP_LAYOUT_HEX[4].cols * MAP_LAYOUT_HEX[4].rows);
    expect(a.firstHouseCombatDay == null || a.firstHouseCombatDay >= 1).toBe(true);
  });
});
