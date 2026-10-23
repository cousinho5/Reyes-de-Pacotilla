// Tareas del cron contra D1. Cada una se ejecuta en un lote atómico
// (db.batch) que empieza registrando su clave única: si la tarea ya se hizo,
// la restricción UNIQUE hace fallar el lote entero y no se repite nada.

import {
  gloryFromEvents,
  EVENTS,
  applyEventNow,
  eventCombat,
  eventLine,
  eventOfWeek,
  eventProduction,
  eventText,
  eventUpkeepFactor,
  productionEventWeek,
  ABSENT_AFTER_DAYS,
  BUILDINGS,
  PRESTIGE,
  applyUpkeep,
  applyFortifyUpkeep,
  ANY_ORIGIN,
  areAdjacent,
  RESOURCES,
  dailyProduction,
  lastPlace,
  objectiveMet,
  planAutopilot,
  resolutionInfo,
  totalResolutions,
  withRhythm,
  recruitSite,
  claimRuins,
  resolveCampaign,
  fitOrders,
  checkOrders,
  bannersSeen,
  ALLIANCE,
  PHRASES,
  fill,
  houseInSentence,
  type AutopilotTemplate,
  type BuildingKind,
  type Alliance,
  type CampaignEvent,
  type ObjectiveKey,
  type Order,
  type Tile,
} from "@reyes/engine";
import { notifyHouses, type NotifyEnv } from "./notify";
import { announceAuction, auctionStatements, cardsForResolution } from "./subasta";
import { publishBulletin, publishChronicle } from "./boletin";
import { loadMercenaries, mercenaryCount, mercenaryDawnStatements } from "./mercenarios";
import { dueJobs, type GameClock } from "./scheduler";
import { allianceNightStatements } from "./alianzas";
import { expireOffersStatement } from "./offers";
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
  rhythmOf,
  captainsOf,
  guestStatements,
  loadAlliances,
  toEngineAlliances,
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
    days: rhythmOf(game).days,
  };
}

/** Ejecuta las tareas que tocan en una partida en el instante `now`. */
export async function runGameJobs(env: NotifyEnv, game: GameRow, now: Date): Promise<void> {
  const clock = clockOf(game);
  if (!clock || game.status !== "active") return;
  for (const job of dueJobs(now, clock)) {
    try {
      if (job.kind === "produccion") await runProduction(env, game, job.key, job.date, now);
      else if (job.kind === "anuncio") await announceAuction(env, game, job.week);
      else if (job.kind === "aviso_cierre") await closeWarning(env, game, job.resolution);
      else if (job.kind === "resolucion") await runResolution(env, game, job.resolution, now);
      else if (job.kind === "fin") await finishGame(env, game, now);
    } catch (err) {
      if (isAlreadyDone(err)) continue;
      console.error(`Partida ${game.id}, tarea ${job.key}:`, err);
    }
  }
  // Tras la resolución del domingo, el boletín de la semana (el último sale con el final),
  // y tras la del miércoles, la hoja volandera (bloque 3).
  const after = await loadGame(env.DB, game.id);
  const done = after && after.current_resolution >= 1 ? resolutionInfo(after.current_resolution, rhythmOf(after).days) : null;
  if (after && after.status === "active" && (done?.kind === "domingo" || done?.kind === "miercoles")) {
    const week = done.week;
    if (done.kind === "miercoles" || week < after.weeks) {
      try {
        await publishBulletin(env, after, week, false, done.kind);
      } catch (err) {
        console.error(`Partida ${game.id}, boletín ${week} (${done.kind}):`, err);
      }
    }
  }
}

