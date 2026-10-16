import { describe, expect, it } from "vitest";
import { localDate, localParts, resolutionInfo, resolutionInstant, zonedToUtc } from "../src";

const MADRID = "Europe/Madrid";

describe("Calendario en hora de Madrid", () => {
  it("las 22:00 de Madrid son las 20:00 UTC en verano y las 21:00 UTC en invierno", () => {
    expect(zonedToUtc("2026-10-21", "22:00", MADRID).toISOString()).toBe("2026-10-21T20:00:00.000Z");
    expect(zonedToUtc("2026-11-01", "22:00", MADRID).toISOString()).toBe("2026-11-01T21:00:00.000Z");
  });

  it("resoluciones de una partida que empieza el lunes 19 de octubre de 2026 (cruza el cambio de hora)", () => {
    expect(resolutionInstant("2026-10-19", 1, "22:00", MADRID).toISOString()).toBe("2026-10-21T20:00:00.000Z");
    expect(resolutionInstant("2026-10-19", 2, "22:00", MADRID).toISOString()).toBe("2026-10-25T21:00:00.000Z");
    expect(resolutionInstant("2026-10-19", 4, "22:00", MADRID).toISOString()).toBe("2026-11-01T21:00:00.000Z");
  });

  it("numeración: impares el miércoles, pares el domingo", () => {
    expect(resolutionInfo(1)).toEqual({ week: 1, kind: "miercoles" });
    expect(resolutionInfo(12)).toEqual({ week: 6, kind: "domingo" });
  });

  it("la fecha local cambia a medianoche de Madrid, no de UTC", () => {
    const instant = new Date("2026-10-20T22:30:00Z"); // 00:30 del 21 en Madrid
    expect(localDate(instant, MADRID)).toBe("2026-10-21");
    expect(localParts(instant, MADRID)).toMatchObject({ hour: 0, weekday: 3 });
  });
});
