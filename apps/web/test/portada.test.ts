import { describe, expect, it } from "vitest";
import { HOURS, frameAt, tint } from "../src/art/panorama";
import * as P from "../src/art/portada";
import { cleanCode, greeting, hourAt, hourFromUrl, welcomeLines } from "../src/home";
import { SAMPLE_HOUSES, sampleGame } from "../src/sampleGame";
import { samplePrologue } from "../src/cinematics";

const at = (h: number) => new Date(2026, 9, 23, h, 30);

describe("portada (bloque 7)", () => {
  it("la hora del cielo sigue el reloj del móvil", () => {
    expect([5, 6, 8, 9, 17, 18, 20, 21, 23].map((h) => hourAt(at(h)))).toEqual([
      "noche",
      "amanecer",
      "amanecer",
      "dia",
      "dia",
      "atardecer",
      "atardecer",
      "noche",
      "noche",
    ]);
    expect(hourFromUrl("?hora=noche")).toBe("noche");
    expect(hourFromUrl("?hora=mediodia")).toBeNull();
    expect(greeting("atardecer")).toBe("Buenas tardes");
    expect(welcomeLines("noche").length).toBeGreaterThan(welcomeLines("dia").length);
  });

  it("el tinte de la hora deja el día tal cual y enciende las ventanas de noche", () => {
    const pal = { a: "#806040", z: "#2a3550" };
    expect(tint(pal, 0, "dia")).toEqual(pal);
    const night = tint(pal, 0, "noche");
    expect(night.a).not.toBe(pal.a);
    // Las ventanas, del todo encendidas: el ámbar.
    expect(night.z).toBe("#ffb84a");
    // Lo lejano se va al color de la bruma.
    expect(tint(pal, 1, "dia").a).not.toBe(pal.a);
    expect(Object.keys(HOURS)).toHaveLength(4);
  });

  it("los fotogramas no se salen de la animación, tampoco con tiempos negativos", () => {
    for (const t of [-3, -0.1, 0, 1.7, 99]) {
      const f = frameAt(P.humo.length, t, 10);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(P.humo.length);
      const g = frameAt(P.fantasma.length, t, 5, true);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThan(P.fantasma.length);
    }
  });

  it("los planos miden lo mismo y solo usan colores de su paleta", () => {
    for (const s of [P.lejos, P.colinas, P.pueblo]) {
      expect(s.grid).toHaveLength(216);
      expect(s.grid.every((r) => r.length === 196)).toBe(true);
      const keys = new Set(s.grid.join("").replaceAll(".", ""));
      for (const k of keys) expect(s.palette[k], k).toBeDefined();
    }
  });

  it("el código se escribe en mayúsculas, sin espacios y con seis caracteres", () => {
    expect(cleanCode(" ab-c 12x9")).toBe("ABC12X");
    expect(cleanCode("ñ1")).toBe("1");
  });

  it("la partida de muestra tiene siete casas, cada una con su castillo, y sale siempre igual", () => {
    const g = sampleGame();
    expect(g.casas).toBe(SAMPLE_HOUSES);
    expect(g.casas).toHaveLength(7);
    const castles = g.casillas!.filter((t) => t.type === "castillo");
    expect(castles.map((t) => t.owner).sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(sampleGame()).toBe(g);
    const p = samplePrologue(g);
    expect(p.scenes).toHaveLength(6);
    expect(p.scenes[4]!.text).toBe("Siete casas se creyeron las más capaces.");
    expect(p.scenes[5]!.text).toContain("Seis semanas");
  });
});
