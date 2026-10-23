// API del juego. Todas las respuestas para el jugador van en español y nunca
// incluyen información fuera de su niebla de guerra.

import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  ANY_ORIGIN,
  castleStage,
  BUILDINGS,
  captainName,
  UNIT_KINDS,
  upkeepTroops,
  type UnitKind,
  SPECIALTY_PAIRS,
  STARTING_RESOURCES,
  castleName,
  checkFortify,
  checkOrders,
  fitOrders,
  planNights,
  QUEUE,
  checkRecruit,
  canRecruitAt,
  checkUpgrade,
  checkOffer,
  cleanBundle,
  dealObjectives,
  OBJECTIVES,
  type ObjectiveKey,
  dailyProduction,
  MAX_OPEN_PUBLIC_OFFERS,
  TRADE,
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
  checkProclamation,
  PROCLAMATION,
  resolutionInfo,
  type WeekEvent,
  EVENTS,
  eventLine,
  eventText,
  checkShield,
  freeShield,
  type Order,
  type Resource,
  type Resources,
  CROWN_GOODS,
  ECONOMY_TWEAKS,
  MERCENARIES,
  mercenaryCost,
  alliesOf,
  guestStacks,
  houseInSentence,
  noticeText,
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
import { bribeView, errataView, proclamationView, type StoredBulletin } from "./boletin";
import { auctionView, handView, openAuctionWeek, spiedHouses, useCardStatements, type CardRow } from "./subasta";
import { addBots, advance, botsPlayDay, deleteTestGame, testStart } from "./pruebas";
import { ransomStatements } from "./rescate";
import { coronationView, publicCoronation, shareKeyOf } from "./coronacion";
import { loadHomeSummary } from "./portada";
import { cinematicsView, isCinematicKey } from "./cinematicas";
import { prestigeHistory, relations } from "./reino";
import { crownCost, crownMarket, crownPriceView, crownPurchaseStatements } from "./corona";
import { hireStatements, leavingDay, loadMercenaries } from "./mercenarios";
import { acceptOffer, bundle, offerExpiry, offerView, type OfferRow } from "./offers";
import { ordersOpen } from "./scheduler";
import {
  acceptAlliance,
  alliancesView,
  breakAlliance,
  declineAlliance,
  freshAllianceName,
  proposeAlliance,
  withdrawAlliance,
  type AllianceResult,
} from "./alianzas";
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
  loadAlliances,
  toEngineAlliances,
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
  const db = c.env.DB;
  const user = await db.prepare("SELECT id, display_name FROM users WHERE id = ?")
    .bind(s.userId)
    .first<{ id: number; display_name: string }>();
  const { results } = await db.prepare(
    `SELECT g.*, h.id AS house_id, h.name AS casa, h.color, h.shield_shape, h.shield_division, h.color2, h.symbol, h.metal
     FROM houses h JOIN games g ON g.id = h.game_id WHERE h.user_id = ? ORDER BY g.id DESC`,
  )
    .bind(s.userId)
    .all<
      GameRow &
        Pick<HouseRow, "color" | "shield_shape" | "shield_division" | "color2" | "symbol" | "metal"> & { house_id: number; casa: string }
    >();
  // Bloque 7: lo que la portada cuenta de cada partida, dentro de la niebla de esa casa.
  const games = await Promise.all(
    results.map(async (g) => {
      const houses = await loadHouses(db, g.id);
      const casas = houses.map((h) => ({ id: h.id, nombre: h.name, color: h.color, lema: h.motto, escudo: shieldView(h) }));
      if (g.status === "lobby") {
        return { g, casas, resumen: null };
      }
      return { g, casas, resumen: await loadHomeSummary(db, g, g.house_id) };
    }),
  );
  // El título de la última partida acabada (de verdad, no de prueba), para la vitrina.
  const last = games.find((x) => x.g.status === "finished" && x.g.is_test !== 1);
  const lastTitle = last
    ? ((await coronationView(db, last.g))?.titulos.find((t) => t.casa === last.g.house_id)?.nombre ?? null)
    : null;
  return c.json({
    usuario: user ? { id: user.id, nombre: user.display_name } : null,
    partidas: games.map(({ g, casas, resumen }) => ({
      id: g.id,
      nombre: g.name,
      estado: g.status,
      prueba: g.is_test === 1,
      casa: g.casa,
      casaId: g.house_id,
      color: g.color,
      escudo: shieldView(g),
      semanas: g.weeks,
      inicio: g.start_date,
      esCreador: g.created_by === s.userId,
      codigoInvitacion: g.status === "lobby" && g.created_by === s.userId ? g.invite_code : null,
      casas,
      resumen,
      titulo: last && g.id === last.g.id ? lastTitle : null,
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

/** Bloque 13: la coronación de una partida acabada, para el enlace público (sin cuenta). */
app.get("/api/coronacion/:clave", async (c) => {
  const view = await publicCoronation(c.env.DB, c.req.param("clave"));
  if (!view) return fail(c, 404, "Esa coronación no existe o la partida aún no ha acabado.");
  return c.json(view);
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
      `UPDATE games SET status = 'active', start_date = ?, map_cols = ?, map_rows = ?, map_coast = ?, started_at = ?,
         sim_now = ?, played_house_id = ? WHERE id = ? AND status = 'lobby'`,
    ).bind(startDate, map.cols, map.rows, map.coast, new Date().toISOString(), simNow, test ? (mine?.id ?? null) : null, game.id),
  ];
  for (const t of map.tiles) {
    const name = t.type === "castillo" ? castleName(houses.find((h) => h.id === t.castleOf)!.name) : t.name;
    statements.push(
      db.prepare(
        "INSERT INTO tiles (game_id, x, y, type, name, castle_of, owner_house_id, troops, river) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(game.id, t.x, t.y, t.type, name, t.castleOf ?? null, t.owner, t.troops, t.river ?? 0),
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
  // Cada Capitán empieza en el castillo de su casa.
  statements.push(
    db.prepare("UPDATE houses SET captain_tile = (SELECT t.id FROM tiles t WHERE t.castle_of = houses.id) WHERE game_id = ?").bind(game.id),
  );
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
      /** Lados con costa (bloque 1); null en los mapas de antes. */
      costa: game.map_coast ?? null,
      zonaHoraria: game.timezone,
      resolucionActual: game.current_resolution,
      totalResoluciones: totalResolutions(game.weeks, rhythmOf(game).days),
      /** Días con resolución (0 = lunes) y resoluciones que dura fortificar. */
      diasResolucion: rhythmOf(game).days,
      fortificarResoluciones: rhythmOf(game).fortify,
      /** Noches seguidas para las que se pueden dejar órdenes (esta y las siguientes). */
      nochesEnCola: QUEUE.nights,
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
  // Bloque 8: con una alianza en vigor, cada aliado ve lo mismo que el otro.
  const allianceRows = await loadAlliances(db, game.id);
  const allies = alliesOf(toEngineAlliances(allianceRows), house.id);
  const sharedVision = [...new Set([...spied, ...allies])];
  const per = rhythmOf(game).days.length;
  const [buildings, prestige, orders, events, offers, trades, achievements, ending, snapshots, combats, myTrades] = await Promise.all([
    loadBuildings(db, game.id),
    computeAllPrestige(db, game.id, houses, tiles, now),
    db.prepare(
      "SELECT id, resolution_no, kind, from_tile_id, troops, jinetes, catapultas, captain, guest, target_tile_id, supported_from_tile_id, supports_any, repeat FROM orders WHERE house_id = ? AND resolution_no >= ? ORDER BY resolution_no, id",
    )
      .bind(house.id, game.current_resolution + 1)
      .all<{
        id: number;
        resolution_no: number;
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
        repeat: number;
      }>(),
    db.prepare(
      `SELECT e.id, e.type, e.payload, e.at, e.visible_to, r.number AS resolucion FROM event_log e LEFT JOIN resolutions r ON r.id = e.resolution_id
       WHERE e.game_id = ? AND (e.visible_to IS NULL OR e.visible_to = ?)
       -- Por resolución (la más reciente arriba) y, dentro, en orden. Lo que no
       -- pertenece a una resolución (logros, piloto, final) va con la siguiente.
       ORDER BY COALESCE(r.number, (SELECT current_resolution + 1 FROM games WHERE id = e.game_id)) DESC, e.id ASC LIMIT 40`,
    )
      .bind(game.id, house.id)
      .all<{ id: number; type: string; payload: string; at: string; visible_to: number | null; resolucion: number | null }>(),
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
    // Bloque 11: fotos de Prestigio de cada domingo, la de la noche anterior y la final (el total es público).
    db.prepare(
      "SELECT house_id, resolution_no, total FROM prestige_snapshots WHERE game_id = ? AND (resolution_no % ? = 0 OR resolution_no = ? OR resolution_no > ?) ORDER BY resolution_no",
    )
      .bind(game.id, per, game.current_resolution - 1, totalResolutions(game.weeks, rhythmOf(game).days))
      .all<{ house_id: number; resolution_no: number; total: number }>(),
    // Bloque 11: batallas públicas y tratos de esta casa, para «qué relación tiene contigo».
    db.prepare("SELECT payload FROM event_log WHERE game_id = ? AND type = 'combate' AND visible_to IS NULL")
      .bind(game.id)
      .all<{ payload: string }>(),
    db.prepare("SELECT house_a, house_b FROM trades WHERE game_id = ? AND valid = 1 AND (house_a = ? OR house_b = ?)")
      .bind(game.id, house.id, house.id)
      .all<{ house_a: number; house_b: number }>(),
  ]);
  const finished = game.status === "finished";
  const relation = relations(
    house.id,
    houses.map((h) => h.id),
    combats.results.map((r) => JSON.parse(r.payload) as Record<string, unknown>),
    myTrades.results,
  );
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
      // Las tropas de paso (bloque 8) también comen.
      mantenimientoSemanal: weeklyUpkeep(
        upkeepTroops([...own, ...guestStacks(tiles, house.id).map((g) => g.guest)]),
        own.filter((t) => t.type !== "castillo").length,
      ),
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
      avisoCierre: house.close_warning !== 0,
      cinematicas: house.cinematics === "esenciales" ? "esenciales" : "todas",
    },
    casas: houses
      .map((h) => ({
        id: h.id,
        nombre: h.name,
        color: h.color,
        lema: h.motto,
        escudo: shieldView(h),
        prestigio: prestige.get(h.id),
        // Etapa del castillo (bloque 2): sale de los niveles de sus edificios, que ya son públicos por el Prestigio.
        etapa: castleStage(buildings.get(h.id)!),
        // Bloque 11: las cifras de la ficha de casa. Todas son públicas (salen en el Prestigio o en el mapa).
        cifras: {
          casillas: tiles.filter((t) => t.owner === h.id && t.type !== "castillo").length,
          edificios: Object.values(buildings.get(h.id)!).reduce((a, b) => a + b, 0),
          gloria: h.glory ?? 0,
          asedios: h.siege_nights ?? 0,
        },
        ...(h.id !== house.id ? { relacion: relation.get(h.id) } : {}),
        logros: achievements.results.filter((a) => a.house_id === h.id).map((a) => ({ clave: a.achievement_key, veces: a.times })),
        // Los objetivos secretos solo se revelan al final.
        objetivo: finished ? { ...objectiveView(h.objective_key), cumplido: h.objective_met === 1 } : null,
        // Capitán: su nombre y, si está preso, de quién (es público: se sabe en todo el reino).
        capitan: {
          nombre: captainName(game.seed, h.id),
          presoDe: h.captain_captured_by,
          libreEn: h.captain_free_at,
          // El rescate solo lo ven las dos casas del trato.
          ...(h.captain_captured_by != null && (h.id === house.id || h.captain_captured_by === house.id) ? { rescate: h.captain_ransom } : {}),
        },
      }))
      .sort((a, b) => (b.prestigio?.total ?? 0) - (a.prestigio?.total ?? 0)),
    historia: prestigeHistory(snapshots.results, per, game.current_resolution, total),
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
    // Bloque 5: precio de la próxima unidad de cada recurso. Lo que guarda el reino no sale de aquí.
    // Bloque 5: mercenarios de alquiler de esta casa y cuándo se van.
    mercenarios:
      game.status === "active" && ECONOMY_TWEAKS.mercenaries === "alquiler"
        ? {
            precio: MERCENARIES.hire,
            dias: MERCENARIES.days,
            grupos: (await loadMercenaries(db, game.id))
              .filter((r) => r.house_id === house.id)
              .map((r) => ({ unidades: r.units, seVan: r.leaves_on })),
          }
        : null,
    corona: game.status === "active" && ECONOMY_TWEAKS.crown ? { precios: crownPriceView(await crownMarket(db, game, houses)) } : null,
    evento: game.status === "active" ? await eventView(db, game) : null,
    // Bloque 13: las cinemáticas que hay para esta casa y cuáles ha visto.
    cinematicas: await cinematicsView(db, game, house.id, now),
    // Bloque 13: la coronación (solo con la partida acabada) y la clave del enlace para compartirla.
    coronacion: await coronationView(db, game),
    compartir: await shareKeyOf(db, game),
    boletines: (
      await db
        .prepare(
          "SELECT week, edition, json_extract(content, '$.headline') AS headline FROM bulletins WHERE game_id = ? ORDER BY week DESC, CASE edition WHEN 'domingo' THEN 0 ELSE 1 END",
        )
        .bind(game.id)
        .all<{ week: number; edition: string; headline: string }>()
    ).results.map((b) => ({ semana: b.week, edicion: b.edition, titular: b.headline })),
    soborno:
      game.status === "active"
        ? await bribeView(db, game, house.id, house.name, resolutionInfo(Math.min(game.current_resolution + 1, totalResolutions(game.weeks, rhythmOf(game).days)), rhythmOf(game).days).week)
        : null,
    // Bloque 3: la fe de erratas de esta casa al pie de la Crónica Definitiva (si no ganó).
    feDeErratas:
      finished && ending != null && (JSON.parse(ending.payload) as { winner: number | null }).winner !== house.id
        ? { texto: (await errataView(db, game.id)).find((e) => e.casa === house.id)?.texto ?? null, max: PROCLAMATION.maxLetters }
        : null,
    // Bloque 3: la proclama de esta casa para el próximo domingo.
    proclama:
      game.status === "active"
        ? await proclamationView(db, game, house.id, resolutionInfo(Math.min(game.current_resolution + 1, totalResolutions(game.weeks, rhythmOf(game).days)), rhythmOf(game).days).week)
        : null,
    cartas: await handView(db, game.id, house.id),
    vigiladas: spied,
    // Bloque 8: registro público de alianzas, propuestas de esta casa y sus límites.
    alianzas: alliancesView(allianceRows, house.id, now),
    casillas: projectForHouse(tiles, house.id, sharedVision).map((t) => {
      // Capitanes en la casilla: el propio siempre; los ajenos, solo si se ven sus tropas.
      const caps = houses.filter((h) => h.captain_tile === t.id && (h.id === house.id || t.troops != null)).map((h) => h.id);
      return { ...t, nombre: names.get(t.id), ...(caps.length ? { capitanes: caps } : {}) };
    }),
    // Las de la próxima resolución y las que quedan en cola para las siguientes.
    ordenes: orders.results.map((o) => ({
      id: o.id,
      resolucion: o.resolution_no,
      tipo: o.kind === "move" ? "mover" : o.kind === "siege" ? "sitiar" : "apoyar",
      desde: o.from_tile_id,
      hacia: o.target_tile_id,
      // -1 (ANY_ORIGIN): apoya el primer ataque que llegue a la casilla.
      apoyaDesde: o.supports_any ? ANY_ORIGIN : o.supported_from_tile_id,
      tropas: o.troops,
      jinetes: o.jinetes,
      catapultas: o.catapultas,
      ...(o.captain ? { capitan: true } : {}),
      // Sale de las tropas de paso de la casa en una casilla aliada (bloque 8).
      ...(o.guest ? { dePaso: true } : {}),
      // Se copia a la noche siguiente al resolver (bloque 12).
      ...(o.repeat ? { repetir: true } : {}),
    })),
    eventos: events.results.map((e) => ({
      id: e.id,
      tipo: e.type,
      resolucion: e.resolucion,
      datos: JSON.parse(e.payload),
      ...(e.visible_to != null ? { privado: true } : {}),
    })),
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
  const { cantidad, tipo, casilla } = await c.req
    .json<{ cantidad?: number; tipo?: string; casilla?: number }>()
    .catch(() => ({ cantidad: undefined, tipo: undefined, casilla: undefined }));
  const kind = (tipo ?? "mesnada") as UnitKind;
  if (!UNIT_KINDS.includes(kind)) return fail(c, 400, "Tipo de tropa no válido.");
  // Bloque 1: también se puede reclutar en una aldea propia (sin casilla, en el castillo).
  let site: number | null = null;
  if (casilla != null) {
    const tile = toEngineTiles(await loadTiles(c.env.DB, m.game.id)).find((t) => t.id === Number(casilla));
    if (!tile) return fail(c, 404, "Esa casilla no existe.");
    if (!canRecruitAt(tile, m.house.id)) return fail(c, 409, "Solo puedes reclutar en tu castillo o en una aldea tuya.");
    if (tile.type === "aldea") site = tile.id;
  }
  const check = checkRecruit(Number(cantidad), resourcesOf(m.house), kind);
  if (!check.ok) return fail(c, 409, check.error);
  const n = Number(cantidad);
  const db = c.env.DB;
  const err = await runPaid(c, [
    // Si la aldea cambió de manos entre tanto, no se paga ni se recluta nada.
    site != null
      ? db.prepare(
          `UPDATE houses SET pan = pan - ?, madera = madera - ?, piedra = piedra - ?, hierro = hierro - ?, oro = oro - ?
           WHERE id = ? AND EXISTS (SELECT 1 FROM tiles WHERE id = ? AND owner_house_id = ? AND type = 'aldea')`,
        ).bind(
          check.value.cost.pan ?? 0,
          check.value.cost.madera ?? 0,
          check.value.cost.piedra ?? 0,
          check.value.cost.hierro ?? 0,
          check.value.cost.oro ?? 0,
          m.house.id,
          site,
          m.house.id,
        )
      : payStatement(db, m.house.id, check.value.cost),
    site != null
      ? db.prepare(
          "UPDATE tiles SET troops = troops + ?, jinetes = jinetes + ?, catapultas = catapultas + ? WHERE id = ? AND owner_house_id = ? AND type = 'aldea'",
        ).bind(n, kind === "jinetes" ? n : 0, kind === "catapultas" ? n : 0, site, m.house.id)
      : db.prepare(
          "UPDATE tiles SET troops = troops + ?, jinetes = jinetes + ?, catapultas = catapultas + ? WHERE game_id = ? AND castle_of = ?",
        ).bind(n, kind === "jinetes" ? n : 0, kind === "catapultas" ? n : 0, m.game.id, m.house.id),
  ]);
  return err ?? c.json({ ok: true });
});

// Bloque 5: mercenarios de alquiler. Aparecen en el castillo y se van solos a los 7 días.
app.post("/api/partidas/:id/mercenarios", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  if (ECONOMY_TWEAKS.mercenaries !== "alquiler") return fail(c, 409, "No hay mercenarios en esta partida.");
  const { cantidad } = await c.req.json<{ cantidad?: number }>().catch(() => ({ cantidad: undefined }));
  const n = Number(cantidad);
  if (!Number.isInteger(n) || n < 1 || n > 100) return fail(c, 400, "Elige cuántos mercenarios quieres (de 1 a 100).");
  const castle = await c.env.DB.prepare("SELECT id FROM tiles WHERE game_id = ? AND castle_of = ? AND owner_house_id = ?")
    .bind(m.game.id, m.house.id, m.house.id)
    .first<{ id: number }>();
  if (!castle) return fail(c, 409, "Los mercenarios solo se presentan en tu castillo, y no lo tienes.");
  if (m.house.oro < mercenaryCost(n)) return fail(c, 409, `Hacen falta ${mercenaryCost(n)} de Oro.`);
  const err = await runPaid(c, hireStatements(c.env.DB, m.game, m.house, n));
  return err ?? c.json({ ok: true, oro: mercenaryCost(n), seVan: leavingDay(m.game) });
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

/** Bloque 12: encender o apagar el aviso 1 hora antes del cierre. */
app.post("/api/partidas/:id/aviso-cierre", async (c) => {
  const m = await membership(c);
  if (m instanceof Response) return m;
  const body = await c.req.json<{ activo?: boolean }>().catch(() => ({}) as never);
  if (typeof body.activo !== "boolean") return fail(c, 400, "Falta si quieres el aviso o no.");
  await c.env.DB.prepare("UPDATE houses SET close_warning = ? WHERE id = ?").bind(body.activo ? 1 : 0, m.house.id).run();
  return c.json({ ok: true });
});

/** Bloque 13: qué cinemáticas salen solas al entrar. */
app.post("/api/partidas/:id/ajuste-cinematicas", async (c) => {
  const m = await membership(c);
  if (m instanceof Response) return m;
  const body = await c.req.json<{ cuales?: string }>().catch(() => ({}) as never);
  if (body.cuales !== "todas" && body.cuales !== "esenciales") return fail(c, 400, "Elige «todas» o «esenciales».");
  await c.env.DB.prepare("UPDATE houses SET cinematics = ? WHERE id = ?").bind(body.cuales, m.house.id).run();
  return c.json({ ok: true });
});

interface OrderInput {
  tipo: "mover" | "apoyar" | "sitiar";
  desde: number;
  hacia: number;
  tropas: number;
  apoyaDesde?: number | null;
  /** De esas tropas, cuántas son Jinetes y Catapultas (el resto, Mesnada). */
  jinetes?: number;
  catapultas?: number;
  /** El Capitán va con este grupo (solo órdenes de mover). */
  capitan?: boolean;
  /** Bloque 8: las tropas son las de paso de la casa en esa casilla aliada. */
  dePaso?: boolean;
  /** Bloque 12: se copia a la noche siguiente al resolver (asedios y apoyos a la defensa). */
  repetir?: boolean;
}

/**
 * Sustituye todas las órdenes de la casa para la próxima resolución y las que
 * deja en cola para las siguientes (diseño v3, fase 5: hasta QUEUE.nights noches).
 * Las de esta noche se comprueban con el mapa de verdad; las de las noches
 * siguientes, con lo que la casa ve proyectado noche a noche (como su botón
 * Simular), y al llegar su noche se ajustan a las tropas que queden.
 */
app.put("/api/partidas/:id/ordenes", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const clock = clockOf(m.game)!;
  if (!ordersOpen(gameNow(m.game), clock)) return fail(c, 409, "Las órdenes ya están cerradas para esta resolución.");
  const { ordenes } = await c.req.json<{ ordenes?: (OrderInput & { resolucion?: number })[] }>().catch(() => ({ ordenes: undefined }));
  if (!Array.isArray(ordenes) || ordenes.length > 60 * QUEUE.nights) return fail(c, 400, "Lista de órdenes no válida.");

  const n = m.game.current_resolution + 1;
  const last = Math.min(n + QUEUE.nights - 1, totalResolutions(m.game.weeks, rhythmOf(m.game).days));
  const nights: Order[][] = Array.from({ length: last - n + 1 }, () => []);
  // Bloque 12: qué órdenes se repiten cada noche (mismo puesto que en `nights`).
  const repeats: boolean[][] = nights.map(() => []);
  for (const o of ordenes) {
    const r = o.resolucion == null ? n : Number(o.resolucion);
    if (!Number.isInteger(r) || r < n || r > last) return fail(c, 400, "Solo se pueden dejar órdenes para las próximas noches.");
    const repeat = o.repetir === true;
    if (repeat && !(o.tipo === "sitiar" || (o.tipo === "apoyar" && o.apoyaDesde == null))) {
      return fail(c, 400, "Solo se repiten cada noche los asedios y las defensas.");
    }
    repeats[r - n]!.push(repeat);
    nights[r - n]!.push(
      o.tipo === "mover"
        ? {
            kind: "move",
            house: m.house.id,
            from: Number(o.desde),
            to: Number(o.hacia),
            troops: Number(o.tropas),
            ...orderTypes(o),
            ...(o.capitan === true ? { captain: true } : {}),
            ...(o.dePaso === true ? { guest: true } : {}),
          }
        : o.tipo === "sitiar"
          ? {
              kind: "siege",
              house: m.house.id,
              from: Number(o.desde),
              target: Number(o.hacia),
              troops: Number(o.tropas),
              ...orderTypes(o),
              ...(o.dePaso === true ? { guest: true } : {}),
            }
          : {
              kind: "support",
              house: m.house.id,
              from: Number(o.desde),
              target: Number(o.hacia),
              supportedFrom: o.apoyaDesde == null ? null : Number(o.apoyaDesde),
              troops: Number(o.tropas),
              ...orderTypes(o),
              ...(o.dePaso === true ? { guest: true } : {}),
            },
    );
  }
  if (nights.some((x) => x.length > 60)) return fail(c, 400, "Demasiadas órdenes para una noche.");

  const [tiles, alliances] = await Promise.all([
    loadTiles(c.env.DB, m.game.id).then(toEngineTiles),
    loadAlliances(c.env.DB, m.game.id).then(toEngineAlliances),
  ]);
  // Esta noche: con el mapa de verdad (y las alianzas, que son públicas).
  const { invalid } = checkOrders(tiles, nights[0] ?? [], n, alliances);
  if (invalid.length > 0) return fail(c, 400, `Orden no válida: ${invalid[0]!.reason}.`);
  // Las siguientes: con lo que ve la casa (también lo de sus aliados), proyectado noche a noche.
  const spied = await spiedHouses(c.env.DB, m.game, m.house.id);
  const vision = [...new Set([...spied, ...alliesOf(alliances, m.house.id)])];
  const plan = withRhythm(rhythmOf(m.game), () =>
    planNights(projectForHouse(tiles, m.house.id, vision), nights, m.house.id, m.house.captain_tile, n, alliances),
  );
  for (let i = 1; i < nights.length; i++) {
    if (nights[i]!.length === 0) continue;
    const before = plan[i - 1]!.tiles;
    const queued = checkOrders(before, fitOrders(before, nights[i]!), n + i, alliances);
    if (queued.invalid.length > 0) return fail(c, 400, `Orden en cola no válida (noche ${i + 1}): ${queued.invalid[0]!.reason}.`);
  }
  for (let i = 0; i < nights.length; i++) {
    const withCaptain = nights[i]!.filter((o) => o.kind === "move" && o.captain);
    const captainTile = i === 0 ? m.house.captain_tile : plan[i - 1]!.captainTile;
    if (withCaptain.length > 1) return fail(c, 400, "El Capitán solo puede ir con un grupo cada noche.");
    if (withCaptain.length === 1 && withCaptain[0]!.from !== captainTile) return fail(c, 400, "Tu Capitán no estará en esa casilla.");
  }

  // Una orden que no cambia conserva su hora (updated_at): el apoyo sin origen
  // suma al ataque que se dio antes, y volver a guardar no debe adelantarlo.
  const previous = await c.env.DB.prepare(
    "SELECT resolution_no, kind, from_tile_id, troops, jinetes, catapultas, captain, guest, target_tile_id, supported_from_tile_id, supports_any, updated_at FROM orders WHERE house_id = ? AND resolution_no >= ?",
  )
    .bind(m.house.id, n)
    .all<{
      resolution_no: number;
      kind: string;
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
    }>();
  const keep = new Map<string, string[]>();
  for (const p of previous.results) {
    const key = [p.resolution_no, p.kind, p.from_tile_id, p.troops, p.jinetes, p.catapultas, p.captain, p.guest, p.target_tile_id, p.supports_any ? ANY_ORIGIN : (p.supported_from_tile_id ?? "")].join("|");
    keep.set(key, [...(keep.get(key) ?? []), p.updated_at]);
  }
  const statements = [
    c.env.DB.prepare("DELETE FROM orders WHERE house_id = ? AND resolution_no >= ?").bind(m.house.id, n),
    ...nights.flatMap((orders, i) =>
      orders.map((o, j) => {
        const supported = o.kind === "support" ? o.supportedFrom : null;
        const anyOrigin = supported === ANY_ORIGIN;
        const row = [
          n + i,
          o.kind,
          o.from,
          o.troops,
          o.jinetes ?? 0,
          o.catapultas ?? 0,
          o.kind === "move" && o.captain ? 1 : 0,
          o.guest ? 1 : 0,
          o.kind === "move" ? o.to : o.target,
        ] as const;
        const at = keep.get([...row, supported ?? ""].join("|"))?.shift() ?? null;
        return c.env.DB.prepare(
          "INSERT INTO orders (game_id, house_id, resolution_no, kind, from_tile_id, troops, jinetes, catapultas, captain, guest, target_tile_id, supported_from_tile_id, supports_any, updated_at, repeat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ','now')), ?)",
        ).bind(m.game.id, m.house.id, ...row, anyOrigin ? null : supported, anyOrigin ? 1 : 0, at, repeats[i]![j] ? 1 : 0);
      }),
    ),
  ];
  await c.env.DB.batch(statements);
  return c.json({ ok: true, ordenes: nights.reduce((a, x) => a + x.length, 0) });
});

// ---------------------------------------------------------------------------
// Alianzas (bloque 8, docs/alianzas.md)
// ---------------------------------------------------------------------------

function allianceReply(c: Ctx, r: AllianceResult) {
  return r.ok ? c.json({ ...r }) : fail(c, r.status, r.error);
}

/** Un nombre solemne nuevo para la propuesta (Fray Abundio lo cambia cuantas veces haga falta). */
app.get("/api/partidas/:id/alianzas/nombre", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  return c.json({ nombre: freshAllianceName() });
});

/** Proponer una alianza a otra casa (con el nombre que puso Fray Abundio, o uno nuevo). */
app.post("/api/partidas/:id/alianzas", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const { casa, nombre } = await c.req.json<{ casa?: number; nombre?: string | null }>().catch(() => ({ casa: undefined, nombre: undefined }));
  if (!Number.isInteger(Number(casa))) return fail(c, 400, "Elige a qué casa proponer la alianza.");
  return allianceReply(c, await proposeAlliance(c.env, m.game, m.house, Number(casa), nombre ?? null));
});

app.post("/api/partidas/:id/alianzas/:aid/aceptar", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  return allianceReply(c, await acceptAlliance(c.env, m.game, m.house, Number(c.req.param("aid"))));
});

app.post("/api/partidas/:id/alianzas/:aid/rechazar", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  return allianceReply(c, await declineAlliance(c.env, m.game, m.house, Number(c.req.param("aid"))));
});

app.post("/api/partidas/:id/alianzas/:aid/retirar", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  return allianceReply(c, await withdrawAlliance(c.env, m.game, m.house, Number(c.req.param("aid"))));
});

