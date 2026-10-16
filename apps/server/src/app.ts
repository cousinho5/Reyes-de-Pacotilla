// API del juego. Todas las respuestas para el jugador van en español y nunca
// incluyen información fuera de su niebla de guerra.

import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  BUILDINGS,
  SPECIALTY_PAIRS,
  STARTING_RESOURCES,
  checkFortify,
  checkOrders,
  checkRecruit,
  checkUpgrade,
  dailyProduction,
  generateMap,
  localDate,
  localParts,
  projectForHouse,
  resolutionInstant,
  weeklyUpkeep,
  zonedToUtc,
  type BuildingKind,
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
import { ordersOpen, type GameClock } from "./scheduler";
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

export interface Env {
  DB: D1Database;
  /** Clave para firmar sesiones y códigos (wrangler secret put SESSION_SECRET). */
  SESSION_SECRET: string;
  /** Clave para crear partidas (wrangler secret put ADMIN_SECRET). */
  ADMIN_SECRET: string;
}

type Vars = { session: Session | null };
type Ctx = Context<{ Bindings: Env; Variables: Vars }>;

export const COLORS = ["gules", "azur", "sinople", "sable", "purpura", "naranjado", "aguamarina", "leonado"] as const;
const SHAPES = ["espanol", "apuntado", "almendrado", "rodela", "estandarte"] as const;
const SYMBOLS = [
  "leon", "aguila", "torre", "espada", "corona", "llave", "lobo", "dragon",
  "gallina", "cerdo", "nabo", "caracol", "pato", "queso", "bota", "cuchara",
] as const;

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
    `SELECT g.id, g.name, g.status, h.name AS casa, h.color FROM houses h JOIN games g ON g.id = h.game_id
     WHERE h.user_id = ? ORDER BY g.id DESC`,
  )
    .bind(s.userId)
    .all<{ id: number; name: string; status: string; casa: string; color: string }>();
  return c.json({
    usuario: user ? { id: user.id, nombre: user.display_name } : null,
    partidas: results.map((g) => ({ id: g.id, nombre: g.name, estado: g.status, casa: g.casa, color: g.color })),
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
// Crear partida e invitaciones
// ---------------------------------------------------------------------------

/** Crear partida: protegido con la clave de administración. Crea también al creador. */
app.post("/api/partidas", async (c) => {
  if (c.req.header("x-admin") !== c.env.ADMIN_SECRET) return fail(c, 403, "Hace falta la clave de administración.");
  const body = await c.req.json<{ nombre?: string; semanas?: number; creador?: string }>().catch(() => ({}) as never);
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
    "INSERT INTO games (name, weeks, seed, invite_code, created_by) VALUES (?, ?, ?, ?, ?) RETURNING id",
  )
    .bind(nombre, semanas, randomCode(12), invite, userId)
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
    casas: houses.map((h) => ({ nombre: h.name, color: h.color })),
    coloresLibres: COLORS.filter((col) => !houses.some((h) => h.color === col)),
    yaDentro: s ? houses.some((h) => h.user_id === s.userId) : false,
  });
});

app.post("/api/invitacion/:codigo/unirse", async (c) => {
  const db = c.env.DB;
  const game = await db.prepare("SELECT id, status FROM games WHERE invite_code = ?")
    .bind(normalizeCode(c.req.param("codigo")))
    .first<{ id: number; status: string }>();
  if (!game) return fail(c, 404, "Esa invitación no existe.");
  if (game.status !== "lobby") return fail(c, 409, "La partida ya ha empezado.");

  const body = await c.req
    .json<{ nombre?: string; casa?: string; color?: string; lema?: string }>()
    .catch(() => ({}) as never);
  const casa = (body.casa ?? "").trim();
  if (casa.length < 1 || casa.length > 20) return fail(c, 400, "El nombre de la casa tiene entre 1 y 20 caracteres.");
  if (!COLORS.includes(body.color as (typeof COLORS)[number])) return fail(c, 400, "Ese color no existe.");
  const lema = (body.lema ?? "").trim() || null;
  if (lema && lema.length > 40) return fail(c, 400, "El lema tiene como máximo 40 caracteres.");

  const houses = await loadHouses(db, game.id);
  if (houses.length >= 8) return fail(c, 409, "La partida ya tiene 8 casas.");
  if (houses.some((h) => h.color === body.color)) return fail(c, 409, "Ese color ya está cogido.");

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

  // Escudo provisional (el creador de escudos llega en la versión 1): la primera combinación libre.
  const used = new Set(houses.map((h) => `${h.shield_shape}:${h.symbol}`));
  const i = houses.length;
  let shape: string = SHAPES[i % SHAPES.length]!;
  let symbol: string = SYMBOLS[(i * 3) % SYMBOLS.length]!;
  for (let k = 0; used.has(`${shape}:${symbol}`); k++) symbol = SYMBOLS[k % SYMBOLS.length]!;

  try {
    await db.prepare(
      "INSERT INTO houses (game_id, user_id, name, color, shield_shape, symbol, motto) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(game.id, s.userId, casa, body.color, shape, symbol, lema)
      .run();
  } catch {
    return fail(c, 409, "Ese color acaba de cogerlo otra casa. Elige otro.");
  }
  return c.json({ ok: true, partida: game.id, codigoAcceso });
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
  const houses = await loadHouses(db, game.id);
  if (houses.length < 4) return fail(c, 409, "Hacen falta al menos 4 casas para empezar.");

  const body = await c.req.json<{ inicio?: string }>().catch(() => ({}) as { inicio?: string });
  const startDate = body.inicio ?? nextMonday(new Date(), game.timezone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || new Date(`${startDate}T12:00:00Z`).getUTCDay() !== 1) {
    return fail(c, 400, "La partida empieza un lunes (AAAA-MM-DD).");
  }

  const map = generateMap(game.seed, houses.map((h) => h.id));
  const statements: D1PreparedStatement[] = [
    db.prepare(
      "UPDATE games SET status = 'active', start_date = ?, map_cols = ?, map_rows = ?, started_at = ? WHERE id = ? AND status = 'lobby'",
    ).bind(startDate, map.cols, map.rows, new Date().toISOString(), game.id),
  ];
  for (const t of map.tiles) {
    const name = t.type === "castillo" ? `Castillo de la ${houses.find((h) => h.id === t.castleOf)!.name}` : t.name;
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
      db.prepare("UPDATE houses SET pan = ?, madera = ?, piedra = ?, hierro = ?, oro = ?, last_seen_at = ? WHERE id = ?").bind(
        STARTING_RESOURCES,
        STARTING_RESOURCES,
        STARTING_RESOURCES,
        STARTING_RESOURCES,
        STARTING_RESOURCES,
        new Date().toISOString(),
        h.id,
      ),
    );
  });
  await db.batch(statements);
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
  const house = houses.find((h) => h.user_id === s.userId);
  if (!house) return fail(c, 403, "No tienes casa en esta partida.");
  // Cuenta como visita para el piloto automático.
  await c.env.DB.prepare("UPDATE houses SET last_seen_at = ? WHERE id = ?").bind(new Date().toISOString(), house.id).run();
  return { game, house, houses };
}

