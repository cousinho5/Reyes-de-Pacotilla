// Boletines de Fray Abundio en D1. Se publican tras la resolución del domingo
// (el último, al terminar la partida, con los objetivos secretos) y, desde el
// bloque 3, tras la del miércoles (la hoja volandera). Usan los hechos públicos
// del registro, los tratos, sobornos y proclamas de la semana y las frases ya
// usadas, para no repetirlas.

import {
  BRIBE_COST,
  OBJECTIVES,
  MIDWEEK_TYPES,
  PHRASES,
  PROCLAMATION,
  writeBulletin,
  writeChronicle,
  type Bulletin,
  type BulletinEdition,
  type BulletinFact,
  type ObjectiveKey,
} from "@reyes/engine";
import { notifyHouses, type NotifyEnv } from "./notify";
import { computeAllPrestige, gameNow, loadHouses, loadTiles, rhythmOf, toEngineTiles, type GameRow } from "./state";

export interface StoredBulletin extends Bulletin {
  /** Último evento del registro incluido (el siguiente boletín empieza después). */
  lastEventId: number;
}

export async function publishBulletin(
  env: NotifyEnv,
  game: GameRow,
  week: number,
  final = false,
  edition: BulletinEdition = "domingo",
): Promise<void> {
  const db = env.DB;
  const mid = edition === "miercoles";
  const exists = await db.prepare("SELECT 1 AS x FROM bulletins WHERE game_id = ? AND week = ? AND edition = ?").bind(game.id, week, edition).first();
  if (exists) return;
  const now = gameNow(game);
  const [houses, tileRows, prevSunday, midweek, used, bribes, proclamations] = await Promise.all([
    loadHouses(db, game.id),
    loadTiles(db, game.id),
    db.prepare("SELECT content FROM bulletins WHERE game_id = ? AND week < ? AND week > 0 AND edition = 'domingo' ORDER BY week DESC LIMIT 1")
      .bind(game.id, week)
      .first<{ content: string }>(),
    // El domingo, la hoja volandera de esa misma semana (lo que ya contó no se repite).
    mid
      ? null
      : db.prepare("SELECT content FROM bulletins WHERE game_id = ? AND week = ? AND edition = 'miercoles'").bind(game.id, week).first<{ content: string }>(),
    db.prepare("SELECT phrase_key FROM phrase_usage WHERE game_id = ?").bind(game.id).all<{ phrase_key: string }>(),
    mid
      ? { results: [] }
      : db.prepare("SELECT house_id, template_key, amount FROM bribes WHERE game_id = ? AND week = ?")
          .bind(game.id, week)
          .all<{ house_id: number; template_key: string; amount: number }>(),
    mid
      ? { results: [] }
      : db.prepare("SELECT house_id, text FROM proclamations WHERE game_id = ? AND week = ? ORDER BY updated_at, house_id")
          .bind(game.id, week)
          .all<{ house_id: number; text: string }>(),
  ]);
  const previous = prevSunday ? (JSON.parse(prevSunday.content) as StoredBulletin) : null;
  const told = midweek ? (JSON.parse(midweek.content) as StoredBulletin).lastEventId : 0;
  // Hechos desde el domingo anterior: el miércoles, los de mitad de semana; el
  // domingo, toda la semana, marcando los que ya contó la hoja volandera.
  const since = previous?.lastEventId ?? 0;
  const per = rhythmOf(game).days.length;
  const [facts, trades, crown, pastRows, prevRanking] = await Promise.all([
    db.prepare(
      "SELECT e.id, e.type, e.payload, r.number AS resolution FROM event_log e LEFT JOIN resolutions r ON r.id = e.resolution_id WHERE e.game_id = ? AND e.visible_to IS NULL AND e.id > ? ORDER BY e.id",
    )
      .bind(game.id, since)
      .all<{ id: number; type: string; payload: string; resolution: number | null }>(),
    db.prepare("SELECT house_a, house_b FROM trades WHERE game_id = ? AND at >= ?")
      .bind(game.id, new Date(now.getTime() - 7 * 864e5).toISOString())
      .all<{ house_a: number; house_b: number }>(),
    db.prepare("SELECT resource, SUM(units) AS units FROM crown_purchases WHERE game_id = ? AND at >= ? GROUP BY resource")
      .bind(game.id, new Date(now.getTime() - 7 * 864e5).toISOString())
      .all<{ resource: string; units: number }>(),
    // Bloque 3: para la memoria del cronista, los combates y asedios de antes y la clasificación del domingo anterior.
    db.prepare(
      "SELECT e.type, e.payload, r.number AS resolution FROM event_log e LEFT JOIN resolutions r ON r.id = e.resolution_id WHERE e.game_id = ? AND e.visible_to IS NULL AND e.id <= ? AND e.type IN ('combate', 'asedio') ORDER BY e.id",
    )
      .bind(game.id, since)
      .all<{ type: string; payload: string; resolution: number | null }>(),
    mid || week <= 1
      ? { results: [] }
      : db.prepare("SELECT house_id FROM prestige_snapshots WHERE game_id = ? AND resolution_no = ? ORDER BY total DESC, house_id")
          .bind(game.id, (week - 1) * per)
          .all<{ house_id: number }>(),
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
  // Bloque 8: Traidor de la Corona, la casa que más alianzas ha roto (en empate, la primera en romper).
  let traitor: { house: number; broken: number } | null = null;
  if (final) {
    const row = await db
      .prepare(
        "SELECT broken_by AS house, COUNT(*) AS n, MIN(broken_at) AS first FROM alliances WHERE game_id = ? AND broken_by IS NOT NULL GROUP BY broken_by ORDER BY n DESC, first, broken_by LIMIT 1",
      )
      .bind(game.id)
      .first<{ house: number; n: number }>();
    if (row) traitor = { house: row.house, broken: row.n };
  }

  const allFacts = facts.results.map<BulletinFact>((f) => ({
    type: f.type,
    data: JSON.parse(f.payload) as Record<string, unknown>,
    resolution: f.resolution,
    ...(f.id <= told && MIDWEEK_TYPES.includes(f.type) ? { told: true } : {}),
  }));
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
    facts: allFacts,
    memory: {
      // Lo ya contado el miércoles también es pasado para la memoria del domingo.
      past: [
        ...pastRows.results.map((f) => ({ type: f.type, data: JSON.parse(f.payload) as Record<string, unknown>, resolution: f.resolution })),
        ...allFacts.filter((f) => f.told),
      ],
      ...(prevRanking.results.length > 0 ? { previousRanking: prevRanking.results.map((r) => r.house_id) } : {}),
    },
    tileNames: new Map(tileRows.map((t) => [t.id, t.name])),
    tileTypes: new Map(tiles.map((t) => [t.id, t.type])),
    tileOwners: new Map(tiles.map((t) => [t.id, t.owner])),
    trades: trades.results.map((t) => ({ a: t.house_a, b: t.house_b })),
    crown: Object.fromEntries(crown.results.map((r) => [r.resource, r.units])),
    bribes: bribes.results.map((b) => ({ house: b.house_id, template: Number(b.template_key), amount: b.amount })),
    used: used.results.map((u) => u.phrase_key),
    edition,
    proclamations: proclamations.results.map((p) => ({ house: p.house_id, text: p.text })),
    final: final
      ? {
          objectives: houses
            .filter((h) => h.objective_key)
            .map((h) => ({ house: h.id, text: OBJECTIVES[h.objective_key as ObjectiveKey] ?? h.objective_key!, met: h.objective_met === 1 })),
          patron,
          traitor,
        }
      : undefined,
  });
  const stored: StoredBulletin = { ...bulletin, lastEventId: facts.results.at(-1)?.id ?? since };

  try {
    await db.batch([
      db.prepare("INSERT INTO job_runs (game_id, job_key) VALUES (?, ?)").bind(game.id, mid ? `boletin:${week}:miercoles` : `boletin:${week}`),
      db.prepare("INSERT INTO bulletins (game_id, week, edition, content, published_at) VALUES (?, ?, ?, ?, ?)").bind(
        game.id,
        week,
        edition,
        JSON.stringify(stored),
        now.toISOString(),
      ),
      ...bulletin.used.map((k) => db.prepare("INSERT OR IGNORE INTO phrase_usage (game_id, phrase_key) VALUES (?, ?)").bind(game.id, k)),
      db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) VALUES (?, 'boletin', NULL, ?)").bind(
        game.id,
        JSON.stringify({ week, headline: bulletin.headline, ...(mid ? { edition } : {}) }),
      ),
    ]);
  } catch (err) {
    if (err instanceof Error && /UNIQUE constraint failed/.test(err.message)) return;
    throw err;
  }
  await notifyHouses(env, houses.map((h) => h.id), {
    kind: "boletin",
    title: mid ? "La hoja volandera de Fray Abundio" : "El boletín de Fray Abundio",
    body: bulletin.headline.charAt(0) + bulletin.headline.slice(1).toLowerCase(),
    url: `/partida/${game.id}`,
    dedupe: mid ? `boletin:${game.id}:${week}:miercoles` : `boletin:${game.id}:${week}`,
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

/** Bloque 3: la proclama de esta casa para el boletín del domingo de la semana `week`. */
export async function proclamationView(db: D1Database, game: GameRow, houseId: number, week: number | null) {
  if (week == null) return null;
  const row = await db
    .prepare("SELECT text FROM proclamations WHERE game_id = ? AND house_id = ? AND week = ?")
    .bind(game.id, houseId, week)
    .first<{ text: string }>();
  return { semana: week, texto: row?.text ?? null, max: PROCLAMATION.maxLetters };
}

/**
 * Bloque 3: la Crónica Definitiva, al acabar la partida. Se guarda como la
 * semana 0 y se lee en el mismo pergamino que los boletines.
 */
export async function publishChronicle(env: NotifyEnv, game: GameRow): Promise<void> {
  const db = env.DB;
  const exists = await db.prepare("SELECT 1 AS x FROM bulletins WHERE game_id = ? AND week = 0").bind(game.id).first();
  if (exists) return;
  const per = rhythmOf(game).days.length;
  const [houses, tileRows, end, facts, snapshots] = await Promise.all([
    loadHouses(db, game.id),
    loadTiles(db, game.id),
    db.prepare("SELECT payload FROM event_log WHERE game_id = ? AND type = 'fin' ORDER BY id DESC LIMIT 1").bind(game.id).first<{ payload: string }>(),
    db.prepare(
      "SELECT e.type, e.payload, r.number AS resolution FROM event_log e LEFT JOIN resolutions r ON r.id = e.resolution_id WHERE e.game_id = ? AND e.visible_to IS NULL AND e.type IN ('combate', 'alianza_rota') ORDER BY e.id",
    )
      .bind(game.id)
      .all<{ type: string; payload: string; resolution: number | null }>(),
    db.prepare("SELECT house_id, resolution_no, total FROM prestige_snapshots WHERE game_id = ? AND resolution_no % ? = 0 ORDER BY resolution_no, total DESC, house_id")
      .bind(game.id, per)
      .all<{ house_id: number; resolution_no: number; total: number }>(),
  ]);
  const winner = end ? (JSON.parse(end.payload) as { winner: number | null }).winner : null;
  if (winner == null) return;
  // La semana de cada hecho sale de su resolución; las alianzas rotas sin resolución, de la anterior.
  let lastResolution = 0;
  const logged = facts.results.map((f) => {
    if (f.resolution != null) lastResolution = f.resolution;
    const r = f.resolution ?? lastResolution + 1;
    return { type: f.type, data: JSON.parse(f.payload) as Record<string, unknown>, resolution: f.resolution, week: Math.ceil(r / per) };
  });
  const weeklyRanking: number[][] = [];
  for (let w = 1; w <= game.weeks; w++) {
    const rows = snapshots.results.filter((x) => x.resolution_no === w * per);
    if (rows.length > 0) weeklyRanking.push(rows.map((x) => x.house_id));
  }
  const chronicle = writeChronicle({
    seed: game.seed,
    houses: houses.map((h) => ({ id: h.id, name: h.name, motto: h.motto, color: h.color, symbol: h.symbol, prestige: 0 })),
    winner,
    facts: logged,
    weeklyRanking,
    tileNames: new Map(tileRows.map((t) => [t.id, t.name])),
  });
  const now = gameNow(game);
  try {
    await db.batch([
      db.prepare("INSERT INTO job_runs (game_id, job_key) VALUES (?, ?)").bind(game.id, "cronica"),
      db.prepare("INSERT INTO bulletins (game_id, week, edition, content, published_at) VALUES (?, 0, 'domingo', ?, ?)").bind(
        game.id,
        JSON.stringify({ ...chronicle, lastEventId: 0 }),
        now.toISOString(),
      ),
    ]);
  } catch (err) {
    if (err instanceof Error && /UNIQUE constraint failed/.test(err.message)) return;
    throw err;
  }
  await notifyHouses(env, houses.map((h) => h.id), {
    kind: "boletin",
    title: "La Crónica Definitiva",
    body: "Fray Abundio cuenta cómo fue de verdad el interregno. Más o menos.",
    url: `/partida/${game.id}`,
    dedupe: `cronica:${game.id}`,
  });
}

/** Bloque 3: la fe de erratas de las casas que no ganaron, al pie de la Crónica (proclamas de la semana 0). */
export async function errataView(db: D1Database, gameId: number) {
  const rows = await db
    .prepare("SELECT house_id, text FROM proclamations WHERE game_id = ? AND week = 0 ORDER BY updated_at, house_id")
    .bind(gameId)
    .all<{ house_id: number; text: string }>();
  return rows.results.map((r) => ({ casa: r.house_id, texto: r.text }));
}
