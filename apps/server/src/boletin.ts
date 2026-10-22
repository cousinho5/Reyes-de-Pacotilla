// Boletín semanal de Fray Abundio en D1. Se publica tras la resolución del
// domingo (el último, al terminar la partida, con los objetivos secretos).
// Usa los hechos públicos del registro desde el boletín anterior, los tratos y
// sobornos de la semana y las frases ya usadas, para no repetirlas.

import {
  BRIBE_COST,
  OBJECTIVES,
  PHRASES,
  writeBulletin,
  type Bulletin,
  type BulletinFact,
  type ObjectiveKey,
} from "@reyes/engine";
import { notifyHouses, type NotifyEnv } from "./notify";
import { computeAllPrestige, gameNow, loadHouses, loadTiles, toEngineTiles, type GameRow } from "./state";

export interface StoredBulletin extends Bulletin {
  /** Último evento del registro incluido (el siguiente boletín empieza después). */
  lastEventId: number;
}

export async function publishBulletin(env: NotifyEnv, game: GameRow, week: number, final = false): Promise<void> {
  const db = env.DB;
  const exists = await db.prepare("SELECT 1 AS x FROM bulletins WHERE game_id = ? AND week = ?").bind(game.id, week).first();
  if (exists) return;
  const now = gameNow(game);
  const [houses, tileRows, prev, used, bribes] = await Promise.all([
    loadHouses(db, game.id),
    loadTiles(db, game.id),
    db.prepare("SELECT content FROM bulletins WHERE game_id = ? AND week < ? AND week > 0 ORDER BY week DESC LIMIT 1")
      .bind(game.id, week)
      .first<{ content: string }>(),
    db.prepare("SELECT phrase_key FROM phrase_usage WHERE game_id = ?").bind(game.id).all<{ phrase_key: string }>(),
    db.prepare("SELECT house_id, template_key, amount FROM bribes WHERE game_id = ? AND week = ?")
      .bind(game.id, week)
      .all<{ house_id: number; template_key: string; amount: number }>(),
  ]);
  const previous = prev ? (JSON.parse(prev.content) as StoredBulletin) : null;
  const since = previous?.lastEventId ?? 0;
  const [facts, trades, crown] = await Promise.all([
    db.prepare("SELECT id, type, payload FROM event_log WHERE game_id = ? AND visible_to IS NULL AND id > ? ORDER BY id")
      .bind(game.id, since)
      .all<{ id: number; type: string; payload: string }>(),
    db.prepare("SELECT house_a, house_b FROM trades WHERE game_id = ? AND at >= ?")
      .bind(game.id, new Date(now.getTime() - 7 * 864e5).toISOString())
      .all<{ house_a: number; house_b: number }>(),
    db.prepare("SELECT resource, SUM(units) AS units FROM crown_purchases WHERE game_id = ? AND at >= ? GROUP BY resource")
      .bind(game.id, new Date(now.getTime() - 7 * 864e5).toISOString())
      .all<{ resource: string; units: number }>(),
  ]);
  const tiles = toEngineTiles(tileRows);
  const prestige = await computeAllPrestige(db, game.id, houses, tiles, now);

  // En el último boletín el Prestigio incluye el objetivo secreto (ya calculado en el final).
  const finalTotals = final
    ? await db
        .prepare("SELECT payload FROM event_log WHERE game_id = ? AND type = 'fin' ORDER BY id DESC LIMIT 1")
        .bind(game.id)
        .first<{ payload: string }>()
    : null;
  const ranking = finalTotals ? (JSON.parse(finalTotals.payload) as { ranking: { house: number; total: number }[] }).ranking : null;

  let patron: { house: number; gold: number } | null = null;
  if (final) {
    const row = await db
      .prepare("SELECT house_id, SUM(amount) AS gold FROM bribes WHERE game_id = ? GROUP BY house_id ORDER BY gold DESC, house_id LIMIT 1")
      .bind(game.id)
      .first<{ house_id: number; gold: number }>();
    if (row) patron = { house: row.house_id, gold: row.gold };
  }

  const bulletin = writeBulletin({
    seed: game.seed,
    week,
    totalWeeks: game.weeks,
    houses: houses.map((h) => ({
      id: h.id,
      name: h.name,
      motto: h.motto,
      color: h.color,
      symbol: h.symbol,
      metal: h.metal,
      division: h.shield_division,
      color2: h.color2,
      prestige: ranking?.find((r) => r.house === h.id)?.total ?? prestige.get(h.id)?.total ?? 0,
    })),
    previousLeader: previous?.leader ?? null,
    facts: facts.results.map<BulletinFact>((f) => ({ type: f.type, data: JSON.parse(f.payload) as Record<string, unknown> })),
    tileNames: new Map(tileRows.map((t) => [t.id, t.name])),
    trades: trades.results.map((t) => ({ a: t.house_a, b: t.house_b })),
    crown: Object.fromEntries(crown.results.map((r) => [r.resource, r.units])),
    bribes: bribes.results.map((b) => ({ house: b.house_id, template: Number(b.template_key), amount: b.amount })),
    used: used.results.map((u) => u.phrase_key),
    final: final
      ? {
          objectives: houses
            .filter((h) => h.objective_key)
            .map((h) => ({ house: h.id, text: OBJECTIVES[h.objective_key as ObjectiveKey] ?? h.objective_key!, met: h.objective_met === 1 })),
          patron,
        }
      : undefined,
  });
  const stored: StoredBulletin = { ...bulletin, lastEventId: facts.results.at(-1)?.id ?? since };

  try {
    await db.batch([
      db.prepare("INSERT INTO job_runs (game_id, job_key) VALUES (?, ?)").bind(game.id, `boletin:${week}`),
      db.prepare("INSERT INTO bulletins (game_id, week, content, published_at) VALUES (?, ?, ?, ?)").bind(
        game.id,
        week,
        JSON.stringify(stored),
        now.toISOString(),
      ),
      ...bulletin.used.map((k) => db.prepare("INSERT OR IGNORE INTO phrase_usage (game_id, phrase_key) VALUES (?, ?)").bind(game.id, k)),
      db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) VALUES (?, 'boletin', NULL, ?)").bind(
        game.id,
        JSON.stringify({ week, headline: bulletin.headline }),
      ),
    ]);
  } catch (err) {
    if (err instanceof Error && /UNIQUE constraint failed/.test(err.message)) return;
    throw err;
  }
  await notifyHouses(env, houses.map((h) => h.id), {
    kind: "boletin",
    title: "El boletín de Fray Abundio",
    body: bulletin.headline.charAt(0) + bulletin.headline.slice(1).toLowerCase(),
    url: `/partida/${game.id}`,
    dedupe: `boletin:${game.id}:${week}`,
  });
}

/** Lo que ve una casa del soborno de la semana: si ya pagó y las frases que puede comprar. */
export async function bribeView(db: D1Database, game: GameRow, houseId: number, houseName: string, week: number | null) {
  if (week == null) return null;
  const done = await db
    .prepare("SELECT template_key FROM bribes WHERE game_id = ? AND house_id = ? AND week = ?")
    .bind(game.id, houseId, week)
    .first<{ template_key: string }>();
  const name = /^casa\b/i.test(houseName) ? `la ${houseName}` : houseName;
  return {
    semana: week,
    coste: BRIBE_COST,
    pagado: done ? Number(done.template_key) : null,
    frases: PHRASES["soborno.frase"].map((t) => {
      const s = t.replace("{jugador}", name);
      return s.charAt(0).toUpperCase() + s.slice(1);
    }),
  };
}
