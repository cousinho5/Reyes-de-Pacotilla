// Bloque 13: lo que necesita la cinemática de la coronación (puntos 3, 4 y 10).
// Solo existe con la partida acabada: entonces ya no hay niebla, y el mapa
// semana a semana, los títulos y la clasificación final son de todos. Lo usan
// el estado de la partida y la página pública del enlace para compartirla.

import {
  OBJECTIVE_KEYS,
  objectiveText,
  castleStage,
  combatTitleStats,
  comebacks,
  endTitles,
  guestTroops,
  type ObjectiveKey,
  type TitleCombat,
} from "@reyes/engine";
import { shieldView } from "./heraldry";
import { loadBuildings, loadGame, loadHouses, loadTiles, rhythmOf, toEngineTiles, type GameRow } from "./state";

export interface CoronationView {
  ganador: number | null;
  /** Clasificación final, de primero a último, con el Prestigio de cada casa. */
  clasificacion: { casa: number; total: number }[];
  titulos: { casa: number; clave: string; nombre: string; n: number; linea: string; rey: boolean }[];
  /** De quién era cada casilla al cerrar cada semana; faltan las semanas sin foto. */
  semanas: { semana: number; duenos: [number, number][] }[];
}

/** Clave del enlace público: 128 bits al azar, imposible de adivinar. */
export function newShareKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function coronationView(db: D1Database, game: GameRow): Promise<CoronationView | null> {
  if (game.status !== "finished") return null;
  const per = rhythmOf(game).days.length;
  const [houses, tileRows, buildings, end, combats, ruins, trades, lots, alliances, bribes, sundays, weeks] = await Promise.all([
    loadHouses(db, game.id),
    loadTiles(db, game.id),
    loadBuildings(db, game.id),
    db
      .prepare("SELECT payload FROM event_log WHERE game_id = ? AND type = 'fin' ORDER BY id DESC LIMIT 1")
      .bind(game.id)
      .first<{ payload: string }>(),
    db
      .prepare("SELECT payload FROM event_log WHERE game_id = ? AND type = 'combate' AND visible_to IS NULL")
      .bind(game.id)
      .all<{ payload: string }>(),
    db
      .prepare(
        "SELECT json_extract(payload, '$.house') AS house, COUNT(*) AS n FROM event_log WHERE game_id = ? AND type = 'ruinas' GROUP BY house",
      )
      .bind(game.id)
      .all<{ house: number; n: number }>(),
    db.prepare("SELECT house_a, house_b FROM trades WHERE game_id = ?").bind(game.id).all<{ house_a: number; house_b: number }>(),
    db
      .prepare(
        "SELECT winner_house_id AS house, COUNT(*) AS n FROM auction_lots WHERE game_id = ? AND winner_house_id IS NOT NULL GROUP BY winner_house_id",
      )
      .bind(game.id)
      .all<{ house: number; n: number }>(),
    db
      .prepare(
        "SELECT house_a, house_b, signed_resolution, broken_by, ends_resolution FROM alliances WHERE game_id = ? AND signed_resolution IS NOT NULL",
      )
      .bind(game.id)
      .all<{ house_a: number; house_b: number; signed_resolution: number; broken_by: number | null; ends_resolution: number | null }>(),
    db
      .prepare("SELECT house_id AS house, SUM(amount) AS n FROM bribes WHERE game_id = ? GROUP BY house_id")
      .bind(game.id)
      .all<{ house: number; n: number }>(),
    db
      .prepare(
        "SELECT house_id, resolution_no FROM prestige_snapshots WHERE game_id = ? AND resolution_no % ? = 0 ORDER BY resolution_no, total DESC, house_id",
      )
      .bind(game.id, per)
      .all<{ house_id: number; resolution_no: number }>(),
    db
      .prepare("SELECT week, owners FROM territory_snapshots WHERE game_id = ? ORDER BY week")
      .bind(game.id)
      .all<{ week: number; owners: string }>(),
  ]);
  const fin = end ? (JSON.parse(end.payload) as { winner: number | null; ranking: { house: number; total: number }[] }) : null;
  const ranking = fin?.ranking ?? [];
  const winner = fin?.winner ?? null;
  const tiles = toEngineTiles(tileRows);
  const count = (rows: { house: number; n: number }[], h: number) => rows.find((r) => r.house === h)?.n ?? 0;

  const fromCombats = combatTitleStats(combats.results.map((c) => JSON.parse(c.payload) as TitleCombat));
  const weekly: number[][] = [];
  for (const r of [...new Set(sundays.results.map((s) => s.resolution_no))])
    weekly.push(sundays.results.filter((s) => s.resolution_no === r).map((s) => s.house_id));
  const climbs = comebacks(
    weekly,
    ranking.map((r) => r.house),
  );
  const titles = endTitles(
    houses.map((h) => ({
      house: h.id,
      conquests: 0,
      riverWins: 0,
      defenses: 0,
      tilesLost: 0,
      ...fromCombats.get(h.id),
      siegeNights: h.siege_nights,
      trades: trades.results.filter((t) => t.house_a === h.id || t.house_b === h.id).length,
      buildingLevels: Object.values(buildings.get(h.id) ?? {}).reduce((a, l) => a + l, 0),
      gold: h.oro,
      troops: tiles.filter((t) => t.owner === h.id).reduce((a, t) => a + t.troops, 0) + guestTroops(tiles, h.id),
      auctions: count(lots.results, h.id),
      betrayals: alliances.results.filter((a) => a.broken_by === h.id).length,
      allianceNights: alliances.results
        .filter((a) => (a.house_a === h.id || a.house_b === h.id) && a.broken_by !== h.id)
        .reduce((n, a) => n + Math.max(0, (a.ends_resolution ?? game.current_resolution) - a.signed_resolution + 1), 0),
      bribes: count(bribes.results, h.id),
      ruins: count(ruins.results, h.id),
      comeback: climbs.get(h.id) ?? 0,
      castleTroops: tiles.find((t) => t.castleOf === h.id && t.owner === h.id)?.troops ?? 0,
    })),
    winner,
    game.seed,
    new Map(houses.map((h) => [h.id, h.name])),
  );
  return {
    ganador: winner,
    clasificacion: ranking.map((r) => ({ casa: r.house, total: r.total })),
    titulos: titles.map((t) => ({ casa: t.house, clave: t.key, nombre: t.name, n: t.n, linea: t.line, rey: t.king })),
    semanas: weeks.results.map((w) => ({ semana: w.week, duenos: JSON.parse(w.owners) as [number, number][] })),
  };
}

