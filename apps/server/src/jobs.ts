// Tareas del cron contra D1. Cada una se ejecuta en un lote atómico
// (db.batch) que empieza registrando su clave única: si la tarea ya se hizo,
// la restricción UNIQUE hace fallar el lote entero y no se repite nada.

import {
  ABSENT_AFTER_DAYS,
  applyUpkeep,
  dailyProduction,
  lastPlace,
  resolutionInfo,
  resolveCampaign,
  type CampaignEvent,
  type Order,
  type Tile,
} from "@reyes/engine";
import { dueJobs, type GameClock } from "./scheduler";
import { computeAllPrestige, loadBuildings, loadGame, loadHouses, loadTiles, toEngineTiles, type GameRow } from "./state";

const ABSENT_AFTER_MS = ABSENT_AFTER_DAYS * 24 * 60 * 60 * 1000;

export async function runHourly(db: D1Database, now: Date): Promise<void> {
  const { results: games } = await db.prepare("SELECT id FROM games WHERE status = 'active'").all<{ id: number }>();
  for (const { id } of games) {
    const game = await loadGame(db, id);
    if (!game?.start_date) continue;
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
        if (job.kind === "produccion") await runProduction(db, game, job.key);
        else if (job.kind === "resolucion") await runResolution(db, game, job.resolution, now);
        else if (job.kind === "fin") await finishGame(db, game, now);
        // Pendiente (MVP 2): aviso_cierre con notificaciones push.
      } catch (err) {
        if (isAlreadyDone(err)) continue;
        console.error(`Partida ${game.id}, tarea ${job.key}:`, err);
      }
    }
  }
}

/** Producción diaria: edificios + casillas + ayuda al último (si le toca). */
export async function runProduction(db: D1Database, game: GameRow, key: string): Promise<void> {
  const [houses, buildings, tiles] = await Promise.all([
    loadHouses(db, game.id),
    loadBuildings(db, game.id),
    loadTiles(db, game.id),
  ]);
  const statements = [db.prepare("INSERT INTO job_runs (game_id, job_key) VALUES (?, ?)").bind(game.id, key)];
  for (const house of houses) {
    const levels = buildings.get(house.id);
    if (!levels) continue;
    const owned = tiles.filter((t) => t.owner_house_id === house.id).map((t) => ({ type: t.type }));
    const helpActive = house.help_until_resolution != null && house.help_until_resolution > game.current_resolution;
    const p = dailyProduction(levels, owned, helpActive ? (house.help_resource ?? "pan") : null);
    statements.push(
      db.prepare(
        "UPDATE houses SET pan = pan + ?, madera = madera + ?, piedra = piedra + ?, hierro = hierro + ?, oro = oro + ? WHERE id = ?",
      ).bind(p.pan, p.madera, p.piedra, p.hierro, p.oro, house.id),
    );
  }
  await db.batch(statements);
}

/**
 * Resolución: congela estado y órdenes, ejecuta el motor y guarda el resultado.
 * Los domingos, además: mantenimiento, ayuda al último y foto de Prestigio.
 */
