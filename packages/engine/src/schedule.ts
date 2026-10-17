// Calendario de la partida en hora local. Los cron de Cloudflare van en UTC,
// así que el cron se ejecuta cada hora y estas funciones deciden, en la zona
// horaria de la partida (Europe/Madrid por defecto), qué toca hacer. Así los
// cambios de horario de verano e invierno no mueven las 22:00.

import { RHYTHM } from "./rules";

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = domingo ... 6 = sábado */
  weekday: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Fecha y hora locales de un instante en una zona horaria. */
export function localParts(instant: Date, timeZone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(instant).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WEEKDAYS.indexOf(p.weekday ?? ""),
  };
}

/** Fecha local en formato AAAA-MM-DD (clave de la producción diaria). */
export function localDate(instant: Date, timeZone: string): string {
  const p = localParts(instant, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Instante UTC de una fecha y hora locales ("2026-10-28", "22:00"). */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const [h, mi] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Ajuste por la diferencia entre la hora local resultante y la deseada (dos pasadas cubren el cambio de hora).
  let ts = guess;
  for (let i = 0; i < 2; i++) {
    const p = localParts(new Date(ts), timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    ts += guess - asUtc;
  }
  return new Date(ts);
}

/** Una resolución cada día (diseño v3). */
export const DAILY_DAYS = [0, 1, 2, 3, 4, 5, 6];
/** Miércoles y domingo (diseño v2, partidas empezadas antes del cambio). */
export const TWICE_WEEKLY_DAYS = [2, 6];

/** Lee los días con resolución guardados como texto ("2,6" o "0,1,2,3,4,5,6"). */
export function parseResolutionDays(text: string | null | undefined): number[] {
  const days = (text ?? "")
    .split(",")
    .filter((d) => d.trim() !== "")
    .map((d) => Number(d.trim()))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return days.length ? [...new Set(days)].sort((a, b) => a - b) : [...TWICE_WEEKLY_DAYS];
}

/** Resoluciones que tiene una partida. */
export function totalResolutions(weeks: number, days: number[] = RHYTHM.days): number {
  return weeks * days.length;
}

/** Resoluciones que dura fortificar con un ritmo: unos 7 días de protección como mucho. */
export function fortifyResolutions(days: number[]): number {
  return days.length >= 5 ? 4 : 2;
}

/**
 * Semana, día (0 = lunes) y tipo de la resolución n. El miércoles trae la Gran
 * Subasta y el evento de combate; el domingo, el mantenimiento y el boletín.
 */
export function resolutionInfo(
  n: number,
  days: number[] = RHYTHM.days,
): { week: number; weekday: number; kind: "miercoles" | "domingo" | "dia" } {
  const per = days.length;
  const week = Math.ceil(n / per);
  const weekday = days[(((n - 1) % per) + per) % per]!;
  return { week, weekday, kind: weekday === 2 ? "miercoles" : weekday === 6 ? "domingo" : "dia" };
}

/**
 * Instante de la resolución n de una partida que empieza el lunes `startMonday`
 * (fecha local AAAA-MM-DD), a `resolveTime` del día que le toca.
 */
export function resolutionInstant(
  startMonday: string,
  n: number,
  resolveTime: string,
  timeZone: string,
  days: number[] = RHYTHM.days,
): Date {
  const { week, weekday } = resolutionInfo(n, days);
  const offsetDays = (week - 1) * 7 + weekday;
  const [y, m, d] = startMonday.split("-").map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, m - 1, d + offsetDays));
  const date = `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
  return zonedToUtc(date, resolveTime, timeZone);
}

/** Anuncio de la semana (lotes de la Gran Subasta y evento): el martes a `time`. */
export function announceInstant(startMonday: string, week: number, time: string, timeZone: string): Date {
  const [y, m, d] = startMonday.split("-").map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, m - 1, d + (week - 1) * 7 + 1));
  const date = `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
  return zonedToUtc(date, time, timeZone);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
