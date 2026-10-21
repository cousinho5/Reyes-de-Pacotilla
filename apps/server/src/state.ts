// Lectura del estado de una partida desde D1, en los tipos del motor.

import {
  BUILDINGS,
  PRESTIGE,
  computePrestige,
  fortifyResolutions,
  parseResolutionDays,
  type AchievementKey,
  type Captain,
  type BuildingKind,
  type HouseId,
  type PrestigeBreakdown,
  type Resource,
  type Resources,
  type Tile,
  type TileType,
} from "@reyes/engine";

export interface GameRow {
  id: number;
  name: string;
  status: "lobby" | "active" | "finished";
  weeks: number;
  timezone: string;
  close_time: string;
  resolve_time: string;
  seed: string;
  start_date: string | null;
  map_cols: number | null;
  map_rows: number | null;
  /** Lados con costa (bloque 1); NULL en los mapas de antes. */
  map_coast: "oeste-este" | "norte-sur" | null;
  current_resolution: number;
  invite_code: string;
  created_by: number;
  is_test: number;
  test_bots: number | null;
  sim_now: string | null;
  played_house_id: number | null;
  /** Días con resolución, "0,1,2,3,4,5,6" (0 = lunes). Las partidas antiguas, "2,6". */
  resolution_days: string;
}

/** Días con resolución de la partida y cuánto dura fortificar con ese ritmo. */
export function rhythmOf(game: Pick<GameRow, "resolution_days">): { days: number[]; fortify: number } {
  const days = parseResolutionDays(game.resolution_days);
  return { days, fortify: fortifyResolutions(days) };
}

/** Hora de la partida: la real, o la simulada en las partidas de prueba. */
export function gameNow(game: Pick<GameRow, "is_test" | "sim_now">): Date {
  return game.is_test === 1 && game.sim_now ? new Date(game.sim_now) : new Date();
}

export interface HouseRow extends Resources {
  id: number;
  game_id: number;
  user_id: number;
  name: string;
  color: string;
  shield_shape: string;
  shield_division: string;
  color2: string | null;
  symbol: string;
  metal: string;
  motto: string | null;
  help_resource: Resource | null;
  help_until_resolution: number | null;
  vacation: number;
  last_seen_at: string | null;
  autopilot_template: string | null;
  autopilot_ran_on: string | null;
  objective_options: string | null;
  objective_key: string | null;
  objective_met: number | null;
  is_bot: number;
  bot_personality: string | null;
  /** Noches que ha tenido rodeado un castillo ajeno (Prestigio, diseño v3). */
  siege_nights: number;
  /** Capitán (diseño v3): casilla donde está (null si preso), quién lo tiene y hasta qué resolución. */
  captain_tile: number | null;
  captain_captured_by: number | null;
  captain_free_at: number | null;
  /** Puntos de Gloria (Prestigio). */
  glory: number;
}

export interface TileRow {
  id: number;
  x: number;
  y: number;
  type: TileType;
  name: string;
  owner_house_id: number | null;
  troops: number;
  /** De esas tropas, Jinetes y Catapultas (el resto, Mesnada). */
  jinetes: number;
  catapultas: number;
  fortified_until: number | null;
  castle_of: number | null;
  /** Asedio: casa que la tiene sitiada y noches que lleva. */
  besieged_by: number | null;
  siege_nights: number;
  /** Ríos por los lados de la casilla (bloque 1, 0011). */
  river: number;
}

export async function loadGame(db: D1Database, gameId: number): Promise<GameRow | null> {
  return db.prepare("SELECT * FROM games WHERE id = ?").bind(gameId).first<GameRow>();
}

export async function loadHouses(db: D1Database, gameId: number): Promise<HouseRow[]> {
  const { results } = await db.prepare("SELECT * FROM houses WHERE game_id = ? ORDER BY id").bind(gameId).all<HouseRow>();
  return results;
}

export async function loadTiles(db: D1Database, gameId: number): Promise<TileRow[]> {
  const { results } = await db
    .prepare(
      "SELECT id, x, y, type, name, owner_house_id, troops, jinetes, catapultas, fortified_until, castle_of, besieged_by, siege_nights, river FROM tiles WHERE game_id = ? ORDER BY y, x",
    )
    .bind(gameId)
    .all<TileRow>();
  return results;
}