function clockOf(game: GameRow): GameClock | null {
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

app.get("/api/partidas/:id", async (c) => {
  const m = await membership(c);
  if (m instanceof Response) return m;
  const { game, house, houses } = m;
  const db = c.env.DB;
  const now = new Date();
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
      totalResoluciones: game.weeks * 2,
    },
  };
  if (game.status === "lobby") {
    return c.json({
      ...base,
      yo: { casa: house.id },
      casas: houses.map((h) => ({ id: h.id, nombre: h.name, color: h.color, lema: h.motto })),
    });
  }

  const tileRows = await loadTiles(db, game.id);
  const tiles = toEngineTiles(tileRows);
  const [buildings, prestige, orders, events] = await Promise.all([
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
       ORDER BY COALESCE(r.number, 0) DESC, e.id ASC LIMIT 40`,
    )
      .bind(game.id, house.id)
      .all<{ id: number; type: string; payload: string; at: string; resolucion: number | null }>(),
  ]);

  const clock = clockOf(game)!;
  const next = game.current_resolution + 1;
  const total = game.weeks * 2;
  const levels = buildings.get(house.id)!;
  const own = tiles.filter((t) => t.owner === house.id);
  const helpActive = house.help_until_resolution != null && house.help_until_resolution > game.current_resolution;
  const names = new Map(tileRows.map((t) => [t.id, t.name]));

  return c.json({
    ...base,
    partida: {
      ...base.partida,
      proximaResolucion: next <= total ? next : null,
      cierre: next <= total ? resolutionInstant(clock.startDate, next, clock.closeTime, clock.timezone).toISOString() : null,
      resolucion: next <= total ? resolutionInstant(clock.startDate, next, clock.resolveTime, clock.timezone).toISOString() : null,
      ordenesAbiertas: game.status === "active" && ordersOpen(now, clock),
      haEmpezado: now >= zonedToUtc(clock.startDate, "00:00", clock.timezone),
    },
    yo: {
      casa: house.id,
      recursos: resourcesOf(house),
      edificios: levels,
      produccionDiaria: dailyProduction(levels, own, helpActive ? (house.help_resource ?? "pan") : null),
      mantenimientoSemanal: weeklyUpkeep(own.reduce((a, t) => a + t.troops, 0), own.filter((t) => t.type !== "castillo").length),
      ayudaAlUltimo: helpActive ? (house.help_resource ?? "pan") : null,
      recursoAyuda: house.help_resource ?? "pan",
    },
    casas: houses
      .map((h) => ({ id: h.id, nombre: h.name, color: h.color, lema: h.motto, prestigio: prestige.get(h.id) }))
      .sort((a, b) => (b.prestigio?.total ?? 0) - (a.prestigio?.total ?? 0)),
    casillas: projectForHouse(tiles, house.id).map((t) => ({ ...t, nombre: names.get(t.id) })),
    ordenes: orders.results.map((o) => ({
      id: o.id,
      tipo: o.kind === "move" ? "mover" : "apoyar",
      desde: o.from_tile_id,
      hacia: o.target_tile_id,
      apoyaDesde: o.supported_from_tile_id,
      tropas: o.troops,
    })),
    eventos: events.results.map((e) => ({ id: e.id, tipo: e.type, resolucion: e.resolucion, datos: JSON.parse(e.payload) })),
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
  const err = await runPaid(c, [
    payStatement(c.env.DB, m.house.id, check.value.cost),
    c.env.DB.prepare("UPDATE buildings SET level = ? WHERE house_id = ? AND kind = ? AND level = ?").bind(
      check.value.newLevel,
      m.house.id,
      edificio,
      levels[edificio],
    ),
  ]);
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
  const check = checkFortify(tile, m.house.id, m.game.current_resolution + 1, resourcesOf(m.house));
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
  if (!ordersOpen(new Date(), clock)) return fail(c, 409, "Las órdenes ya están cerradas para esta resolución.");
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

/** Lunes siguiente (nunca hoy) en la zona horaria de la partida. */
export function nextMonday(now: Date, timeZone: string): string {
  const today = localDate(now, timeZone);
  const [y, mo, d] = today.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, mo - 1, d));
  const add = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + add);
  return date.toISOString().slice(0, 10);
}