/** Romper: deja de existir tras `ALLIANCE.noticeResolutions` noches (la de hoy es la primera). */
app.post("/api/partidas/:id/alianzas/:aid/romper", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const r = await breakAlliance(c.env, m.game, m.house, Number(c.req.param("aid")));
  return r.ok ? c.json({ ok: true, id: r.id, terminaTras: r.endsAt }) : fail(c, r.status, r.error);
});

/**
 * Soltar a un Capitán preso (diseño v3). Lo usa quien lo tiene, por ejemplo
 * tras cobrar un rescate en el comercio. El Capitán vuelve a su castillo.
 */
app.post("/api/partidas/:id/capitan/:casa/soltar", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const prisoner = Number(c.req.param("casa"));
  const db = c.env.DB;
  const castle = await db.prepare("SELECT id FROM tiles WHERE game_id = ? AND castle_of = ?").bind(m.game.id, prisoner).first<{ id: number }>();
  if (!castle) return fail(c, 404, "Esa casa no existe.");
  const res = await db.batch([
    db.prepare(
      "UPDATE houses SET captain_tile = ?, captain_captured_by = NULL, captain_free_at = NULL, captain_ransom = NULL WHERE id = ? AND game_id = ? AND captain_captured_by = ?",
    ).bind(castle.id, prisoner, m.game.id, m.house.id),
    db.prepare(
      "INSERT INTO event_log (game_id, type, visible_to, payload) SELECT ?, 'capitan_libre', NULL, ? WHERE changes() > 0",
    ).bind(m.game.id, JSON.stringify({ house: prisoner, by: m.house.id, reason: "liberado" })),
  ]);
  if ((res[0]?.meta.changes ?? 0) === 0) return fail(c, 409, "No tienes preso a ese Capitán.");
  return c.json({ ok: true });
});

