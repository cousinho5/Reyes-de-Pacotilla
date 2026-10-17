import { describe, expect, it } from "vitest";
import { SHIELD_DIVISIONS, SHIELD_SHAPES, SHIELD_SYMBOLS } from "@reyes/engine";
import { SHIELD_H, SHIELD_W, SYMBOL_ART, shieldGrid } from "../src/art/shield";
import { FRAY_SPRITES, RESOURCE_SPRITES, TILE_SPRITES } from "../src/art/sprites";

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
    const all = [...Object.values(TILE_SPRITES), ...Object.values(RESOURCE_SPRITES), ...Object.values(FRAY_SPRITES)];
    for (const s of all) {
      const w = s.grid[0]!.length;
      expect(s.grid.every((r) => r.length === w)).toBe(true);
      for (const c of s.grid.join("")) if (c !== ".") expect(s.palette[c], `color «${c}»`).toBeDefined();
    }
    expect(Object.values(TILE_SPRITES).every((s) => s.grid.length === 16 && s.grid[0]!.length === 16)).toBe(true);
    expect(Object.values(FRAY_SPRITES).every((s) => s.grid.length === 24 && s.grid[0]!.length === 24)).toBe(true);
  });
});
