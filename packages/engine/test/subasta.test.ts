import { describe, expect, it } from "vitest";
import {
  CARD_KEYS,
  auctionLots,
  checkCard,
  lotLabel,
  resolveAuction,
  resolveCampaign,
  visibleTileIds,
  type CardContext,
  type Tile,
} from "../src";

const tile = (id: number, x: number, y: number, extra: Partial<Tile>): Tile => ({
  id,
  x,
  y,
  type: "campos",
  owner: null,
  troops: 4,
  fortifiedUntil: null,
  ...extra,
});

describe("Gran Subasta", () => {
  it("tres lotes reproducibles: recursos, carta y un tercero de cualquiera de los dos", () => {
    const a = auctionLots("semilla", 1);
    expect(auctionLots("semilla", 1)).toEqual(a);
    expect(a.map((l) => l.slot)).toEqual([1, 2, 3]);
    expect(a[0]!.kind).toBe("resources");
    expect(a[1]!.kind).toBe("card");
    expect(auctionLots("semilla", 2)).not.toEqual(a);
    expect(lotLabel({ slot: 1, kind: "resources", resources: { hierro: 20, oro: 20 } })).toBe("20 de Hierro y 20 de Oro");
    expect(lotLabel({ slot: 2, kind: "card", card: "espia" })).toBe("la carta Espía");
  });

  it("gana la puja más alta; en empate, la más temprana", () => {
    const lots = [{ slot: 1, kind: "card" as const, card: "espia" as const }];
    const gold = new Map([
      [1, 50],
      [2, 50],
      [3, 50],
    ]);
    const r = resolveAuction(
      lots,
      [
        { slot: 1, house: 1, amount: 10, placedAt: "2026-10-20T10:00:00Z" },
        { slot: 1, house: 2, amount: 12, placedAt: "2026-10-20T12:00:00Z" },
        { slot: 1, house: 3, amount: 12, placedAt: "2026-10-20T11:00:00Z" },
      ],
      gold,
    );
    expect(r).toEqual([{ slot: 1, winner: 3, price: 12 }]);
  });

  it("quien ya no puede pagar pierde el lote, que va a la siguiente puja", () => {
    const lots = auctionLots("x", 1);
    const r = resolveAuction(
      lots,
      [
        { slot: 1, house: 1, amount: 30, placedAt: "a" },
        { slot: 2, house: 1, amount: 30, placedAt: "a" },
        { slot: 2, house: 2, amount: 5, placedAt: "b" },
      ],
      new Map([
        [1, 40],
        [2, 10],
      ]),
    );
    expect(r[0]).toEqual({ slot: 1, winner: 1, price: 30 });
    expect(r[1]).toEqual({ slot: 2, winner: 2, price: 5 }); // a la casa 1 solo le quedan 10
    expect(r[2]).toEqual({ slot: 3, winner: null, price: 0 });
  });
});

describe("Cartas de la Corona", () => {
  const tiles = [
    tile(1, 0, 0, { type: "castillo", owner: 1, castleOf: 1, troops: 6 }),
    tile(2, 1, 0, { owner: 1, troops: 3 }),
    tile(3, 2, 0, { owner: 1, troops: 3, type: "bosque" }),
    tile(4, 3, 0, { owner: 2, troops: 5 }),
  ];
  const ctx: CardContext = {
    house: 1,
    tiles,
    buildings: { granja: 2, aserradero: 4, cantera: 1, mina: 1, mercado: 1 },
    resources: { pan: 30, madera: 30, piedra: 5, hierro: 10, oro: 10 },
    houses: [1, 2],
    nextResolution: 3,
  };

  it("hay 8 cartas y cada una valida sus parámetros", () => {
    expect(CARD_KEYS).toHaveLength(8);
    expect(checkCard("espia", { casa: 1 }, ctx).ok).toBe(false);
    expect(checkCard("espia", { casa: 2 }, ctx)).toEqual({ ok: true, effect: { spy: { house: 2, until: 3 } } });
    expect(checkCard("muralla", { casilla: 4 }, ctx).ok).toBe(false);
    expect(checkCard("muralla", { casilla: 2 }, ctx)).toEqual({ ok: true, effect: { fortify: { tile: 2, until: 4 } } });
    expect(checkCard("mercenarios", {}, ctx)).toEqual({ ok: true, effect: { castleTroops: 5 } });
    expect(checkCard("carreta", { da: "piedra", recibe: "oro" }, ctx).ok).toBe(false); // solo 5 de Piedra
    expect(checkCard("carreta", { da: "pan", recibe: "hierro" }, ctx)).toEqual({
      ok: true,
      effect: { resources: { pan: -20, hierro: 20 } },
    });
    expect(checkCard("maestro_obras", { edificio: "aserradero" }, ctx).ok).toBe(false); // ya en nivel 4
    expect(checkCard("maestro_obras", { edificio: "granja" }, ctx)).toEqual({ ok: true, effect: { upgrade: "granja" } });
    expect(checkCard("diezmo", {}, ctx)).toEqual({ ok: true, effect: { resources: { oro: 6 } } });
    expect(checkCard("tregua", { casilla: 1 }, ctx).ok).toBe(false); // castillo
    expect(checkCard("tregua", { casilla: 3 }, ctx)).toEqual({ ok: true, effect: { truce: { tile: 3, resolution: 3 } } });
    expect(checkCard("tambores", {}, ctx)).toEqual({ ok: true, effect: { drums: { resolution: 3, bonus: 0.25 } } });
  });

  it("Tregua: el ataque no sale y las tropas se quedan donde estaban", () => {
    const r = resolveCampaign({
      resolution: 3,
      tiles,
      orders: [{ kind: "move", house: 2, from: 4, to: 3, troops: 5 }],
      truceTiles: [3],
    });
    expect(r.tiles.find((t) => t.id === 3)).toMatchObject({ owner: 1, troops: 3 });
    expect(r.tiles.find((t) => t.id === 4)).toMatchObject({ owner: 2, troops: 5 });
    expect(r.events).toContainEqual({ type: "tregua", tile: 3, houses: [2] });
  });

  it("Tambores: +25% de fuerza convierte una derrota en victoria", () => {
    // 5 atacantes contra 4 defensores x 1,25 = 5: empate y gana el defensor. Con tambores, 6,25 contra 5.
    const orders = [{ kind: "move" as const, house: 2, from: 4, to: 3, troops: 5 }];
    const base = tiles.map((t) => (t.id === 3 ? { ...t, troops: 4 } : t));
    expect(resolveCampaign({ resolution: 3, tiles: base, orders }).tiles.find((t) => t.id === 3)!.owner).toBe(1);
    const won = resolveCampaign({ resolution: 3, tiles: base, orders, attackBonus: { 2: 0.25 } });
    expect(won.tiles.find((t) => t.id === 3)!.owner).toBe(2);
  });

  it("Espía: se ven todas las casillas de la casa vigilada", () => {
    const far = [...tiles, tile(9, 9, 9, { owner: 2, troops: 20 })];
    expect(visibleTileIds(far, 1).has(9)).toBe(false);
    expect(visibleTileIds(far, 1, [2]).has(9)).toBe(true);
  });
});
