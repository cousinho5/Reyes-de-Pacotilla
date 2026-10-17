import { describe, expect, it } from "vitest";
import {
  checkFortify,
  defenseMultiplier,
  marchKind,
  projectForHouse,
  resolveCampaign,
  roadEdges,
  visibleTileIds,
  type Tile,
  type TileType,
} from "../src";

// Mapa hexagonal de 5x3 ("odd-r"):
//   fila 0:  C(0,0)  campos  campos  fortaleza  puerto
//   fila 1:     bosque  campos  montana  campos  campos
//   fila 2:  puerto  campos  cantera  campos  C(4,2)
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
const rich = { pan: 100, madera: 100, piedra: 100, hierro: 100, oro: 100 };

describe("Terreno (diseño v3, fase 2)", () => {
  it("defensa: llano x1,25; bosque y cantera x1,5; montaña y fortaleza x1,75; nunca más de x2", () => {
    const tiles = make();
    expect(defenseMultiplier(at(tiles, 1, 0), 1, false)).toBe(1.25);
    expect(defenseMultiplier(at(tiles, 0, 1), 1, false)).toBe(1.5);
    expect(defenseMultiplier(at(tiles, 2, 2), 1, false)).toBe(1.5);
    expect(defenseMultiplier(at(tiles, 2, 1), 1, false)).toBe(1.75);
    expect(defenseMultiplier(at(tiles, 3, 0), 1, false)).toBe(1.75);
    expect(defenseMultiplier({ ...at(tiles, 2, 1), fortifiedUntil: 3 }, 1, true)).toBe(2);
  });

  it("fortificar en una cantera cuesta la mitad de Piedra", () => {
    const tiles = make({ "2,2": 1, "1,0": 1 });
    expect(checkFortify(at(tiles, 2, 2), 1, 1, rich)).toMatchObject({ ok: true, value: { cost: { piedra: 4 } } });
    expect(checkFortify(at(tiles, 1, 0), 1, 1, rich)).toMatchObject({ ok: true, value: { cost: { piedra: 8 } } });
  });

  it("los caminos unen castillos y fortaleza sin cruzar montañas ni puertos", () => {
    const edges = roadEdges(make());
    expect(edges.length).toBeGreaterThan(0);
    for (const [a, b] of edges) {
      expect(["montana", "puerto"]).not.toContain(a.type);
      expect(["montana", "puerto"]).not.toContain(b.type);
    }
  });

  it("por camino se llega a dos casillas si la de en medio es tuya; por mar, de puerto propio a cualquier puerto", () => {
    const edges = roadEdges(make());
    // Un tramo de dos pasos del camino que sale del castillo 1.
    const castle = at(make(), 0, 0);
    const first = edges.find(([a, b]) => a.id === castle.id || b.id === castle.id)!;
    const mid = first[0].id === castle.id ? first[1] : first[0];
    const second = edges.find(([a, b]) => (a.id === mid.id || b.id === mid.id) && a.id !== castle.id && b.id !== castle.id)!;
    const end = second[0].id === mid.id ? second[1] : second[0];
    const mine = make({ [`${mid.x},${mid.y}`]: 1 });
    expect(marchKind(at(mine, 0, 0), at(mine, end.x, end.y), mine, 1)).toBe("camino");
    // Si la de en medio no es suya, no.
    const notMine = make();
    expect(marchKind(at(notMine, 0, 0), at(notMine, end.x, end.y), notMine, 1)).toBeNull();
    // Mar.
    const ports = make({ "0,2": 1 });
    expect(marchKind(at(ports, 0, 2), at(ports, 4, 0), ports, 1)).toBe("mar");
    expect(marchKind(at(ports, 4, 0), at(ports, 0, 2), ports, 1)).toBeNull(); // el puerto de salida no es suyo
    expect(marchKind(at(ports, 0, 2), at(ports, 1, 2), ports, 1)).toBe("vecina");
  });

  it("una travesía por mar se resuelve como un ataque normal", () => {
    const tiles = make({ "0,2": 1 }, { "0,2": 10, "4,0": 4 });
    const from = at(tiles, 0, 2);
    const to = at(tiles, 4, 0);
    const result = resolveCampaign({ resolution: 1, tiles, orders: [{ kind: "move", house: 1, from: from.id, to: to.id, troops: 10 }] });
    expect(result.events.some((e) => e.type === "orden_invalida")).toBe(false);
    expect(result.tiles.find((t) => t.id === to.id)).toMatchObject({ owner: 1 });
  });

  it("emboscada: el bosque de otra casa se ve, pero no sus tropas; atalaya: desde una montaña propia se ve a dos casillas", () => {
    const tiles = make({ "0,1": 2, "1,1": 1 });
    const view = projectForHouse(tiles, 1);
    const forest = view.find((t) => t.x === 0 && t.y === 1)!;
    expect(forest).toMatchObject({ visible: true, troops: null, hidden: true });
    // Con la carta Espía sí se ven.
    expect(projectForHouse(tiles, 1, [2]).find((t) => t.x === 0 && t.y === 1)!.troops).toBe(4);
    // Atalaya.
    const plain = make({ "1,0": 1 });
    const withTower = make({ "2,1": 1 });
    const far = at(plain, 4, 1);
    expect(visibleTileIds(plain, 1).has(far.id)).toBe(false);
    expect(visibleTileIds(withTower, 1).has(at(withTower, 4, 1).id)).toBe(true);
  });
});