export function toEngineTiles(rows: TileRow[]): Tile[] {
  return rows.map((t) => ({
    id: t.id,
    x: t.x,
    y: t.y,
    type: t.type,
    owner: t.owner_house_id,
    troops: t.troops,
    ...(t.jinetes > 0 ? { jinetes: t.jinetes } : {}),
    ...(t.catapultas > 0 ? { catapultas: t.catapultas } : {}),
    fortifiedUntil: t.fortified_until,
    castleOf: t.castle_of,
    ...(t.besieged_by != null ? { besiegedBy: t.besieged_by, siegeNights: t.siege_nights } : {}),
    ...(t.river ? { river: t.river } : {}),
  }));
}

export async function loadBuildings(db: D1Database, gameId: number): Promise<Map<HouseId, Record<BuildingKind, number>>> {
  const { results } = await db
    .prepare("SELECT b.house_id, b.kind, b.level FROM buildings b JOIN houses h ON h.id = b.house_id WHERE h.game_id = ?")
    .bind(gameId)
    .all<{ house_id: number; kind: BuildingKind; level: number }>();
  const out = new Map<HouseId, Record<BuildingKind, number>>();
  for (const b of results) {
    const levels = out.get(b.house_id) ?? (Object.fromEntries(BUILDINGS.map((k) => [k, 1])) as Record<BuildingKind, number>);
    levels[b.kind] = b.level;
    out.set(b.house_id, levels);
  }
  return out;
}

export function resourcesOf(h: HouseRow): Resources {
  return { pan: h.pan, madera: h.madera, piedra: h.piedra, hierro: h.hierro, oro: h.oro };
}

/** Prestigio en vivo de todas las casas. */
export async function computeAllPrestige(
  db: D1Database,
  gameId: number,
  houses: HouseRow[],
  tiles: Tile[],
  now: Date,
): Promise<Map<HouseId, PrestigeBreakdown>> {
  const since = new Date(now.getTime() - PRESTIGE.tradeWindowDays * 24 * 60 * 60 * 1000).toISOString();
  const [buildings, trades, achievements] = await Promise.all([
    loadBuildings(db, gameId),
    db
      .prepare("SELECT house_a, house_b FROM trades WHERE game_id = ? AND valid = 1 AND at >= ?")
      .bind(gameId, since)
      .all<{ house_a: number; house_b: number }>(),
    db
      .prepare("SELECT house_id, achievement_key, times FROM achievements WHERE game_id = ?")
      .bind(gameId)
      .all<{ house_id: number; achievement_key: AchievementKey; times: number }>(),
  ]);
  const partners = new Map<HouseId, Set<HouseId>>();
  for (const t of trades.results) {
    partners.set(t.house_a, (partners.get(t.house_a) ?? new Set()).add(t.house_b));
    partners.set(t.house_b, (partners.get(t.house_b) ?? new Set()).add(t.house_a));
  }
  const out = new Map<HouseId, PrestigeBreakdown>();
  for (const h of houses) {
    const ach: Partial<Record<AchievementKey, number>> = {};
    for (const a of achievements.results) if (a.house_id === h.id) ach[a.achievement_key] = a.times;
    out.set(
      h.id,
      computePrestige({
        house: h.id,
        tiles,
        buildings: buildings.get(h.id) ?? (Object.fromEntries(BUILDINGS.map((k) => [k, 1])) as Record<BuildingKind, number>),
        gold: h.oro,
        tradePartners: partners.get(h.id)?.size ?? 0,
        achievements: ach,
        siegeNights: h.siege_nights ?? 0,
        glory: h.glory ?? 0,
      }),
    );
  }
  return out;
}

/** Capitanes de las casas, en el formato del motor. */
export function captainsOf(houses: HouseRow[]): Captain[] {
  return houses.map((h) => ({
    house: h.id,
    tile: h.captain_tile,
    capturedBy: h.captain_captured_by,
    freeAt: h.captain_free_at,
  }));
}
