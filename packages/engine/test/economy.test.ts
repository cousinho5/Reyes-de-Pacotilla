import { describe, expect, it } from "vitest";
import { castleStage, computePrestige, dailyProduction, isValidTrade, pay, upgradeCost, weeklyUpkeep } from "../src";

const START = { granja: 2, aserradero: 2, cantera: 1, mina: 1, mercado: 1 } as const;

describe("Economía", () => {
  it("una casa empieza produciendo 14 recursos al día", () => {
    const p = dailyProduction({ ...START }, []);
    expect(Object.values(p).reduce((a, b) => a + b, 0)).toBe(14);
  });

  it("las casillas y la ayuda al último suman producción", () => {
    const p = dailyProduction({ ...START }, [{ type: "puerto" }, { type: "fortaleza" }], "hierro");
    expect(p.oro).toBe(2 + 2);
    expect(p.hierro).toBe(2 + 3);
  });

  it("el castillo crece en 5 etapas según la suma de niveles (bloque 2)", () => {
    expect(castleStage({ ...START })).toBe(1);
    expect(castleStage({ ...START, cantera: 2 })).toBe(1);
    expect(castleStage({ ...START, cantera: 3 })).toBe(2);
    expect(castleStage({ granja: 3, aserradero: 3, cantera: 3, mina: 1, mercado: 1 })).toBe(3);
    expect(castleStage({ granja: 3, aserradero: 3, cantera: 3, mina: 3, mercado: 2 })).toBe(4);
    expect(castleStage({ granja: 4, aserradero: 4, cantera: 3, mina: 3, mercado: 3 })).toBe(5);
    expect(castleStage({ granja: 5, aserradero: 5, cantera: 5, mina: 5, mercado: 5 })).toBe(5);
  });

  it("costes de mejora (más Madera que Piedra)", () => {
    expect(upgradeCost(1)).toEqual({ madera: 17, piedra: 12, oro: 5 });
    expect(upgradeCost(4)).toEqual({ madera: 69, piedra: 40, hierro: 30, oro: 30 });
    expect(upgradeCost(5)).toBeNull();
  });

  it("no se puede pagar lo que no se tiene", () => {
    const have = { pan: 0, madera: 10, piedra: 20, hierro: 0, oro: 0 };
    expect(() => pay(have, { madera: 12, piedra: 12 })).toThrow();
  });

  it("mantenimiento: 1 Pan cada 3 tropas y 2 Pan por casilla a partir de la quinta", () => {
    expect(weeklyUpkeep(9, 4)).toBe(3);
    expect(weeklyUpkeep(10, 6)).toBe(4 + 4);
  });
});

describe("Prestigio en vivo", () => {
  it("al empezar una casa tiene 2 de Prestigio (edificios)", () => {
    const p = computePrestige({ house: 1, tiles: [], buildings: { ...START }, gold: 0, tradePartners: 0, achievements: {} });
    expect(p.total).toBe(2);
  });

  it("suma territorio, riqueza, comercio, logros y objetivo con sus topes", () => {
    const p = computePrestige({
      house: 1,
      tiles: [
        { type: "castillo", owner: 1 },
        { type: "campos", owner: 1 },
        { type: "fortaleza", owner: 1 },
        { type: "bosque", owner: 2 },
      ],
      buildings: { granja: 5, aserradero: 3, cantera: 1, mina: 1, mercado: 1 },
      gold: 400,
      tradePartners: 5,
      achievements: { ganador_subasta: 4, obra_maestra: 1 },
      secretObjectiveMet: true,
    });
    expect(p).toMatchObject({
      territorio: 2 + 5,
      edificios: 4 + 2 + 1,
      riqueza: 10,
      comercio: 6,
      logros: 3 * 2 + 3,
      objetivo: 6,
    });
  });

  it("un trato vale para el Prestigio con al menos 10 por lado", () => {
    expect(isValidTrade(10, 12)).toBe(true);
    expect(isValidTrade(9, 50)).toBe(false);
  });
});