/**
 * Rescate del Capitán (bloque 4): quien lo tiene preso pide un precio en Oro
 * (o lo retira con null) y puede cambiarlo cuando quiera.
 */
app.put("/api/partidas/:id/capitan/:casa/rescate", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const prisoner = Number(c.req.param("casa"));
  const { oro } = await c.req.json<{ oro?: number | null }>().catch(() => ({ oro: undefined }));
  const price = oro == null ? null : Number(oro);
  if (price != null && !(Number.isInteger(price) && price >= 1 && price <= 100000)) return fail(c, 400, "El rescate es un número de Oro, de 1 en adelante.");
  const res = await c.env.DB.prepare("UPDATE houses SET captain_ransom = ? WHERE id = ? AND game_id = ? AND captain_captured_by = ?")
    .bind(price, prisoner, m.game.id, m.house.id)
    .run();
  if ((res.meta.changes ?? 0) === 0) return fail(c, 409, "No tienes preso a ese Capitán.");
  return c.json({ ok: true, rescate: price });
});

/**
 * Pagar el rescate del propio Capitán: el Oro pasa a quien lo tiene y el
 * Capitán vuelve al castillo en el momento. Hay que confirmar el precio que se
 * vio, por si quien lo tiene lo ha cambiado. Todo en un lote: si falta Oro,
 * el CHECK de la base de datos lo deshace entero.
 */
