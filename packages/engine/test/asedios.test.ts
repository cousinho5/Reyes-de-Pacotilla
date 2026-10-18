import { describe, expect, it } from "vitest";
import { checkOrders, computePrestige, dailyProduction, resolveCampaign, type Order, type Tile } from "../src";

// Fila hexagonal: (0,0) campos de 1, (1,0) fortaleza neutral, (2,0) campos de 1; debajo, (0,1) castillo de 2 y (1,1) campos de 1.
const base = (): Tile[] => [
  { id: 1, x: 0, y: 0, type: "campos", owner: 1, troops: 6 },
  { id: 2, x: 1, y: 0, type: "fortaleza", owner: null, troops: 8 },
  { id: 3, x: 2, y: 0, type: "campos", owner: 1, troops: 6 },
  { id: 4, x: 0, y: 1, type: "castillo", owner: 2, castleOf: 2, troops: 6 },
  { id: 5, x: 1, y: 1, type: "campos", owner: 1, troops: 6 },
];
const siege = (from: number, target: number, troops = 3): Order => ({ kind: "siege", house: 1, from, target, troops });
const levels = { granja: 2, aserradero: 2, cantera: 1, mina: 1, mercado: 1 };

describe("Asedios (diseño v3, fase 3b)", () => {
  it("cada noche de asedio la fortaleza pierde un 25% de murallas", () => {
    let tiles = base();
    tiles = resolveCampaign({ resolution: 1, tiles, orders: [siege(1, 2)] }).tiles;
    expect(tiles.find((t) => t.id === 2)).toMatchObject({ besiegedBy: 1, siegeNights: 1 });
    tiles = resolveCampaign({ resolution: 2, tiles, orders: [siege(1, 2)] }).tiles;
    expect(tiles.find((t) => t.id === 2)!.siegeNights).toBe(2);
    // Con dos noches, la fortaleza ya no tiene murallas: 8 x 1,25 = 10. 11 la toman.
    tiles = tiles.map((t) => (t.id === 3 ? { ...t, troops: 11 } : t));
    const r = resolveCampaign({ resolution: 3, tiles, orders: [siege(1, 2), { kind: "move", house: 1, from: 3, to: 2, troops: 11 }] });
    const fight = r.events.find((e) => e.type === "combate");
    expect(fight?.type === "combate" && fight.sides.find((s) => s.role === "defensa")!.strength).toBe(10);
    expect(r.tiles.find((t) => t.id === 2)).toMatchObject({ owner: 1, besiegedBy: null, siegeNights: 0 });
  });

  it("el asedio se rompe si atacan la casilla de quien sitia, y se levanta si nadie lo mantiene", () => {
    let tiles = resolveCampaign({ resolution: 1, tiles: base(), orders: [siege(1, 2)] }).tiles;
    tiles = tiles.map((t) => (t.id === 4 ? { ...t, troops: 1 } : t));
    const cut = resolveCampaign({
      resolution: 2,
      tiles,
      orders: [siege(1, 2), { kind: "move", house: 2, from: 4, to: 1, troops: 1 }],
    });
    expect(cut.events.some((e) => e.type === "asedio_roto" && e.reason === "cortado")).toBe(true);
    expect(cut.tiles.find((t) => t.id === 2)!.besiegedBy).toBeNull();
    const lifted = resolveCampaign({ resolution: 2, tiles, orders: [] });
    expect(lifted.events.some((e) => e.type === "asedio_roto" && e.reason === "levantado")).toBe(true);
  });

  it("un castillo hay que rodearlo desde dos casillas; entonces sus edificios producen la mitad", () => {
    const one = resolveCampaign({ resolution: 1, tiles: base(), orders: [siege(1, 4)] });
    expect(one.tiles.find((t) => t.id === 4)!.besiegedBy ?? null).toBeNull();
    const two = resolveCampaign({ resolution: 1, tiles: base(), orders: [siege(1, 4), siege(5, 4)] });
    const castle = two.tiles.find((t) => t.id === 4)!;
    expect(castle).toMatchObject({ besiegedBy: 1, siegeNights: 1 });
    expect(two.events.find((e) => e.type === "asedio")).toMatchObject({ castle: true, from: [1, 5] });
    expect(dailyProduction(levels, [castle]).pan).toBe(2);
    expect(dailyProduction(levels, [{ ...castle, besiegedBy: null }]).pan).toBe(4);
  });

  it("solo se sitian fortalezas y castillos ajenos, con al menos 3 tropas", () => {
    const tiles = base().map((t) => (t.id === 4 ? { ...t, type: "campos" as const, castleOf: null, fortifiedUntil: 5 } : t));
    expect(checkOrders(tiles, [siege(1, 4)], 1).invalid[0]!.reason).toContain("solo se sitian castillos y fortalezas");
    expect(checkOrders(base(), [siege(1, 2, 2)]).invalid[0]!.reason).toContain("al menos 3");
    expect(checkOrders(base(), [siege(3, 5)]).invalid[0]!.reason).toContain("propia");
  });

  it("cada noche rodeando un castillo ajeno da 1 de Prestigio, hasta 10", () => {
    const p = (n: number) => computePrestige({ house: 1, tiles: [], buildings: levels, gold: 0, tradePartners: 0, achievements: {}, siegeNights: n });
    expect(p(3).asedios).toBe(3);
    expect(p(30).asedios).toBe(10);
  });
});
