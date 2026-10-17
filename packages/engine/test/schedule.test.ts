import { describe, expect, it } from "vitest";
import { fortifyResolutions, localDate, localParts, parseResolutionDays, resolutionInfo, resolutionInstant, totalResolutions, zonedToUtc } from "../src";

const MADRID = "Europe/Madrid";

describe("Calendario en hora de Madrid", () => {
  it("las 22:00 de Madrid son las 20:00 UTC en verano y las 21:00 UTC en invierno", () => {
    expect(zonedToUtc("2026-10-21", "22:00", MADRID).toISOString()).toBe("2026-10-21T20:00:00.000Z");
    expect(zonedToUtc("2026-11-01", "22:00", MADRID).toISOString()).toBe("2026-11-01T21:00:00.000Z");
  });

  it("resoluciones de una partida que empieza el lunes 19 de octubre de 2026 (cruza el cambio de hora)", () => {
    // Ritmo antiguo: miércoles y domingo.
    const old = [2, 6];
    expect(resolutionInstant("2026-10-19", 1, "22:00", MADRID, old).toISOString()).toBe("2026-10-21T20:00:00.000Z");
    expect(resolutionInstant("2026-10-19", 2, "22:00", MADRID, old).toISOString()).toBe("2026-10-25T21:00:00.000Z");
    expect(resolutionInstant("2026-10-19", 4, "22:00", MADRID, old).toISOString()).toBe("2026-11-01T21:00:00.000Z");
    // Diseño v3: una cada día, empezando el mismo lunes.
    expect(resolutionInstant("2026-10-19", 1, "22:00", MADRID).toISOString()).toBe("2026-10-19T20:00:00.000Z");
    expect(resolutionInstant("2026-10-19", 7, "22:00", MADRID).toISOString()).toBe("2026-10-25T21:00:00.000Z");
    expect(resolutionInstant("2026-10-19", 8, "22:00", MADRID).toISOString()).toBe("2026-10-26T21:00:00.000Z");
  });

  it("numeración: con miércoles y domingo, impares el miércoles; con resolución diaria, una por día", () => {
    expect(resolutionInfo(1, [2, 6])).toEqual({ week: 1, weekday: 2, kind: "miercoles" });
    expect(resolutionInfo(12, [2, 6])).toEqual({ week: 6, weekday: 6, kind: "domingo" });
    expect(resolutionInfo(1)).toEqual({ week: 1, weekday: 0, kind: "dia" });
    expect(resolutionInfo(3)).toEqual({ week: 1, weekday: 2, kind: "miercoles" });
    expect(resolutionInfo(14)).toEqual({ week: 2, weekday: 6, kind: "domingo" });
    expect(totalResolutions(6)).toBe(42);
    expect(totalResolutions(6, [2, 6])).toBe(12);
    expect(parseResolutionDays("2,6")).toEqual([2, 6]);
    expect(parseResolutionDays("0,1,2,3,4,5,6")).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(parseResolutionDays(null)).toEqual([2, 6]);
    expect(fortifyResolutions([2, 6])).toBe(2);
    expect(fortifyResolutions([0, 1, 2, 3, 4, 5, 6])).toBe(4);
  });

  it("la fecha local cambia a medianoche de Madrid, no de UTC", () => {
    const instant = new Date("2026-10-20T22:30:00Z"); // 00:30 del 21 en Madrid
    expect(localDate(instant, MADRID)).toBe("2026-10-21");
    expect(localParts(instant, MADRID)).toMatchObject({ hour: 0, weekday: 3 });
  });
});
