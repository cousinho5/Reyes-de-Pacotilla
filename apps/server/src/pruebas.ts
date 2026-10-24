// Partidas de prueba: para probar el juego a tu ritmo contra bots.
// - Al empezar se rellenan con bots con personalidad (`bots.ts`, los mismos
//   que en las partidas reales): cada mañana juegan su día; antes de cada
//   resolución dan órdenes (con apoyos); y contestan a las ofertas.
// - Tienen un reloj simulado: el cron no las toca y el tiempo solo avanza con
//   los botones de la mesa de pruebas, que ejecutan las mismas tareas que el
//   cron real (producción, piloto automático, resolución y final).
// - Quien las crea puede "jugar como" cualquier casa.

import { localDate, resolutionInstant, totalResolutions, zonedToUtc } from "@reyes/engine";
import { addBotOrders, botsAnswerOffers, botsDiplomacy, botsPlayDay, type BotEnv } from "./bots";
import { clockOf, runGameJobs } from "./jobs";
import type { NotifyEnv } from "./notify";
import { gameNow, loadGame, loadHouses, rhythmOf, type GameRow } from "./state";

/** Hora local a la que empieza cada día simulado. */
const MORNING = "09:00";
/** Pasos como mucho por llamada (un paso = una mañana o una resolución). */
const MAX_STEPS = 8;

/** Instante en que empieza la partida de prueba: el lunes de inicio a las 9:00. */
export function testStart(startDate: string, timeZone: string): Date {
  return zonedToUtc(startDate, MORNING, timeZone);
}

/** Siguiente parada del reloj simulado: la próxima mañana o la resolución, lo que llegue antes. */
export function nextStop(game: GameRow, now: Date): Date {
  const today = localDate(now, game.timezone);
  const todayMorning = zonedToUtc(today, MORNING, game.timezone);
  const morning = now < todayMorning ? todayMorning : zonedToUtc(addDays(today, 1), MORNING, game.timezone);
  const clock = clockOf(game);
  const next = game.current_resolution + 1;
  if (!clock || next > totalResolutions(game.weeks, clock.days)) return morning;
  const resolve = resolutionInstant(clock.startDate, next, clock.resolveTime, clock.timezone, clock.days);
  return resolve > now && resolve < morning ? resolve : morning;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Avanza el reloj de una partida de prueba. "paso": hasta la siguiente parada.
 * "resolucion": hasta pasar la próxima resolución (o el final, si ya no quedan).
 */
export async function advance(env: BotEnv, gameId: number, until: "paso" | "resolucion"): Promise<GameRow> {
  const db = env.DB;
  let game = (await loadGame(db, gameId))!;
  const startResolution = game.current_resolution;
  for (let step = 0; step < MAX_STEPS && game.status === "active"; step++) {
    const stop = nextStop(game, gameNow(game));
    const next = game.current_resolution + 1;
    const clock = clockOf(game)!;
    const resolving =
      next <= totalResolutions(game.weeks, clock.days) &&
      stop >= resolutionInstant(clock.startDate, next, clock.resolveTime, clock.timezone, clock.days);
    // Las ofertas se hicieron durante el día: los bots contestan antes de nada.
    await botsAnswerOffers(env, game);
    // Bloque 8: antes de la noche, los bots contestan las propuestas de alianza que les han llegado.
    if (resolving) await botsDiplomacy(env, game, true);
    if (resolving) await addBotOrders(env, game, next);
    await db.prepare("UPDATE games SET sim_now = ? WHERE id = ?").bind(stop.toISOString(), game.id).run();
    game = { ...game, sim_now: stop.toISOString() };
    await runGameJobs(env, game, stop);
    game = (await loadGame(db, gameId))!;
    // Cada mañana, tras la producción, los bots juegan su día.
    if (!resolving && game.status === "active") await botsPlayDay(env, game);

    if (until === "paso") break;
    const total = totalResolutions(game.weeks, rhythmOf(game).days);
    if (game.current_resolution > startResolution && game.current_resolution < total) break;
  }
  return game;
}

/** Borra una partida de prueba entera, con sus bots. */
export async function deleteTestGame(env: NotifyEnv, game: GameRow): Promise<void> {
  const db = env.DB;
  const houses = await loadHouses(db, game.id);
  const botUsers = houses.filter((h) => h.is_bot === 1).map((h) => h.user_id);
  const ids = houses.map((h) => h.id);
  const inHouses = ids.length ? `(${ids.join(",")})` : "(NULL)";
  // En orden, de lo que depende de otras cosas hacia arriba.
  await db.batch([
    db.prepare("DELETE FROM event_log WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM resolutions WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM orders WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM tile_guests WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM alliances WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM trades WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM crown_purchases WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM mercenaries WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM offers WHERE game_id = ? AND parent_offer_id IS NOT NULL").bind(game.id),
    db.prepare("DELETE FROM offers WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM achievements WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM bids WHERE lot_id IN (SELECT id FROM auction_lots WHERE game_id = ?)").bind(game.id),
    db.prepare("DELETE FROM auction_lots WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM cards WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM game_events WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM bribes WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM proclamations WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM bulletins WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM phrase_usage WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM prestige_snapshots WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM territory_snapshots WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM notifications WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM job_runs WHERE game_id = ?").bind(game.id),
    // El Capitán apunta a una casilla (0009): se suelta antes de borrar las casillas.
    db.prepare("UPDATE houses SET captain_tile = NULL WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM tiles WHERE game_id = ?").bind(game.id),
    db.prepare(`DELETE FROM buildings WHERE house_id IN ${inHouses}`),
    db.prepare(`DELETE FROM cinematics_seen WHERE house_id IN ${inHouses}`),
    db.prepare("DELETE FROM houses WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM games WHERE id = ?").bind(game.id),
    ...botUsers.map((u) => db.prepare("DELETE FROM users WHERE id = ?").bind(u)),
  ]);
}

