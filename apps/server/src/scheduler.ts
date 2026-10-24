// Decide qué tareas tocan en un instante dado, en la hora local de la partida.
// Es pura: el cron horario la llama y luego ejecuta las tareas contra D1.
// Cada tarea tiene una clave única, así que repetirla no tiene efecto.

import { BOT_SCHEDULE, CLOSE_WARNING_MINUTES, announceInstant, localDate, localParts, resolutionInfo, resolutionInstant, totalResolutions, zonedToUtc } from "@reyes/engine";

export interface GameClock {
  timezone: string;
  closeTime: string; // "21:00"
  resolveTime: string; // "22:00"
  /** Lunes local de inicio, AAAA-MM-DD. */
  startDate: string;
  weeks: number;
  /** Última resolución completada (0 si ninguna). */
  currentResolution: number;
  /** Días con resolución (0 = lunes): todos, o miércoles y domingo en las partidas antiguas. */
  days: number[];
}

export type Job =
  | { kind: "produccion"; key: string; date: string }
  | { kind: "anuncio"; key: string; week: number }
  | { kind: "aviso_cierre"; key: string; resolution: number }
  | { kind: "resolucion"; key: string; resolution: number }
  | { kind: "fin"; key: string };

const CLOSE_WARNING_MS = CLOSE_WARNING_MINUTES * 60 * 1000;

export function dueJobs(now: Date, game: GameClock): Job[] {
  const jobs: Job[] = [];
  const start = zonedToUtc(game.startDate, "00:00", game.timezone);
  if (now < start) return jobs;

  const total = totalResolutions(game.weeks, game.days);
  const next = game.currentResolution + 1;

  if (game.currentResolution >= total) {
    jobs.push({ kind: "fin", key: "fin" });
    return jobs;
  }

  const date = localDate(now, game.timezone);
  jobs.push({ kind: "produccion", key: `produccion:${date}`, date });

  // Martes a la hora de resolución: lotes de la Gran Subasta del miércoles (una
  // vez por semana: la clave evita repetirlo). Va antes que la resolución del martes.
  const { week, weekday } = resolutionInfo(next, game.days);
  if (weekday <= 2 && now >= announceInstant(game.startDate, week, game.resolveTime, game.timezone)) {
    jobs.push({ kind: "anuncio", key: `anuncio:${week}`, week });
  }

  const close = resolutionInstant(game.startDate, next, game.closeTime, game.timezone, game.days);
  if (now.getTime() >= close.getTime() - CLOSE_WARNING_MS && now < close) {
    jobs.push({ kind: "aviso_cierre", key: `aviso_cierre:${next}`, resolution: next });
  }

  const resolveAt = resolutionInstant(game.startDate, next, game.resolveTime, game.timezone, game.days);
  if (now >= resolveAt) {
    jobs.push({ kind: "resolucion", key: `resolucion:${next}`, resolution: next });
  }

  return jobs;
}

/** ¿Se pueden dar todavía órdenes para la próxima resolución? */
export function ordersOpen(now: Date, game: GameClock): boolean {
  const next = game.currentResolution + 1;
  if (next > totalResolutions(game.weeks, game.days)) return false;
  return now < resolutionInstant(game.startDate, next, game.closeTime, game.timezone, game.days);
}

/** Turnos de los bots en una partida real (`docs/bots.md`). */
export type BotJob =
  | { kind: "bot_dia"; key: string; house: number; date: string }
  | { kind: "bot_respuestas" }
  | { kind: "bot_ordenes"; resolution: number };

/**
 * Qué les toca a los bots en el instante `now`: el día de cada uno a su hora
 * (o en cuanto pase el cron, si se saltó esa hora), contestar mientras están
 * despiertos y dar las órdenes en la última hora antes del cierre.
 */
export function dueBotJobs(now: Date, game: GameClock, bots: { house: number; hour: number }[]): BotJob[] {
  const jobs: BotJob[] = [];
  if (bots.length === 0 || now < zonedToUtc(game.startDate, "00:00", game.timezone)) return jobs;
  const next = game.currentResolution + 1;
  if (next > totalResolutions(game.weeks, game.days)) return jobs;

  const date = localDate(now, game.timezone);
  const { hour } = localParts(now, game.timezone);
  for (const b of bots) {
    if (hour >= b.hour) jobs.push({ kind: "bot_dia", key: `bot_dia:${b.house}:${date}`, house: b.house, date });
  }
  if (hour >= BOT_SCHEDULE.awake[0] && hour < BOT_SCHEDULE.awake[1]) jobs.push({ kind: "bot_respuestas" });
  const close = resolutionInstant(game.startDate, next, game.closeTime, game.timezone, game.days);
  if (now.getTime() >= close.getTime() - BOT_SCHEDULE.ordersBeforeClose * 60 * 1000 && now < close) {
    jobs.push({ kind: "bot_ordenes", resolution: next });
  }
  return jobs;
}
