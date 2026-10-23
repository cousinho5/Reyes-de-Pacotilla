// Bloque 13: qué cinemáticas tiene cada casa y cuáles ha visto. El servidor
// solo dice cuáles hay (con sus datos, siempre públicos) y si se han visto; el
// cliente las dibuja, decide cuáles salen solas y marca las vistas.

import { EVENTS, eventLine, eventText, zonedToUtc, type EventKey, type WeekEvent } from "@reyes/engine";
import { type GameRow } from "./state";

export type CinematicKind = "prologo" | "evento" | "fantasma" | "ultima" | "coronacion";

export interface CinematicView {
  /** "prologo", "evento:3", "fantasma:2", "ultima" o "coronacion". */
  clave: string;
  tipo: CinematicKind;
  semana: number;
  /** Para ordenarlas: semana * 10 + día (0 = lunes). */
  orden: number;
  /** Ya no sale sola: se vio o se pasó por alto. */
  vista: boolean;
  /** Se pasó por alto porque había demasiadas a la vez (la lista la marca como nueva). */
  sinVer?: boolean;
  /** Sale sola la primera vez (el prólogo, solo si la partida va por la semana 1). */
  sola: boolean;
  datos?: Record<string, unknown>;
}

export interface CinematicsInput {
  status: GameRow["status"];
  weeks: number;
  /** Semana en curso (1 = la primera); más que `weeks` si ya acabó. */
  week: number;
  events: { week: number; key: EventKey; params: string | null }[];
  /** Lo que dijo el difunto rey en cada boletín del domingo (si salió). */
  kings: { week: number; kind: "fantasma" | "muerte"; line: string }[];
  seen: { key: string; watched: number }[];
  seed: string;
}

const KEY = /^(prologo|ultima|coronacion|(evento|fantasma):\d{1,2})$/;

/** Una clave de cinemática válida (para la API). */
export function isCinematicKey(key: string): boolean {
  return KEY.test(key);
}

/** Las cinemáticas que ya existen para una casa, en orden. */
export function cinematicsList(input: CinematicsInput): CinematicView[] {
  if (input.status === "lobby") return [];
  const seen = new Map(input.seen.map((s) => [s.key, s.watched]));
  const out: CinematicView[] = [];
  const add = (clave: string, tipo: CinematicKind, semana: number, day: number, sola: boolean, datos?: Record<string, unknown>) => {
    const w = seen.get(clave);
    out.push({
      clave,
      tipo,
      semana,
      orden: semana * 10 + day,
      vista: w != null,
      ...(w === 0 ? { sinVer: true } : {}),
      sola,
      ...(datos ? { datos } : {}),
    });
  };
  add("prologo", "prologo", 1, 0, input.week <= 1);
  for (const e of input.events) {
    const event: WeekEvent = { key: e.key, ...(e.params ? (JSON.parse(e.params) as Partial<WeekEvent>) : {}) };
    if (!EVENTS[event.key]) continue;
    add(`evento:${e.week}`, "evento", e.week, 1, true, {
      clave: event.key,
      nombre: EVENTS[event.key].nombre,
      texto: eventText(event),
      linea: eventLine(input.seed, e.week, event),
    });
  }
  for (const k of input.kings) add(`fantasma:${k.week}`, "fantasma", k.week, 6, true, { como: k.kind, linea: k.line });
  if (input.weeks > 1 && input.week >= input.weeks) add("ultima", "ultima", input.weeks, 0, input.status === "active");
  if (input.status === "finished") add("coronacion", "coronacion", input.weeks + 1, 0, true);
  return out.sort((a, b) => a.orden - b.orden);
}

/**
 * Qué dijo el difunto rey en un boletín guardado. Los de antes del bloque 13 no
 * lo apuntan: se busca en su sección y se reconoce la muerte por el ave.
 */
export function kingOf(content: string): { kind: "fantasma" | "muerte"; line: string } | null {
  const b = JSON.parse(content) as { king?: { kind: "fantasma" | "muerte"; line: string }; sections?: { title: string; lines: string[] }[] };
  if (b.king) return b.king;
  const line = b.sections?.find((s) => s.title === "Del difunto rey")?.lines[0];
  if (!line) return null;
  return { kind: /pollo|\bave\b|banquete/i.test(line) ? "muerte" : "fantasma", line };
}

/** La semana en curso de una partida que empezó el lunes `start` (1 = la primera), en su hora local. */
export function weekOf(start: string | null, now: Date, timeZone = "UTC"): number {
  if (!start) return 0;
  const days = Math.floor((now.getTime() - zonedToUtc(start, "00:00", timeZone).getTime()) / 864e5);
  return Math.max(1, Math.floor(days / 7) + 1);
}

export async function cinematicsView(db: D1Database, game: GameRow, houseId: number, now: Date): Promise<CinematicView[]> {
  if (game.status === "lobby") return [];
  const [events, bulletins, seen] = await Promise.all([
    db
      .prepare("SELECT week, event_key, params FROM game_events WHERE game_id = ? AND announced_at IS NOT NULL ORDER BY week")
      .bind(game.id)
      .all<{ week: number; event_key: EventKey; params: string | null }>(),
    db
      .prepare("SELECT week, content FROM bulletins WHERE game_id = ? AND edition = 'domingo' AND week > 0 ORDER BY week")
      .bind(game.id)
      .all<{ week: number; content: string }>(),
    db.prepare("SELECT key, watched FROM cinematics_seen WHERE house_id = ?").bind(houseId).all<{ key: string; watched: number }>(),
  ]);
  const kings = bulletins.results.flatMap((b) => {
    const k = kingOf(b.content);
    return k ? [{ week: b.week, ...k }] : [];
  });
  return cinematicsList({
    status: game.status,
    weeks: game.weeks,
    week: game.status === "finished" ? game.weeks + 1 : weekOf(game.start_date, now, game.timezone),
    events: events.results.map((e) => ({ week: e.week, key: e.event_key, params: e.params })),
    kings,
    seen: seen.results,
    seed: game.seed,
  });
}
