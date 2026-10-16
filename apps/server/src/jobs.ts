// Tareas del cron contra D1. Cada una se ejecuta en un lote atómico
// (db.batch) que empieza registrando su clave única: si la tarea ya se hizo,
// la restricción UNIQUE hace fallar el lote entero y no se repite nada.

import {
  BUILDINGS,
  dailyProduction,
  resolutionInfo,
  resolveCampaign,
  type BuildingKind,
  type Order,
  type Resource,
  type Tile,
  type TileType,
} from "@reyes/engine";
import { dueJobs, type GameClock } from "./scheduler";

interface GameRow {
  id: number;
  timezone: string;
  close_time: string;
  resolve_time: string;
  start_date: string | null;
  weeks: number;
  current_resolution: number;
}

const ABSENT_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

export async function runHourly(db: D1Database, now: Date): Promise<void> {
  const { results: games } = await db
    .prepare(
      "SELECT id, timezone, close_time, resolve_time, start_date, weeks, current_resolution FROM games WHERE status = 'active'",
    )
    .all<GameRow>();

  for (const game of games) {
    if (!game.start_date) continue;
    const clock: GameClock = {
      timezone: game.timezone,
      closeTime: game.close_time,
      resolveTime: game.resolve_time,
      startDate: game.start_date,
      weeks: game.weeks,
      currentResolution: game.current_resolution,
    };
    for (const job of dueJobs(now, clock)) {
      try {
        if (job.kind === "produccion") await runProduction(db, game.id, job.key);
        else if (job.kind === "resolucion") await runResolution(db, game, job.resolution, now);
        // Pendiente (MVP 1-2): aviso_cierre (notificaciones) y fin (objetivos, títulos, Crónica).
      } catch (err) {
        if (isAlreadyDone(err)) continue;
        console.error(`Partida ${game.id}, tarea ${job.key}:`, err);
      }
    }
  }
}

/** Producción diaria: edificios + casillas + ayuda al último. */
export async function runProduction(db: D1Database, gameId: number, key: string): Promise<void> {
  const [houses, buildings, tiles] = await Promise.all([
    db
      .prepare("SELECT id, help_resource FROM houses WHERE game_id = ?")
      .bind(gameId)
      .all<{ id: number; help_resource: Resource | null }>(),
    db
      .prepare("SELECT b.house_id, b.kind, b.level FROM buildings b JOIN houses h ON h.id = b.house_id WHERE h.game_id = ?")
      .bind(gameId)
      .all<{ house_id: number; kind: BuildingKind; level: number }>(),
    db
      .prepare("SELECT owner_house_id, type FROM tiles WHERE game_id = ? AND owner_house_id IS NOT NULL")
      .bind(gameId)
      .all<{ owner_house_id: number; type: TileType }>(),
  ]);

  const statements = [db.prepare("INSERT INTO job_runs (game_id, job_key) VALUES (?, ?)").bind(gameId, key)];
  for (const house of houses.results) {
    const levels = Object.fromEntries(BUILDINGS.map((k) => [k, 1])) as Record<BuildingKind, number>;
    for (const b of buildings.results) if (b.house_id === house.id) levels[b.kind] = b.level;
    const owned = tiles.results.filter((t) => t.owner_house_id === house.id).map((t) => ({ type: t.type }));
    const p = dailyProduction(levels, owned, house.help_resource);
    statements.push(
      db
        .prepare(
          "UPDATE houses SET pan = pan + ?, madera = madera + ?, piedra = piedra + ?, hierro = hierro + ?, oro = oro + ? WHERE id = ?",
        )
        .bind(p.pan, p.madera, p.piedra, p.hierro, p.oro, house.id),
    );
  }
  await db.batch(statements);
}

