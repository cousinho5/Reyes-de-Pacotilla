import { describe, expect, it } from "vitest";
import { BUILDINGS } from "@reyes/engine";
import { SCENE_H, SCENE_W, SITES, TARGETS, animateScene, buildingSprite, castleSprite, drawWork, lightAt, renderCastleScene, targetAt } from "../src/art/castleScene";

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

  it("cada nivel de un edificio se ve distinto y ocupa el mismo lienzo", () => {
    for (const b of BUILDINGS) {
      const dibujos = [1, 2, 3, 4, 5].map((l) => buildingSprite(b, l));
      expect(new Set(dibujos.map((s) => s.grid.join("\n"))).size, b).toBe(5);
      expect(new Set(dibujos.map((s) => `${s.grid[0]!.length}x${s.grid.length}`)).size, b).toBe(1);
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

  it("la luz sigue la hora de la partida y de noche todo se oscurece menos el fuego", () => {
    expect([6, 7, 12, 18, 20, 21, 23].map(lightAt)).toEqual(["noche", "amanecer", "dia", "atardecer", "atardecer", "noche", "noche"]);
    const sum = (a: Uint8ClampedArray) => a.reduce((n, v, i) => (i % 4 === 3 ? n : n + v), 0);
    const day = renderCastleScene({ stage: 3, levels: START, color: "#b3291d" });
    const night = renderCastleScene({ stage: 3, levels: START, color: "#b3291d", light: "noche" });
    expect(sum(night.rgba)).toBeLessThan(sum(day.rgba) * 0.6);
    expect(day.light).toBe("dia");
  });

  it("si te sitian, las tiendas del enemigo acampan delante con su color", () => {
    const calm = renderCastleScene({ stage: 3, levels: START, color: "#b3291d" });
    const siege = renderCastleScene({ stage: 3, levels: START, color: "#b3291d", besieger: "#1b3c80" });
    expect(siege.rgba).not.toEqual(calm.rgba);
    // Algún píxel es del azul del sitiador.
    let blue = false;
    for (let i = 0; i < siege.rgba.length && !blue; i += 4) blue = siege.rgba[i] === 0x1b && siege.rgba[i + 1] === 0x3c && siege.rgba[i + 2] === 0x80;
    expect(blue).toBe(true);
  });

  it("la escena se mueve fotograma a fotograma y la obra tapa la pieza que mejora", () => {
    const img = renderCastleScene({ stage: 3, levels: { granja: 3, aserradero: 3, cantera: 3, mina: 4, mercado: 3 }, color: "#b3291d" });
    const a = new Uint8ClampedArray(img.rgba.length);
    const b = new Uint8ClampedArray(img.rgba.length);
    animateScene(img, 0, a);
    animateScene(img, 5, b);
    expect(a).not.toEqual(b);
    const work = new Uint8ClampedArray(a);
    drawWork(img, "granja", 0.3, work);
    const [x, y, w, h] = img.boxes.granja;
    let changed = 0;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (work[(yy * SCENE_W + xx) * 4] !== a[(yy * SCENE_W + xx) * 4]) changed++;
    expect(changed).toBeGreaterThan(50);
  });
});
