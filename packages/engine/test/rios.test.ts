import { afterEach, describe, expect, it } from "vitest";
import {
  GRID,
  RIVERS,
  areAdjacent,
  bridgeBetween,
  generateMap,
  marchKind,
  neighbourCoords,
  resolveCampaign,
  riverBetween,
  roadEdges,
  sideTowards,
  wastelandSplit,
  mapLayout,
  type Tile,
  type TileType,
} from "../src";

const ORIGINAL = GRID.kind;
afterEach(() => {
  GRID.kind = ORIGINAL;
});

// Mapa hexagonal de 5x3 ("odd-r"), el mismo de las pruebas de terreno.
const layout: TileType[][] = [
  ["castillo", "campos", "campos", "fortaleza", "puerto"],
  ["bosque", "campos", "montana", "campos", "campos"],
  ["puerto", "campos", "cantera", "campos", "castillo"],
];
const make = (owners: Record<string, number> = {}, troops: Record<string, number> = {}): Tile[] =>
  layout.flatMap((row, y) =>
    row.map((type, x) => ({
      id: y * 5 + x + 1,
      x,
      y,
      type,
      owner: type === "castillo" ? (x === 0 ? 1 : 2) : (owners[`${x},${y}`] ?? null),
      castleOf: type === "castillo" ? (x === 0 ? 1 : 2) : null,
      troops: troops[`${x},${y}`] ?? 4,
      fortifiedUntil: null,
    })),
  );
const at = (tiles: Tile[], x: number, y: number) => tiles.find((t) => t.x === x && t.y === y)!;
/** Pone un río entre dos casillas vecinas (en las dos). */
function river(tiles: Tile[], a: Tile, b: Tile): Tile[] {
  return tiles.map((t) =>
    t.id === a.id
      ? { ...t, river: (t.river ?? 0) | (1 << sideTowards(a, b)) }
      : t.id === b.id
        ? { ...t, river: (t.river ?? 0) | (1 << sideTowards(b, a)) }
        : t,
  );
}
const move = (from: Tile, to: Tile, troops: number) => ({ kind: "move" as const, house: 1, from: from.id, to: to.id, troops });

describe("Ríos, puentes y lagos (bloque 1, fase 2)", () => {
  it("atacar cruzando un río da +25% al defensor", () => {
    GRID.kind = "hex";
    const base = make({ "0,1": 1 }, { "0,1": 6 });
    // Sin río: 6 contra 4 x1,25 = 5, se toma.
    let r = resolveCampaign({ resolution: 1, tiles: base, orders: [move(at(base, 0, 1), at(base, 1, 1), 6)] });
    expect(at(r.tiles, 1, 1).owner).toBe(1);
    // Con río: la defensa sube a x1,5 (6 contra 6): empate, gana el defensor.
    const tiles = river(base, at(base, 0, 1), at(base, 1, 1));
    expect(riverBetween(at(tiles, 0, 1), at(tiles, 1, 1))).toBe(true);
    expect(riverBetween(at(tiles, 1, 1), at(tiles, 0, 1))).toBe(true);
    r = resolveCampaign({ resolution: 1, tiles, orders: [move(at(tiles, 0, 1), at(tiles, 1, 1), 6)] });
    expect(at(r.tiles, 1, 1).owner).toBe(null);
    const combat = r.events.find((e) => e.type === "combate");
    expect(combat && combat.type === "combate" && combat.sides.find((s) => s.role === "ataque")?.river).toBe(true);
    // Apagado, no cuenta.
    RIVERS.enabled = false;
    try {
      r = resolveCampaign({ resolution: 1, tiles, orders: [move(at(tiles, 0, 1), at(tiles, 1, 1), 6)] });
      expect(at(r.tiles, 1, 1).owner).toBe(1);
    } finally {
      RIVERS.enabled = true;
    }
  });

  it("donde un camino cruza el río hay un puente y no cuenta", () => {
    GRID.kind = "hex";
    const base = make({}, { "0,0": 6 });
    const castle = at(base, 0, 0);
    const field = at(base, 1, 0);
    const road = roadEdges(base).some(([a, b]) => (a.id === castle.id && b.id === field.id) || (a.id === field.id && b.id === castle.id));
    expect(road).toBe(true);
    const tiles = river(base, castle, field);
    expect(bridgeBetween(at(tiles, 0, 0), at(tiles, 1, 0), tiles)).toBe(true);
    const r = resolveCampaign({ resolution: 1, tiles, orders: [move(at(tiles, 0, 0), at(tiles, 1, 0), 6)] });
    expect(at(r.tiles, 1, 0).owner).toBe(1);
  });

  it("en un lago no se puede entrar", () => {
    GRID.kind = "hex";
    const tiles = make({ "0,1": 1 }).map((t) => (t.x === 1 && t.y === 1 ? { ...t, type: "lago" as const, troops: 0 } : t));
    expect(marchKind(at(tiles, 0, 1), at(tiles, 1, 1), tiles, 1)).toBeNull();
    const r = resolveCampaign({ resolution: 1, tiles, orders: [move(at(tiles, 0, 1), at(tiles, 1, 1), 3)] });
    expect(at(r.tiles, 1, 1).owner).toBeNull();
    expect(r.events.some((e) => e.type === "orden_invalida")).toBe(true);
  });

  for (let n = 4; n <= 8; n++) {
    it(`${n} casas: ríos que llegan al mar, lagos que no encierran a nadie`, () => {
      GRID.kind = "hex";
      for (const seed of ["uno", "dos", "tres"]) {
        const map = generateMap(`${seed}-${n}`, Array.from({ length: n }, (_, i) => i + 1));
        const inMap = (p: { x: number; y: number }) => p.x >= 0 && p.y >= 0 && p.x < map.cols && p.y < map.rows;
        const byPos = new Map(map.tiles.map((t) => [`${t.x},${t.y}`, t]));
        // Ríos: los lados se marcan en las dos casillas y alguno sale al mar.
        let mouths = 0;
        let sides = 0;
        for (const t of map.tiles) {
          neighbourCoords(t).forEach((q, i) => {
            if (!t.river || !(t.river & (1 << i))) return;
            sides++;
            if (!inMap(q)) return;
            const other = byPos.get(`${q.x},${q.y}`)!;
            expect(riverBetween(other, t)).toBe(true);
          });
        }
        // Y alguno llega a la orilla (una casilla del borde con costa).
        const shore = (t: { x: number; y: number }) =>
          map.coast === "oeste-este" ? t.x === 0 || t.x === map.cols - 1 : t.y === 0 || t.y === map.rows - 1;
        mouths = map.tiles.filter((t) => shore(t) && t.river).length;
        expect(sides).toBeGreaterThan(0);
        expect(mouths).toBeGreaterThan(0);
        // Lagos: los que tocan, nunca junto a un castillo, y todo el mapa unido.
        const lakes = map.tiles.filter((t) => t.type === "lago");
        expect(lakes).toHaveLength(wastelandSplit(mapLayout(n as 4).paramos, n).lakes);
        const castles = map.tiles.filter((t) => t.type === "castillo");
        for (const l of lakes) for (const c of castles) expect(areAdjacent(l, c)).toBe(false);
        const land = map.tiles.filter((t) => t.type !== "lago");
        const seen = new Set([land[0]!]);
        const queue = [land[0]!];
        while (queue.length) {
          const cur = queue.pop()!;
          for (const o of land) if (!seen.has(o) && areAdjacent(cur, o)) (seen.add(o), queue.push(o));
        }
        expect(seen.size).toBe(land.length);
      }
    });
  }
});
