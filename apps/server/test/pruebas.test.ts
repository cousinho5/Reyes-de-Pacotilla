import { describe, expect, it } from "vitest";
import { PERSONALITY_NAMES } from "@reyes/engine";
import { pickPersonality } from "../src/bots";
import { nextStop, testStart } from "../src/pruebas";
import type { GameRow } from "../src/state";

const game = (current: number, days = "2,6"): GameRow =>
  ({
    resolution_days: days,
    timezone: "Europe/Madrid",
    close_time: "21:00",
    resolve_time: "22:00",
    start_date: "2026-10-19",
    weeks: 2,
    current_resolution: current,
  }) as GameRow;

const madrid = (d: Date) =>
  new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(d);

describe("Reloj de las partidas de prueba", () => {
  it("empieza el lunes a las 9:00 y va de mañana en mañana parando en cada resolución", () => {
    let now = testStart("2026-10-19", "Europe/Madrid");
    let current = 0;
    const stops = [madrid(now)];
    for (let i = 0; i < 9; i++) {
      now = nextStop(game(current), now);
      stops.push(madrid(now));
      if (stops.at(-1)!.endsWith("22:00")) current++;
    }
    expect(stops).toEqual([
      "lun, 09:00",
      "mar, 09:00",
      "mié, 09:00",
      "mié, 22:00",
      "jue, 09:00",
      "vie, 09:00",
      "sáb, 09:00",
      "dom, 09:00",
      "dom, 22:00", // cruza el cambio de hora del 25 de octubre sin moverse
      "lun, 09:00",
    ]);
  });

  it("con resolución diaria, para cada mañana y cada noche", () => {
    let now = testStart("2026-10-19", "Europe/Madrid");
    let current = 0;
    const stops = [madrid(now)];
    for (let i = 0; i < 5; i++) {
      now = nextStop(game(current, "0,1,2,3,4,5,6"), now);
      stops.push(madrid(now));
      if (stops.at(-1)!.endsWith("22:00")) current++;
    }
    expect(stops).toEqual(["lun, 09:00", "lun, 22:00", "mar, 09:00", "mar, 22:00", "mié, 09:00", "mié, 22:00"]);
  });

  it("acabadas las resoluciones, sigue a la mañana siguiente (para cerrar la partida)", () => {
    const after = nextStop(game(4), new Date("2026-11-01T21:00:00Z"));
    expect(madrid(after)).toBe("lun, 09:00");
  });
});

describe("Personalidad de los bots nuevos (docs/bots.md)", () => {
  it("no se repite hasta agotarlas, y la elegida manda", () => {
    const houses: { is_bot: number; bot_personality: string | null }[] = [{ is_bot: 0, bot_personality: null }];
    for (let i = 0; i < PERSONALITY_NAMES.length; i++) houses.push({ is_bot: 1, bot_personality: pickPersonality("semilla", houses) });
    expect(new Set(houses.slice(1).map((h) => h.bot_personality)).size).toBe(PERSONALITY_NAMES.length);
    expect(pickPersonality("semilla", houses, "guerrero")).toBe("guerrero");
    expect(pickPersonality("semilla", houses)).toBe(pickPersonality("semilla", houses));
  });
});
