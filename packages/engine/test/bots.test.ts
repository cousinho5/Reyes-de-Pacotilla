import { describe, expect, it } from "vitest";
import { botAcceptsOffer, checkOrders, planBotOrders, resolveCampaign, type Tile } from "../src";

const tile = (id: number, x: number, y: number, extra: Partial<Tile>): Tile => ({
  id,
  x,
  y,
  type: "campos",
  owner: null,
  troops: 4,
  ...extra,
});

describe("Bots de las partidas de prueba", () => {
  it("atacan la casilla vecina que pueden ganar, dejando guarnición en el castillo", () => {
    const tiles = [
      tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 9 }),
      tile(2, 1, 0, { type: "campos", troops: 4 }), // defensa 5: hacen falta 7 con margen
      tile(3, 0, 1, { type: "fortaleza", troops: 10 }), // defensa 17,5: demasiado
    ];
    const orders = planBotOrders({ house: 1, tiles, resolution: 1 });
    expect(orders).toEqual([{ kind: "move", house: 1, from: 1, to: 2, troops: 7 }]);
    expect(checkOrders(tiles, orders).invalid).toEqual([]);
    const result = resolveCampaign({ resolution: 1, tiles, orders });
    expect(result.tiles.find((t) => t.id === 2)!.owner).toBe(1);
  });

  it("prefieren casillas valiosas y no atacan castillos ni sin fuerza", () => {
    const tiles = [
      tile(1, 1, 1, { type: "castillo", owner: 1, castleOf: 1, troops: 20 }),
      tile(2, 2, 1, { type: "campos", troops: 4 }),
      tile(3, 1, 2, { type: "puerto", troops: 8 }),
      tile(4, 0, 1, { type: "castillo", owner: 2, castleOf: 2, troops: 1 }),
    ];
    expect(planBotOrders({ house: 1, tiles, resolution: 1 })[0]!.to).toBe(3);
    const weak = tiles.map((t) => (t.id === 1 ? { ...t, troops: 6 } : t));
    expect(planBotOrders({ house: 1, tiles: weak, resolution: 1 })).toEqual([]);
  });

  it("son deterministas y no modifican la entrada", () => {
    const tiles = [tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 12 }), tile(2, 1, 0, {})];
    const copy = JSON.parse(JSON.stringify(tiles)) as typeof tiles;
    expect(planBotOrders({ house: 1, tiles, resolution: 2 })).toEqual(planBotOrders({ house: 1, tiles, resolution: 2 }));
    expect(tiles).toEqual(copy);
  });

  it("aceptan tratos que no les hacen perder y que pueden pagar", () => {
    const res = { pan: 10, madera: 10, piedra: 10, hierro: 10, oro: 10 };
    expect(botAcceptsOffer({ pan: 6 }, { hierro: 5 }, res)).toBe(true);
    expect(botAcceptsOffer({ pan: 4 }, { hierro: 5 }, res)).toBe(false);
    expect(botAcceptsOffer({ pan: 30 }, { hierro: 20 }, res)).toBe(false);
  });
});
