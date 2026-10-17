// API del juego. Todas las respuestas para el jugador van en español y nunca
// incluyen información fuera de su niebla de guerra.

import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  BUILDINGS,
  SPECIALTY_PAIRS,
  STARTING_RESOURCES,
  castleName,
  checkFortify,
  checkOrders,
  checkRecruit,
  checkUpgrade,
  checkOffer,
  cleanBundle,
  dealObjectives,
  OBJECTIVES,
  type ObjectiveKey,
  dailyProduction,
  MAX_OPEN_PUBLIC_OFFERS,
  RESOURCES,
  totalOf,
  generateMap,
  localDate,
  localParts,
  projectForHouse,
  resolutionInstant,
  DAILY_DAYS,
  totalResolutions,
  withRhythm,
  weeklyUpkeep,
  zonedToUtc,
  type BuildingKind,
  type CardParams,
  type EventKey,
  BRIBE_COST,
  PHRASES,
  resolutionInfo,
  type WeekEvent,
  EVENTS,
  eventLine,
  eventText,
  checkShield,
  freeShield,
  type Order,
  type Resources,
} from "@reyes/engine";
import {
  SESSION_COOKIE,
  hashCode,
  normalizeCode,
  randomCode,
  sessionCookieOptions,
  signSession,
  verifySession,
  type Session,
} from "./auth";
import { notifyHouses, vapidFrom, type NotifyEnv } from "./notify";
import { COLORS, shieldOf, shieldView } from "./heraldry";
import { clockOf, runGameJobs } from "./jobs";
import { bribeView, type StoredBulletin } from "./boletin";
import { auctionView, handView, openAuctionWeek, spiedHouses, useCardStatements, type CardRow } from "./subasta";
import { addBots, advance, botsPlayDay, deleteTestGame, testStart } from "./pruebas";
import { acceptOffer, bundle, offerView, type OfferRow } from "./offers";
import { ordersOpen } from "./scheduler";
import {
  computeAllPrestige,
  loadBuildings,
  loadGame,
  loadHouses,
  loadTiles,
  resourcesOf,
  toEngineTiles,
  gameNow,
  type GameRow,
  type HouseRow,
  rhythmOf,
} from "./state";

export interface Env extends NotifyEnv {
  DB: D1Database;
  /** Clave para firmar sesiones y códigos (wrangler secret put SESSION_SECRET). */
  SESSION_SECRET: string;
  /** Clave para crear partidas (wrangler secret put ADMIN_SECRET). */
  ADMIN_SECRET: string;
}

type Vars = { session: Session | null };
type Ctx = Context<{ Bindings: Env; Variables: Vars }>;

export const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// Sesión (si la hay) en todas las rutas.
app.use("*", async (c, next) => {
  const session = await verifySession(getCookie(c, SESSION_COOKIE), c.env.SESSION_SECRET);
  let valid: Session | null = null;
  if (session) {
    const user = await c.env.DB.prepare("SELECT token_version FROM users WHERE id = ?")
      .bind(session.userId)
      .first<{ token_version: number }>();
    if (user && user.token_version === session.tokenVersion) valid = session;
  }
  c.set("session", valid);
  await next();
});

const fail = (c: Ctx, status: 400 | 401 | 403 | 404 | 409, error: string) => c.json({ error }, status);

app.get("/api/salud", (c) => {
  const p = localParts(new Date(), "Europe/Madrid");
  return c.json({
    ok: true,
    juego: "Reyes de Pacotilla",
    horaMadrid: `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`,
  });
});

// ---------------------------------------------------------------------------
// Cuentas
// ---------------------------------------------------------------------------

async function startSession(c: Ctx, userId: number, tokenVersion: number) {
  const token = await signSession({ userId, tokenVersion }, c.env.SESSION_SECRET);
  setCookie(c, SESSION_COOKIE, token, sessionCookieOptions(new URL(c.req.url).protocol === "https:"));
}

app.post("/api/entrar", async (c) => {
  const { codigo } = await c.req.json<{ codigo?: string }>().catch(() => ({ codigo: undefined }));
  if (!codigo || normalizeCode(codigo).length !== 6) return fail(c, 400, "El código tiene 6 caracteres.");
  const hash = await hashCode(codigo, c.env.SESSION_SECRET);
  const user = await c.env.DB.prepare("SELECT id, token_version FROM users WHERE login_code_hash = ?")
    .bind(hash)
    .first<{ id: number; token_version: number }>();
  if (!user) return fail(c, 401, "Ese código no existe. Revísalo con calma, alteza.");
  await startSession(c, user.id, user.token_version);
  return c.json({ ok: true });
});

