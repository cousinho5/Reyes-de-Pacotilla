import { describe, expect, it } from "vitest";
import { bannersSeen, battleLine, fitOrders, planNights, resolveCampaign, threats, type Tile } from "../src";

// Fila hexagonal: (0,0) castillo de 1, (1,0) campos de 1, (2,0) campos de 2, (3,0) campos neutral, (4,0) bosque de 2.
const make = (over: Partial<Record<number, Partial<Tile>>> = {}): Tile[] =>
  [
    { id: 1, x: 0, y: 0, type: "castillo", owner: 1, castleOf: 1, troops: 2 },
    { id: 2, x: 1, y: 0, type: "campos", owner: 1, troops: 5 },
    { id: 3, x: 2, y: 0, type: "campos", owner: 2, troops: 4 },
    { id: 4, x: 3, y: 0, type: "campos", owner: null, troops: 3 },
    { id: 5, x: 4, y: 0, type: "bosque", owner: 2, troops: 2 },
    { id: 6, x: 0, y: 2, type: "castillo", owner: 2, castleOf: 2, troops: 2 },
  ].map((t) => ({ ...t, ...(over[t.id] ?? {}) })) as Tile[];

describe("Amenazas (borde rojo)", () => {
  it("marca las casillas propias que un enemigo a la vista puede atacar, nunca el castillo", () => {
    expect(threats(make(), 1)).toEqual([{ tile: 2, by: [2] }]);
    // Si no se ven sus tropas (null) o no tiene, no amenaza.
    expect(threats(make({ 3: { troops: 0 } }), 1)).toEqual([]);
    expect(threats(make().map((t) => (t.id === 3 ? { ...t, troops: null } : t)), 1)).toEqual([]);
  });

  it("a la montaña solo amenaza la Mesnada", () => {
    const tiles = make({ 2: { type: "montana" }, 3: { troops: 2, jinetes: 2 } });
    expect(threats(tiles, 1)).toEqual([]);
    expect(threats(make({ 2: { type: "montana" }, 3: { troops: 3, jinetes: 2 } }), 1)).toEqual([{ tile: 2, by: [2] }]);
  });
});

describe("Estandartes a la vista", () => {
  it("avisa de un grupo ajeno que entra junto a tus tierras, con las tropas que se ven", () => {
    const r = resolveCampaign({ resolution: 1, tiles: make(), orders: [{ kind: "move", house: 2, from: 5, to: 4, troops: 2 }] });
    // Entra en la neutral (4)? No: 2 contra 3 de guarnición, fracasa. Con 5 tropas sí.
    expect(bannersSeen(r.tiles, r.events, 1)).toEqual([]);
    const tiles = make({ 5: { troops: 6 } });
    const won = resolveCampaign({ resolution: 1, tiles, orders: [{ kind: "move", house: 2, from: 5, to: 4, troops: 6 }] });
    // La casilla 4 no es vecina de las de la casa 1 (está a dos pasos): nada.
    expect(bannersSeen(won.tiles, won.events, 1)).toEqual([]);
    // Pero si la casa 1 tiene la casilla 3, sí.
    const near = make({ 3: { owner: 1 }, 5: { troops: 6 } });
    const r2 = resolveCampaign({ resolution: 1, tiles: near, orders: [{ kind: "move", house: 2, from: 5, to: 4, troops: 6 }] });
    expect(bannersSeen(r2.tiles, r2.events, 1)).toEqual([{ house: 2, tile: 4, troops: expect.any(Number), near: 3 }]);
  });

  it("en un bosque ajeno no se ve quién hay: no hay aviso", () => {
    const tiles = make({ 3: { owner: 1 }, 4: { type: "bosque", owner: 2, troops: 1 }, 5: { troops: 6 } });
    const r = resolveCampaign({ resolution: 1, tiles, orders: [{ kind: "move", house: 2, from: 5, to: 4, troops: 6 }] });
    expect(r.events.some((e) => e.type === "movimiento" && e.to === 4)).toBe(true);
    expect(bannersSeen(r.tiles, r.events, 1)).toEqual([]);
  });
});

describe("Órdenes en cola", () => {
  it("una orden se ajusta a las tropas que queden, por tipos", () => {
    const tiles = make({ 2: { troops: 4, jinetes: 1 } });
    const fitted = fitOrders(tiles, [
      { kind: "move", house: 1, from: 2, to: 3, troops: 3 },
      { kind: "move", house: 1, from: 2, to: 4, troops: 5, jinetes: 2 },
    ]);
    expect(fitted[0]).toMatchObject({ troops: 3 });
    expect(fitted[1]).toMatchObject({ troops: 1, jinetes: 1 });
    // Si no queda nada, la orden no cambia (y el motor la da por no válida).
    const none = fitOrders(make({ 2: { troops: 0 } }), [{ kind: "move", house: 1, from: 2, to: 3, troops: 2 }]);
    expect(none[0]).toMatchObject({ troops: 2 });
  });

  it("planNights encadena noches: lo que conquistas hoy sirve de salida mañana", () => {
    const tiles = make({ 2: { troops: 9 }, 3: { troops: 1 } });
    const plan = planNights(
      tiles,
      [
        [{ kind: "move", house: 1, from: 2, to: 3, troops: 9 }],
        [{ kind: "move", house: 1, from: 3, to: 4, troops: 20 }],
      ],
      1,
      1,
      5,
    );
    expect(plan.map((p) => p.resolution)).toEqual([5, 6]);
    expect(plan[0]!.tiles.find((t) => t.id === 3)!.owner).toBe(1);
    // La segunda noche sale con lo que quedó (no con 20) y toma la neutral.
    expect(plan[1]!.tiles.find((t) => t.id === 4)!.owner).toBe(1);
    expect(plan[1]!.events.some((e) => e.type === "orden_invalida")).toBe(false);
    expect(plan[1]!.captainTile).toBe(1);
  });

  it("las tropas que no se ven cuentan como cero", () => {
    const seen = make().map((t) => (t.id === 3 ? { ...t, troops: null } : t));
    const plan = planNights(seen, [[{ kind: "move", house: 1, from: 2, to: 3, troops: 1 }]], 1, null, 1);
    expect(plan[0]!.tiles.find((t) => t.id === 3)!.owner).toBe(1);
  });
});

describe("Línea de Fray Abundio para la repetición", () => {
  it("rellena con las cifras exactas y siempre dice lo mismo para la misma batalla", () => {
    const r = resolveCampaign({ resolution: 1, tiles: make({ 2: { troops: 9 } }), orders: [{ kind: "move", house: 1, from: 2, to: 3, troops: 9 }] });
    const fight = r.events.find((e) => e.type === "combate")!;
    expect(fight.type === "combate" && fight.sides.find((s) => s.role === "ataque")!.from).toEqual([2]);
    const names = (id: number) => (id === 1 ? "Casa del Nabo" : "Casa de la Col");
    const a = battleLine(fight as never, names, "el Prado", "p1:1:7");
    expect(a).toBe(battleLine(fight as never, names, "el Prado", "p1:1:7"));
    expect(a).toMatch(/9/);
    expect(a).toMatch(/4/);
    expect(a).not.toMatch(/\{/);
  });
});
