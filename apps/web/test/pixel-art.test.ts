import { describe, expect, it } from "vitest";
import { SHIELD_DIVISIONS, SHIELD_SHAPES, SHIELD_SYMBOLS } from "@reyes/engine";
import { SHIELD_H, SHIELD_W, SYMBOL_ART, shieldGrid } from "../src/art/shield";
import { FRAY_SPRITES, RESOURCE_SPRITES } from "../src/art/sprites";
import { renderWorld, roadEdges, type WorldCell } from "../src/art/world";
import { makeGeo, sharedEdge } from "../src/art/grid";

const count = (rows: string[], chars: string) => rows.join("").split("").filter((c) => chars.includes(c)).length;

describe("Pixel art", () => {
  it("cada símbolo cabe entero en cada forma de escudo, con cualquier división", () => {
    for (const shape of SHIELD_SHAPES) {
      for (const symbol of SHIELD_SYMBOLS) {
        const art = SYMBOL_ART[symbol];
        const want = count(art, "#+x");
        for (const division of SHIELD_DIVISIONS) {
          const g = shieldGrid(shape, division, symbol);
          expect(g).toHaveLength(SHIELD_H);
          expect(g.every((r) => r.length === SHIELD_W)).toBe(true);
          expect(count(g, "mnx"), `${symbol} en ${shape}`).toBe(want);
        }
      }
    }
  });

  it("las divisiones usan los dos colores y el pleno solo uno", () => {
    expect(count(shieldGrid("espanol", "pleno", "nabo"), "b")).toBe(0);
    for (const d of SHIELD_DIVISIONS.filter((x) => x !== "pleno")) {
      const g = shieldGrid("espanol", d, "nabo");
      expect(count(g, "a")).toBeGreaterThan(20);
      expect(count(g, "b")).toBeGreaterThan(20);
    }
  });

  it("todos los sprites son rectangulares y solo usan colores de su paleta", () => {
    const types = ["campos", "bosque", "montana", "cantera", "puerto", "castillo", "fortaleza"] as const;
    const tiles = types.map((type) => {
      const img = renderWorld({ cols: 1, rows: 1, margin: 0, cells: [{ x: 0, y: 0, type, owner: "#B3291D", troops: 7, fortified: true, battle: true }] });
      return { grid: img.pixels, palette: img.palette };
    });
    const all = [...tiles, ...Object.values(RESOURCE_SPRITES), ...Object.values(FRAY_SPRITES)];
    for (const s of all) {
      const w = s.grid[0]!.length;
      expect(s.grid.every((r) => r.length === w)).toBe(true);
      for (const c of s.grid.join("")) if (c !== ".") expect(s.palette[c], `color «${c}»`).toBeDefined();
    }
    expect(tiles.every((s) => s.grid.length === 64 && s.grid[0]!.length === 64)).toBe(true);
    expect(Object.values(RESOURCE_SPRITES).every((s) => s.grid.length === 16 && s.grid[0]!.length === 16)).toBe(true);
    expect(Object.values(FRAY_SPRITES).every((s) => s.grid.length === 32 && s.grid[0]!.length === 32)).toBe(true);
  });

  it("el mapa entero sale igual con la misma partida, y con niebla no cambia el dibujo", () => {
    const types = ["campos", "bosque", "montana", "cantera", "puerto", "castillo", "fortaleza"] as const;
    const cells: WorldCell[] = [];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) cells.push({ x, y, type: types[(x * 3 + y * 2) % 7]! });
    const a = renderWorld({ cols: 5, rows: 4, cells, seed: 3 });
    const b = renderWorld({ cols: 5, rows: 4, cells, seed: 3 });
    expect(a.pixels).toEqual(b.pixels);
    // Hexágonos: 64 de la primera casilla, 56 por cada una más, media de desplazamiento y 20 de margen a cada lado.
    expect(a.grid).toBe("hex");
    expect(a.width).toBe(64 + 4 * 56 + 28 + 40);
    expect(a.height).toBe(64 + 3 * 48 + 40);
    expect(renderWorld({ cols: 5, rows: 4, cells, seed: 3, grid: "square" }).width).toBe(5 * 64 + 40);
    const fogged = renderWorld({ cols: 5, rows: 4, cells: cells.map((c) => ({ ...c, fogged: true })), seed: 3 });
    expect(fogged.pixels).toEqual(a.pixels);
    for (const c of a.pixels.join("")) expect(a.palette[c], `color «${c}»`).toBeDefined();
  });

  it("los caminos unen cada castillo con la fortaleza sin cruzar montañas", () => {
    const grid = ["castillo", "campos", "montana", "fortaleza", "bosque", "campos"] as const;
    const cells: WorldCell[] = grid.map((type, i) => ({ x: i % 3, y: Math.floor(i / 3), type }));
    const edges = roadEdges(3, 2, cells);
    expect(edges.length).toBeGreaterThan(0);
    for (const [a, b] of edges) expect(a.type !== "montana" && b.type !== "montana").toBe(true);
  });

  it("en hexágonos, cada píxel del tablero pertenece a la casilla de centro más cercano y los lados compartidos casan", () => {
    const geo = makeGeo("hex", 6, 5, 20);
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 6; x++) {
        const [cx, cy] = geo.center(x, y);
        expect(geo.cellAt(cx, cy)).toEqual([x, y]);
        for (const [nx, ny] of geo.neighbours(x, y)) {
          if (nx < 0 || ny < 0 || nx >= 6 || ny >= 5) continue;
          const [a, b] = sharedEdge(geo, x, y, nx, ny);
          const [c, d] = sharedEdge(geo, nx, ny, x, y);
          // El mismo lado visto desde las dos casillas (en orden inverso), con menos de 1 px de diferencia.
          expect(Math.hypot(a[0] - d[0], a[1] - d[1])).toBeLessThan(1);
          expect(Math.hypot(b[0] - c[0], b[1] - c[1])).toBeLessThan(1);
        }
      }
  });
});
