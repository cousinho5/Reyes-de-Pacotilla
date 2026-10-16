// Tareas del cron contra D1. Cada una se ejecuta en un lote atómico
// (db.batch) que empieza registrando su clave única: si la tarea ya se hizo,
// la restricción UNIQUE hace fallar el lote entero y no se repite nada.

import {
  ABSENT_AFTER_DAYS,
  BUILDINGS,
  PRESTIGE,
  applyUpkeep,
  dailyProduction,
  lastPlace,
  objectiveMet,
  planAutopilot,
  resolutionInfo,
  resolveCampaign,
  type AutopilotTemplate,
  type BuildingKind,
  type CampaignEvent,
  type ObjectiveKey,
  type Order,
  type Tile,
} from "@reyes/engine";
import { notifyHouses, type NotifyEnv } from "./notify";
import { dueJobs, type GameClock } from "./scheduler";
import {
  computeAllPrestige,
  loadBuildings,
  loadGame,
  loadHouses,
  loadTiles,
  resourcesOf,
  toEngineTiles,
  type GameRow,
  type HouseRow,
} from "./state";

const ABSENT_AFTER_MS = ABSENT_AFTER_DAYS * 24 * 60 * 60 * 1000;

export function isAbsent(
  h: Pick<HouseRow, "id" | "vacation" | "last_seen_at" | "is_bot">,
  now: Date,
  game?: Pick<GameRow, "is_test" | "played_house_id">,
): boolean {
  if (h.vacation === 1) return true;
  // En las pruebas el reloj salta días y los bots juegan por su cuenta (pruebas.ts):
  // nadie pasa al piloto automático.
  if (game?.is_test === 1) return false;
  return !h.last_seen_at || now.getTime() - Date.parse(h.last_seen_at) > ABSENT_AFTER_MS;
}

export async function runHourly(env: NotifyEnv, now: Date): Promise<void> {
  const db = env.DB;
  // Las partidas de prueba tienen su propio reloj: solo avanzan desde la mesa de pruebas.
  const { results: games } = await db
    .prepare("SELECT id FROM games WHERE status = 'active' AND is_test = 0")
    .all<{ id: number }>();
  for (const { id } of games) {
    const game = await loadGame(db, id);
    if (game) await runGameJobs(env, game, now);
  }
}

export function clockOf(game: GameRow): GameClock | null {
  if (!game.start_date) return null;
  return {
    timezone: game.timezone,
    closeTime: game.close_time,
    resolveTime: game.resolve_time,
    startDate: game.start_date,
    weeks: game.weeks,
    currentResolution: game.current_resolution,
  };
}

/** Ejecuta las tareas que tocan en una partida en el instante `now`. */
export async function runGameJobs(env: NotifyEnv, game: GameRow, now: Date): Promise<void> {
  const clock = clockOf(game);
  if (!clock || game.status !== "active") return;
  for (const job of dueJobs(now, clock)) {
    try {
      if (job.kind === "produccion") await runProduction(env, game, job.key, job.date, now);
      else if (job.kind === "aviso_cierre") await closeWarning(env, game, job.resolution);
      else if (job.kind === "resolucion") await runResolution(env, game, job.resolution, now);
      else if (job.kind === "fin") await finishGame(env, game, now);
    } catch (err) {
      if (isAlreadyDone(err)) continue;
      console.error(`Partida ${game.id}, tarea ${job.key}:`, err);
    }
  }
}

