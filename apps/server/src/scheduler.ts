// Decide qué tareas tocan en un instante dado, en la hora local de la partida.
// Es pura: el cron horario la llama y luego ejecuta las tareas contra D1.
// Cada tarea tiene una clave única, así que repetirla no tiene efecto.

import { announceInstant, localDate, resolutionInstant, zonedToUtc } from "@reyes/engine";

export interface GameClock {
  timezone: string;
  closeTime: string; // "21:00"
  resolveTime: string; // "22:00"
  /** Lunes local de inicio, AAAA-MM-DD. */
  startDate: string;
  weeks: number;
  /** Última resolución completada (0 si ninguna). */
  currentResolution: number;
}

export type Job =
  | { kind: "produccion"; key: string; date: string }
  | { kind: "anuncio"; key: string; week: number }
  | { kind: "aviso_cierre"; key: string; resolution: number }
  | { kind: "resolucion"; key: string; resolution: number }
  | { kind: "fin"; key: string };

const TWO_HOURS = 2 * 60 * 60 * 1000;

export function dueJobs(now: Date, game: GameClock): Job[] {
  const jobs: Job[] = [];
  const start = zonedToUtc(game.startDate, "00:00", game.timezone);
  if (now < start) return jobs;

  const total = game.weeks * 2;
  const next = game.currentResolution + 1;

  if (game.currentResolution >= total) {
    jobs.push({ kind: "fin", key: "fin" });
    return jobs;
  }

  const date = localDate(now, game.timezone);
  jobs.push({ kind: "produccion", key: `produccion:${date}`, date });

  // Martes a la hora de resolución: lotes de la Gran Subasta del miércoles.
  if (next % 2 === 1) {
    const week = (next + 1) / 2;
    if (now >= announceInstant(game.startDate, week, game.resolveTime, game.timezone)) {
      jobs.push({ kind: "anuncio", key: `anuncio:${week}`, week });
    }
  }

  const close = resolutionInstant(game.startDate, next, game.closeTime, game.timezone);
  if (now.getTime() >= close.getTime() - TWO_HOURS && now < close) {
    jobs.push({ kind: "aviso_cierre", key: `aviso_cierre:${next}`, resolution: next });
  }

  const resolveAt = resolutionInstant(game.startDate, next, game.resolveTime, game.timezone);
  if (now >= resolveAt) {
    jobs.push({ kind: "resolucion", key: `resolucion:${next}`, resolution: next });
  }

  return jobs;
}

/** ¿Se pueden dar todavía órdenes para la próxima resolución? */
export function ordersOpen(now: Date, game: GameClock): boolean {
  const next = game.currentResolution + 1;
  if (next > game.weeks * 2) return false;
  return now < resolutionInstant(game.startDate, next, game.closeTime, game.timezone);
}
