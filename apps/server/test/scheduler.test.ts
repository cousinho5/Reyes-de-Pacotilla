import { describe, expect, it } from "vitest";
import { dueBotJobs, dueJobs, ordersOpen, type GameClock } from "../src/scheduler";
import { isAbsent } from "../src/jobs";

// Partida piloto de 2 semanas que empieza el lunes 19 de octubre de 2026.
// Cruza el cambio de hora del domingo 25 de octubre. Con el ritmo antiguo
// (miércoles y domingo), el de las partidas empezadas antes del diseño v3.
const game: GameClock = {
  timezone: "Europe/Madrid",
  closeTime: "21:00",
  resolveTime: "22:00",
  startDate: "2026-10-19",
  weeks: 2,
  currentResolution: 0,
  days: [2, 6],
};
// La misma partida con una resolución cada día (diseño v3).
const daily: GameClock = { ...game, days: [0, 1, 2, 3, 4, 5, 6] };

const kinds = (now: string, g: GameClock = game) => dueJobs(new Date(now), g).map((j) => j.key);

describe("Tareas del cron horario", () => {
  it("antes del inicio no hay nada que hacer", () => {
    expect(kinds("2026-10-18T21:00:00Z")).toEqual([]);
  });

  it("la producción se identifica por la fecha local de Madrid", () => {
    expect(kinds("2026-10-19T22:00:00Z")).toEqual(["produccion:2026-10-20"]); // 00:00 del 20 en Madrid
  });

  it("aviso de cierre una hora antes y resolución el miércoles a las 22:00 (verano: 20:00 UTC)", () => {
    expect(kinds("2026-10-21T17:00:00Z")).not.toContain("aviso_cierre:1"); // 19:00 en Madrid, aún no
    expect(kinds("2026-10-21T18:00:00Z")).toContain("aviso_cierre:1"); // 20:00, una hora antes del cierre de las 21:00
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

  it("el martes a las 22:00 se anuncian los lotes de la semana", () => {
    expect(kinds("2026-10-20T19:00:00Z")).not.toContain("anuncio:1"); // martes 21:00 en Madrid
    expect(kinds("2026-10-20T20:00:00Z")).toContain("anuncio:1"); // martes 22:00
    expect(kinds("2026-10-21T08:00:00Z")).toContain("anuncio:1"); // sigue pendiente hasta que se haga
    expect(kinds("2026-10-22T08:00:00Z", { ...game, currentResolution: 1 })).not.toContain("anuncio:1");
    expect(kinds("2026-10-27T21:00:00Z", { ...game, currentResolution: 2 })).toContain("anuncio:2");
  });

  it("con resolución diaria: una cada noche a las 22:00, la del martes después del anuncio y 14 en dos semanas", () => {
    expect(kinds("2026-10-19T20:00:00Z", daily)).toContain("resolucion:1"); // lunes 19, 22:00 en Madrid
    expect(kinds("2026-10-19T18:00:00Z", daily)).toContain("aviso_cierre:1");
    const tuesday = kinds("2026-10-20T20:00:00Z", { ...daily, currentResolution: 1 });
    expect(tuesday).toEqual(["produccion:2026-10-20", "anuncio:1", "resolucion:2"]);
    // El jueves ya no se repite el anuncio.
    expect(kinds("2026-10-22T20:00:00Z", { ...daily, currentResolution: 3 })).not.toContain("anuncio:1");
    // Tras el cambio de hora, el domingo 25 (resolución 7) es a las 21:00 UTC.
    expect(kinds("2026-10-25T20:00:00Z", { ...daily, currentResolution: 6 })).not.toContain("resolucion:7");
    expect(kinds("2026-10-25T21:00:00Z", { ...daily, currentResolution: 6 })).toContain("resolucion:7");
    expect(kinds("2026-11-02T10:00:00Z", { ...daily, currentResolution: 14 })).toEqual(["fin"]);
  });

  it("con resolución diaria, las órdenes de cada día se cierran a las 21:00", () => {
    expect(ordersOpen(new Date("2026-10-19T18:59:00Z"), daily)).toBe(true);
    expect(ordersOpen(new Date("2026-10-19T19:00:00Z"), daily)).toBe(false);
    expect(ordersOpen(new Date("2026-10-19T19:00:00Z"), { ...daily, currentResolution: 1 })).toBe(true);
  });
});

describe("Turnos de los bots en una partida real", () => {
  const bots = [
    { house: 7, hour: 9 },
    { house: 8, hour: 18 },
  ];
  const botKinds = (now: string, g: GameClock = daily) =>
    dueBotJobs(new Date(now), g, bots).map((j) => (j.kind === "bot_dia" ? j.key : j.kind === "bot_ordenes" ? `bot_ordenes:${j.resolution}` : j.kind));

  it("de noche duermen y no hacen nada", () => {
    expect(botKinds("2026-10-20T04:00:00Z")).toEqual([]); // 6:00 en Madrid
  });

  it("cada bot juega su día a su hora, y después si el cron se saltó esa hora", () => {
    expect(botKinds("2026-10-20T07:00:00Z")).toEqual(["bot_dia:7:2026-10-20", "bot_respuestas"]); // 9:00
    expect(botKinds("2026-10-20T15:00:00Z")).toEqual(["bot_dia:7:2026-10-20", "bot_respuestas"]); // 17:00
    expect(botKinds("2026-10-20T16:00:00Z")).toEqual(["bot_dia:7:2026-10-20", "bot_dia:8:2026-10-20", "bot_respuestas"]); // 18:00
  });

  it("dan las órdenes en la última hora antes del cierre, no después", () => {
    const tuesday = { ...daily, currentResolution: 1 }; // la del lunes ya pasó: toca la 2.ª
    expect(botKinds("2026-10-20T17:00:00Z", tuesday)).not.toContain("bot_ordenes:2"); // 19:00
    expect(botKinds("2026-10-20T18:00:00Z", tuesday)).toContain("bot_ordenes:2"); // 20:00
    expect(botKinds("2026-10-20T19:00:00Z", tuesday)).not.toContain("bot_ordenes:2"); // 21:00, cerrado
  });

  it("contestan hasta las 23:00 y paran a medianoche", () => {
    expect(botKinds("2026-10-20T21:00:00Z")).toContain("bot_respuestas"); // 23:00
    expect(botKinds("2026-10-20T22:00:00Z")).toEqual([]); // 0:00 del 21
  });

  it("antes del inicio, sin bots o con la partida acabada, nada", () => {
    expect(botKinds("2026-10-18T10:00:00Z")).toEqual([]);
    expect(dueBotJobs(new Date("2026-10-20T16:00:00Z"), daily, [])).toEqual([]);
    expect(botKinds("2026-11-01T10:00:00Z", { ...daily, currentResolution: 14 })).toEqual([]);
  });
});

describe("Piloto automático", () => {
  const now = new Date("2026-10-25T10:00:00Z");
  const old = "2026-10-19T10:00:00Z"; // seis días sin entrar
  it("una persona que no entra en 3 días pasa al piloto; un bot, nunca (juega su turno)", () => {
    expect(isAbsent({ id: 1, vacation: 0, last_seen_at: old, is_bot: 0 }, now)).toBe(true);
    expect(isAbsent({ id: 2, vacation: 0, last_seen_at: old, is_bot: 1 }, now)).toBe(false);
  });
});
