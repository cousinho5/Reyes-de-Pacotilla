import { describe, expect, it } from "vitest";
import { MERCENARIES, applyUpkeep, dismissTroops, mercenariesAlive, mercenaryCost, type Tile } from "../src";

const tile = (id: number, extra: Partial<Tile>): Tile => ({ id, x: id, y: 0, type: "campos", owner: 1, troops: 0, fortifiedUntil: null, ...extra });

describe("Mercenarios de alquiler (bloque 5)", () => {
  it("cuestan 6 de Oro cada uno y se quedan 7 días", () => {
    expect(mercenaryCost(5)).toBe(30);
    expect(MERCENARIES.days).toBe(7);
  });

  it("al irse se quitan primero del castillo y luego de las casillas con más tropas", () => {
    const tiles = [
      tile(1, { type: "castillo", castleOf: 1, troops: 3 }),
      tile(2, { troops: 2 }),
      tile(3, { troops: 6 }),
      tile(4, { owner: 2, troops: 9 }),
    ];
    const out = dismissTroops(tiles, 1, 5);
    expect(out.removed).toBe(5);
    expect(out.tiles.map((t) => t.troops)).toEqual([0, 2, 4, 9]);
    expect(tiles[0]!.troops).toBe(3); // no cambia la entrada
  });

  it("se van como Mesnada: los jinetes se quedan mientras haya sitio", () => {
    const tiles = [tile(1, { type: "castillo", castleOf: 1, troops: 6, jinetes: 2 })];
    const out = dismissTroops(tiles, 1, 3);
    expect(out.tiles[0]).toMatchObject({ troops: 3, jinetes: 2 });
  });

  it("si la casa tiene menos tropas que mercenarios, murieron mercenarios (primero los que antes se van)", () => {
    expect(mercenariesAlive([3, 4], 10)).toEqual([3, 4]);
    expect(mercenariesAlive([3, 4], 5)).toEqual([1, 4]);
    expect(mercenariesAlive([3, 4], 0)).toEqual([0, 0]);
  });

  it("no comen: su Pan no cuenta en el mantenimiento", () => {
    const tiles = [tile(1, { type: "castillo", castleOf: 1, troops: 12 })];
    expect(applyUpkeep(tiles, 1, 50).cost).toBe(4);
    expect(applyUpkeep(tiles, 1, 50, 1, 6).cost).toBe(2);
    expect(applyUpkeep(tiles, 1, 50, 1, 20).cost).toBe(0);
  });
});
