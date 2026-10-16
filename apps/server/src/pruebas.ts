// Partidas de prueba: para probar el juego sin reunir a 4 personas.
// - Al empezar se rellenan con bots (casas que juegan solas).
// - Tienen un reloj simulado: el cron no las toca y el tiempo solo avanza con
//   los botones de la mesa de pruebas, que ejecutan las mismas tareas que el
//   cron real (producción, piloto automático, resolución y final).
// - Quien las crea puede "jugar como" cualquier casa.

import { localDate, planBotOrders, botAcceptsOffer, resolutionInstant, zonedToUtc } from "@reyes/engine";
import { hashCode, randomCode } from "./auth";
import { COLORS, pickShield } from "./heraldry";
import { clockOf, isAbsent, runGameJobs } from "./jobs";
import type { NotifyEnv } from "./notify";
import { acceptOffer, bundle, type OfferRow } from "./offers";
import { gameNow, loadGame, loadHouses, loadTiles, resourcesOf, toEngineTiles, type GameRow, type HouseRow } from "./state";

/** Hora local a la que empieza cada día simulado. */
const MORNING = "09:00";
/** Pasos como mucho por llamada (un paso = una mañana o una resolución). */
const MAX_STEPS = 8;

const BOT_HOUSES: { name: string; motto: string }[] = [
  { name: "Casa del Nabo", motto: "Raíces profundas, ideas cortas" },
  { name: "Los Pocapena", motto: "Ya si eso, mañana" },
  { name: "Gallina Bélica", motto: "Cacarea fuerte, corre más" },
  { name: "Barones del Barro", motto: "Del barro venimos" },
  { name: "Duques del Queso", motto: "Cuanto más curado, mejor" },
  { name: "Señores del Pato", motto: "Ni frío ni calor" },
  { name: "Caracol Veloz", motto: "Llegaremos" },
];

export interface BotEnv extends NotifyEnv {
  SESSION_SECRET: string;
}

/** Añade bots hasta tener `count` (y nunca más de 8 casas). Devuelve las casas resultantes. */
export async function addBots(env: BotEnv, gameId: number, count: number): Promise<HouseRow[]> {
  const db = env.DB;
  let houses = await loadHouses(db, gameId);
  const wanted = Math.min(count, 8 - houses.length);
  for (let i = 0; i < wanted; i++) {
    const color = COLORS.find((c) => !houses.some((h) => h.color === c))!;
    const who = BOT_HOUSES.find((b) => !houses.some((h) => h.name === b.name)) ?? { name: `Bot ${i + 1}`, motto: "" };
    const { shape, symbol } = pickShield(houses);
    // Cada bot es un usuario con un código que nadie conoce: no se puede entrar con él.
    const user = await db
      .prepare("INSERT INTO users (display_name, login_code_hash) VALUES (?, ?) RETURNING id")
      .bind(`Bot ${who.name}`, await hashCode(randomCode(12), env.SESSION_SECRET))
      .first<{ id: number }>();
    await db
      .prepare(
        "INSERT INTO houses (game_id, user_id, name, color, shield_shape, symbol, motto, is_bot) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
      )
      .bind(gameId, user!.id, who.name, color, shape, symbol, who.motto || null)
      .run();
    houses = await loadHouses(db, gameId);
  }
  return houses;
}

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
  if (!clock || next > game.weeks * 2) return morning;
  const resolve = resolutionInstant(clock.startDate, next, clock.resolveTime, clock.timezone);
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
    if (next <= game.weeks * 2 && stop >= resolutionInstant(clock.startDate, next, clock.resolveTime, clock.timezone)) {
      await addBotOrders(env, game, next, stop);
    }
    // Las ofertas se hicieron durante el día: los bots contestan antes de gastar en su turno.
    await botsAnswerOffers(env, game);
    await db.prepare("UPDATE games SET sim_now = ? WHERE id = ?").bind(stop.toISOString(), game.id).run();
    game = { ...game, sim_now: stop.toISOString() };
    await runGameJobs(env, game, stop);
    game = (await loadGame(db, gameId))!;

    if (until === "paso") break;
    const total = game.weeks * 2;
    if (game.current_resolution > startResolution && game.current_resolution < total) break;
  }
  return game;
}

