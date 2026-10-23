import { describe, expect, it } from "vitest";
import { FUTURE_KING, TITLES, combatTitleStats, comebacks, endTitles, type TitleStats } from "../src/titles";
import { PHRASES } from "../src/texts/cronista";

const zero = (house: number, more: Partial<TitleStats> = {}): TitleStats => ({
  house,
  conquests: 0,
  riverWins: 0,
  defenses: 0,
  siegeNights: 0,
  trades: 0,
  buildingLevels: 7,
  gold: 0,
  troops: 0,
  auctions: 0,
  tilesLost: 0,
  betrayals: 0,
  allianceNights: 0,
  bribes: 0,
  ruins: 0,
  comeback: 0,
  castleTroops: 0,
  ...more,
});
const names = new Map([
  [1, "Casa del Metro"],
  [2, "Los Pocapena"],
  [3, "Gallina Bélica"],
  [4, "Barones del Barro"],
]);

describe("Títulos de fin de partida (bloque 13)", () => {
  it("cada casa el dato en que más destaca, con su cifra y sin repetir", () => {
    const t = endTitles(
      [
        zero(1, { conquests: 9, troops: 40, castleTroops: 8 }),
        zero(2, { conquests: 3, trades: 7, gold: 30 }),
        zero(3, { tilesLost: 5, castleTroops: 12 }),
        zero(4, { bribes: 20, gold: 25 }),
      ],
      1,
      "s",
      names,
    );
    expect(t.map((x) => x.key)).toEqual(["azote", "mercader", "caido", "mecenas"]);
    expect(t[0]).toMatchObject({ name: "Azote de Fronteras", n: 9, king: true });
    expect(new Set(t.map((x) => x.key)).size).toBe(4);
    expect(t[1]!.line).toContain("7");
    expect(t[1]!.line).toContain("los Pocapena");
    expect(t.filter((x) => x.king)).toHaveLength(1);
    expect(FUTURE_KING).toBe("Futuro Rey, según el cronista");
  });

  it("aunque dos casas no destaquen en nada, cada una lleva un título distinto", () => {
    const t = endTitles([zero(1), zero(2), zero(3)], null, "s", names);
    expect(new Set(t.map((x) => x.key)).size).toBe(3);
    expect(t.every((x) => x.line.length > 0 && !x.line.includes("{"))).toBe(true);
  });

  it("es determinista", () => {
    const s = [zero(1, { ruins: 2 }), zero(2, { defenses: 4 })];
    expect(endTitles(s, 2, "x", names)).toEqual(endTitles(s, 2, "x", names));
  });

  it("cada título tiene sus frases en el banco, con la casa y la cifra", () => {
    for (const t of TITLES) {
      const v = PHRASES[`titulo.${t.key}`] as readonly string[];
      expect(v.length).toBeGreaterThanOrEqual(2);
      for (const line of v) expect(line).toMatch(/\{n\}.*\{casa\}|\{casa\}.*\{n\}/);
    }
    expect(TITLES).toHaveLength(16);
  });

  it("cuenta conquistas, ríos, defensas y pérdidas de los combates", () => {
    const m = combatTitleStats([
      {
        winner: 1,
        previousOwner: 2,
        conquered: true,
        sides: [
          { house: 1, role: "ataque", river: true },
          { house: 2, role: "defensa" },
        ],
      },
      {
        winner: 2,
        previousOwner: 2,
        conquered: false,
        sides: [
          { house: 1, role: "ataque" },
          { house: 2, role: "defensa" },
        ],
      },
      {
        winner: 1,
        previousOwner: null,
        conquered: true,
        sides: [
          { house: 1, role: "ataque" },
          { house: null, role: "defensa" },
        ],
      },
    ]);
    expect(m.get(1)).toEqual({ conquests: 1, riverWins: 1, defenses: 0, tilesLost: 0 });
    expect(m.get(2)).toEqual({ conquests: 0, riverWins: 0, defenses: 1, tilesLost: 1 });
  });

  it("la remontada se cuenta desde el peor domingo", () => {
    const m = comebacks(
      [
        [1, 2, 3],
        [2, 1, 3],
        [1, 2, 3],
      ],
      [3, 1, 2],
    );
    expect(m.get(3)).toBe(2);
    expect(m.get(1)).toBe(0);
    expect(m.get(2)).toBe(0);
  });
});
