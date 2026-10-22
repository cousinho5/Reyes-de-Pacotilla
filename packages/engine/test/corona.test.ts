import { describe, expect, it } from "vitest";
import { CROWN, PERSONALITIES, crownAffordable, crownPrices, crownQuote, crownUnitPrice, planCrown, situation, writeBulletin, type AiView, type BulletinInput, type Resources } from "../src";

// Reino equilibrado: la media de los cuatro recursos es 100 y el Hierro escasea.
const realm: Resources = { pan: 130, madera: 130, piedra: 130, hierro: 10, oro: 300 };
const none: Resources = { pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 0 };

describe("Cambio con la Corona (bloque 5)", () => {
  it("el precio sale de la escasez en el reino, con el 30% de la Corona", () => {
    // Pan: raíz((100 + 10) / (130 + 10)) × 2 × 1,3
    expect(crownUnitPrice(realm, "pan", 0)).toBeCloseTo(Math.sqrt(110 / 140) * 2 * 1.3, 6);
    // Hierro: raíz((100 + 10) / (10 + 10)) × 2 × 1,3
    expect(crownUnitPrice(realm, "hierro", 0)).toBeCloseTo(Math.sqrt(110 / 20) * 2 * 1.3, 6);
    expect(crownPrices(realm, none).hierro).toBeGreaterThan(crownPrices(realm, none).pan);
    expect(crownPrices(realm, none).oro).toBe(1);
  });

  it("cada unidad comprada en los últimos días encarece la siguiente un 1%", () => {
    expect(crownUnitPrice(realm, "pan", 10)).toBeCloseTo(crownUnitPrice(realm, "pan", 0) * 1.1, 6);
  });

  it("el precio no sube de 10 antes del 30%", () => {
    expect(crownUnitPrice({ ...realm, hierro: 0 }, "hierro", 5000)).toBeCloseTo(CROWN.max * CROWN.markup, 6);
  });

  it("una compra grande paga cada unidad al precio que deja la anterior, con el total redondeado hacia arriba", () => {
    let sum = 0;
    for (let i = 0; i < 20; i++) sum += crownUnitPrice(realm, "hierro", 5 + i);
    expect(crownQuote(realm, "hierro", 5, 20)).toBe(Math.ceil(sum));
    expect(crownQuote(realm, "hierro", 5, 20)).toBeGreaterThan(Math.ceil(20 * crownUnitPrice(realm, "hierro", 5)));
    expect(crownQuote(realm, "hierro", 0, 0)).toBe(0);
  });

  it("dice cuántas unidades llegan con el Oro que hay", () => {
    const n = crownAffordable(realm, "pan", 0, 50);
    expect(crownQuote(realm, "pan", 0, n)).toBeLessThanOrEqual(50);
    expect(crownQuote(realm, "pan", 0, n + 1)).toBeGreaterThan(50);
  });

  it("es pura: no cambia lo que recibe", () => {
    const copy = { ...realm };
    crownQuote(realm, "pan", 3, 10);
    expect(realm).toEqual(copy);
  });

  it("el bot compra lo que le falta sin pasarse de su Oro", () => {
    const view: AiView = {
      house: 1,
      tiles: [{ id: 1, x: 0, y: 0, type: "castillo", owner: 1, castleOf: 1, troops: 6, fortifiedUntil: null }],
      buildings: { granja: 2, aserradero: 2, cantera: 1, mina: 1, mercado: 1 },
      resources: { pan: 30, madera: 30, piedra: 30, hierro: 0, oro: 40 },
      nextResolution: 1,
      day: 2,
      totalDays: 42,
      objective: null,
      prestige: [{ house: 1, total: 5 }],
      recentPartners: [],
    };
    const plan = planCrown(situation(view, PERSONALITIES.estratega), { ...realm, hierro: 300 }, none);
    expect(plan.gold).toBeLessThanOrEqual(40);
    expect(plan.units.oro).toBe(0);
    const paid = (["pan", "madera", "piedra", "hierro"] as const).reduce((a, r) => a + crownQuote({ ...realm, hierro: 300 }, r, 0, plan.units[r]), 0);
    expect(plan.gold).toBe(paid);
  });

  it("el boletín cuenta lo que más vendió la Corona, sin decir a quién", () => {
    const input: BulletinInput = {
      seed: "s",
      week: 2,
      totalWeeks: 6,
      houses: [{ id: 1, name: "Casa Uno", motto: "", color: "rojo", symbol: "leon", metal: "oro", division: "plain", color2: null, prestige: 5 }] as BulletinInput["houses"],
      previousLeader: 1,
      facts: [],
      tileNames: new Map(),
      trades: [],
      crown: { pan: 4, hierro: 12 },
      bribes: [],
      used: [],
    };
    const text = writeBulletin(input).sections.flatMap((s) => s.lines).join(" ");
    expect(text).toContain("12 de Hierro");
    expect(text).not.toContain("Casa Uno compra");
  });
});
