import { describe, expect, it } from "vitest";
import { HOURS, frameAt, tint } from "../src/art/panorama";
import * as P from "../src/art/portada";
import type { MyGame } from "../src/api";
import {
  attackLines,
  cleanCode,
  closeLine,
  closingSoon,
  greeting,
  hourAt,
  hourFromUrl,
  insideLines,
  mainGame,
  showcase,
  sortGames,
  timeLeft,
  toDeviceClock,
  welcomeLines,
} from "../src/home";
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


const NOW = new Date("2026-10-23T18:00:00Z");
const summary = (more: Partial<NonNullable<MyGame["resumen"]>> = {}): NonNullable<MyGame["resumen"]> => ({
  noche: 6,
  totalNoches: 42,
  semana: 1,
  cierre: "2026-10-23T21:00:00Z",
  ordenesAbiertas: true,
  faltanOrdenes: false,
  ataques: [],
  boletin: null,
  ofertas: 0,
  clasificacion: [],
  puesto: null,
  puestoAntes: null,
  mapa: null,
  final: null,
  ...more,
});
const game = (id: number, estado: MyGame["estado"], more: Partial<MyGame> = {}): MyGame => ({
  id,
  nombre: `P${id}`,
  estado,
  casa: "Duques del Queso",
  casaId: 1,
  color: "naranjado",
  resumen: estado === "lobby" ? null : summary(),
  ...more,
});

describe("portada con partidas (bloque 7)", () => {
  it("ordena por urgencia: faltan órdenes, recién acabada, en juego, sala y acabadas", () => {
    const list = [
      game(1, "finished", { resumen: summary({ final: { ganador: 1, puesto: 1, fecha: "2026-09-01T00:00:00Z" } }) }),
      game(2, "lobby"),
      game(3, "active", { resumen: summary({ cierre: "2026-10-24T21:00:00Z" }) }),
      game(4, "active", { resumen: summary({ faltanOrdenes: true, cierre: "2026-10-25T21:00:00Z" }) }),
      game(5, "active", { resumen: summary({ faltanOrdenes: true }) }),
      game(6, "finished", { resumen: summary({ final: { ganador: 2, puesto: 3, fecha: "2026-10-22T00:00:00Z" } }) }),
    ];
    expect(sortGames(list, NOW).map((g) => g.id)).toEqual([5, 4, 6, 3, 2, 1]);
  });

  it("una partida de prueba solo va arriba si no hay otra", () => {
    const test = game(1, "active", { prueba: true, resumen: summary({ faltanOrdenes: true }) });
    const real = game(2, "lobby");
    expect(mainGame(sortGames([test, real], NOW))!.id).toBe(2);
    expect(mainGame([test])!.id).toBe(1);
    expect(mainGame([])).toBeNull();
  });

  it("cuenta lo que falta para el cierre y avisa en la última hora", () => {
    expect(timeLeft("2026-10-23T21:12:00Z", NOW)).toBe("3 h 12 min");
    expect(timeLeft("2026-10-23T18:09:30Z", NOW)).toBe("10 min");
    expect(timeLeft("2026-10-25T22:00:00Z", NOW)).toBe("2 días y 4 h");
    expect(timeLeft("2026-10-23T17:00:00Z", NOW)).toBe("0 min");
    expect(closingSoon("2026-10-23T18:40:00Z", NOW)).toBe(true);
    expect(closingSoon("2026-10-23T21:00:00Z", NOW)).toBe(false);
    expect(closeLine(new Date(NOW.getTime() + 60_000).toISOString(), NOW)).toMatch(/^A las \d\d:\d\d\.$/);
    expect(closeLine(new Date(NOW.getTime() + 3 * 864e5).toISOString(), NOW)).toMatch(/^El \S+ a las/);
  });

  it("pasa el reloj de una prueba a la hora del móvil", () => {
    const g = game(1, "active", { resumen: summary({ ahora: "2026-11-02T10:00:00Z", cierre: "2026-11-02T12:00:00Z" }) });
    expect(toDeviceClock(g, NOW).resumen!.cierre).toBe("2026-10-23T20:00:00.000Z");
    const real = game(2, "active");
    expect(toDeviceClock(real, NOW)).toBe(real);
  });

  it("resume los combates de anoche", () => {
    expect(
      attackLines([
        { casilla: "el Vado", resultado: "resistio" },
        { casilla: "Peña Alta", resultado: "perdida" },
        { casilla: "el Robledal", resultado: "conquista" },
      ]),
    ).toEqual(["Te atacaron en el Vado: resististe", "Perdiste Peña Alta", "Y 1 combate más anoche"]);
  });

  it("la vitrina cuenta coronas y partidas de verdad", () => {
    const won = game(1, "finished", { titulo: "Muralla con Patas", resumen: summary({ final: { ganador: 1, puesto: 1, fecha: null } }) });
    const lost = game(2, "finished", { resumen: summary({ final: { ganador: 3, puesto: 2, fecha: null } }) });
    const test = game(3, "finished", { prueba: true, resumen: summary({ final: { ganador: 1, puesto: 1, fecha: null } }) });
    expect(showcase([won, lost, test, game(4, "active")])).toEqual({ coronas: 1, jugadas: 2, titulo: "Muralla con Patas" });
  });

  it("Fray Abundio habla de lo que toca, con las cifras exactas", () => {
    const g = game(1, "active", {
      resumen: summary({
        faltanOrdenes: true,
        ataques: [{ casilla: "Peña Alta", resultado: "perdida" }],
        clasificacion: [
          { casa: 2, total: 30 },
          { casa: 1, total: 13 },
          { casa: 3, total: 9 },
        ],
        puesto: 2,
      }),
    });
    const lines = insideLines(g, NOW);
    expect(lines[0]).toContain("siguen en blanco");
    expect(lines[1]).toContain("Quedan 3 h 00 min");
    expect(lines).toContain("Anoche perdisteis Peña Alta. El cronista no dirá que lo vio venir, pero lo vio venir.");
    expect(lines).toContain("Duques del Queso va 2.º, a 17 de Prestigio del primero. El cronista lo considera un triunfo moral.");
    expect(insideLines(null, NOW)[0]).toContain("Aún no estás");
    expect(insideLines(game(9, "lobby"), NOW)[0]).toContain("«P9»");
  });
});
