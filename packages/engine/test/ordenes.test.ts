// Bloque 12: la cuenta de la defensa y «¿Y si atacan?».
import { describe, expect, it } from "vitest";
import { defenseBreakdown, defenseMultiplier, worstAttacks, type Tile } from "../src";

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

describe("La ventaja del defensor por partes", () => {
  it("suma lo mismo que el multiplicador del combate", () => {
    const tile: Tile = { id: 9, x: 0, y: 0, type: "bosque", owner: 2, troops: 3, fortifiedUntil: 5 };
    const { parts, multiplier } = defenseBreakdown(tile, 4);
    expect(parts.map((p) => p.kind)).toEqual(["defensor", "fortificada", "terreno"]);
    expect(1 + parts.reduce((a, p) => a + p.bonus, 0)).toBeCloseTo(defenseMultiplier(tile, 4, false));
    expect(multiplier).toBeCloseTo(defenseMultiplier(tile, 4, false));
  });

  it("en llano solo cuenta la del defensor; el río suma la suya", () => {
    const tile: Tile = { id: 9, x: 0, y: 0, type: "campos", owner: null, troops: 3 };
    expect(defenseBreakdown(tile, 1).parts).toEqual([{ kind: "defensor", bonus: 0.25 }]);
    expect(defenseBreakdown(tile, 1, false, true).parts.map((p) => p.kind)).toEqual(["defensor", "rio"]);
  });
});

describe("¿Y si atacan?", () => {
  it("dice qué casilla perderías si una casa a la vista ataca con todo", () => {
    // 4 de la casa 2 contra 5 tuyas con +25%: aguantas.
    expect(worstAttacks(make(), 1, [], 1)).toEqual([]);
    // Con 9 no.
    expect(worstAttacks(make({ 3: { troops: 9 } }), 1, [], 1)).toEqual([{ tile: 2, by: [2], troops: 9 }]);
  });

  it("cuenta el hueco que dejan tus órdenes", () => {
    const orders = [{ kind: "move" as const, house: 1, from: 2, to: 1, troops: 4 }];
    expect(worstAttacks(make(), 1, orders, 1)).toEqual([{ tile: 2, by: [2], troops: 4 }]);
  });

  it("no usa lo que no se ve ni a los aliados", () => {
    const hidden = make({ 3: { troops: 9 } }).map((t) => (t.id === 3 ? { ...t, troops: null } : t));
    expect(worstAttacks(hidden, 1, [], 1)).toEqual([]);
    const ally = [{ a: 1, b: 2, status: "active" as const, endsAt: null, since: 0 }];
    expect(worstAttacks(make({ 3: { troops: 9 } }), 1, [], 1, ally)).toEqual([]);
  });

  it("no toca la entrada", () => {
    const tiles = make({ 3: { troops: 9 } });
    const copy = JSON.stringify(tiles);
    worstAttacks(tiles, 1, [], 1);
    expect(JSON.stringify(tiles)).toBe(copy);
  });
});