/** La clave del enlace de una partida acabada; las acabadas antes de haber enlaces la reciben al pedirla. */
export async function shareKeyOf(db: D1Database, game: GameRow): Promise<string | null> {
  if (game.status !== "finished") return null;
  if (game.share_key) return game.share_key;
  await db.prepare("UPDATE games SET share_key = ? WHERE id = ? AND share_key IS NULL").bind(newShareKey(), game.id).run();
  const row = await db.prepare("SELECT share_key FROM games WHERE id = ?").bind(game.id).first<{ share_key: string | null }>();
  return row?.share_key ?? null;
}

/**
 * La página pública de la coronación (punto 10): sin cuenta, con la clave del
 * enlace y solo con la partida acabada. Lleva lo que ya es de todos al acabar:
 * nombres, escudos, lemas, el mapa sin tropas, los objetivos revelados, los
 * títulos y la clasificación. Nada de recursos, órdenes, tratos ni mensajes.
 */
export async function publicCoronation(db: D1Database, key: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(key)) return null;
  const row = await db.prepare("SELECT id FROM games WHERE share_key = ? AND status = 'finished'").bind(key).first<{ id: number }>();
  const game = row ? await loadGame(db, row.id) : null;
  if (!game) return null;
  const [houses, tileRows, buildings, coronation] = await Promise.all([
    loadHouses(db, game.id),
    loadTiles(db, game.id),
    loadBuildings(db, game.id),
    coronationView(db, game),
  ]);
  return {
    partida: {
      id: game.id,
      nombre: game.name,
      estado: game.status,
      semanas: game.weeks,
      columnas: game.map_cols,
      filas: game.map_rows,
      costa: game.map_coast ?? null,
    },
    casas: houses.map((h) => ({
      id: h.id,
      nombre: h.name,
      color: h.color,
      lema: h.motto,
      escudo: shieldView(h),
      etapa: castleStage(buildings.get(h.id)!),
      objetivo: h.objective_key
        ? { clave: h.objective_key, texto: OBJECTIVE_KEYS.includes(h.objective_key as ObjectiveKey) ? objectiveText(h.objective_key as ObjectiveKey, game.weeks) : h.objective_key, cumplido: h.objective_met === 1 }
        : null,
    })),
    casillas: toEngineTiles(tileRows).map((t) => ({
      id: t.id,
      x: t.x,
      y: t.y,
      type: t.type,
      owner: t.owner,
      river: t.river ?? 0,
      castleOf: t.castleOf ?? null,
    })),
    coronacion: coronation,
  };
}