app.post("/api/salir", (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

app.get("/api/yo", async (c) => {
  const s = c.get("session");
  if (!s) return c.json({ usuario: null, partidas: [] });
  const user = await c.env.DB.prepare("SELECT id, display_name FROM users WHERE id = ?")
    .bind(s.userId)
    .first<{ id: number; display_name: string }>();
  const { results } = await c.env.DB.prepare(
    `SELECT g.id, g.name, g.status, g.is_test, h.name AS casa, h.color, h.shield_shape, h.shield_division, h.color2, h.symbol, h.metal
     FROM houses h JOIN games g ON g.id = h.game_id WHERE h.user_id = ? ORDER BY g.id DESC`,
  )
    .bind(s.userId)
    .all<
      Pick<HouseRow, "color" | "shield_shape" | "shield_division" | "color2" | "symbol" | "metal"> & {
        id: number;
        name: string;
        status: string;
        is_test: number;
        casa: string;
      }
    >();
  return c.json({
    usuario: user ? { id: user.id, nombre: user.display_name } : null,
    partidas: results.map((g) => ({
      id: g.id,
      nombre: g.name,
      estado: g.status,
      prueba: g.is_test === 1,
      casa: g.casa,
      color: g.color,
      escudo: shieldView(g),
    })),
  });
});

/** Genera un código de acceso nuevo (el anterior y las sesiones abiertas dejan de valer). */
app.post("/api/codigo-nuevo", async (c) => {
  const s = c.get("session");
  if (!s) return fail(c, 401, "Primero hay que entrar.");
  const code = randomCode();
  await c.env.DB.prepare("UPDATE users SET login_code_hash = ?, token_version = token_version + 1 WHERE id = ?")
    .bind(await hashCode(code, c.env.SESSION_SECRET), s.userId)
    .run();
  const user = await c.env.DB.prepare("SELECT token_version FROM users WHERE id = ?")
    .bind(s.userId)
    .first<{ token_version: number }>();
  await startSession(c, s.userId, user!.token_version);
  return c.json({ codigoAcceso: code });
});

// ---------------------------------------------------------------------------
// Notificaciones push
// ---------------------------------------------------------------------------

app.get("/api/push/clave", (c) => c.json({ clave: c.env.VAPID_PUBLIC_KEY ?? null }));

app.post("/api/push/suscribir", async (c) => {
  const s = c.get("session");
  if (!s) return fail(c, 401, "Primero hay que entrar.");
  const body = await c.req
    .json<{ endpoint?: string; keys?: { p256dh?: string; auth?: string } }>()
    .catch(() => ({}) as never);
  if (!body.endpoint?.startsWith("https://") || !body.keys?.p256dh || !body.keys?.auth) {
    return fail(c, 400, "Suscripción no válida.");
  }
  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions (user_id, endpoint, keys_json) VALUES (?, ?, ?)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, keys_json = excluded.keys_json`,
  )
    .bind(s.userId, body.endpoint, JSON.stringify({ p256dh: body.keys.p256dh, auth: body.keys.auth }))
    .run();
  return c.json({ ok: true });
});

app.post("/api/push/baja", async (c) => {
  const s = c.get("session");
  if (!s) return fail(c, 401, "Primero hay que entrar.");
  const { endpoint } = await c.req.json<{ endpoint?: string }>().catch(() => ({ endpoint: undefined }));
  await c.env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?").bind(endpoint, s.userId).run();
  return c.json({ ok: true });
});

app.post("/api/push/prueba", async (c) => {
  const s = c.get("session");
  if (!s) return fail(c, 401, "Primero hay que entrar.");
  if (!vapidFrom(c.env)) return fail(c, 409, "El servidor aún no tiene configuradas las notificaciones.");
  const house = await c.env.DB.prepare("SELECT id FROM houses WHERE user_id = ? ORDER BY id DESC LIMIT 1")
    .bind(s.userId)
    .first<{ id: number }>();
  if (!house) return fail(c, 404, "Aún no tienes casa en ninguna partida.");
  await notifyHouses(c.env, [house.id], {
    kind: "prueba",
    title: "Reyes de Pacotilla",
    body: "Fray Abundio comprueba que le oyes. Te oye.",
    url: "/",
    dedupe: `prueba:${Date.now()}`,
  });
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Crear partida e invitaciones
// ---------------------------------------------------------------------------

/** Crear partida: protegido con la clave de administración. Crea también al creador. */
app.post("/api/partidas", async (c) => {
  if (c.req.header("x-admin") !== c.env.ADMIN_SECRET) return fail(c, 403, "Hace falta la clave de administración.");
  const body = await c.req
    .json<{ nombre?: string; semanas?: number; creador?: string; prueba?: boolean; bots?: number }>()
    .catch(() => ({}) as never);
  const prueba = body.prueba === true;
  const bots = Number(body.bots ?? 3);
  if (prueba && !(Number.isInteger(bots) && bots >= 3 && bots <= 7)) return fail(c, 400, "Una prueba lleva de 3 a 7 bots.");
  const nombre = (body.nombre ?? "").trim();
  const semanas = body.semanas ?? 6;
  if (!nombre) return fail(c, 400, "La partida necesita un nombre.");
  if (![2, 4, 6, 8].includes(semanas)) return fail(c, 400, "La partida dura 2, 4, 6 u 8 semanas.");

  const s = c.get("session");
  let userId = s?.userId;
  let codigoAcceso: string | null = null;
  if (!userId) {
    const creador = (body.creador ?? "").trim();
    if (!creador) return fail(c, 400, "Falta el nombre de quien crea la partida.");
    codigoAcceso = randomCode();
    const user = await c.env.DB.prepare("INSERT INTO users (display_name, login_code_hash) VALUES (?, ?) RETURNING id")
      .bind(creador, await hashCode(codigoAcceso, c.env.SESSION_SECRET))
      .first<{ id: number }>();
    userId = user!.id;
    await startSession(c, userId, 1);
  }
  const invite = randomCode(8);
  const game = await c.env.DB.prepare(
    "INSERT INTO games (name, weeks, seed, invite_code, created_by, is_test, test_bots, resolution_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
  )
    .bind(nombre, semanas, randomCode(12), invite, userId, prueba ? 1 : 0, prueba ? bots : null, DAILY_DAYS.join(","))
    .first<{ id: number }>();
  return c.json({ id: game!.id, codigoInvitacion: invite, codigoAcceso });
});

app.get("/api/invitacion/:codigo", async (c) => {
  const game = await c.env.DB.prepare("SELECT id, name, status, weeks FROM games WHERE invite_code = ?")
    .bind(normalizeCode(c.req.param("codigo")))
    .first<{ id: number; name: string; status: string; weeks: number }>();
  if (!game) return fail(c, 404, "Esa invitación no existe.");
  const houses = await loadHouses(c.env.DB, game.id);
  const s = c.get("session");
  return c.json({
    partida: { id: game.id, nombre: game.name, estado: game.status, semanas: game.weeks },
    casas: houses.map((h) => ({ nombre: h.name, color: h.color, escudo: shieldView(h) })),
    coloresLibres: COLORS.filter((col) => !houses.some((h) => h.color === col)),
    yaDentro: s ? houses.some((h) => h.user_id === s.userId) : false,
  });
});


type HouseBody = {
  casa?: string;
  color?: string;
  lema?: string;
  forma?: string;
  division?: string;
  color2?: string | null;
  simbolo?: string;
  metal?: string;
};

/**
 * Nombre, lema y escudo de una casa, validados frente a las demás. Si el
 * cliente no manda escudo (versiones antiguas), se propone el primero libre.
 */
function parseHouse(body: HouseBody, others: HouseRow[]) {
  const casa = (body.casa ?? "").trim();
  if (casa.length < 1 || casa.length > 20) return { error: "El nombre de la casa tiene entre 1 y 20 caracteres.", status: 400 as const };
  const lema = (body.lema ?? "").trim() || null;
  if (lema && lema.length > 40) return { error: "El lema tiene como máximo 40 caracteres.", status: 400 as const };
  const fallback = freeShield(others.map(shieldOf));
  const division = body.division ?? "pleno";
  const shield = {
    color: body.color,
    shape: body.forma ?? fallback.shape,
    division,
    color2: division === "pleno" ? (body.color2 ?? null) : body.color2,
    symbol: body.simbolo ?? fallback.symbol,
    metal: body.metal ?? "oro",
  };
  const error = checkShield(shield, others.map(shieldOf));
  // 409 si choca con otra casa; 400 si el escudo no vale por sí mismo.
  if (error) return { error, status: (checkShield(shield, []) ? 400 : 409) as 400 | 409 };
  return { casa, lema, shield: shield as ReturnType<typeof shieldOf> };
}

app.post("/api/invitacion/:codigo/unirse", async (c) => {
  const db = c.env.DB;
  const game = await db.prepare("SELECT id, status FROM games WHERE invite_code = ?")
    .bind(normalizeCode(c.req.param("codigo")))
    .first<{ id: number; status: string }>();
  if (!game) return fail(c, 404, "Esa invitación no existe.");
  if (game.status !== "lobby") return fail(c, 409, "La partida ya ha empezado.");

  const body = await c.req.json<HouseBody & { nombre?: string }>().catch(() => ({}) as never);
  const houses = await loadHouses(db, game.id);
  if (houses.length >= 8) return fail(c, 409, "La partida ya tiene 8 casas.");
  const parsed = parseHouse(body, houses);
  if ("error" in parsed) return fail(c, parsed.status ?? 400, parsed.error!);
  const { casa, lema, shield } = parsed;

  let s = c.get("session");
  let codigoAcceso: string | null = null;
  if (s && houses.some((h) => h.user_id === s!.userId)) return fail(c, 409, "Ya tienes una casa en esta partida.");
  if (!s) {
    const nombre = (body.nombre ?? "").trim();
    if (!nombre) return fail(c, 400, "¿Cómo te llamas?");
    codigoAcceso = randomCode();
    const user = await db.prepare("INSERT INTO users (display_name, login_code_hash) VALUES (?, ?) RETURNING id")
      .bind(nombre, await hashCode(codigoAcceso, c.env.SESSION_SECRET))
      .first<{ id: number }>();
    s = { userId: user!.id, tokenVersion: 1 };
    await startSession(c, s.userId, 1);
  }

  try {
    await db.prepare(
      "INSERT INTO houses (game_id, user_id, name, color, shield_shape, shield_division, color2, symbol, metal, motto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(game.id, s.userId, casa, shield.color, shield.shape, shield.division, shield.color2, shield.symbol, shield.metal, lema)
      .run();
  } catch {
    return fail(c, 409, "Otra casa acaba de coger ese color o ese escudo. Elige otro.");
  }
  return c.json({ ok: true, partida: game.id, codigoAcceso });
});

// En la sala de espera cada casa puede retocar su nombre, lema y escudo.
app.put("/api/partidas/:id/casa", async (c) => {
  const m = await membership(c);
  if (m instanceof Response) return m;
  const { game, house, houses } = m;
  if (game.status !== "lobby") return fail(c, 409, "El escudo no se cambia con la partida empezada.");
  const body = await c.req.json<HouseBody>().catch(() => ({}) as HouseBody);
  const parsed = parseHouse(body, houses.filter((h) => h.id !== house.id));
  if ("error" in parsed) return fail(c, parsed.status ?? 400, parsed.error!);
  const { casa, lema, shield } = parsed;
  try {
    await c.env.DB.prepare(
      "UPDATE houses SET name = ?, motto = ?, color = ?, shield_shape = ?, shield_division = ?, color2 = ?, symbol = ?, metal = ? WHERE id = ?",
    )
      .bind(casa, lema, shield.color, shield.shape, shield.division, shield.color2, shield.symbol, shield.metal, house.id)
      .run();
  } catch {
    return fail(c, 409, "Otra casa acaba de coger ese color o ese escudo. Elige otro.");
  }
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Empezar la partida
// ---------------------------------------------------------------------------

app.post("/api/partidas/:id/empezar", async (c) => {
  const db = c.env.DB;
  const s = c.get("session");
  const game = await loadGame(db, Number(c.req.param("id")));
  if (!game) return fail(c, 404, "Esa partida no existe.");
  if (!s || s.userId !== game.created_by) return fail(c, 403, "Solo quien creó la partida puede empezarla.");
  if (game.status !== "lobby") return fail(c, 409, "La partida ya ha empezado.");
  const test = game.is_test === 1;
  if (test && !(await loadHouses(db, game.id)).some((h) => h.user_id === s.userId)) {
    return fail(c, 409, "Elige primero tu casa.");
  }
  // Las pruebas se rellenan con bots; las de verdad necesitan 4 personas.
  const houses = test ? await addBots(c.env, game.id, game.test_bots ?? 3) : await loadHouses(db, game.id);
  if (houses.length < 4) return fail(c, 409, "Hacen falta al menos 4 casas para empezar.");

  const body = await c.req.json<{ inicio?: string }>().catch(() => ({}) as { inicio?: string });
  const startDate = body.inicio ?? nextMonday(new Date(), game.timezone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || new Date(`${startDate}T12:00:00Z`).getUTCDay() !== 1) {
    return fail(c, 400, "La partida empieza un lunes (AAAA-MM-DD).");
  }

  const simNow = test ? testStart(startDate, game.timezone).toISOString() : null;
  const mine = houses.find((h) => h.user_id === s.userId);
  const map = generateMap(game.seed, houses.map((h) => h.id));
  const objectives = dealObjectives(game.seed, houses.map((h) => h.id));
  const statements: D1PreparedStatement[] = [
    db.prepare(
      `UPDATE games SET status = 'active', start_date = ?, map_cols = ?, map_rows = ?, started_at = ?,
         sim_now = ?, played_house_id = ? WHERE id = ? AND status = 'lobby'`,
    ).bind(startDate, map.cols, map.rows, new Date().toISOString(), simNow, test ? (mine?.id ?? null) : null, game.id),
  ];
  for (const t of map.tiles) {
    const name = t.type === "castillo" ? castleName(houses.find((h) => h.id === t.castleOf)!.name) : t.name;
    statements.push(
      db.prepare(
        "INSERT INTO tiles (game_id, x, y, type, name, castle_of, owner_house_id, troops) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(game.id, t.x, t.y, t.type, name, t.castleOf ?? null, t.owner, t.troops),
    );
  }
  houses.forEach((h, i) => {
    const specialties = SPECIALTY_PAIRS[i % SPECIALTY_PAIRS.length]!;
    for (const kind of BUILDINGS) {
      statements.push(
        db.prepare("INSERT INTO buildings (house_id, kind, level) VALUES (?, ?, ?)").bind(
          h.id,
          kind,
          specialties.includes(kind) ? 2 : 1,
        ),
      );
    }
    statements.push(
      db.prepare(
        "UPDATE houses SET pan = ?, madera = ?, piedra = ?, hierro = ?, oro = ?, last_seen_at = ?, objective_options = ? WHERE id = ?",
      ).bind(
        STARTING_RESOURCES,
        STARTING_RESOURCES,
        STARTING_RESOURCES,
        STARTING_RESOURCES,
        STARTING_RESOURCES,
        new Date().toISOString(),
        JSON.stringify(objectives.get(h.id)),
        h.id,
      ),
    );
  });
  await db.batch(statements);
  // En las pruebas, el primer día empieza ya: producción del lunes.
  if (test) {
    await runGameJobs(c.env, (await loadGame(db, game.id))!, new Date(simNow!));
    await botsPlayDay(c.env, (await loadGame(db, game.id))!);
  }
  return c.json({ ok: true, inicio: startDate });
});

// ---------------------------------------------------------------------------
// Estado de la partida (con niebla de guerra)
// ---------------------------------------------------------------------------

interface Membership {
  game: GameRow;
  house: HouseRow;
  houses: HouseRow[];
}

async function membership(c: Ctx): Promise<Membership | Response> {
  const s = c.get("session");
  if (!s) return fail(c, 401, "Primero hay que entrar.");
  const game = await loadGame(c.env.DB, Number(c.req.param("id")));
  if (!game) return fail(c, 404, "Esa partida no existe.");
  const houses = await loadHouses(c.env.DB, game.id);
  // En las pruebas, quien las creó puede manejar cualquier casa ("jugar como").
  const playing =
    game.is_test === 1 && game.created_by === s.userId && game.played_house_id != null
      ? houses.find((h) => h.id === game.played_house_id)
      : undefined;
  const house = playing ?? houses.find((h) => h.user_id === s.userId);
  if (!house) return fail(c, 403, "No tienes casa en esta partida.");
  // Cuenta como visita para el piloto automático.
  await c.env.DB.prepare("UPDATE houses SET last_seen_at = ? WHERE id = ?").bind(new Date().toISOString(), house.id).run();
  return { game, house, houses };
}

app.get("/api/partidas/:id", async (c) => {
  const m = await membership(c);
  if (m instanceof Response) return m;
  const { game, house, houses } = m;
  const db = c.env.DB;
  const now = gameNow(game);
  const s = c.get("session")!;

  const base = {
    partida: {
      id: game.id,
      nombre: game.name,
      estado: game.status,
      semanas: game.weeks,
      esCreador: game.created_by === s.userId,
      codigoInvitacion: game.created_by === s.userId ? game.invite_code : null,
      inicio: game.start_date,
      columnas: game.map_cols,
      filas: game.map_rows,
      resolucionActual: game.current_resolution,
      totalResoluciones: totalResolutions(game.weeks, rhythmOf(game).days),
      /** Días con resolución (0 = lunes) y resoluciones que dura fortificar. */
      diasResolucion: rhythmOf(game).days,
      fortificarResoluciones: rhythmOf(game).fortify,
    },
  };
  if (game.status === "lobby") {
    return c.json({
      ...base,
      yo: { casa: house.id },
      casas: houses.map((h) => ({ id: h.id, nombre: h.name, color: h.color, lema: h.motto, escudo: shieldView(h) })),
      prueba: game.is_test === 1 ? { bots: game.test_bots ?? 3 } : null,
    });
  }

  const tileRows = await loadTiles(db, game.id);
  const tiles = toEngineTiles(tileRows);
  // Carta Espía: casas que esta casa ve enteras hasta la próxima resolución.
  const spied = await spiedHouses(db, game, house.id);
  const [buildings, prestige, orders, events, offers, trades, achievements, ending] = await Promise.all([
    loadBuildings(db, game.id),
    computeAllPrestige(db, game.id, houses, tiles, now),
    db.prepare(
      "SELECT id, kind, from_tile_id, troops, target_tile_id, supported_from_tile_id FROM orders WHERE house_id = ? AND resolution_no = ? ORDER BY id",
    )
      .bind(house.id, game.current_resolution + 1)
      .all<{ id: number; kind: "move" | "support"; from_tile_id: number; troops: number; target_tile_id: number; supported_from_tile_id: number | null }>(),
    db.prepare(
      `SELECT e.id, e.type, e.payload, e.at, r.number AS resolucion FROM event_log e LEFT JOIN resolutions r ON r.id = e.resolution_id
       WHERE e.game_id = ? AND (e.visible_to IS NULL OR e.visible_to = ?)
       -- Por resolución (la más reciente arriba) y, dentro, en orden. Lo que no
       -- pertenece a una resolución (logros, piloto, final) va con la siguiente.
       ORDER BY COALESCE(r.number, (SELECT current_resolution + 1 FROM games WHERE id = e.game_id)) DESC, e.id ASC LIMIT 40`,
    )
      .bind(game.id, house.id)
      .all<{ id: number; type: string; payload: string; at: string; resolucion: number | null }>(),
    db.prepare(
      `SELECT * FROM offers WHERE game_id = ? AND (
         (status = 'open' AND (to_house_id IS NULL OR to_house_id = ? OR from_house_id = ?))
         OR (status <> 'open' AND (from_house_id = ? OR to_house_id = ? OR accepted_by = ?) AND closed_at >= ?)
       ) ORDER BY id DESC LIMIT 50`,
    )
      .bind(game.id, house.id, house.id, house.id, house.id, house.id, new Date(now.getTime() - 3 * 864e5).toISOString())
      .all<OfferRow>(),
    db.prepare(
      `SELECT t.id, t.house_a, t.house_b, t.amount_a, t.amount_b, t.valid, t.at,
              CASE WHEN o.to_house_id IS NULL THEN 1 ELSE 0 END AS public_offer
       FROM trades t LEFT JOIN offers o ON o.id = t.offer_id WHERE t.game_id = ? ORDER BY t.id DESC LIMIT 15`,
    )
      .bind(game.id)
      .all<{ id: number; house_a: number; house_b: number; amount_a: number; amount_b: number; valid: number; at: string; public_offer: number }>(),
    db.prepare("SELECT house_id, achievement_key, times FROM achievements WHERE game_id = ?")
      .bind(game.id)
      .all<{ house_id: number; achievement_key: string; times: number }>(),
    game.status === "finished"
      ? db.prepare("SELECT payload FROM event_log WHERE game_id = ? AND type = 'fin' ORDER BY id DESC LIMIT 1")
          .bind(game.id)
          .first<{ payload: string }>()
      : Promise.resolve(null),
  ]);
  const finished = game.status === "finished";
  const objectiveView = (key: string | null) =>
    key ? { clave: key, texto: OBJECTIVES[key as ObjectiveKey] ?? key } : null;

  const clock = clockOf(game)!;
  const next = game.current_resolution + 1;
  const total = totalResolutions(game.weeks, rhythmOf(game).days);
  const levels = buildings.get(house.id)!;
  const own = tiles.filter((t) => t.owner === house.id);
  const helpActive = house.help_until_resolution != null && house.help_until_resolution > game.current_resolution;
  const names = new Map(tileRows.map((t) => [t.id, t.name]));

  return c.json({
    ...base,
    partida: {
      ...base.partida,
      proximaResolucion: next <= total ? next : null,
      cierre: next <= total ? resolutionInstant(clock.startDate, next, clock.closeTime, clock.timezone, clock.days).toISOString() : null,
      resolucion: next <= total ? resolutionInstant(clock.startDate, next, clock.resolveTime, clock.timezone, clock.days).toISOString() : null,
      ordenesAbiertas: game.status === "active" && ordersOpen(now, clock),
      haEmpezado: now >= zonedToUtc(clock.startDate, "00:00", clock.timezone),
      final: ending ? (JSON.parse(ending.payload) as { ranking: { house: number; total: number }[]; winner: number | null }) : null,
    },
    yo: {
      casa: house.id,
      recursos: resourcesOf(house),
      edificios: levels,
      produccionDiaria: dailyProduction(levels, own, helpActive ? (house.help_resource ?? "pan") : null),
      mantenimientoSemanal: weeklyUpkeep(own.reduce((a, t) => a + t.troops, 0), own.filter((t) => t.type !== "castillo").length),
      ayudaAlUltimo: helpActive ? (house.help_resource ?? "pan") : null,
      recursoAyuda: house.help_resource ?? "pan",
      objetivo: {
        opciones: (JSON.parse(house.objective_options ?? "[]") as string[]).map(objectiveView),
        elegido: objectiveView(house.objective_key),
        puedeElegir: game.status === "active" && game.current_resolution === 0,
        cumplido: house.objective_met == null ? null : house.objective_met === 1,
      },
      ausencia: {
        vacaciones: house.vacation === 1,
        plantilla: house.autopilot_template ?? "equilibrada",
      },
    },
    casas: houses
      .map((h) => ({
        id: h.id,
        nombre: h.name,
        color: h.color,
        lema: h.motto,
        escudo: shieldView(h),
        prestigio: prestige.get(h.id),
        logros: achievements.results.filter((a) => a.house_id === h.id).map((a) => ({ clave: a.achievement_key, veces: a.times })),
        // Los objetivos secretos solo se revelan al final.
        objetivo: finished ? { ...objectiveView(h.objective_key), cumplido: h.objective_met === 1 } : null,
      }))
      .sort((a, b) => (b.prestigio?.total ?? 0) - (a.prestigio?.total ?? 0)),
    prueba:
      game.is_test === 1 && game.created_by === s.userId
        ? {
            ahora: now.toISOString(),
            jugandoComo: house.id,
            casas: houses.map((h) => ({
              id: h.id,
              nombre: h.name,
              color: h.color,
              escudo: shieldView(h),
              bot: h.is_bot === 1,
              personalidad: h.is_bot === 1 ? (h.bot_personality ?? "estratega") : null,
            })),
          }
        : null,
    subasta: game.status === "active" ? await auctionView(db, game, house.id) : null,
    evento: game.status === "active" ? await eventView(db, game) : null,
    boletines: (
      await db.prepare("SELECT week, json_extract(content, '$.headline') AS headline FROM bulletins WHERE game_id = ? ORDER BY week DESC")
        .bind(game.id)
        .all<{ week: number; headline: string }>()
    ).results.map((b) => ({ semana: b.week, titular: b.headline })),
    soborno:
      game.status === "active"
        ? await bribeView(db, game, house.id, house.name, resolutionInfo(Math.min(game.current_resolution + 1, totalResolutions(game.weeks, rhythmOf(game).days)), rhythmOf(game).days).week)
        : null,
    cartas: await handView(db, game.id, house.id),
    vigiladas: spied,
    casillas: projectForHouse(tiles, house.id, spied).map((t) => ({ ...t, nombre: names.get(t.id) })),
    ordenes: orders.results.map((o) => ({
      id: o.id,
      tipo: o.kind === "move" ? "mover" : "apoyar",
      desde: o.from_tile_id,
      hacia: o.target_tile_id,
      apoyaDesde: o.supported_from_tile_id,
      tropas: o.troops,
    })),
    eventos: events.results.map((e) => ({ id: e.id, tipo: e.type, resolucion: e.resolucion, datos: JSON.parse(e.payload) })),
    ofertas: offers.results.map(offerView),
    tratos: trades.results.map((t) => ({
      id: t.id,
      casas: [t.house_a, t.house_b],
      valido: t.valid === 1,
      // Las cantidades de los tratos dirigidos solo las ven sus dos casas.
      cantidades: t.public_offer === 1 || t.house_a === house.id || t.house_b === house.id ? [t.amount_a, t.amount_b] : null,
      cuando: t.at,
    })),
  });
});

// ---------------------------------------------------------------------------
// Acciones diarias
// ---------------------------------------------------------------------------

function payStatement(db: D1Database, houseId: number, cost: Partial<Resources>) {
  return db.prepare(
    "UPDATE houses SET pan = pan - ?, madera = madera - ?, piedra = piedra - ?, hierro = hierro - ?, oro = oro - ? WHERE id = ?",
  ).bind(cost.pan ?? 0, cost.madera ?? 0, cost.piedra ?? 0, cost.hierro ?? 0, cost.oro ?? 0, houseId);
}

async function activeMembership(c: Ctx): Promise<Membership | Response> {
  const m = await membership(c);
  if (m instanceof Response) return m;
  if (m.game.status !== "active") return fail(c, 409, "La partida no está en juego.");
  return m;
}

/** Si un lote falla por recursos negativos, la restricción CHECK lo deshace todo. */
async function runPaid(c: Ctx, statements: D1PreparedStatement[]) {
  try {
    await c.env.DB.batch(statements);
    return null;
  } catch (err) {
    if (err instanceof Error && /CHECK constraint failed/.test(err.message)) {
      return fail(c, 409, "No hay recursos suficientes.");
    }
    throw err;
  }
}

app.post("/api/partidas/:id/mejorar", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const { edificio } = await c.req.json<{ edificio?: BuildingKind }>().catch(() => ({ edificio: undefined }));
  if (!edificio || !BUILDINGS.includes(edificio)) return fail(c, 400, "Ese edificio no existe.");
  const levels = (await loadBuildings(c.env.DB, m.game.id)).get(m.house.id)!;
  const check = checkUpgrade(levels, edificio, resourcesOf(m.house));
  if (!check.ok) return fail(c, 409, check.error);
  const db = c.env.DB;
  const statements = [
    payStatement(db, m.house.id, check.value.cost),
    db.prepare("UPDATE buildings SET level = ? WHERE house_id = ? AND kind = ? AND level = ?").bind(
      check.value.newLevel,
      m.house.id,
      edificio,
      levels[edificio],
    ),
  ];
  if (check.value.newLevel >= 3) {
    // Para el boletín: obras notables (nivel 3 o más), públicas como el Prestigio de edificios.
    statements.push(
      db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) VALUES (?, 'mejora', NULL, ?)").bind(
        m.game.id,
        JSON.stringify({ house: m.house.id, edificio, nivel: check.value.newLevel }),
      ),
    );
  }
  if (check.value.newLevel === 5) {
    // Logro "Obra maestra": solo la primera casa con un edificio a nivel 5.
    statements.push(
      db.prepare(
        `INSERT INTO achievements (game_id, house_id, achievement_key) SELECT ?, ?, 'obra_maestra'
         WHERE NOT EXISTS (SELECT 1 FROM achievements WHERE game_id = ? AND achievement_key = 'obra_maestra')`,
      ).bind(m.game.id, m.house.id, m.game.id),
      db.prepare(
        `INSERT INTO event_log (game_id, type, visible_to, payload) SELECT ?, 'logro', NULL, ?
         WHERE EXISTS (SELECT 1 FROM achievements WHERE game_id = ? AND achievement_key = 'obra_maestra' AND house_id = ?)
           AND NOT EXISTS (SELECT 1 FROM event_log WHERE game_id = ? AND type = 'logro' AND json_extract(payload, '$.logro') = 'obra_maestra')`,
      ).bind(m.game.id, JSON.stringify({ house: m.house.id, logro: "obra_maestra", edificio }), m.game.id, m.house.id, m.game.id),
    );
  }
  const err = await runPaid(c, statements);
  return err ?? c.json({ ok: true, nivel: check.value.newLevel });
});

app.post("/api/partidas/:id/reclutar", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const { cantidad } = await c.req.json<{ cantidad?: number }>().catch(() => ({ cantidad: undefined }));
  const check = checkRecruit(Number(cantidad), resourcesOf(m.house));
  if (!check.ok) return fail(c, 409, check.error);
  const err = await runPaid(c, [
    payStatement(c.env.DB, m.house.id, check.value.cost),
    c.env.DB.prepare("UPDATE tiles SET troops = troops + ? WHERE game_id = ? AND castle_of = ?").bind(
      Number(cantidad),
      m.game.id,
      m.house.id,
    ),
  ]);
  return err ?? c.json({ ok: true });
});

app.post("/api/partidas/:id/fortificar", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const { casilla } = await c.req.json<{ casilla?: number }>().catch(() => ({ casilla: undefined }));
  const tiles = toEngineTiles(await loadTiles(c.env.DB, m.game.id));
  const tile = tiles.find((t) => t.id === Number(casilla));
  if (!tile) return fail(c, 404, "Esa casilla no existe.");
  const check = withRhythm(rhythmOf(m.game), () => checkFortify(tile, m.house.id, m.game.current_resolution + 1, resourcesOf(m.house)));
  if (!check.ok) return fail(c, 409, check.error);
  const err = await runPaid(c, [
    payStatement(c.env.DB, m.house.id, check.value.cost),
    c.env.DB.prepare("UPDATE tiles SET fortified_until = ? WHERE id = ? AND owner_house_id = ?").bind(
      check.value.fortifiedUntil,
      tile.id,
      m.house.id,
    ),
  ]);
  return err ?? c.json({ ok: true, hasta: check.value.fortifiedUntil });
});

app.post("/api/partidas/:id/ayuda", async (c) => {
  const m = await membership(c);
  if (m instanceof Response) return m;
  const { recurso } = await c.req.json<{ recurso?: string }>().catch(() => ({ recurso: undefined }));
  if (!["pan", "madera", "piedra", "hierro", "oro"].includes(recurso ?? "")) return fail(c, 400, "Ese recurso no existe.");
  await c.env.DB.prepare("UPDATE houses SET help_resource = ? WHERE id = ?").bind(recurso, m.house.id).run();
  return c.json({ ok: true });
});

app.post("/api/partidas/:id/objetivo", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  if (m.game.current_resolution > 0) return fail(c, 409, "El objetivo se elige antes de la primera resolución.");
  const { clave } = await c.req.json<{ clave?: string }>().catch(() => ({ clave: undefined }));
  const options = JSON.parse(m.house.objective_options ?? "[]") as string[];
  if (!clave || !options.includes(clave)) return fail(c, 400, "Ese objetivo no está entre tus opciones.");
  await c.env.DB.prepare("UPDATE houses SET objective_key = ? WHERE id = ?").bind(clave, m.house.id).run();
  return c.json({ ok: true });
});

app.post("/api/partidas/:id/ausencia", async (c) => {
  const m = await membership(c);
  if (m instanceof Response) return m;
  const body = await c.req.json<{ vacaciones?: boolean; plantilla?: string }>().catch(() => ({}) as never);
  if (body.plantilla != null && !["defensiva", "economica", "equilibrada"].includes(body.plantilla)) {
    return fail(c, 400, "Esa plantilla no existe.");
  }
  await c.env.DB.prepare(
    "UPDATE houses SET vacation = COALESCE(?, vacation), autopilot_template = COALESCE(?, autopilot_template) WHERE id = ?",
  )
    .bind(body.vacaciones == null ? null : body.vacaciones ? 1 : 0, body.plantilla ?? null, m.house.id)
    .run();
  return c.json({ ok: true });
});

interface OrderInput {
  tipo: "mover" | "apoyar";
  desde: number;
  hacia: number;
  tropas: number;
  apoyaDesde?: number | null;
}

/** Sustituye todas las órdenes de la casa para la próxima resolución. */
app.put("/api/partidas/:id/ordenes", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const clock = clockOf(m.game)!;
  if (!ordersOpen(gameNow(m.game), clock)) return fail(c, 409, "Las órdenes ya están cerradas para esta resolución.");
  const { ordenes } = await c.req.json<{ ordenes?: OrderInput[] }>().catch(() => ({ ordenes: undefined }));
  if (!Array.isArray(ordenes) || ordenes.length > 60) return fail(c, 400, "Lista de órdenes no válida.");

  const orders: Order[] = ordenes.map((o) =>
    o.tipo === "mover"
      ? { kind: "move", house: m.house.id, from: Number(o.desde), to: Number(o.hacia), troops: Number(o.tropas) }
      : {
          kind: "support",
          house: m.house.id,
          from: Number(o.desde),
          target: Number(o.hacia),
          supportedFrom: o.apoyaDesde == null ? null : Number(o.apoyaDesde),
          troops: Number(o.tropas),
        },
  );
  const tiles = toEngineTiles(await loadTiles(c.env.DB, m.game.id));
  const { invalid } = checkOrders(tiles, orders);
  if (invalid.length > 0) return fail(c, 400, `Orden no válida: ${invalid[0]!.reason}.`);

  const n = m.game.current_resolution + 1;
  const statements = [
    c.env.DB.prepare("DELETE FROM orders WHERE house_id = ? AND resolution_no = ?").bind(m.house.id, n),
    ...orders.map((o) =>
      c.env.DB.prepare(
        "INSERT INTO orders (game_id, house_id, resolution_no, kind, from_tile_id, troops, target_tile_id, supported_from_tile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(
        m.game.id,
        m.house.id,
        n,
        o.kind,
        o.from,
        o.troops,
        o.kind === "move" ? o.to : o.target,
        o.kind === "support" ? o.supportedFrom : null,
      ),
    ),
  ];
  await c.env.DB.batch(statements);
  return c.json({ ok: true, ordenes: orders.length });
});

// ---------------------------------------------------------------------------
// Comercio (diseño, sección 9)
// ---------------------------------------------------------------------------

async function loadOffer(c: Ctx, gameId: number): Promise<OfferRow | null> {
  return c.env.DB.prepare("SELECT * FROM offers WHERE id = ? AND game_id = ?")
    .bind(Number(c.req.param("oid")), gameId)
    .first<OfferRow>();
}

/** Crear una oferta pública (sin "para") o dirigida; también contraofertas. */
app.post("/api/partidas/:id/ofertas", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const body = await c.req
    .json<{ para?: number | null; da?: unknown; pide?: unknown; contraofertaDe?: number }>()
    .catch(() => ({}) as never);
  const give = cleanBundle(body.da);
  const want = cleanBundle(body.pide);
  const check = checkOffer(give, want, resourcesOf(m.house));
  if (!check.ok) return fail(c, 400, check.error);

  let to = body.para == null ? null : Number(body.para);
  let parent: OfferRow | null = null;
  if (body.contraofertaDe != null) {
    parent = await c.env.DB.prepare("SELECT * FROM offers WHERE id = ? AND game_id = ?")
      .bind(Number(body.contraofertaDe), m.game.id)
      .first<OfferRow>();
    if (!parent || parent.status !== "open") return fail(c, 409, "Esa oferta ya no está abierta.");
    if (parent.to_house_id != null && parent.to_house_id !== m.house.id) return fail(c, 403, "Esa oferta no era para ti.");
    if (parent.from_house_id === m.house.id) return fail(c, 400, "No puedes contraofertarte a ti mismo.");
    to = parent.from_house_id;
  }
  if (to != null) {
    if (to === m.house.id) return fail(c, 400, "No puedes comerciar contigo mismo.");
    if (!m.houses.some((h) => h.id === to)) return fail(c, 404, "Esa casa no está en la partida.");
  } else {
    const open = await c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM offers WHERE game_id = ? AND from_house_id = ? AND to_house_id IS NULL AND status = 'open'",
    )
      .bind(m.game.id, m.house.id)
      .first<{ n: number }>();
    if ((open?.n ?? 0) >= MAX_OPEN_PUBLIC_OFFERS) {
      return fail(c, 409, `Como mucho ${MAX_OPEN_PUBLIC_OFFERS} ofertas públicas abiertas. Retira alguna antes.`);
    }
  }

  const statements = [
    c.env.DB.prepare(
      `INSERT INTO offers (game_id, from_house_id, to_house_id, parent_offer_id,
         give_pan, give_madera, give_piedra, give_hierro, give_oro,
         want_pan, want_madera, want_piedra, want_hierro, want_oro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      m.game.id, m.house.id, to, parent?.id ?? null,
      give!.pan ?? 0, give!.madera ?? 0, give!.piedra ?? 0, give!.hierro ?? 0, give!.oro ?? 0,
      want!.pan ?? 0, want!.madera ?? 0, want!.piedra ?? 0, want!.hierro ?? 0, want!.oro ?? 0,
    ),
  ];
  // Una contraoferta a una oferta dirigida la cierra; las públicas siguen abiertas para los demás.
  if (parent && parent.to_house_id === m.house.id) {
    statements.push(
      c.env.DB.prepare("UPDATE offers SET status = 'countered', closed_at = ? WHERE id = ? AND status = 'open'").bind(
        gameNow(m.game).toISOString(),
        parent.id,
      ),
    );
  }
  await c.env.DB.batch(statements);
  if (to != null) {
    await notifyHouses(c.env, [to], {
      kind: "oferta",
      title: "Te han hecho una oferta",
      body: `${m.house.name} quiere comerciar contigo.`,
      url: `/partida/${m.game.id}`,
      dedupe: `oferta:${m.game.id}:${Date.now()}:${to}`,
    });
  }
  return c.json({ ok: true });
});

/**
 * Aceptar: todo en un lote atómico. Primero se marca la oferta con un token
 * único; los recursos y el trato solo se aplican si el token es el nuestro.
 * Si a alguien le faltan recursos, la restricción CHECK deshace el lote entero.
 */
app.post("/api/partidas/:id/ofertas/:oid/aceptar", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const offer = await loadOffer(c, m.game.id);
  if (!offer || offer.status !== "open") return fail(c, 409, "Esa oferta ya no está disponible.");
  if (offer.from_house_id === m.house.id) return fail(c, 400, "No puedes aceptar tu propia oferta.");
  if (offer.to_house_id != null && offer.to_house_id !== m.house.id) return fail(c, 403, "Esa oferta no era para ti.");
  const result = await acceptOffer(c.env, m.game, offer, m.house);
  if (result) return fail(c, 409, result);
  return c.json({ ok: true });
});

