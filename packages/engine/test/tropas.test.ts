import { describe, expect, it } from "vitest";
import { applyUpkeep, checkOrders, checkRecruit, keepUnits, resolveCampaign, retreatUnits, type Tile, type TileType } from "../src";

// Fila hexagonal de 4 casillas y otra debajo: (0,0) castillo, (1,0) campos, (2,0) X, (3,0) campos.
const make = (mid: TileType, extra: Partial<Tile> = {}, row2: TileType = "campos"): Tile[] => [
  { id: 1, x: 0, y: 0, type: "castillo", owner: 1, castleOf: 1, troops: 0 },
  { id: 2, x: 1, y: 0, type: "campos", owner: 1, troops: 10, jinetes: 4, catapultas: 2 },
  { id: 3, x: 2, y: 0, type: mid, owner: 2, troops: 6, ...extra },
  { id: 4, x: 3, y: 0, type: "campos", owner: null, troops: 2 },
  { id: 5, x: 0, y: 1, type: row2, owner: null, troops: 0 },
];
const rich = { pan: 100, madera: 100, piedra: 100, hierro: 100, oro: 100 };

describe("Tipos de tropa (diseño v3, fase 3)", () => {
  it("los jinetes cargan con fuerza 2 contra lo llano sin murallas", () => {
    // 4 jinetes = fuerza 8 contra 6 x 1,25 = 7,5: ganan.
    const r = resolveCampaign({ resolution: 1, tiles: make("campos"), orders: [{ kind: "move", house: 1, from: 2, to: 3, troops: 4, jinetes: 4 }] });
    expect(r.tiles.find((t) => t.id === 3)).toMatchObject({ owner: 1, jinetes: 1 });
    // La misma carga contra una casilla fortificada: fuerza 4, pierde.
    const walled = resolveCampaign({
      resolution: 1,
      tiles: make("campos", { fortifiedUntil: 3 }),
      orders: [{ kind: "move", house: 1, from: 2, to: 3, troops: 4, jinetes: 4 }],
    });
    expect(walled.tiles.find((t) => t.id === 3)!.owner).toBe(2);
  });

  it("en el bosque los jinetes valen la mitad", () => {
    // 4 jinetes = fuerza 2 contra 6 x 1,5: nada que hacer; 4 de Mesnada tampoco, pero el desastre es mayor.
    const r = resolveCampaign({ resolution: 1, tiles: make("bosque"), orders: [{ kind: "move", house: 1, from: 2, to: 3, troops: 4, jinetes: 4 }] });
    const fight = r.events.find((e) => e.type === "combate")!;
    expect(fight.type === "combate" && fight.sides.find((s) => s.role === "ataque")!.strength).toBe(2);
  });

  it("las catapultas quitan un 25% de muralla cada una y se pierden si el ataque fracasa", () => {
    // Fortaleza con 6: 6 x 1,75 = 10,5. Con 2 catapultas: 6 x 1,25 = 7,5, y 6 de Mesnada... no llegan;
    // con 8 de Mesnada y 2 catapultas sí.
    const tiles = make("fortaleza");
    tiles[1] = { ...tiles[1]!, troops: 14, jinetes: 4, catapultas: 2 };
    const ok = resolveCampaign({ resolution: 1, tiles, orders: [{ kind: "move", house: 1, from: 2, to: 3, troops: 10, catapultas: 2 }] });
    expect(ok.tiles.find((t) => t.id === 3)!.owner).toBe(1);
    const sin = resolveCampaign({ resolution: 1, tiles, orders: [{ kind: "move", house: 1, from: 2, to: 3, troops: 8 }] });
    expect(sin.tiles.find((t) => t.id === 3)!.owner).toBe(2);
    // Ataque fallido con catapultas: vuelven la mitad de los demás y ninguna catapulta.
    const bad = resolveCampaign({ resolution: 1, tiles, orders: [{ kind: "move", house: 1, from: 2, to: 3, troops: 4, catapultas: 2 }] });
    const back = bad.tiles.find((t) => t.id === 2)!;
    expect(back.troops).toBe(10 + 1);
    expect(back.catapultas ?? 0).toBe(0);
  });

  it("jinetes y catapultas no suben a la montaña; un grupo solo de jinetes cruza dos casillas llanas", () => {
    const tiles = make("montana");
    expect(checkOrders(tiles, [{ kind: "move", house: 1, from: 2, to: 3, troops: 1, jinetes: 1 }]).invalid).toHaveLength(1);
    expect(checkOrders(tiles, [{ kind: "move", house: 1, from: 2, to: 3, troops: 1 }]).valid).toHaveLength(1);
    // Carga: de (1,0) a (3,0) pasando por (2,0) propia y llana.
    const plain: Tile[] = make("campos").map((t) => (t.id === 3 ? { ...t, owner: 1 } : t));
    expect(checkOrders(plain, [{ kind: "move", house: 1, from: 2, to: 4, troops: 3, jinetes: 3 }]).valid).toHaveLength(1);
    expect(checkOrders(plain, [{ kind: "move", house: 1, from: 2, to: 4, troops: 3, jinetes: 2 }]).invalid).toHaveLength(1);
  });

  it("no se pueden mandar más jinetes o catapultas de los que hay", () => {
    const tiles = make("campos");
    const { valid, invalid } = checkOrders(tiles, [
      { kind: "move", house: 1, from: 2, to: 3, troops: 3, jinetes: 3 },
      { kind: "support", house: 1, from: 2, target: 3, supportedFrom: null, troops: 2, jinetes: 2 },
    ]);
    expect(valid).toHaveLength(1);
    expect(invalid[0]!.reason).toContain("no hay tropas suficientes");
  });

  it("reparto de bajas y repliegue", () => {
    expect(keepUnits({ mesnada: 6, jinetes: 3, catapultas: 1 }, 5)).toEqual({ mesnada: 4, jinetes: 1, catapultas: 0 });
    expect(retreatUnits({ mesnada: 5, jinetes: 3, catapultas: 2 })).toEqual({ mesnada: 3, jinetes: 1, catapultas: 0 });
  });

  it("reclutar: jinetes con Oro, catapultas con Madera; las catapultas comen doble", () => {
    expect(checkRecruit(2, rich, "jinetes")).toEqual({ ok: true, value: { cost: { hierro: 6, pan: 4, oro: 2 } } });
    expect(checkRecruit(1, rich, "catapultas")).toEqual({ ok: true, value: { cost: { madera: 4, hierro: 2 } } });
    // 10 tropas con 2 catapultas cuentan como 12: 4 de Pan (más 0 por estirarse).
    expect(applyUpkeep(make("campos"), 1, 100).cost).toBe(4);
  });
});