/** Producción diaria y, después, el piloto automático de las casas ausentes. */
export async function runProduction(env: NotifyEnv, game: GameRow, key: string, date: string, now: Date): Promise<void> {
  const db = env.DB;
  const [houses, buildings, tileRows, mercs] = await Promise.all([
    loadHouses(db, game.id),
    loadBuildings(db, game.id),
    loadTiles(db, game.id),
    loadMercenaries(db, game.id),
  ]);
  const statements = [db.prepare("INSERT INTO job_runs (game_id, job_key) VALUES (?, ?)").bind(game.id, key)];
  const day = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${game.start_date}T12:00:00Z`)) / 864e5);
  // Evento que afecta a la producción de hoy (de jueves a miércoles tras anunciarse).
  const eventWeek = productionEventWeek(day);
  const mods = eventWeek != null && eventWeek <= game.weeks ? eventProduction(eventOfWeek(game.seed, eventWeek), eventWeek, day) : null;
  const produced = new Map<number, ReturnType<typeof dailyProduction>>();
  for (const house of houses) {
    const levels = buildings.get(house.id);
    if (!levels) continue;
    const owned = tileRows.filter((t) => t.owner_house_id === house.id).map((t) => ({ type: t.type }));
    const helpActive = house.help_until_resolution != null && house.help_until_resolution > game.current_resolution;
    const p = dailyProduction(levels, owned, helpActive ? (house.help_resource ?? "pan") : null, mods);
    produced.set(house.id, p);
    statements.push(
      db.prepare(
        "UPDATE houses SET pan = pan + ?, madera = madera + ?, piedra = piedra + ?, hierro = hierro + ?, oro = oro + ? WHERE id = ?",
      ).bind(p.pan, p.madera, p.piedra, p.hierro, p.oro, house.id),
    );
  }
  // Bloque 5: los mercenarios que cumplen se van al amanecer, tras la producción (como en el simulador).
  statements.push(...mercenaryDawnStatements(db, game, date, mercs, toEngineTiles(tileRows)));
  await db.batch(statements);

  // Piloto automático: una vez al día, con los recursos ya producidos.
  const tiles = toEngineTiles(tileRows);
  for (const house of houses) {
    if (!isAbsent(house, now, game) || house.autopilot_ran_on === date) continue;
    const levels = buildings.get(house.id);
    const p = produced.get(house.id);
    if (!levels || !p) continue;
    const res = resourcesOf(house);
    for (const r of Object.keys(p) as (keyof typeof p)[]) res[r] += p[r];
    const plan = withRhythm(rhythmOf(game), () => planAutopilot({
      template: (house.autopilot_template ?? "equilibrada") as AutopilotTemplate,
      day,
      house: house.id,
      tiles,
      buildings: levels,
      resources: res,
      nextResolution: game.current_resolution + 1,
    }));
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
      // En una aldea del frente si la tiene (bloque 1); si no, en el castillo.
      const site = recruitSite(tiles, house.id);
      st.push(
        site && site.type === "aldea"
          ? db.prepare("UPDATE tiles SET troops = troops + ? WHERE id = ? AND owner_house_id = ?").bind(plan.recruit, site.id, house.id)
          : db.prepare("UPDATE tiles SET troops = troops + ? WHERE game_id = ? AND castle_of = ?").bind(plan.recruit, game.id, house.id),
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

/** Aviso 1 hora antes del cierre (bloque 12), solo a las casas que aún no han dado ninguna orden y no lo han apagado. */
export async function closeWarning(env: NotifyEnv, game: GameRow, n: number): Promise<void> {
  await env.DB.prepare("INSERT INTO job_runs (game_id, job_key) VALUES (?, ?)").bind(game.id, `aviso_cierre:${n}`).run();
  const houses = await loadHouses(env.DB, game.id);
  // Solo a quien aún no ha dado órdenes: un aviso cada tarde a todo el mundo cansaría (respeto al tiempo).
  const { results } = await env.DB.prepare("SELECT DISTINCT house_id FROM orders WHERE game_id = ? AND resolution_no = ?")
    .bind(game.id, n)
    .all<{ house_id: number }>();
  const ordered = new Set(results.map((r) => r.house_id));
  const to = houses.filter((h) => !ordered.has(h.id) && h.close_warning !== 0).map((h) => h.id);
  if (to.length === 0) return;
  await notifyHouses(env, to, {
    kind: "cierre",
    title: "Cierre en 1 h",
    body: "Aún no has dado órdenes. Fray Abundio se impacienta.",
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
  const [tileRows, orderRows, houses, achieved, mercs, allianceRows] = await Promise.all([
    loadTiles(db, game.id),
    db.prepare(`SELECT ${ORDER_COLUMNS} FROM orders WHERE game_id = ? AND resolution_no = ? ORDER BY id`)
      .bind(game.id, n)
      .all<OrderRow>(),
    loadHouses(db, game.id),
    db.prepare("SELECT achievement_key FROM achievements WHERE game_id = ?").bind(game.id).all<{ achievement_key: string }>(),
    loadMercenaries(db, game.id),
    loadAlliances(db, game.id),
  ]);
  // Bloque 8: alianzas en vigor o en aviso (las aceptadas antes de la resolución valen esta noche).
  const alliances = toEngineAlliances(allianceRows);

  const tiles = toEngineTiles(tileRows);
  const orders: Order[] = orderRows.results.map(orderOf);
  const absentHouses = houses.filter((h) => isAbsent(h, now, game)).map((h) => h.id);

  const { days } = rhythmOf(game);
  const { week, kind } = resolutionInfo(n, days);
  // Cartas que actúan en esta resolución (Tregua y Tambores de guerra).
  const cardEffects = await cardsForResolution(db, game.id, n);
  // Evento de la semana: lo que afecta al combate del miércoles.
  const event = eventOfWeek(game.seed, week);
  const result = resolveCampaign({
    resolution: n,
    tiles,
    // Órdenes en cola: cada una se ajusta a las tropas que queden en su casilla.
    orders: fitOrders(tiles, orders),
    captains: captainsOf(houses),
    absentHouses,
    alliances,
    ...cardEffects,
    ...(kind === "miercoles" ? eventCombat(event) : {}),
  });
  const extraEvents: { type: string; visibleTo: number | null; payload: unknown }[] = [];
  const extraStatements: D1PreparedStatement[] = [];
  // Ruinas (bloque 1): la primera casa que entra se lleva el premio y quedan como Prado.
  const ruins = claimRuins(result.tiles, game.seed);
  let finalTiles: Tile[] = ruins.tiles;
  for (const c of ruins.claims) {
    extraStatements.push(db.prepare("UPDATE tiles SET type = 'prado' WHERE id = ? AND type = 'ruinas'").bind(c.tile));
    if (c.prize.kind === "carta") {
      extraStatements.push(
        db.prepare("INSERT INTO cards (game_id, house_id, card_key, acquired_at) VALUES (?, ?, ?, ?)").bind(
          game.id,
          c.house,
          c.prize.card,
          now.toISOString(),
        ),
      );
    } else {
      // El recurso sale de RESOURCES (nombres de columna fijos), nunca de fuera.
      extraStatements.push(db.prepare(`UPDATE houses SET ${c.prize.resource} = ${c.prize.resource} + ? WHERE id = ?`).bind(c.prize.amount, c.house));
    }
    extraEvents.push({ type: "ruinas", visibleTo: null, payload: { house: c.house, tile: c.tile, prize: c.prize } });
  }

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

  // Miércoles: efectos al momento del evento (repartos, bandidos), tras la campaña.
  if (kind === "miercoles") {
    const since = new Date(now.getTime() - 7 * 864e5).toISOString();
    const [weekTrades, prestigeNow] = await Promise.all([
      db.prepare("SELECT house_a, house_b FROM trades WHERE game_id = ? AND valid = 1 AND at >= ?")
        .bind(game.id, since)
        .all<{ house_a: number; house_b: number }>(),
      computeAllPrestige(db, game.id, houses, finalTiles, now),
    ]);
    const outcome = applyEventNow(
      event,
      finalTiles,
      houses.map((h) => ({
        house: h.id,
        resources: resourcesOf(h),
        prestige: prestigeNow.get(h.id)?.total ?? 0,
        validTradesWeek: weekTrades.results.filter((t) => t.house_a === h.id || t.house_b === h.id).length,
      })),
      n,
    );
    finalTiles = outcome.tiles.map((t) => {
      const extra = t.castleOf != null ? outcome.castleTroops.get(t.castleOf) : undefined;
      return extra ? { ...t, troops: t.troops + extra } : t;
    });
    for (const [hid, d] of outcome.resources) {
      // Nunca por debajo de cero (el tributo se calcula sobre lo que hay).
      extraStatements.push(
        db.prepare(
          "UPDATE houses SET pan = MAX(0, pan + ?), madera = MAX(0, madera + ?), piedra = MAX(0, piedra + ?), hierro = MAX(0, hierro + ?), oro = MAX(0, oro + ?) WHERE id = ?",
        ).bind(d.pan ?? 0, d.madera ?? 0, d.piedra ?? 0, d.hierro ?? 0, d.oro ?? 0, hid),
      );
    }
    extraStatements.push(
      db.prepare("UPDATE game_events SET applied_at = ? WHERE game_id = ? AND week = ?").bind(now.toISOString(), game.id, week),
    );
    const victim = (outcome.log as { house?: number }).house;
    extraEvents.push({
      type: "evento",
      visibleTo: null,
      payload: {
        ...outcome.log,
        week,
        nombre: EVENTS[event.key].nombre,
        texto: eventText(event),
        linea: eventLine(game.seed, week, event, victim != null ? houses.find((h) => h.id === victim)?.name : undefined),
        resources: Object.fromEntries(outcome.resources),
      },
    });
  }

  // Miércoles: la Gran Subasta se adjudica antes de la campaña.
  if (kind === "miercoles") {
    const auction = await auctionStatements(db, game, week, houses);
    extraStatements.push(...auction.statements);
    extraEvents.unshift(...auction.events);
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
      // Los mercenarios no comen: su Pan lo pone la Corona (bloque 5).
      const upkeep = applyUpkeep(finalTiles, h.id, h.pan, eventUpkeepFactor(event), mercenaryCount(mercs, h.id));
      finalTiles = upkeep.tiles;
      if (upkeep.paid > 0) extraStatements.push(db.prepare("UPDATE houses SET pan = pan - ? WHERE id = ?").bind(upkeep.paid, h.id));
      extraEvents.push({ type: "mantenimiento", visibleTo: h.id, payload: { house: h.id, ...upkeep, tiles: undefined } });
    }
    // Mantenimiento de las fortificaciones (bloque 4): FORTIFY_UPKEEP por casilla
    // fortificada; las que no se pueden pagar se desmantelan. Los bots solo
    // conservan las que lindan con otra casa, como en el simulador.
    for (const h of houses) {
      const keep = h.is_bot
        ? (t: Tile) => finalTiles.some((o) => o.owner != null && o.owner !== h.id && areAdjacent(o, t))
        : undefined;
      const fort = applyFortifyUpkeep(finalTiles, h.id, h, n + 1, keep);
      if (fort.dropped === 0 && RESOURCES.every((r) => fort.cost[r] === 0)) continue;
      finalTiles = fort.tiles;
      for (const r of RESOURCES) {
        // MAX(0, …): si la casa gastó algo después de leerla, no se rompe el lote (nunca negativo).
        if (fort.cost[r] > 0) extraStatements.push(db.prepare(`UPDATE houses SET ${r} = MAX(0, ${r} - ?) WHERE id = ?`).bind(fort.cost[r], h.id));
      }
      extraEvents.push({
        type: "mantenimiento_fortificaciones",
        visibleTo: h.id,
        payload: { house: h.id, piedra: fort.cost.piedra, oro: fort.cost.oro, kept: finalTiles.filter((t) => t.owner === h.id && t.fortifiedUntil != null && t.fortifiedUntil > n).length, dropped: fort.dropped },
      });
    }
  }

  // Estandartes a la vista: grupos ajenos que esta noche han entrado junto a tus tierras.
  const tileName = new Map(tileRows.map((t) => [t.id, t.name]));
  const sightings = new Map<number, { house: number; tile: number; troops: number; near: number }[]>();
  for (const h of houses) {
    const seen = bannersSeen(finalTiles, result.events, h.id);
    if (seen.length === 0) continue;
    sightings.set(h.id, seen);
    for (const b of seen) extraEvents.push({ type: "estandartes", visibleTo: h.id, payload: { ...b, viewer: h.id } });
  }

  // Bloque 12: los asedios y las defensas con «Repetir cada noche» se copian a la
  // noche siguiente si siguen siendo posibles; si no, la repetición se acaba y se avisa.
  extraStatements.push(...(await repeatStatements(db, game, n, orderRows.results, finalTiles, alliances, extraEvents)));

  const before = new Map(tiles.map((t) => [t.id, t]));
  const statements: D1PreparedStatement[] = [
    db.prepare(
      `INSERT INTO resolutions (game_id, number, week, kind, scheduled_at, status, state_before, orders_json, finished_at)
       VALUES (?, ?, ?, ?, ?, 'done', ?, ?, ?)`,
    ).bind(game.id, n, week, kind, now.toISOString(), JSON.stringify(tiles), JSON.stringify(orders), new Date().toISOString()),
  ];
  for (const t of finalTiles) {
    const old = before.get(t.id)!;
    if (
      old.owner === t.owner &&
      old.troops === t.troops &&
      old.fortifiedUntil === t.fortifiedUntil &&
      (old.jinetes ?? 0) === (t.jinetes ?? 0) &&
      (old.catapultas ?? 0) === (t.catapultas ?? 0) &&
      (old.besiegedBy ?? null) === (t.besiegedBy ?? null) &&
      (old.siegeNights ?? 0) === (t.siegeNights ?? 0)
    )
      continue;
    statements.push(
      db.prepare(
        "UPDATE tiles SET owner_house_id = ?, troops = ?, jinetes = ?, catapultas = ?, fortified_until = ?, besieged_by = ?, siege_nights = ? WHERE id = ?",
      ).bind(
        t.owner,
        t.troops,
        t.jinetes ?? 0,
        t.catapultas ?? 0,
        t.fortifiedUntil ?? null,
        t.besiegedBy ?? null,
        t.siegeNights ?? 0,
        t.id,
      ),
    );
  }
  // Bloque 8: tropas de paso que han cambiado (entradas, bajas, expulsiones, deserciones).
  statements.push(...guestStatements(db, game.id, tiles, finalTiles));
  // Capitanes: dónde acaba cada uno (o quién lo tiene preso), y la Gloria de la noche.
  for (const c of result.captains) {
    const h = houses.find((x) => x.id === c.house);
    if (!h) continue;
    if (h.captain_tile === c.tile && h.captain_captured_by === (c.capturedBy ?? null) && h.captain_free_at === (c.freeAt ?? null)) continue;
    statements.push(
      // Si cae preso o vuelve, el precio de un rescate anterior ya no vale.
      db.prepare("UPDATE houses SET captain_tile = ?, captain_captured_by = ?, captain_free_at = ?, captain_ransom = NULL WHERE id = ?").bind(
        c.tile,
        c.capturedBy ?? null,
        c.freeAt ?? null,
        c.house,
      ),
    );
  }
  for (const [house, g] of gloryFromEvents(result.events)) {
    statements.push(db.prepare("UPDATE houses SET glory = glory + ? WHERE id = ?").bind(g, house));
  }
  // Asedio a un castillo: una noche más de Prestigio para quien lo rodea.
  for (const e of result.events) {
    if (e.type === "asedio" && e.castle) {
      statements.push(db.prepare("UPDATE houses SET siege_nights = siege_nights + 1 WHERE id = ?").bind(e.house));
    }
  }
  statements.push(...extraStatements);
  // Bloque 10: las ofertas que llevan abiertas tres resoluciones se retiran.
  statements.push(expireOffersStatement(db, game, n, now));

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
    // La ayuda dura una semana: tantas resoluciones como días con resolución.
    if (last != null && n < totalResolutions(game.weeks, days)) {
      statements.push(db.prepare("UPDATE houses SET help_until_resolution = ? WHERE id = ?").bind(n + days.length, last));
      extraEvents.push({ type: "ayuda_ultimo", visibleTo: null, payload: { house: last, until: n + days.length } });
    }
  }

  // La subasta se cuenta primero; luego la campaña y lo demás.
  const allEvents: { type: string; visibleTo: number | null; payload: unknown }[] = [
    ...extraEvents.filter((e) => e.type === "subasta"),
    ...result.events.map((e: CampaignEvent) => ({
      type: e.type,
      // Las órdenes inválidas solo las ve su casa; el resto es público.
      visibleTo: e.type === "orden_invalida" ? e.order.house : null,
      payload: e,
    })),
    ...extraEvents.filter((e) => e.type !== "subasta"),
  ];
  for (const e of allEvents) {
    statements.push(
      db.prepare(
        "INSERT INTO event_log (game_id, resolution_id, type, visible_to, payload) VALUES (?, (SELECT id FROM resolutions WHERE game_id = ? AND number = ?), ?, ?, ?)",
      ).bind(game.id, game.id, n, e.type, e.visibleTo, JSON.stringify(e.payload)),
    );
  }
  // Bloque 8: terminan las alianzas cuyo aviso acaba esta noche y caducan las propuestas.
  statements.push(...allianceNightStatements(db, game, n, allianceRows, now.toISOString()));
  // Aviso de Fray Abundio: tropas de un aliado dentro de tus casillas que pasan del umbral.
  const crowded = crowding(tiles, finalTiles);
  for (const w of crowded) {
    statements.push(
      db.prepare(
        "INSERT INTO event_log (game_id, resolution_id, type, visible_to, payload) VALUES (?, (SELECT id FROM resolutions WHERE game_id = ? AND number = ?), 'tropas_dentro', ?, ?)",
      ).bind(game.id, game.id, n, w.host, JSON.stringify(w)),
    );
  }
  statements.push(
    db.prepare("UPDATE games SET current_resolution = ? WHERE id = ? AND current_resolution = ?").bind(n, game.id, n - 1),
  );
  await db.batch(statements);
  for (const w of crowded) {
    const guest = houses.find((h) => h.id === w.guest);
    const all = PHRASES["aviso.tropas_dentro"];
    const text = fill(all[(n + w.guest) % all.length]!, { jugador: guest ? houseInSentence(guest.name) : "otra casa", n: w.troops });
    await notifyHouses(env, [w.host], {
      kind: "alianza",
      title: "Tropas aliadas en tus tierras",
      body: text.charAt(0).toUpperCase() + text.slice(1),
      url: `/partida/${game.id}`,
      dedupe: `tropas_dentro:${game.id}:${n}:${w.host}:${w.guest}`,
    });
  }

  // Avisos: a quien ha tenido combate en sus tierras, uno personal; al resto, el general.
  const fought = new Set<number>();
  for (const e of result.events) {
    if (e.type === "combate") {
      for (const s of e.sides) {
        if (s.house != null) fought.add(s.house);
        // Bloque 8: también las tropas de paso que defendían o miraban.
        for (const h of s.joint ?? []) fought.add(h);
      }
      for (const h of e.aside ?? []) fought.add(h);
    }
    if (e.type === "rebote") e.houses.forEach((h) => fought.add(h));
  }
  for (const h of houses) {
    const seen = sightings.get(h.id) ?? [];
    const banners =
      seen.length > 0
        ? ` Se ven estandartes de ${houses.find((x) => x.id === seen[0]!.house)?.name ?? "otra casa"} en ${tileName.get(seen[0]!.tile) ?? "una casilla vecina"}${
            seen.length > 1 ? ` y ${seen.length - 1} ${seen.length === 2 ? "aviso" : "avisos"} más` : ""
          }.`
        : "";
    await notifyHouses(env, [h.id], {
      kind: "resolucion",
      title: fought.has(h.id) ? `Combate en la resolución ${n}` : seen.length > 0 ? `Estandartes a la vista` : `Resolución ${n}`,
      body:
        (fought.has(h.id)
          ? "Ha habido batalla en tus tierras. Mira la repetición de la noche."
          : seen.length > 0
            ? "Hay movimiento junto a tus tierras."
            : "El reino se ha movido. Echa un vistazo a la crónica.") + banners,
      url: `/partida/${game.id}`,
      dedupe: `resolucion:${game.id}:${n}:${h.id}`,
    });
  }
}

/** Fin de la partida: objetivos secretos, Prestigio final y coronación. */
export async function finishGame(env: NotifyEnv, game: GameRow, now: Date): Promise<void> {
  const db = env.DB;
  const [houses, tileRows, buildings, trades, takes, lotsWon] = await Promise.all([
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
    db.prepare("SELECT winner_house_id AS house, COUNT(*) AS n FROM auction_lots WHERE game_id = ? AND winner_house_id IS NOT NULL GROUP BY winner_house_id")
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
        auctionsWon: lotsWon.results.find((l) => l.house === h.id)?.n ?? 0,
      });
    const p = prestige.get(h.id)!;
    const total = p.total + (met ? PRESTIGE.secretObjective : 0);
    final.push({ house: h.id, total, tiles: tiles.filter((t) => t.owner === h.id && t.type !== "castillo").length, gold: h.oro });
    statements.push(
      db.prepare("UPDATE houses SET objective_met = ? WHERE id = ?").bind(met ? 1 : 0, h.id),
      db.prepare(
        "INSERT OR REPLACE INTO prestige_snapshots (game_id, house_id, resolution_no, total, breakdown) VALUES (?, ?, ?, ?, ?)",
      ).bind(game.id, h.id, totalResolutions(game.weeks, rhythmOf(game).days) + 1, total, JSON.stringify({ ...p, objetivo: met ? PRESTIGE.secretObjective : 0, total })),
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

  // Último boletín: objetivos secretos y Mecenas de la Mentira.
  try {
    const finished = await loadGame(db, game.id);
    if (finished) await publishBulletin(env, finished, game.weeks, true);
  } catch (err) {
    console.error(`Partida ${game.id}, último boletín:`, err);
  }
  // Bloque 3: la Crónica Definitiva, a favor del ganador.
  try {
    const finished = await loadGame(db, game.id);
    if (finished) await publishChronicle(env, finished);
  } catch (err) {
    console.error(`Partida ${game.id}, Crónica Definitiva:`, err);
  }

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

/** Jinetes y Catapultas de una orden guardada (sin ceros, como en el motor). */
function typesOf(o: { jinetes: number; catapultas: number }): { jinetes?: number; catapultas?: number } {
  return { ...(o.jinetes > 0 ? { jinetes: o.jinetes } : {}), ...(o.catapultas > 0 ? { catapultas: o.catapultas } : {}) };
}

/**
 * Bloque 8: tropas de paso de cada casa dentro de las casillas de cada otra.
 * Devuelve las parejas que esta noche llegan a `ALLIANCE.warnTroops` (antes no
 * llegaban), para el aviso de Fray Abundio a la casa anfitriona.
 */
export function crowding(before: Tile[], after: Tile[]): { host: number; guest: number; troops: number }[] {
  const count = (tiles: Tile[]) => {
    const out = new Map<string, number>();
    for (const t of tiles) {
      if (t.owner == null) continue;
      for (const g of t.guests ?? []) out.set(`${t.owner}:${g.house}`, (out.get(`${t.owner}:${g.house}`) ?? 0) + g.troops);
    }
    return out;
  };
  const was = count(before);
  const now = count(after);
  const out: { host: number; guest: number; troops: number }[] = [];
  for (const [key, troops] of now) {
    if (troops < ALLIANCE.warnTroops || (was.get(key) ?? 0) >= ALLIANCE.warnTroops) continue;
    const [host, guest] = key.split(":").map(Number) as [number, number];
    out.push({ host, guest, troops });
  }
  return out.sort((a, b) => a.host - b.host || a.guest - b.guest);
}

/**
 * Repetir cada noche (bloque 12): copia a la noche n + 1 las órdenes de la noche
 * n marcadas para repetirse, con el mapa ya resuelto. Si una ya no es posible
 * (asedio roto, casilla perdida, sin tropas), no se copia y su casa recibe un
 * aviso en la crónica. Si la casa ya tiene esa misma orden en cola, no la duplica.
 * Va en el mismo lote que la resolución (su clave es la de la resolución).
 */
async function repeatStatements(
  db: D1Database,
  game: GameRow,
  n: number,
  rows: OrderRow[],
  tiles: Tile[],
  alliances: Alliance[],
  events: { type: string; visibleTo: number | null; payload: unknown }[],
): Promise<D1PreparedStatement[]> {
  const repeated = rows.filter((r) => r.repeat === 1);
  if (repeated.length === 0 || n + 1 > totalResolutions(game.weeks, rhythmOf(game).days)) return [];
  const { results: queued } = await db
    .prepare("SELECT house_id, kind, from_tile_id, target_tile_id, supported_from_tile_id, supports_any FROM orders WHERE game_id = ? AND resolution_no = ?")
    .bind(game.id, n + 1)
    .all<{ house_id: number; kind: OrderRow["kind"]; from_tile_id: number; target_tile_id: number; supported_from_tile_id: number | null; supports_any: number }>();
  const same = (a: Pick<OrderRow, "house_id" | "kind" | "from_tile_id" | "target_tile_id" | "supported_from_tile_id" | "supports_any">, b: typeof a) =>
    a.house_id === b.house_id &&
    a.kind === b.kind &&
    a.from_tile_id === b.from_tile_id &&
    a.target_tile_id === b.target_tile_id &&
    a.supported_from_tile_id === b.supported_from_tile_id &&
    a.supports_any === b.supports_any;
  const out: D1PreparedStatement[] = [];
  for (const r of repeated) {
    if (queued.some((q) => same(q, r))) {
      out.push(
        db
          .prepare(
            "UPDATE orders SET repeat = 1 WHERE game_id = ? AND resolution_no = ? AND house_id = ? AND kind = ? AND from_tile_id = ? AND target_tile_id = ?",
          )
          .bind(game.id, n + 1, r.house_id, r.kind, r.from_tile_id, r.target_tile_id),
      );
      continue;
    }
    const order = orderOf(r);
    const { invalid } = checkOrders(tiles, fitOrders(tiles, [order]), n + 1, alliances);
    if (invalid.length > 0) {
      events.push({
        type: "repeticion_fin",
        visibleTo: r.house_id,
        payload: { house: r.house_id, kind: r.kind, from: r.from_tile_id, target: r.target_tile_id, reason: invalid[0]!.reason },
      });
      continue;
    }
    out.push(
      db
        .prepare(
          "INSERT INTO orders (game_id, house_id, resolution_no, kind, from_tile_id, troops, jinetes, catapultas, captain, guest, target_tile_id, supported_from_tile_id, supports_any, updated_at, repeat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 1)",
        )
        .bind(game.id, r.house_id, n + 1, r.kind, r.from_tile_id, r.troops, r.jinetes, r.catapultas, r.guest, r.target_tile_id, r.supported_from_tile_id, r.supports_any, r.updated_at),
    );
  }
  return out;
}

/** Una orden guardada (fila de `orders`), en el formato del motor. */
export interface OrderRow {
  house_id: number;
  kind: "move" | "support" | "siege";
  from_tile_id: number;
  troops: number;
  jinetes: number;
  catapultas: number;
  captain: number;
  guest: number;
  target_tile_id: number;
  supported_from_tile_id: number | null;
  supports_any: number;
  updated_at: string;
  /** Bloque 12: se copia a la noche siguiente al resolver. */
  repeat?: number;
}

export const ORDER_COLUMNS =
  "house_id, kind, from_tile_id, troops, jinetes, catapultas, captain, guest, target_tile_id, supported_from_tile_id, supports_any, updated_at, repeat";

export function orderOf(o: OrderRow): Order {
  const guest = o.guest ? { guest: true } : {};
  if (o.kind === "move") {
    return {
      kind: "move",
      house: o.house_id,
      from: o.from_tile_id,
      to: o.target_tile_id,
      troops: o.troops,
      ...typesOf(o),
      ...(o.captain ? { captain: true } : {}),
      ...guest,
      // Para el apoyo sin origen (bloque 4): cuándo se cambió la orden por última vez.
      at: Date.parse(o.updated_at),
    };
  }
  if (o.kind === "siege") {
    return { kind: "siege", house: o.house_id, from: o.from_tile_id, target: o.target_tile_id, troops: o.troops, ...typesOf(o), ...guest };
  }
  return {
    kind: "support",
    house: o.house_id,
    from: o.from_tile_id,
    target: o.target_tile_id,
    supportedFrom: o.supports_any ? ANY_ORIGIN : o.supported_from_tile_id,
    troops: o.troops,
    ...typesOf(o),
    ...guest,
  };
}
