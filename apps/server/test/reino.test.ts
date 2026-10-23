import { describe, expect, it } from "vitest";
import { prestigeHistory } from "../src/reino";

const rows = [
  { house_id: 1, resolution_no: 6, total: 10 },
  { house_id: 2, resolution_no: 6, total: 12 },
  { house_id: 1, resolution_no: 7, total: 14 },
  { house_id: 2, resolution_no: 7, total: 13 },
  { house_id: 1, resolution_no: 8, total: 15 },
  { house_id: 2, resolution_no: 8, total: 16 },
];

describe("Historia del Prestigio para Reino", () => {
  it("da un punto por domingo y la foto de la noche anterior", () => {
    const h = prestigeHistory(rows, 7, 9, 28);
    expect(h.semanas).toEqual([{ semana: 1, totales: { 1: 14, 2: 13 } }]);
    expect(h.anterior).toEqual({ resolucion: 8, totales: { 1: 15, 2: 16 } });
    expect(h.final).toBeNull();
  });

  it("sin foto de la noche anterior (partidas de antes o la primera noche), no hay flechas", () => {
    expect(prestigeHistory(rows, 7, 1, 28).anterior).toBeNull();
    expect(prestigeHistory(rows, 7, 12, 28).anterior).toBeNull();
  });

  it("al acabar, la foto final va aparte", () => {
    const h = prestigeHistory([...rows, { house_id: 1, resolution_no: 15, total: 30 }], 7, 14, 14);
    expect(h.final).toEqual({ 1: 30 });
    expect(h.semanas.map((s) => s.semana)).toEqual([1]);
  });
});

describe("Relación entre casas para la ficha", () => {
  it("cuenta batallas ganadas y perdidas entre las dos y sus tratos", async () => {
    const { relations } = await import("../src/reino");
    const r = relations(
      1,
      [1, 2, 3],
      [
        { winner: 1, previousOwner: 2, sides: [{ house: 1 }] },
        { winner: 2, previousOwner: 1, sides: [{ house: 2 }, { house: 3 }] },
        { winner: 3, previousOwner: 2, sides: [{ house: 3 }] }, // no estaba la casa 1
        { winner: 3, previousOwner: null, sides: [{ house: 3 }, { house: 4, joint: [1] }] },
      ],
      [
        { house_a: 1, house_b: 2 },
        { house_a: 3, house_b: 1 },
        { house_a: 2, house_b: 3 },
      ],
    );
    expect(r.get(2)).toEqual({ ganadas: 1, perdidas: 1, tratos: 1 });
    expect(r.get(3)).toEqual({ ganadas: 0, perdidas: 1, tratos: 1 });
    expect(r.has(1)).toBe(false);
  });
});