/** Órdenes de ataque de los bots para la resolución `n` (si aún no tienen). */
async function addBotOrders(env: NotifyEnv, game: GameRow, n: number, now: Date): Promise<void> {
  const db = env.DB;
  const [houses, tileRows, existing] = await Promise.all([
    loadHouses(db, game.id),
    loadTiles(db, game.id),
    db.prepare("SELECT DISTINCT house_id FROM orders WHERE game_id = ? AND resolution_no = ?")
      .bind(game.id, n)
      .all<{ house_id: number }>(),
  ]);
  const tiles = toEngineTiles(tileRows);
  const absentHouses = houses.filter((h) => isAbsent(h, now, game)).map((h) => h.id);
  const statements: D1PreparedStatement[] = [];
  for (const h of houses) {
    if (h.is_bot !== 1 || h.id === game.played_house_id) continue;
    if (existing.results.some((e) => e.house_id === h.id)) continue;
    for (const o of planBotOrders({ house: h.id, tiles, resolution: n, absentHouses })) {
      statements.push(
        db.prepare(
          "INSERT INTO orders (game_id, house_id, resolution_no, kind, from_tile_id, troops, target_tile_id) VALUES (?, ?, ?, 'move', ?, ?, ?)",
        ).bind(game.id, h.id, n, o.from, o.troops, o.to),
      );
    }
  }
  if (statements.length > 0) await db.batch(statements);
}

/** Los bots aceptan las ofertas que les convienen y rechazan las dirigidas que no. */
async function botsAnswerOffers(env: NotifyEnv, game: GameRow): Promise<void> {
  const db = env.DB;
  const { results: offers } = await db
    .prepare("SELECT * FROM offers WHERE game_id = ? AND status = 'open' ORDER BY id")
    .bind(game.id)
    .all<OfferRow>();
  for (const offer of offers) {
    const houses = await loadHouses(db, game.id);
    const bots = houses.filter(
      (h) => h.is_bot === 1 && h.id !== game.played_house_id && h.id !== offer.from_house_id,
    );
    const candidates = offer.to_house_id == null ? bots : bots.filter((h) => h.id === offer.to_house_id);
    if (candidates.length === 0) continue;
    // Una oferta pública de otro bot no la acepta nadie: los bots solo comercian contigo.
    if (offer.to_house_id == null && houses.find((h) => h.id === offer.from_house_id)?.is_bot === 1) continue;
    const give = bundle(offer, "give");
    const want = bundle(offer, "want");
    const taker = candidates.find((h) => botAcceptsOffer(give, want, resourcesOf(h)));
    if (taker) {
      await acceptOffer(env, game, offer, taker);
    } else if (offer.to_house_id != null) {
      await db
        .prepare("UPDATE offers SET status = 'rejected', closed_at = ? WHERE id = ? AND status = 'open'")
        .bind(gameNow(game).toISOString(), offer.id)
        .run();
    }
  }
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
    db.prepare("DELETE FROM trades WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM offers WHERE game_id = ? AND parent_offer_id IS NOT NULL").bind(game.id),
    db.prepare("DELETE FROM offers WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM achievements WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM prestige_snapshots WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM notifications WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM job_runs WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM tiles WHERE game_id = ?").bind(game.id),
    db.prepare(`DELETE FROM buildings WHERE house_id IN ${inHouses}`),
    db.prepare("DELETE FROM houses WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM games WHERE id = ?").bind(game.id),
    ...botUsers.map((u) => db.prepare("DELETE FROM users WHERE id = ?").bind(u)),
  ]);
}
