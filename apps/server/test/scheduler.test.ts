import { describe, expect, it } from "vitest";
import { dueJobs, ordersOpen, type GameClock } from "../src/scheduler";

// Partida piloto de 2 semanas que empieza el lunes 19 de octubre de 2026.
// Cruza el cambio de hora del domingo 25 de octubre.
const game: GameClock = {
  timezone: "Europe/Madrid",
  closeTime: "21:00",
  resolveTime: "22:00",
  startDate: "2026-10-19",
  weeks: 2,
  currentResolution: 0,
};

const kinds = (now: string, g: GameClock = game) => dueJobs(new Date(now), g).map((j) => j.key);

describe("Tareas del cron horario", () => {
  it("antes del inicio no hay nada que hacer", () => {
    expect(kinds("2026-10-18T21:00:00Z")).toEqual([]);
  });

  it("la producción se identifica por la fecha local de Madrid", () => {
    expect(kinds("2026-10-19T22:00:00Z")).toEqual(["produccion:2026-10-20"]); // 00:00 del 20 en Madrid
  });

  it("aviso de cierre dos horas antes y resolución el miércoles a las 22:00 (verano: 20:00 UTC)", () => {
    expect(kinds("2026-10-21T17:00:00Z")).toContain("aviso_cierre:1"); // 19:00 en Madrid
    expect(kinds("2026-10-21T19:00:00Z")).not.toContain("resolucion:1"); // 21:00, aún no
    expect(kinds("2026-10-21T20:00:00Z")).toContain("resolucion:1");
  });

  it("tras el cambio de hora, la resolución del domingo 25 es a las 21:00 UTC", () => {
    const g = { ...game, currentResolution: 1 };
    expect(kinds("2026-10-25T20:00:00Z", g)).not.toContain("resolucion:2");
    expect(kinds("2026-10-25T21:00:00Z", g)).toContain("resolucion:2");
  });

  it("al completar todas las resoluciones toca cerrar la partida", () => {
    expect(kinds("2026-11-02T10:00:00Z", { ...game, currentResolution: 4 })).toEqual(["fin"]);
  });

  it("las órdenes se cierran a las 21:00 de Madrid", () => {
    expect(ordersOpen(new Date("2026-10-21T18:59:00Z"), game)).toBe(true);
    expect(ordersOpen(new Date("2026-10-21T19:00:00Z"), game)).toBe(false);
  });
});