export async function runResolution(db: D1Database, game: GameRow, n: number, now: Date): Promise<void> {
  const [tileRows, orderRows, houses] = await Promise.all([
    loadTiles(db, game.id),
    db.prepare(
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
    loadHouses(db, game.id),
  ]);

  const tiles = toEngineTiles(tileRows);
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
  const absentHouses = houses
    .filter((h) => h.vacation === 1 || !h.last_seen_at || now.getTime() - Date.parse(h.last_seen_at) > ABSENT_AFTER_MS)
    .map((h) => h.id);

  const result = resolveCampaign({ resolution: n, tiles, orders, absentHouses });
  const { week, kind } = resolutionInfo(n);
  let finalTiles: Tile[] = result.tiles;
  const extraEvents: { type: string; visibleTo: number | null; payload: unknown }[] = [];
  const houseUpdates: D1PreparedStatement[] = [];

  if (kind === "domingo") {
    // Mantenimiento: Pan por tropas y por estirarse; si no llega, deserciones.
    for (const h of houses) {
      const upkeep = applyUpkeep(finalTiles, h.id, h.pan);
      finalTiles = upkeep.tiles;
      if (upkeep.paid > 0) houseUpdates.push(db.prepare("UPDATE houses SET pan = pan - ? WHERE id = ?").bind(upkeep.paid, h.id));
      extraEvents.push({ type: "mantenimiento", visibleTo: h.id, payload: { house: h.id, ...upkeep, tiles: undefined } });
    }
  }

  const before = new Map(tiles.map((t) => [t.id, t]));
  const statements: D1PreparedStatement[] = [
    db.prepare(
      `INSERT INTO resolutions (game_id, number, week, kind, scheduled_at, status, state_before, orders_json, finished_at)
       VALUES (?, ?, ?, ?, ?, 'done', ?, ?, ?)`,
    ).bind(game.id, n, week, kind, now.toISOString(), JSON.stringify(tiles), JSON.stringify(orders), new Date().toISOString()),
  ];
  for (const t of finalTiles) {
    const old = before.get(t.id)!;
    if (old.owner === t.owner && old.troops === t.troops && old.fortifiedUntil === t.fortifiedUntil) continue;
    statements.push(
      db.prepare("UPDATE tiles SET owner_house_id = ?, troops = ?, fortified_until = ? WHERE id = ?").bind(
        t.owner,
        t.troops,
        t.fortifiedUntil ?? null,
        t.id,
      ),
    );
  }
  statements.push(...houseUpdates);

  if (kind === "domingo") {
    // Foto de Prestigio y ayuda al último para la semana siguiente.
    const prestige = await computeAllPrestige(db, game.id, houses, finalTiles, now);
    for (const [houseId, p] of prestige) {
      statements.push(
        db.prepare(
          "INSERT INTO prestige_snapshots (game_id, house_id, resolution_no, total, breakdown) VALUES (?, ?, ?, ?, ?)",
        ).bind(game.id, houseId, n, p.total, JSON.stringify(p)),
      );
    }
    const last = lastPlace([...prestige].map(([house, p]) => ({ house, total: p.total })));
    statements.push(
      db.prepare("UPDATE houses SET help_until_resolution = NULL WHERE game_id = ?").bind(game.id),
    );
    if (last != null && n < game.weeks * 2) {
      statements.push(db.prepare("UPDATE houses SET help_until_resolution = ? WHERE id = ?").bind(n + 2, last));
      extraEvents.push({ type: "ayuda_ultimo", visibleTo: null, payload: { house: last, until: n + 2 } });
    }
  }

  const allEvents: { type: string; visibleTo: number | null; payload: unknown }[] = [
    ...result.events.map((e: CampaignEvent) => ({
      type: e.type,
      // Las órdenes inválidas solo las ve su casa; el resto es público.
      visibleTo: e.type === "orden_invalida" ? e.order.house : null,
      payload: e,
    })),
    ...extraEvents,
  ];
  for (const e of allEvents) {
    statements.push(
      db.prepare(
        "INSERT INTO event_log (game_id, resolution_id, type, visible_to, payload) VALUES (?, (SELECT id FROM resolutions WHERE game_id = ? AND number = ?), ?, ?, ?)",
      ).bind(game.id, game.id, n, e.type, e.visibleTo, JSON.stringify(e.payload)),
    );
  }
  statements.push(
    db.prepare("UPDATE games SET current_resolution = ? WHERE id = ? AND current_resolution = ?").bind(n, game.id, n - 1),
  );
  await db.batch(statements);
}

/** Fin de la partida. Pendiente (MVP 2): objetivos secretos, títulos y Crónica Definitiva. */
export async function finishGame(db: D1Database, game: GameRow, now: Date): Promise<void> {
  await db.batch([
    db.prepare("INSERT INTO job_runs (game_id, job_key) VALUES (?, 'fin')").bind(game.id),
    db.prepare("UPDATE games SET status = 'finished', finished_at = ? WHERE id = ?").bind(now.toISOString(), game.id),
  ]);
}

function isAlreadyDone(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/.test(err.message);
}