/** Resolución de campaña: congela estado y órdenes, ejecuta el motor y guarda el resultado. */
export async function runResolution(db: D1Database, game: GameRow, n: number, now: Date): Promise<void> {
  const [tileRows, orderRows, houseRows] = await Promise.all([
    db
      .prepare(
        "SELECT id, x, y, type, owner_house_id, troops, fortified_until, castle_of FROM tiles WHERE game_id = ? ORDER BY id",
      )
      .bind(game.id)
      .all<{
        id: number;
        x: number;
        y: number;
        type: TileType;
        owner_house_id: number | null;
        troops: number;
        fortified_until: number | null;
        castle_of: number | null;
      }>(),
    db
      .prepare(
        "SELECT house_id, kind, from_tile_id, troops, target_tile_id, supported_from_tile_id FROM orders WHERE game_id = ? AND resolution_no = ? ORDER BY id",
      )
      .bind(game.id, n)
      .all<{
        house_id: number;
        kind: "move" | "support";
        from_tile_id: number;
        troops: number;
        target_tile_id: number;
        supported_from_tile_id: number | null;
      }>(),
    db
      .prepare("SELECT id, vacation, last_seen_at FROM houses WHERE game_id = ?")
      .bind(game.id)
      .all<{ id: number; vacation: number; last_seen_at: string | null }>(),
  ]);

  const tiles: Tile[] = tileRows.results.map((t) => ({
    id: t.id,
    x: t.x,
    y: t.y,
    type: t.type,
    owner: t.owner_house_id,
    troops: t.troops,
    fortifiedUntil: t.fortified_until,
    castleOf: t.castle_of,
  }));
  const orders: Order[] = orderRows.results.map((o) =>
    o.kind === "move"
      ? { kind: "move", house: o.house_id, from: o.from_tile_id, to: o.target_tile_id, troops: o.troops }
      : {
          kind: "support",
          house: o.house_id,
          from: o.from_tile_id,
          target: o.target_tile_id,
          supportedFrom: o.supported_from_tile_id,
          troops: o.troops,
        },
  );
  const absentHouses = houseRows.results
    .filter((h) => h.vacation === 1 || !h.last_seen_at || now.getTime() - Date.parse(h.last_seen_at) > ABSENT_AFTER_MS)
    .map((h) => h.id);

  const result = resolveCampaign({ resolution: n, tiles, orders, absentHouses });
  const { week, kind } = resolutionInfo(n);
  const before = new Map(tiles.map((t) => [t.id, t]));

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO resolutions (game_id, number, week, kind, scheduled_at, status, state_before, orders_json, finished_at)
         VALUES (?, ?, ?, ?, ?, 'done', ?, ?, ?)`,
      )
      .bind(game.id, n, week, kind, now.toISOString(), JSON.stringify(tiles), JSON.stringify(orders), new Date().toISOString()),
  ];
  for (const t of result.tiles) {
    const old = before.get(t.id)!;
    if (old.owner === t.owner && old.troops === t.troops && old.fortifiedUntil === t.fortifiedUntil) continue;
    statements.push(
      db
        .prepare("UPDATE tiles SET owner_house_id = ?, troops = ?, fortified_until = ? WHERE id = ?")
        .bind(t.owner, t.troops, t.fortifiedUntil ?? null, t.id),
    );
  }
  for (const e of result.events) {
    // Las órdenes inválidas solo las ve su casa; el resto es público (el cliente
    // aplica la niebla de guerra al mostrar los detalles).
    const visibleTo = e.type === "orden_invalida" ? e.order.house : null;
    statements.push(
      db
        .prepare(
          "INSERT INTO event_log (game_id, resolution_id, type, visible_to, payload) VALUES (?, (SELECT id FROM resolutions WHERE game_id = ? AND number = ?), ?, ?, ?)",
        )
        .bind(game.id, game.id, n, e.type, visibleTo, JSON.stringify(e)),
    );
  }
  statements.push(
    db
      .prepare("UPDATE games SET current_resolution = ? WHERE id = ? AND current_resolution = ?")
      .bind(n, game.id, n - 1),
  );
  // Pendiente (MVP 1): en la resolución del domingo, mantenimiento, ayuda al
  // último y foto de Prestigio; después, boletín y notificaciones.
  await db.batch(statements);
}

function isAlreadyDone(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/.test(err.message);
}
