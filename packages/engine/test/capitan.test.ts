import { describe, expect, it } from "vitest";
import { captainName, gloryFromEvents, resolveCampaign, type Captain, type Tile } from "../src";

// Fila hexagonal: (0,0) castillo de 1, (1,0) campos de 1, (2,0) campos de 2, (3,0) campos neutral; (0,1) castillo de 2.
const make = (over: Partial<Record<number, Partial<Tile>>> = {}): Tile[] =>
  [
    { id: 1, x: 0, y: 0, type: "castillo", owner: 1, castleOf: 1, troops: 2 },
    { id: 2, x: 1, y: 0, type: "campos", owner: 1, troops: 5 },
    { id: 3, x: 2, y: 0, type: "campos", owner: 2, troops: 4 },
    { id: 4, x: 3, y: 0, type: "campos", owner: null, troops: 6 },
    { id: 5, x: 0, y: 1, type: "castillo", owner: 2, castleOf: 2, troops: 2 },
  ].map((t) => ({ ...t, ...(over[t.id] ?? {}) })) as Tile[];
const caps = (a: Partial<Captain> = {}, b: Partial<Captain> = {}): Captain[] => [
  { house: 1, tile: 2, ...a },
  { house: 2, tile: 5, ...b },
];
const attack = (troops: number, captain = true) => ({ kind: "move" as const, house: 1, from: 2, to: 3, troops, captain });

describe("Capitán (diseño v3, fase 4)", () => {
  it("suma 2 de fuerza al grupo con el que va", () => {
    // 5 contra 4 x 1,25 = 5: empate, gana el defensor. Con el Capitán, 7 contra 5.
    const without = resolveCampaign({ resolution: 1, tiles: make(), orders: [attack(5, false)], captains: caps() });
    expect(without.tiles.find((t) => t.id === 3)!.owner).toBe(2);
    const withCap = resolveCampaign({ resolution: 1, tiles: make(), orders: [attack(5)], captains: caps() });
    expect(withCap.tiles.find((t) => t.id === 3)!.owner).toBe(1);
    expect(withCap.captains.find((c) => c.house === 1)!.tile).toBe(3);
  });

  it("si su ataque fracasa contra otra casa, cae preso hasta 7 resoluciones después", () => {
    const r = resolveCampaign({ resolution: 4, tiles: make({ 3: { troops: 9 } }), orders: [attack(5)], captains: caps() });
    expect(r.captains.find((c) => c.house === 1)).toEqual({ house: 1, tile: null, capturedBy: 2, freeAt: 11 });
    expect(r.events.some((e) => e.type === "capitan_preso" && e.by === 2)).toBe(true);
    // Al llegar la resolución 11, se escapa a su castillo.
    const free = resolveCampaign({ resolution: 11, tiles: make(), orders: [], captains: r.captains });
    expect(free.captains.find((c) => c.house === 1)).toMatchObject({ tile: 1, capturedBy: null });
  });

  it("contra una guarnición neutral no cae preso: vuelve a su castillo", () => {
    const r = resolveCampaign({ resolution: 1, tiles: make({ 3: { owner: null, troops: 9 } }), orders: [attack(5)], captains: caps() });
    expect(r.captains.find((c) => c.house === 1)).toMatchObject({ tile: 1 });
    expect(r.events.some((e) => e.type === "capitan_libre" && e.reason === "huida")).toBe(true);
  });

  it("defiende su casilla con +2 y, si la pierde, cae preso del vencedor", () => {
    const tiles = make({ 2: { troops: 2 }, 3: { troops: 8 } });
    const r = resolveCampaign({
      resolution: 1,
      tiles,
      orders: [{ kind: "move", house: 2, from: 3, to: 2, troops: 8 }],
      captains: caps({ tile: 2 }),
    });
    const fight = r.events.find((e) => e.type === "combate");
    // (2 + 2) x 1,25 = 5 de defensa.
    expect(fight?.type === "combate" && fight.sides.find((s) => s.role === "defensa")!.strength).toBe(5);
    expect(r.captains.find((c) => c.house === 1)).toMatchObject({ tile: null, capturedBy: 2 });
  });

  it("si no está en la casilla de salida, la orden sale sin él", () => {
    const r = resolveCampaign({ resolution: 1, tiles: make(), orders: [attack(5)], captains: caps({ tile: 1 }) });
    expect(r.tiles.find((t) => t.id === 3)!.owner).toBe(2);
    expect(r.captains.find((c) => c.house === 1)!.tile).toBe(1);
  });

  it("cada casa tiene un nombre de Capitán fijo", () => {
    expect(captainName("semilla", 3)).toBe(captainName("semilla", 3));
  });
});

describe("Gloria", () => {
  it("+1 por ganar a otra casa (atacando o defendiendo), nada contra neutrales, +1 por caer con honor", () => {
    const won = resolveCampaign({ resolution: 1, tiles: make(), orders: [attack(5)], captains: caps() });
    expect(gloryFromEvents(won.events).get(1)).toBe(1);
    const held = resolveCampaign({ resolution: 1, tiles: make(), orders: [attack(5, false)] });
    expect(gloryFromEvents(held.events).get(2)).toBe(1);
    // Honor: 4 x 1,25 = 5 contra 10 o más.
    const crushed = resolveCampaign({ resolution: 1, tiles: make({ 2: { troops: 12 } }), orders: [attack(10, false)] });
    expect(gloryFromEvents(crushed.events)).toEqual(new Map([[1, 1], [2, 1]]));
    const neutral = resolveCampaign({
      resolution: 1,
      tiles: make({ 3: { owner: null } }),
      orders: [attack(9, false)],
    });
    expect(gloryFromEvents(neutral.events).size).toBe(0);
  });
});
