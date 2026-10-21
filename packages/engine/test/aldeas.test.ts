import { afterEach, describe, expect, it } from "vitest";
import {
  FEATURES,
  GRID,
  NEUTRAL_GARRISON,
  canRecruitAt,
  claimRuins,
  distance,
  generateMap,
  recruitSite,
  recruitSites,
  ruinPrize,
  tilePrestige,
  type Tile,
} from "../src";

const ORIGINAL = GRID.kind;
afterEach(() => {
  GRID.kind = ORIGINAL;
});

const housesFor = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("Aldeas y Ruinas (bloque 1, fase 3)", () => {
  for (let n = 4; n <= 8; n++) {
    it(`${n} casas: una aldea por casa a ${FEATURES.villageSteps} pasos y ruinas lejos de los castillos`, () => {
      GRID.kind = "hex";
      for (const seed of ["uno", "dos", "tres"]) {
        const map = generateMap(`${seed}-${n}`, housesFor(n));
        const castles = map.tiles.filter((t) => t.type === "castillo");
        const villages = map.tiles.filter((t) => t.type === "aldea");
        const ruins = map.tiles.filter((t) => t.type === "ruinas");
        expect(villages).toHaveLength(n);
        expect(ruins).toHaveLength(FEATURES.ruinsCount[n]!);
        // Cada castillo tiene una aldea a los pasos fijados y ninguna está junto a un castillo.
        for (const c of castles) expect(villages.some((v) => distance(v, c) === FEATURES.villageSteps)).toBe(true);
        for (const t of [...villages, ...ruins]) for (const c of castles) expect(distance(t, c)).toBeGreaterThanOrEqual(2);
        expect(villages.every((v) => v.troops === NEUTRAL_GARRISON.aldea && v.name !== "")).toBe(true);
        expect(ruins.every((r) => r.troops === NEUTRAL_GARRISON.ruinas)).toBe(true);
      }
    });
  }

  it("la aldea da 1 de Prestigio y las ruinas, como un Prado", () => {
    expect(tilePrestige("aldea")).toBe(1);
    expect(tilePrestige("ruinas")).toBe(tilePrestige("prado"));
  });

  it("el premio de unas ruinas sale de la semilla y siempre es el mismo", () => {
    expect(ruinPrize("partida", { x: 3, y: 2 })).toEqual(ruinPrize("partida", { x: 3, y: 2 }));
    const kinds = new Set(Array.from({ length: 40 }, (_, i) => ruinPrize(`p${i}`, { x: 1, y: 1 }).kind));
    expect(kinds).toEqual(new Set(["carta", "recursos"]));
    for (let i = 0; i < 40; i++) {
      const p = ruinPrize(`p${i}`, { x: 2, y: 3 });
      if (p.kind === "recursos") expect(p.amount).toBe(FEATURES.prize);
    }
  });

  it("quien entra en las ruinas se lleva el premio y quedan como Prado", () => {
    const tiles: Tile[] = [
      { id: 1, x: 0, y: 0, type: "ruinas", owner: 2, troops: 3 },
      { id: 2, x: 1, y: 0, type: "ruinas", owner: null, troops: 2 },
    ];
    const r = claimRuins(tiles, "semilla");
    expect(r.tiles[0]!.type).toBe("prado");
    expect(r.tiles[1]!.type).toBe("ruinas");
    expect(r.claims).toEqual([{ house: 2, tile: 1, prize: ruinPrize("semilla", { x: 0, y: 0 }) }]);
    expect(tiles[0]!.type).toBe("ruinas");
  });

  it("se recluta en el castillo o en una aldea propia; los bots, en la aldea del frente", () => {
    GRID.kind = "hex";
    const tiles: Tile[] = [
      { id: 1, x: 0, y: 0, type: "castillo", owner: 1, castleOf: 1, troops: 5 },
      { id: 2, x: 1, y: 0, type: "campos", owner: 1, troops: 2 },
      { id: 3, x: 2, y: 0, type: "aldea", owner: 1, troops: 4 },
      { id: 4, x: 3, y: 0, type: "campos", owner: 2, troops: 4 },
      { id: 5, x: 4, y: 0, type: "aldea", owner: 2, troops: 4 },
    ];
    expect(canRecruitAt(tiles[0]!, 1)).toBe(true);
    expect(canRecruitAt(tiles[2]!, 1)).toBe(true);
    expect(canRecruitAt(tiles[1]!, 1)).toBe(false);
    expect(canRecruitAt(tiles[4]!, 1)).toBe(false);
    expect(recruitSites(tiles, 1).map((t) => t.id)).toEqual([1, 3]);
    expect(recruitSite(tiles, 1)?.id).toBe(3);
    // Sin enemigos junto a la aldea, en el castillo.
    expect(recruitSite(tiles.filter((t) => t.id !== 4), 1)?.id).toBe(1);
  });
});
