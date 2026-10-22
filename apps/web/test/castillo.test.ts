import { describe, expect, it } from "vitest";
import { BUILDINGS } from "@reyes/engine";
import { SCENE_H, SCENE_W, SITES, TARGETS, buildingSprite, castleSprite, renderCastleScene, targetAt } from "../src/art/castleScene";

const START = { granja: 2, aserradero: 2, cantera: 1, mina: 1, mercado: 1 };

describe("Escena del castillo (bloque 2)", () => {
  it("cada etapa y cada nivel tienen dibujo, y todo cabe en la escena por los lados", () => {
    for (let e = 1; e <= 5; e++) expect(castleSprite(e).grid.length).toBeGreaterThan(0);
    for (const b of BUILDINGS) for (let l = 1; l <= 5; l++) expect(buildingSprite(b, l).grid.length).toBeGreaterThan(0);
    const img = renderCastleScene({ stage: 5, levels: { granja: 5, aserradero: 5, cantera: 5, mina: 5, mercado: 5 }, color: "#1b3c80" });
    for (const t of TARGETS) {
      const [x, , w] = img.boxes[t];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(SCENE_W + 3);
    }
  });

  it("es determinista y tiñe con el color de la casa", () => {
    const a = renderCastleScene({ stage: 3, levels: START, color: "#b3291d" });
    const b = renderCastleScene({ stage: 3, levels: START, color: "#b3291d" });
    const c = renderCastleScene({ stage: 3, levels: START, color: "#1b3c80" });
    expect(a.rgba).toEqual(b.rgba);
    expect(a.rgba).not.toEqual(c.rgba);
    expect(a.rgba.length).toBe(SCENE_W * SCENE_H * 4);
  });

  it("tocar el sitio de cada pieza la elige, y el cielo no elige nada", () => {
    const img = renderCastleScene({ stage: 1, levels: START, color: "#b3291d" });
    for (const t of TARGETS) {
      const [x, y, w, h] = img.boxes[t];
      // Algún punto de su caja tiene que llevar a ella.
      let found = false;
      for (let yy = Math.max(0, y); yy < Math.min(SCENE_H, y + h) && !found; yy += 2)
        for (let xx = x; xx < x + w && !found; xx += 2) found = targetAt(img, xx, yy, 0) === t;
      expect(found, t).toBe(true);
    }
    expect(targetAt(img, 5, 5)).toBeNull();
    expect(targetAt(img, SITES.castillo[0], SITES.castillo[1] - 20)).toBe("castillo");
  });
});
