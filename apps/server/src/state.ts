// Lectura del estado de una partida desde D1, en los tipos del motor.

import {
  BUILDINGS,
  PRESTIGE,
  computePrestige,
  fortifyResolutions,
  parseResolutionDays,
  type AchievementKey,
  type Alliance,
  type Captain,
  type Guest,
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
  /** Bloque 13: clave del enlace público de la coronación (al acabar). */
  share_key?: string | null;
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
  /** Bloque 12: aviso 1 hora antes del cierre si aún no ha dado órdenes (1) o apagado (0). */
  close_warning?: number;
  /** Bloque 13: qué cinemáticas salen solas ('todas' o 'esenciales': prólogo y coronación). */
  cinematics?: string;
  last_seen_at: string | null;
  autopilot_template: string | null;
  autopilot_ran_on: string | null;
  objective_options: string | null;
  objective_key: string | null;
  objective_met: number | null;
  is_bot: number;
  bot_personality: string | null;
  bot_level: string | null;
  /** Noches que ha tenido rodeado un castillo ajeno (Prestigio, diseño v3). */
  siege_nights: number;
  /** Capitán (diseño v3): casilla donde está (null si preso), quién lo tiene y hasta qué resolución. */
  captain_tile: number | null;
  captain_captured_by: number | null;
  captain_free_at: number | null;
  /** Rescate que pide quien tiene preso al Capitán (bloque 4); NULL si no ha pedido. */
  captain_ransom: number | null;
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
  /** Tropas de paso de casas aliadas (bloque 8, tabla `tile_guests`). */
  guests?: Guest[];
}

export async function loadGame(db: D1Database, gameId: number): Promise<GameRow | null> {
  return db.prepare("SELECT * FROM games WHERE id = ?").bind(gameId).first<GameRow>();
}

export async function loadHouses(db: D1Database, gameId: number): Promise<HouseRow[]> {
  const { results } = await db.prepare("SELECT * FROM houses WHERE game_id = ? ORDER BY id").bind(gameId).all<HouseRow>();
  return results;
}

export async function loadTiles(db: D1Database, gameId: number): Promise<TileRow[]> {
  const [{ results }, guests] = await Promise.all([
    db
      .prepare(
        "SELECT id, x, y, type, name, owner_house_id, troops, jinetes, catapultas, fortified_until, castle_of, besieged_by, siege_nights, river FROM tiles WHERE game_id = ? ORDER BY y, x",
      )
      .bind(gameId)
      .all<TileRow>(),
    db
      .prepare("SELECT tile_id, house_id, troops, jinetes, catapultas FROM tile_guests WHERE game_id = ? ORDER BY tile_id, house_id")
      .bind(gameId)
      .all<{ tile_id: number; house_id: number; troops: number; jinetes: number; catapultas: number }>(),
  ]);
  // Tropas de paso (bloque 8), en el formato del motor y por casa.
  const byTile = new Map<number, Guest[]>();
  for (const g of guests.results) {
    const list = byTile.get(g.tile_id) ?? [];
    list.push({
      house: g.house_id,
      troops: g.troops,
      ...(g.jinetes > 0 ? { jinetes: g.jinetes } : {}),
      ...(g.catapultas > 0 ? { catapultas: g.catapultas } : {}),
    });
    byTile.set(g.tile_id, list);
  }
  return results.map((t) => (byTile.has(t.id) ? { ...t, guests: byTile.get(t.id) } : t));
}

/**
 * Sentencias para guardar las tropas de paso que han cambiado entre `before` y
 * `after` (por ejemplo, tras una resolución): se borran las de esa casilla y
 * se escriben las nuevas.
 */
export function guestStatements(db: D1Database, gameId: number, before: Tile[], after: Tile[]): D1PreparedStatement[] {
  const old = new Map(before.map((t) => [t.id, JSON.stringify(t.guests ?? [])]));
  const out: D1PreparedStatement[] = [];
  for (const t of after) {
    if (old.get(t.id) === JSON.stringify(t.guests ?? [])) continue;
    out.push(db.prepare("DELETE FROM tile_guests WHERE tile_id = ?").bind(t.id));
    for (const g of t.guests ?? []) {
      if (g.troops <= 0) continue;
      out.push(
        db.prepare("INSERT INTO tile_guests (game_id, tile_id, house_id, troops, jinetes, catapultas) VALUES (?, ?, ?, ?, ?, ?)").bind(
          gameId,
          t.id,
          g.house,
          g.troops,
          g.jinetes ?? 0,
          g.catapultas ?? 0,
        ),
      );
    }
  }
  return out;
}

export interface AllianceRow {
  id: number;
  game_id: number;
  name: string;
  house_a: number;
  house_b: number;
  proposed_by: number;
  status: "proposed" | "active" | "breaking" | "ended" | "declined" | "withdrawn" | "expired";
  proposed_at: string;
  expires_resolution: number;
  signed_resolution: number | null;
  signed_at: string | null;
  broken_by: number | null;
  broken_at: string | null;
  ends_resolution: number | null;
  closed_at: string | null;
}

export async function loadAlliances(db: D1Database, gameId: number): Promise<AllianceRow[]> {
  const { results } = await db.prepare("SELECT * FROM alliances WHERE game_id = ? ORDER BY id").bind(gameId).all<AllianceRow>();
  return results;
}

/** Alianzas en vigor o en aviso, en el formato del motor. */
export function toEngineAlliances(rows: AllianceRow[]): Alliance[] {
  return rows
    .filter((r) => r.status === "active" || r.status === "breaking")
    .map((r) => ({
      a: r.house_a,
      b: r.house_b,
      status: r.status === "active" ? "active" : "breaking",
      endsAt: r.status === "breaking" ? r.ends_resolution : null,
      since: r.signed_resolution ?? 0,
    }));
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
    ...(t.guests?.length ? { guests: t.guests.map((g) => ({ ...g })) } : {}),
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
