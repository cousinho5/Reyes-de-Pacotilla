import { describe, expect, it } from "vitest";
import { BOT_LEVELS, BOT_SCHEDULE, PERSONALITIES, PERSONALITY_NAMES, answerDelayHours, botHour, forgetsOrders, withLevel } from "../src";

describe("Horario de los bots (docs/bots.md)", () => {
  it("cada bot tiene su hora, dentro de las del día, y siempre la misma", () => {
    const hours = Array.from({ length: 40 }, (_, i) => botHour("semilla", i + 1));
    for (const h of hours) {
      expect(h).toBeGreaterThanOrEqual(BOT_SCHEDULE.dayHours[0]);
      expect(h).toBeLessThanOrEqual(BOT_SCHEDULE.dayHours[1]);
    }
    expect(new Set(hours).size).toBeGreaterThan(5); // no juegan todos a la vez
    expect(botHour("semilla", 3)).toBe(hours[2]);
  });

  it("tarda en contestar entre una y tres horas, lo mismo para lo mismo", () => {
    const delays = Array.from({ length: 40 }, (_, i) => answerDelayHours("semilla", 1, `oferta:${i}`));
    expect(Math.min(...delays)).toBe(BOT_SCHEDULE.answerDelay[0]);
    expect(Math.max(...delays)).toBe(BOT_SCHEDULE.answerDelay[1]);
    expect(answerDelayHours("semilla", 1, "oferta:5")).toBe(delays[5]);
  });
});

describe("Niveles de los bots (BOT_LEVELS)", () => {
  it("normal deja la personalidad como estaba", () => {
    for (const name of PERSONALITY_NAMES) expect(withLevel(PERSONALITIES[name], "normal")).toEqual(PERSONALITIES[name]);
    expect(withLevel(PERSONALITIES.mercader, null)).toEqual(PERSONALITIES.mercader);
  });

  it("el novato es más prudente y defiende peor; el taimado, al revés", () => {
    const p = PERSONALITIES.estratega;
    expect(withLevel(p, "novato").margin).toBeGreaterThan(p.margin);
    expect(withLevel(p, "novato").caution).toBeLessThan(p.caution);
    expect(withLevel(p, "taimado").margin).toBeLessThan(p.margin);
    expect(withLevel(p, "taimado").margin).toBeGreaterThan(1);
  });

  it("solo el novato se olvida de dar órdenes, y siempre las mismas noches", () => {
    const nights = Array.from({ length: 200 }, (_, i) => i + 1);
    const forgot = nights.filter((n) => forgetsOrders("s", 3, n, "novato"));
    expect(forgot.length / nights.length).toBeCloseTo(BOT_LEVELS.novato.forget, 1);
    expect(nights.filter((n) => forgetsOrders("s", 3, n, "novato"))).toEqual(forgot);
    expect(nights.some((n) => forgetsOrders("s", 3, n, "normal") || forgetsOrders("s", 3, n, "taimado"))).toBe(false);
  });
});