/** Producción diaria y, después, el piloto automático de las casas ausentes. */
export async function runProduction(env: NotifyEnv, game: GameRow, key: string, date: string, now: Date): Promise<void> {
  const db = env.DB;
  const [houses, buildings, tileRows] = await Promise.all([
    loadHouses(db, game.id),
    loadBuildings(db, game.id),
    loadTiles(db, game.id),
  ]);
  const statements = [db.prepare("INSERT INTO job_runs (game_id, job_key) VALUES (?, ?)").bind(game.id, key)];
  const produced = new Map<number, ReturnType<typeof dailyProduction>>();
  for (const house of houses) {
    const levels = buildings.get(house.id);
    if (!levels) continue;
    const owned = tileRows.filter((t) => t.owner_house_id === house.id).map((t) => ({ type: t.type }));
    const helpActive = house.help_until_resolution != null && house.help_until_resolution > game.current_resolution;
    const p = dailyProduction(levels, owned, helpActive ? (house.help_resource ?? "pan") : null);
    produced.set(house.id, p);
    statements.push(
      db.prepare(
        "UPDATE houses SET pan = pan + ?, madera = madera + ?, piedra = piedra + ?, hierro = hierro + ?, oro = oro + ? WHERE id = ?",
      ).bind(p.pan, p.madera, p.piedra, p.hierro, p.oro, house.id),
    );
  }
  await db.batch(statements);

  // Piloto automático: una vez al día, con los recursos ya producidos.
  const tiles = toEngineTiles(tileRows);
  const day = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${game.start_date}T12:00:00Z`)) / 864e5);
  for (const house of houses) {
    if (!isAbsent(house, now, game) || house.autopilot_ran_on === date) continue;
    const levels = buildings.get(house.id);
    const p = produced.get(house.id);
    if (!levels || !p) continue;
    const res = resourcesOf(house);
    for (const r of Object.keys(p) as (keyof typeof p)[]) res[r] += p[r];
    const plan = planAutopilot({
      template: (house.autopilot_template ?? "equilibrada") as AutopilotTemplate,
      day,
      house: house.id,
      tiles,
      buildings: levels,
      resources: res,
      nextResolution: game.current_resolution + 1,
    });
    const c = plan.cost;
    const st = [
      db.prepare("UPDATE houses SET autopilot_ran_on = ? WHERE id = ? AND (autopilot_ran_on IS NULL OR autopilot_ran_on <> ?)").bind(
        date,
        house.id,
        date,
      ),
      db.prepare(
        "UPDATE houses SET pan = pan - ?, madera = madera - ?, piedra = piedra - ?, hierro = hierro - ?, oro = oro - ? WHERE id = ?",
      ).bind(c.pan ?? 0, c.madera ?? 0, c.piedra ?? 0, c.hierro ?? 0, c.oro ?? 0, house.id),
    ];
    if (plan.upgrade) {
      st.push(
        db.prepare("UPDATE buildings SET level = level + 1 WHERE house_id = ? AND kind = ? AND level = ?").bind(
          house.id,
          plan.upgrade,
          levels[plan.upgrade],
        ),
      );
    }
    if (plan.fortify) {
      st.push(
        db.prepare("UPDATE tiles SET fortified_until = ? WHERE id = ? AND owner_house_id = ?").bind(
          plan.fortify.until,
          plan.fortify.tile,
          house.id,
        ),
      );
    }
    if (plan.recruit > 0) {
      st.push(
        db.prepare("UPDATE tiles SET troops = troops + ? WHERE game_id = ? AND castle_of = ?").bind(plan.recruit, game.id, house.id),
      );
    }
    st.push(
      db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) VALUES (?, 'piloto_automatico', ?, ?)").bind(
        game.id,
        house.id,
        JSON.stringify({ house: house.id, upgrade: plan.upgrade, fortify: plan.fortify?.tile ?? null, recruit: plan.recruit }),
      ),
    );
    try {
      await db.batch(st);
    } catch (err) {
      console.error(`Piloto automático de la casa ${house.id}:`, err);
    }
  }
}

/** Aviso dos horas antes del cierre de órdenes. */
export async function closeWarning(env: NotifyEnv, game: GameRow, n: number): Promise<void> {
  await env.DB.prepare("INSERT INTO job_runs (game_id, job_key) VALUES (?, ?)").bind(game.id, `aviso_cierre:${n}`).run();
  const houses = await loadHouses(env.DB, game.id);
  await notifyHouses(env, houses.map((h) => h.id), {
    kind: "cierre",
    title: "Cierre en 2 h",
    body: "Quedan dos horas para dar órdenes. Fray Abundio se impacienta.",
    url: `/partida/${game.id}`,
    dedupe: `cierre:${game.id}:${n}`,
  });
}

/**
 * Resolución: congela estado y órdenes, ejecuta el motor y guarda el resultado.
 * Los domingos, además: mantenimiento, ayuda al último y foto de Prestigio.
 */
export async function runResolution(env: NotifyEnv, game: GameRow, n: number, now: Date): Promise<void> {
  const db = env.DB;
  const [tileRows, orderRows, houses, achieved] = await Promise.all([
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
    db.prepare("SELECT achievement_key FROM achievements WHERE game_id = ?").bind(game.id).all<{ achievement_key: string }>(),
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
  const absentHouses = houses.filter((h) => isAbsent(h, now, game)).map((h) => h.id);

  const result = resolveCampaign({ resolution: n, tiles, orders, absentHouses });
  const { week, kind } = resolutionInfo(n);
  let finalTiles: Tile[] = result.tiles;
  const extraEvents: { type: string; visibleTo: number | null; payload: unknown }[] = [];
  const extraStatements: D1PreparedStatement[] = [];

  // Logro: primera casa en tomar una fortaleza.
  if (!achieved.results.some((a) => a.achievement_key === "primera_fortaleza")) {
    const first = result.events.find(
      (e) => e.type === "combate" && e.conquered && tiles.find((t) => t.id === e.tile)?.type === "fortaleza",
    );
    if (first && first.type === "combate" && first.winner != null) {
      extraStatements.push(
        db.prepare("INSERT INTO achievements (game_id, house_id, achievement_key) VALUES (?, ?, 'primera_fortaleza')").bind(
          game.id,
          first.winner,
        ),
      );
      extraEvents.push({ type: "logro", visibleTo: null, payload: { house: first.winner, logro: "primera_fortaleza" } });
    }
  }

  // Quien no eligió objetivo antes de la primera resolución se queda con el primero.
  if (n === 1) {
    extraStatements.push(
      db.prepare(
        "UPDATE houses SET objective_key = json_extract(objective_options, '$[0]') WHERE game_id = ? AND objective_key IS NULL AND objective_options IS NOT NULL",
      ).bind(game.id),
    );
  }

  if (kind === "domingo") {
    // Mantenimiento: Pan por tropas y por estirarse; si no llega, deserciones.
    for (const h of houses) {
      const upkeep = applyUpkeep(finalTiles, h.id, h.pan);
      finalTiles = upkeep.tiles;
      if (upkeep.paid > 0) extraStatements.push(db.prepare("UPDATE houses SET pan = pan - ? WHERE id = ?").bind(upkeep.paid, h.id));
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
  statements.push(...extraStatements);

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
    statements.push(db.prepare("UPDATE houses SET help_until_resolution = NULL WHERE game_id = ?").bind(game.id));
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

  // Avisos: a quien ha tenido combate en sus tierras, uno personal; al resto, el general.
  const fought = new Set<number>();
  for (const e of result.events) {
    if (e.type === "combate") for (const s of e.sides) if (s.house != null) fought.add(s.house);
    if (e.type === "rebote") e.houses.forEach((h) => fought.add(h));
  }
  for (const h of houses) {
    await notifyHouses(env, [h.id], {
      kind: "resolucion",
      title: fought.has(h.id) ? `Combate en la resolución ${n}` : `Resolución ${n}`,
      body: fought.has(h.id)
        ? "Ha habido batalla en tus tierras. El resultado, en la crónica."
        : "El reino se ha movido. Echa un vistazo a la crónica.",
      url: `/partida/${game.id}`,
      dedupe: `resolucion:${game.id}:${n}:${h.id}`,
    });
  }
}

/** Fin de la partida: objetivos secretos, Prestigio final y coronación. */
export async function finishGame(env: NotifyEnv, game: GameRow, now: Date): Promise<void> {
  const db = env.DB;
  const [houses, tileRows, buildings, trades, takes] = await Promise.all([
    loadHouses(db, game.id),
    loadTiles(db, game.id),
    loadBuildings(db, game.id),
    db.prepare("SELECT house_a, house_b FROM trades WHERE game_id = ? AND valid = 1").bind(game.id).all<{ house_a: number; house_b: number }>(),
    db.prepare(
      `SELECT json_extract(payload, '$.winner') AS house, COUNT(*) AS n FROM event_log
       WHERE game_id = ? AND type = 'combate' AND json_extract(payload, '$.conquered') = 1
         AND json_extract(payload, '$.previousOwner') IS NOT NULL
       GROUP BY house`,
    )
      .bind(game.id)
      .all<{ house: number; n: number }>(),
  ]);
  const tiles = toEngineTiles(tileRows);
  const prestige = await computeAllPrestige(db, game.id, houses, tiles, now);

  const statements: D1PreparedStatement[] = [
    db.prepare("INSERT INTO job_runs (game_id, job_key) VALUES (?, 'fin')").bind(game.id),
    db.prepare("UPDATE games SET status = 'finished', finished_at = ? WHERE id = ?").bind(now.toISOString(), game.id),
    db.prepare("UPDATE offers SET status = 'cancelled', closed_at = ? WHERE game_id = ? AND status = 'open'").bind(
      now.toISOString(),
      game.id,
    ),
  ];
  const final: { house: number; total: number; tiles: number; gold: number }[] = [];
  for (const h of houses) {
    const partners = new Set<number>();
    let valid = 0;
    for (const t of trades.results) {
      if (t.house_a === h.id) partners.add(t.house_b);
      if (t.house_b === h.id) partners.add(t.house_a);
      if (t.house_a === h.id || t.house_b === h.id) valid++;
    }
    const levels = buildings.get(h.id) ?? (Object.fromEntries(BUILDINGS.map((k) => [k, 1])) as Record<BuildingKind, number>);
    const met =
      h.objective_key != null &&
      objectiveMet(h.objective_key as ObjectiveKey, {
        house: h.id,
        tiles,
        buildings: levels,
        gold: h.oro,
        partnersAllGame: partners.size,
        otherHouses: houses.length - 1,
        validTradesAllGame: valid,
        tilesTakenFromHouses: takes.results.find((t) => t.house === h.id)?.n ?? 0,
      });
    const p = prestige.get(h.id)!;
    const total = p.total + (met ? PRESTIGE.secretObjective : 0);
    final.push({ house: h.id, total, tiles: tiles.filter((t) => t.owner === h.id && t.type !== "castillo").length, gold: h.oro });
    statements.push(
      db.prepare("UPDATE houses SET objective_met = ? WHERE id = ?").bind(met ? 1 : 0, h.id),
      db.prepare(
        "INSERT OR REPLACE INTO prestige_snapshots (game_id, house_id, resolution_no, total, breakdown) VALUES (?, ?, ?, ?, ?)",
      ).bind(game.id, h.id, game.weeks * 2 + 1, total, JSON.stringify({ ...p, objetivo: met ? PRESTIGE.secretObjective : 0, total })),
      db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) VALUES (?, 'objetivo', NULL, ?)").bind(
        game.id,
        JSON.stringify({ house: h.id, objetivo: h.objective_key, cumplido: met }),
      ),
    );
  }
  // Ganador: más Prestigio; en empate, más casillas; si persiste, más Oro.
  final.sort((a, b) => b.total - a.total || b.tiles - a.tiles || b.gold - a.gold);
  statements.push(
    db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) VALUES (?, 'fin', NULL, ?)").bind(
      game.id,
      JSON.stringify({ ranking: final, winner: final[0]?.house ?? null }),
    ),
  );
  await db.batch(statements);

  const winner = houses.find((h) => h.id === final[0]?.house);
  await notifyHouses(env, houses.map((h) => h.id), {
    kind: "fin",
    title: "Fin del interregno",
    body: winner ? `¡Larga vida a ${winner.name}! Consulta la clasificación final.` : "La partida ha terminado.",
    url: `/partida/${game.id}`,
    dedupe: `fin:${game.id}`,
  });
}

function isAlreadyDone(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/.test(err.message);
}