app.post("/api/partidas/:id/ofertas/:oid/rechazar", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const offer = await loadOffer(c, m.game.id);
  if (!offer || offer.status !== "open") return fail(c, 409, "Esa oferta ya no está abierta.");
  if (offer.to_house_id !== m.house.id) return fail(c, 403, "Solo se rechazan las ofertas dirigidas a ti.");
  await c.env.DB.prepare("UPDATE offers SET status = 'rejected', closed_at = ? WHERE id = ? AND status = 'open'")
    .bind(gameNow(m.game).toISOString(), offer.id)
    .run();
  return c.json({ ok: true });
});

app.post("/api/partidas/:id/ofertas/:oid/retirar", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const offer = await loadOffer(c, m.game.id);
  if (!offer || offer.status !== "open") return fail(c, 409, "Esa oferta ya no está abierta.");
  if (offer.from_house_id !== m.house.id) return fail(c, 403, "Solo puedes retirar tus ofertas.");
  await c.env.DB.prepare("UPDATE offers SET status = 'cancelled', closed_at = ? WHERE id = ? AND status = 'open'")
    .bind(gameNow(m.game).toISOString(), offer.id)
    .run();
  return c.json({ ok: true });
});

/** Último evento anunciado (el de la semana en curso). */
async function eventView(db: D1Database, game: GameRow) {
  const row = await db.prepare("SELECT week, event_key, params, applied_at FROM game_events WHERE game_id = ? ORDER BY week DESC LIMIT 1")
    .bind(game.id)
    .first<{ week: number; event_key: EventKey; params: string; applied_at: string | null }>();
  if (!row) return null;
  const e = JSON.parse(row.params) as WeekEvent;
  return {
    semana: row.week,
    clave: row.event_key,
    nombre: EVENTS[row.event_key]?.nombre ?? row.event_key,
    texto: eventText(e),
    linea: eventLine(game.seed, row.week, e),
    aplicado: row.applied_at != null,
  };
}

