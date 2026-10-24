import { describe, expect, it } from "vitest";
import { BOT_SCHEDULE, answerDelayHours, botHour } from "../src";

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