app.post("/api/partidas/:id/capitan/rescate", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const { oro } = await c.req.json<{ oro?: number }>().catch(() => ({ oro: undefined }));
  const price = Number(oro);
  const h = m.house;
  if (h.captain_captured_by == null) return fail(c, 409, "Tu Capitán no está preso.");
  if (h.captain_ransom == null) return fail(c, 409, "Aún no han pedido rescate por tu Capitán.");
  if (!Number.isInteger(price) || price !== h.captain_ransom) return fail(c, 409, "El precio del rescate ha cambiado. Míralo otra vez.");
  if (h.oro < price) return fail(c, 409, `Hacen falta ${price} de Oro.`);
  const db = c.env.DB;
  const captor = h.captain_captured_by;
  const castle = await db.prepare("SELECT id FROM tiles WHERE game_id = ? AND castle_of = ?").bind(m.game.id, h.id).first<{ id: number }>();
  try {
    const res = await db.batch(ransomStatements(db, m.game.id, h.id, captor, price, castle?.id ?? null));
    if ((res[2]?.meta.changes ?? 0) === 0) return fail(c, 409, "El rescate ya no está en pie. Míralo otra vez.");
  } catch (err) {
    if (err instanceof Error && /CHECK constraint failed/.test(err.message)) return fail(c, 409, `Hacen falta ${price} de Oro.`);
    throw err;
  }
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Cambio con la Corona (bloque 5): solo vende, sin tope; cada unidad encarece la siguiente.
// ---------------------------------------------------------------------------

async function crownRequest(c: Ctx) {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  if (!ECONOMY_TWEAKS.crown) return fail(c, 409, "La Corona no vende en esta partida.");
  const body = await c.req.json<{ recurso?: string; unidades?: number; oro?: number }>().catch(() => ({}) as Record<string, undefined>);
  const resource = body.recurso as Resource;
  const units = Number(body.unidades);
  if (!CROWN_GOODS.includes(resource)) return fail(c, 400, "La Corona vende Pan, Madera, Piedra y Hierro.");
  if (!Number.isInteger(units) || units < 1 || units > 500) return fail(c, 400, "Elige cuántas unidades quieres (de 1 a 500).");
  const market = await crownMarket(c.env.DB, m.game, m.houses);
  return { m, resource, units, gold: crownCost(market, resource, units), offered: body.oro };
}

/** Lo que costaría una compra ahora mismo. */
app.post("/api/partidas/:id/corona/presupuesto", async (c) => {
  const r = await crownRequest(c);
  if (r instanceof Response) return r;
  return c.json({ oro: r.gold });
});

/** Compra a la Corona. `oro` es el presupuesto que vio la persona: si el precio ha cambiado, no se compra. */
app.post("/api/partidas/:id/corona/comprar", async (c) => {
  const r = await crownRequest(c);
  if (r instanceof Response) return r;
  if (Number(r.offered) !== r.gold) {
    return c.json({ error: `El precio ha cambiado: ahora son ${r.gold} de Oro.`, oro: r.gold }, 409);
  }
  if (r.m.house.oro < r.gold) return fail(c, 409, `Hacen falta ${r.gold} de Oro.`);
  const err = await runPaid(c, crownPurchaseStatements(c.env.DB, r.m.game, r.m.house.id, r.resource, r.units, r.gold));
  return err ?? c.json({ ok: true, oro: r.gold });
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
    .json<{ para?: number | null; da?: unknown; pide?: unknown; contraofertaDe?: number; frase?: unknown }>()
    .catch(() => ({}) as never);
  // Bloque 10: frase corta opcional, de 80 letras como mucho.
  const note = typeof body.frase === "string" ? body.frase.replace(/\s+/g, " ").trim() : "";
  if ([...note].length > TRADE.noteMax) return fail(c, 400, `La frase, de ${TRADE.noteMax} letras como mucho.`);
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
      `INSERT INTO offers (game_id, from_house_id, to_house_id, parent_offer_id, expires_after, note,
         give_pan, give_madera, give_piedra, give_hierro, give_oro,
         want_pan, want_madera, want_piedra, want_hierro, want_oro)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      m.game.id, m.house.id, to, parent?.id ?? null, offerExpiry(m.game), note || null,
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
      body: noticeText("aviso.oferta", m.house.id + to, { jugador: houseInSentence(m.house.name) }),
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

// Bloque 13: marca una cinemática como vista. Con `vista: false` se pasó por
// alto (había demasiadas a la vez): ya no sale sola, pero sigue como nueva.
app.post("/api/partidas/:id/cinematicas", async (c) => {
  const m = await membership(c);
  if (m instanceof Response) return m;
  const { clave, vista } = await c.req.json<{ clave?: string; vista?: boolean }>().catch(() => ({ clave: undefined, vista: undefined }));
  if (typeof clave !== "string" || !isCinematicKey(clave)) return fail(c, 400, "Esa cinemática no existe.");
  const watched = vista === false ? 0 : 1;
  await c.env.DB.prepare(
    "INSERT INTO cinematics_seen (house_id, key, watched) VALUES (?, ?, ?) ON CONFLICT (house_id, key) DO UPDATE SET watched = MAX(watched, excluded.watched)",
  )
    .bind(m.house.id, clave, watched)
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
  // Bloque 3: ?edicion=miercoles para la hoja volandera; sin ella, el del domingo.
  const edition = c.req.query("edicion") === "miercoles" ? "miercoles" : "domingo";
  const row = await c.env.DB.prepare("SELECT content, published_at FROM bulletins WHERE game_id = ? AND week = ? AND edition = ?")
    .bind(m.game.id, Number(c.req.param("semana")), edition)
    .first<{ content: string; published_at: string }>();
  if (!row) return fail(c, 404, "Ese boletín aún no se ha escrito.");
  const content = JSON.parse(row.content) as StoredBulletin;
  // Bloque 3: la Crónica Definitiva (semana 0) lleva al pie la fe de erratas de los vencidos.
  const erratas = Number(c.req.param("semana")) === 0 ? await errataView(c.env.DB, m.game.id) : undefined;
  return c.json({ ...content, lastEventId: undefined, publicado: row.published_at, ...(erratas ? { erratas } : {}) });
});

/**
 * Bloque 11: la crónica de una semana, noche a noche, con lo que esta casa puede
 * ver. Lo que no pertenece a una resolución (logros, piloto, final) va con la
 * noche siguiente, como en la crónica del estado.
 */
app.get("/api/partidas/:id/cronica/:semana", async (c) => {
  const m = await membership(c);
  if (m instanceof Response) return m;
  const per = rhythmOf(m.game).days.length;
  const lastWeek = Math.max(1, Math.ceil(Math.max(1, m.game.current_resolution) / per));
  const week = Math.min(lastWeek, Math.max(1, Number(c.req.param("semana")) || lastWeek));
  const rows = await c.env.DB.prepare(
    `SELECT id, type, payload, visible_to, night FROM (
       SELECT e.id, e.type, e.payload, e.visible_to, COALESCE(r.number,
         (SELECT MIN(r2.number) FROM event_log e2 JOIN resolutions r2 ON r2.id = e2.resolution_id WHERE e2.game_id = e.game_id AND e2.id > e.id),
         ?) AS night
       FROM event_log e LEFT JOIN resolutions r ON r.id = e.resolution_id
       WHERE e.game_id = ? AND (e.visible_to IS NULL OR e.visible_to = ?) AND e.type <> 'movimiento'
     ) WHERE night BETWEEN ? AND ? ORDER BY night DESC, id ASC`,
  )
    .bind(m.game.current_resolution + 1, m.game.id, m.house.id, (week - 1) * per + 1, week * per)
    .all<{ id: number; type: string; payload: string; visible_to: number | null; night: number }>();
  return c.json({
    semana: week,
    semanas: lastWeek,
    eventos: rows.results.map((e) => ({
      id: e.id,
      tipo: e.type,
      resolucion: e.night,
      datos: JSON.parse(e.payload),
      ...(e.visible_to != null ? { privado: true } : {}),
    })),
  });
});

/** Bloque 3: escribir, cambiar o retirar (texto vacío) la proclama de la semana. */
app.put("/api/partidas/:id/proclama", async (c) => {
  const m = await activeMembership(c);
  if (m instanceof Response) return m;
  const clock = clockOf(m.game)!;
  if (!ordersOpen(gameNow(m.game), clock)) return fail(c, 409, "El cronista ya ha cerrado el boletín de esta semana.");
  const { texto } = await c.req.json<{ texto?: unknown }>().catch(() => ({ texto: undefined }));
  if (typeof texto !== "string") return fail(c, 400, "Falta el texto de la proclama.");
  const checked = checkProclamation(texto);
  if (!checked.ok) return fail(c, 400, checked.error);
  const week = resolutionInfo(m.game.current_resolution + 1, rhythmOf(m.game).days).week;
  const db = c.env.DB;
  if (checked.text === "") {
    await db.prepare("DELETE FROM proclamations WHERE game_id = ? AND house_id = ? AND week = ?").bind(m.game.id, m.house.id, week).run();
  } else {
    await db
      .prepare(
        "INSERT INTO proclamations (game_id, house_id, week, text, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (game_id, house_id, week) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at",
      )
      .bind(m.game.id, m.house.id, week, checked.text, gameNow(m.game).toISOString())
      .run();
  }
  return c.json({ ok: true, texto: checked.text || null });
});

/**
 * Bloque 3: fe de erratas. Al acabar la partida, cada casa que no ganó puede
 * dejar una línea al pie de la Crónica Definitiva (vacía = retirarla).
 */
app.put("/api/partidas/:id/fe-de-erratas", async (c) => {
  const m = await membership(c);
  if (m instanceof Response) return m;
  if (m.game.status !== "finished") return fail(c, 409, "La fe de erratas se escribe cuando acaba la partida.");
  const db = c.env.DB;
  const end = await db.prepare("SELECT payload FROM event_log WHERE game_id = ? AND type = 'fin' ORDER BY id DESC LIMIT 1").bind(m.game.id).first<{ payload: string }>();
  const winner = end ? (JSON.parse(end.payload) as { winner: number | null }).winner : null;
  if (winner === m.house.id) return fail(c, 409, "El ganador no necesita erratas: la Crónica ya dice lo que quiere.");
  const { texto } = await c.req.json<{ texto?: unknown }>().catch(() => ({ texto: undefined }));
  if (typeof texto !== "string") return fail(c, 400, "Falta el texto.");
  const checked = checkProclamation(texto);
  if (!checked.ok) return fail(c, 400, checked.error);
  if (checked.text === "") {
    await db.prepare("DELETE FROM proclamations WHERE game_id = ? AND house_id = ? AND week = 0").bind(m.game.id, m.house.id).run();
  } else {
    await db
      .prepare(
        "INSERT INTO proclamations (game_id, house_id, week, text, updated_at) VALUES (?, ?, 0, ?, ?) ON CONFLICT (game_id, house_id, week) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at",
      )
      .bind(m.game.id, m.house.id, checked.text, gameNow(m.game).toISOString())
      .run();
  }
  return c.json({ ok: true, texto: checked.text || null });
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

/** Jinetes y Catapultas que trae una orden del cliente (enteros o nada). */
function orderTypes(o: { jinetes?: unknown; catapultas?: unknown }): { jinetes?: number; catapultas?: number } {
  const j = Number(o.jinetes ?? 0);
  const c = Number(o.catapultas ?? 0);
  return { ...(j !== 0 ? { jinetes: j } : {}), ...(c !== 0 ? { catapultas: c } : {}) };
}