// ---------------------------------------------------------------------------
// Boletín de Fray Abundio y soborno (diseño, sección 17)
// ---------------------------------------------------------------------------

app.get("/api/partidas/:id/boletin/:semana", async (c) => {
  const m = await membership(c);
  if (m instanceof Response) return m;
  const row = await c.env.DB.prepare("SELECT content, published_at FROM bulletins WHERE game_id = ? AND week = ?")
    .bind(m.game.id, Number(c.req.param("semana")))
    .first<{ content: string; published_at: string }>();
  if (!row) return fail(c, 404, "Ese boletín aún no se ha escrito.");
  const content = JSON.parse(row.content) as StoredBulletin;
  return c.json({ ...content, lastEventId: undefined, publicado: row.published_at });
});

/** Sobornar al cronista: una frase halagadora sobre uno mismo en el boletín del domingo. */
app.post("/api/partidas/:id/soborno", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const clock = clockOf(m.game)!;
  if (!ordersOpen(gameNow(m.game), clock)) return fail(c, 409, "El cronista ya ha cerrado el boletín de esta semana.");
  const { plantilla } = await c.req.json<{ plantilla?: number }>().catch(() => ({ plantilla: undefined }));
  const n = Number(plantilla);
  if (!Number.isInteger(n) || n < 0 || n >= PHRASES["soborno.frase"].length) return fail(c, 400, "Esa frase no está en el catálogo del cronista.");
  const week = resolutionInfo(m.game.current_resolution + 1, rhythmOf(m.game).days).week;
  const db = c.env.DB;
  try {
    await db.batch([
      db.prepare("INSERT INTO bribes (game_id, house_id, week, amount, template_key) VALUES (?, ?, ?, ?, ?)").bind(
        m.game.id,
        m.house.id,
        week,
        BRIBE_COST,
        String(n),
      ),
      payStatement(db, m.house.id, { oro: BRIBE_COST }),
    ]);
  } catch (err) {
    if (err instanceof Error && /CHECK constraint failed/.test(err.message)) return fail(c, 409, `Hacen falta ${BRIBE_COST} de Oro.`);
    if (err instanceof Error && /UNIQUE constraint failed/.test(err.message)) return fail(c, 409, "Ya has sobornado al cronista esta semana.");
    throw err;
  }
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Gran Subasta y cartas de la Corona (diseño, sección 9)
// ---------------------------------------------------------------------------

/** Pujar (o cambiar la puja) por un lote. Cantidad 0 retira la puja. */
app.put("/api/partidas/:id/subasta/:lote", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const week = openAuctionWeek(m.game);
  const clock = clockOf(m.game)!;
  if (week == null || !ordersOpen(gameNow(m.game), clock)) return fail(c, 409, "La subasta está cerrada.");
  const lot = await c.env.DB.prepare("SELECT id FROM auction_lots WHERE game_id = ? AND week = ? AND slot = ?")
    .bind(m.game.id, week, Number(c.req.param("lote")))
    .first<{ id: number }>();
  if (!lot) return fail(c, 404, "Ese lote no existe o aún no se ha anunciado.");
  const { cantidad } = await c.req.json<{ cantidad?: number }>().catch(() => ({ cantidad: undefined }));
  const amount = Number(cantidad);
  if (!Number.isInteger(amount) || amount < 0) return fail(c, 400, "La puja es un número entero de Oro.");
  if (amount === 0) {
    await c.env.DB.prepare("DELETE FROM bids WHERE lot_id = ? AND house_id = ?").bind(lot.id, m.house.id).run();
    return c.json({ ok: true });
  }
  if (amount > m.house.oro) return fail(c, 409, "No puedes pujar más Oro del que tienes.");
  await c.env.DB.prepare(
    `INSERT INTO bids (lot_id, house_id, amount, placed_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (lot_id, house_id) DO UPDATE SET amount = excluded.amount, placed_at = excluded.placed_at`,
  )
    .bind(lot.id, m.house.id, amount, gameNow(m.game).toISOString())
    .run();
  return c.json({ ok: true });
});

/** Usar una carta de la Corona. */
app.post("/api/partidas/:id/cartas/:carta/usar", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const db = c.env.DB;
  const card = await db.prepare("SELECT id, house_id, card_key, used_at, used_params FROM cards WHERE id = ? AND game_id = ? AND house_id = ?")
    .bind(Number(c.req.param("carta")), m.game.id, m.house.id)
    .first<CardRow>();
  if (!card) return fail(c, 404, "Esa carta no es tuya.");
  if (card.used_at) return fail(c, 409, "Esa carta ya se usó.");
  const params = await c.req.json<CardParams>().catch(() => ({}) as CardParams);
  const [tileRows, buildings] = await Promise.all([loadTiles(db, m.game.id), loadBuildings(db, m.game.id)]);
  const prepared = useCardStatements(db, m.game, m.house, card, params, {
    house: m.house.id,
    tiles: toEngineTiles(tileRows),
    buildings: buildings.get(m.house.id)!,
    resources: resourcesOf(m.house),
    houses: m.houses.map((h) => h.id),
    nextResolution: m.game.current_resolution + 1,
  });
  if (!prepared.ok) return fail(c, 400, prepared.error);
  const err = await runPaid(c, prepared.statements);
  if (err) return err;
  const after = await db.prepare("SELECT used_at FROM cards WHERE id = ?").bind(card.id).first<{ used_at: string | null }>();
  if (!after?.used_at) return fail(c, 409, "Esa carta ya se usó.");
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Partidas de prueba (solo quien las creó)
// ---------------------------------------------------------------------------

async function testGame(c: Ctx): Promise<GameRow | Response> {
  const s = c.get("session");
  if (!s) return fail(c, 401, "Primero hay que entrar.");
  const game = await loadGame(c.env.DB, Number(c.req.param("id")));
  if (!game) return fail(c, 404, "Esa partida no existe.");
  if (game.is_test !== 1) return fail(c, 409, "Esto solo se puede hacer en una partida de prueba.");
  if (game.created_by !== s.userId) return fail(c, 403, "Solo quien creó la prueba puede manejarla.");
  return game;
}

/** Avanza el reloj simulado: un paso (mañana o resolución) o hasta la próxima resolución. */
app.post("/api/partidas/:id/prueba/avanzar", async (c) => {
  const game = await testGame(c);
  if (game instanceof Response) return game;
  if (game.status !== "active") return fail(c, 409, "La partida no está en juego.");
  const { hasta } = await c.req.json<{ hasta?: string }>().catch(() => ({ hasta: undefined }));
  if (hasta !== "paso" && hasta !== "resolucion") return fail(c, 400, "Se avanza un paso o hasta la resolución.");
  const after = await advance(c.env, game.id, hasta);
  return c.json({ ok: true, ahora: after.sim_now, resolucion: after.current_resolution, estado: after.status });
});

/** Manejar otra casa de la prueba (los bots que no manejas siguen jugando solos). */
app.post("/api/partidas/:id/prueba/jugar-como", async (c) => {
  const game = await testGame(c);
  if (game instanceof Response) return game;
  const { casa } = await c.req.json<{ casa?: number }>().catch(() => ({ casa: undefined }));
  const houses = await loadHouses(c.env.DB, game.id);
  if (!houses.some((h) => h.id === Number(casa))) return fail(c, 404, "Esa casa no está en la partida.");
  await c.env.DB.prepare("UPDATE games SET played_house_id = ? WHERE id = ?").bind(Number(casa), game.id).run();
  return c.json({ ok: true });
});

app.delete("/api/partidas/:id", async (c) => {
  const game = await testGame(c);
  if (game instanceof Response) return game;
  await deleteTestGame(c.env, game);
  return c.json({ ok: true });
});

/** Lunes siguiente (nunca hoy) en la zona horaria de la partida. */
export function nextMonday(now: Date, timeZone: string): string {
  const today = localDate(now, timeZone);
  const [y, mo, d] = today.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, mo - 1, d));
  const add = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + add);
  return date.toISOString().slice(0, 10);
}
