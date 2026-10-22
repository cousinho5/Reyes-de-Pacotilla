// Alianzas (bloque 8, docs/alianzas.md): proponer, aceptar, rechazar, retirar y
// romper. Las usan la API (app.ts) y los bots de las partidas de prueba
// (pruebas.ts). La resolución (jobs.ts) termina las que acaban su aviso y
// caduca las propuestas sin contestar.

import {
  ALLIANCE,
  PHRASES,
  allianceName,
  fill,
  houseInSentence,
  isAllianceName,
  noticeEnd,
  resolutionInstant,
  totalResolutions,
  type HouseId,
  type PhraseKey,
} from "@reyes/engine";
import { notifyHouses, type NotifyEnv } from "./notify";
import { gameNow, loadAlliances, loadHouses, rhythmOf, type AllianceRow, type GameRow, type HouseRow } from "./state";

export type AllianceResult = { ok: true; id: number; name?: string } | { ok: false; status: 400 | 403 | 404 | 409; error: string };

const OPEN = ["proposed", "active", "breaking"] as const;
const DAY = 864e5;

/** Un nombre solemne nuevo (Fray Abundio lo compone; el azar lo pone el servidor). */
export function freshAllianceName(): string {
  return allianceName(crypto.randomUUID());
}

/** La casa rompió una alianza hace menos de `ALLIANCE.cooldownDays` días (hora de la partida). */
export function cooling(rows: AllianceRow[], house: HouseId, now: Date): boolean {
  return cooldownEnd(rows, house, now) != null;
}

/** Hasta cuándo no puede firmar la casa (null si puede). */
export function cooldownEnd(rows: AllianceRow[], house: HouseId, now: Date): Date | null {
  let end: Date | null = null;
  for (const r of rows) {
    if (r.broken_by !== house || !r.broken_at) continue;
    const until = new Date(Date.parse(r.broken_at) + ALLIANCE.cooldownDays * DAY);
    if (until > now && (!end || until > end)) end = until;
  }
  return end;
}

/** Alianzas abiertas (en vigor o en aviso) de una casa. */
function openCount(rows: AllianceRow[], house: HouseId): number {
  return rows.filter((r) => (r.status === "active" || r.status === "breaking") && (r.house_a === house || r.house_b === house)).length;
}

function pairOf(a: HouseId, b: HouseId): [HouseId, HouseId] {
  return a < b ? [a, b] : [b, a];
}

/** Variante de un aviso, fija para cada alianza. */
function notice(key: PhraseKey, pick: number, vars: Record<string, string | number>): string {
  const all = PHRASES[key] as readonly string[];
  const text = fill(all[pick % all.length]!, vars);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function nameOf(houses: HouseRow[], id: HouseId): string {
  const h = houses.find((x) => x.id === id);
  return h ? houseInSentence(h.name) : "otra casa";
}

/** Fecha local de la resolución `n` ("domingo 25"), para los avisos. */
export function resolutionDay(game: GameRow, n: number): string {
  if (!game.start_date) return `la resolución ${n}`;
  const { days } = rhythmOf(game);
  const at = resolutionInstant(game.start_date, n, game.resolve_time, game.timezone, days);
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", timeZone: game.timezone }).format(at);
}

function isUnique(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/.test(err.message);
}

/** Lo que impide firmar a una casa ahora (null si puede). */
function signBlock(rows: AllianceRow[], houses: HouseRow[], house: HouseId, now: Date, me: HouseId): string | null {
  if (cooling(rows, house, now)) {
    return house === me
      ? `Rompiste una alianza hace menos de ${ALLIANCE.cooldownDays} días: aún no puedes firmar otra.`
      : `${capitalize(nameOf(houses, house))} rompió una alianza hace poco y aún no puede firmar otra.`;
  }
  if (ALLIANCE.maxPerHouse != null && openCount(rows, house) >= ALLIANCE.maxPerHouse) {
    return house === me ? "Ya tienes todas las alianzas que se permiten." : `${capitalize(nameOf(houses, house))} ya tiene todas las alianzas que se permiten.`;
  }
  return null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function proposeAlliance(env: NotifyEnv, game: GameRow, house: HouseRow, to: number, name?: string | null): Promise<AllianceResult> {
  const db = env.DB;
  if (!ALLIANCE.enabled) return { ok: false, status: 409, error: "En esta partida no hay alianzas." };
  if (game.status !== "active") return { ok: false, status: 409, error: "La partida no está en juego." };
  const [houses, rows] = await Promise.all([loadHouses(db, game.id), loadAlliances(db, game.id)]);
  const other = houses.find((h) => h.id === to);
  if (!other) return { ok: false, status: 404, error: "Esa casa no está en la partida." };
  if (other.id === house.id) return { ok: false, status: 400, error: "Una casa no se alía consigo misma, por mucho que se quiera." };
  const now = gameNow(game);
  const blocked = signBlock(rows, houses, house.id, now, house.id) ?? signBlock(rows, houses, other.id, now, house.id);
  if (blocked) return { ok: false, status: 409, error: blocked };
  const [a, b] = pairOf(house.id, other.id);
  if (rows.some((r) => r.house_a === a && r.house_b === b && (OPEN as readonly string[]).includes(r.status))) {
    return { ok: false, status: 409, error: "Ya hay una propuesta o una alianza entre vuestras casas." };
  }
  if (name != null && !isAllianceName(name)) return { ok: false, status: 400, error: "El nombre lo pone Fray Abundio: pídele otro." };
  const pactName = name ?? freshAllianceName();
  const expires = game.current_resolution + ALLIANCE.proposalResolutions;
  let id: number;
  try {
    const row = await db
      .prepare(
        "INSERT INTO alliances (game_id, name, house_a, house_b, proposed_by, status, proposed_at, expires_resolution) VALUES (?, ?, ?, ?, ?, 'proposed', ?, ?) RETURNING id",
      )
      .bind(game.id, pactName, a, b, house.id, now.toISOString(), expires)
      .first<{ id: number }>();
    id = row!.id;
  } catch (err) {
    if (isUnique(err)) return { ok: false, status: 409, error: "Ya hay una propuesta o una alianza entre vuestras casas." };
    throw err;
  }
  await db
    .prepare("INSERT INTO event_log (game_id, type, visible_to, payload) VALUES (?, 'alianza_propuesta', ?, ?)")
    .bind(game.id, other.id, JSON.stringify({ id, name: pactName, from: house.id, to: other.id, expires }))
    .run();
  if (other.is_bot !== 1) {
    await notifyHouses(env, [other.id], {
      kind: "alianza",
      title: "Propuesta de alianza",
      body: notice("aviso.propuesta", id, { jugador: houseInSentence(house.name), pacto: pactName, n: ALLIANCE.proposalResolutions }),
      url: `/partida/${game.id}`,
      dedupe: `alianza:propuesta:${id}`,
    });
  }
  return { ok: true, id, name: pactName };
}

async function loadRow(db: D1Database, game: GameRow, id: number): Promise<AllianceRow | null> {
  return db.prepare("SELECT * FROM alliances WHERE id = ? AND game_id = ?").bind(id, game.id).first<AllianceRow>();
}

/**
 * Órdenes de `house` (de esta noche y de la cola) que van contra `other`:
 * mover o sitiar una casilla suya, o apoyar un ataque contra ella. Con la
 * alianza, el motor tomaría la marcha como una entrada, así que no salen.
 */
const AGAINST = `house_id = ? AND game_id = ? AND resolution_no > ? AND target_tile_id IN (SELECT id FROM tiles WHERE game_id = ? AND owner_house_id = ?)
  AND (kind IN ('move','siege') OR (kind = 'support' AND (supports_any = 1 OR supported_from_tile_id IS NOT NULL)))`;

export async function acceptAlliance(env: NotifyEnv, game: GameRow, house: HouseRow, id: number): Promise<AllianceResult> {
  const db = env.DB;
  if (game.status !== "active") return { ok: false, status: 409, error: "La partida no está en juego." };
  const row = await loadRow(db, game, id);
  if (!row || row.status !== "proposed") return { ok: false, status: 404, error: "Esa propuesta ya no está abierta." };
  if (row.house_a !== house.id && row.house_b !== house.id) return { ok: false, status: 403, error: "Esa propuesta no es para tu casa." };
  if (row.proposed_by === house.id) return { ok: false, status: 409, error: "No puedes aceptar tu propia propuesta." };
  const [houses, rows] = await Promise.all([loadHouses(db, game.id), loadAlliances(db, game.id)]);
  const now = gameNow(game);
  const other = row.proposed_by;
  const blocked = signBlock(rows, houses, house.id, now, house.id) ?? signBlock(rows, houses, other, now, house.id);
  if (blocked) return { ok: false, status: 409, error: blocked };

  const cur = game.current_resolution;
  const counts = await Promise.all(
    [
      [house.id, other],
      [other, house.id],
    ].map(async ([x, y]) => {
      const r = await db.prepare(`SELECT COUNT(*) AS n FROM orders WHERE ${AGAINST}`).bind(x, game.id, cur, game.id, y).first<{ n: number }>();
      return { house: x!, against: y!, n: r?.n ?? 0 };
    }),
  );
  const payload = { id, name: row.name, a: row.house_a, b: row.house_b, since: cur + 1 };
  const statements: D1PreparedStatement[] = [
    db.prepare("UPDATE alliances SET status = 'active', signed_resolution = ?, signed_at = ? WHERE id = ? AND status = 'proposed'").bind(
      cur + 1,
      now.toISOString(),
      id,
    ),
    // El registro público de pactos; las siguientes solo si se firmó ahora (changes() encadenado).
    db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) SELECT ?, 'alianza', NULL, ? WHERE changes() > 0").bind(
      game.id,
      JSON.stringify(payload),
    ),
    ...counts
      .filter((c) => c.n > 0)
      .map((c) =>
        db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) SELECT ?, 'ordenes_anuladas', ?, ? WHERE changes() > 0").bind(
          game.id,
          c.house,
          JSON.stringify({ id, name: row.name, house: c.house, against: c.against, orders: c.n }),
        ),
      ),
    // Borrar dos veces no hace daño: si la firma no fue esta, ya no queda nada contra el otro.
    ...counts.map((c) => db.prepare(`DELETE FROM orders WHERE ${AGAINST}`).bind(c.house, game.id, cur, game.id, c.against)),
  ];
  const res = await db.batch(statements);
  if ((res[0]?.meta.changes ?? 0) === 0) return { ok: false, status: 409, error: "Esa propuesta ya no está abierta." };

  const proposer = houses.find((h) => h.id === other);
  if (proposer && proposer.is_bot !== 1) {
    await notifyHouses(env, [other], {
      kind: "alianza",
      title: "Alianza firmada",
      body: notice("aviso.aceptada", id, { jugador: houseInSentence(house.name), pacto: row.name }),
      url: `/partida/${game.id}`,
      dedupe: `alianza:firmada:${id}`,
    });
  }
  for (const c of counts) {
    const h = houses.find((x) => x.id === c.house);
    if (c.n === 0 || !h || h.is_bot === 1) continue;
    await notifyHouses(env, [c.house], {
      kind: "alianza",
      title: "Órdenes anuladas",
      body: notice("aviso.ordenes_anuladas", id, { pacto: row.name, n: c.n, jugador: nameOf(houses, c.against) }),
      url: `/partida/${game.id}`,
      dedupe: `alianza:anuladas:${id}:${c.house}`,
    });
  }
  return { ok: true, id };
}

export async function declineAlliance(env: NotifyEnv, game: GameRow, house: HouseRow, id: number): Promise<AllianceResult> {
  const db = env.DB;
  const row = await loadRow(db, game, id);
  if (!row || row.status !== "proposed") return { ok: false, status: 404, error: "Esa propuesta ya no está abierta." };
  if ((row.house_a !== house.id && row.house_b !== house.id) || row.proposed_by === house.id) {
    return { ok: false, status: 403, error: "Esa propuesta no es para tu casa." };
  }
  const res = await db.batch([
    db.prepare("UPDATE alliances SET status = 'declined', closed_at = ? WHERE id = ? AND status = 'proposed'").bind(gameNow(game).toISOString(), id),
    db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) SELECT ?, 'alianza_rechazada', ?, ? WHERE changes() > 0").bind(
      game.id,
      row.proposed_by,
      JSON.stringify({ id, name: row.name, by: house.id }),
    ),
  ]);
  if ((res[0]?.meta.changes ?? 0) === 0) return { ok: false, status: 409, error: "Esa propuesta ya no está abierta." };
  return { ok: true, id };
}

export async function withdrawAlliance(env: NotifyEnv, game: GameRow, house: HouseRow, id: number): Promise<AllianceResult> {
  const db = env.DB;
  const row = await loadRow(db, game, id);
  if (!row || row.status !== "proposed") return { ok: false, status: 404, error: "Esa propuesta ya no está abierta." };
  if (row.proposed_by !== house.id) return { ok: false, status: 403, error: "Solo quien propone puede retirar la propuesta." };
  const res = await db
    .prepare("UPDATE alliances SET status = 'withdrawn', closed_at = ? WHERE id = ? AND status = 'proposed'")
    .bind(gameNow(game).toISOString(), id)
    .run();
  if ((res.meta.changes ?? 0) === 0) return { ok: false, status: 409, error: "Esa propuesta ya no está abierta." };
  return { ok: true, id };
}

/**
 * Romper: la alianza pasa a aviso. La noche de hoy cuenta como la primera de
 * las `ALLIANCE.noticeResolutions`; al terminar la última deja de existir.
 */
export async function breakAlliance(env: NotifyEnv, game: GameRow, house: HouseRow, id: number): Promise<AllianceResult & { endsAt?: number }> {
  const db = env.DB;
  if (game.status !== "active") return { ok: false, status: 409, error: "La partida no está en juego." };
  const row = await loadRow(db, game, id);
  if (!row || row.status !== "active") return { ok: false, status: 404, error: "Esa alianza no está en vigor." };
  if (row.house_a !== house.id && row.house_b !== house.id) return { ok: false, status: 403, error: "Esa alianza no es de tu casa." };
  const endsAt = noticeEnd(game.current_resolution + 1);
  const other = row.house_a === house.id ? row.house_b : row.house_a;
  const res = await db.batch([
    db.prepare("UPDATE alliances SET status = 'breaking', broken_by = ?, broken_at = ?, ends_resolution = ? WHERE id = ? AND status = 'active'").bind(
      house.id,
      gameNow(game).toISOString(),
      endsAt,
      id,
    ),
    db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) SELECT ?, 'alianza_rota', NULL, ? WHERE changes() > 0").bind(
      game.id,
      JSON.stringify({ id, name: row.name, a: row.house_a, b: row.house_b, by: house.id, endsAt }),
    ),
  ]);
  if ((res[0]?.meta.changes ?? 0) === 0) return { ok: false, status: 409, error: "Esa alianza no está en vigor." };
  const houses = await loadHouses(db, game.id);
  if (houses.find((h) => h.id === other)?.is_bot !== 1) {
    const last = totalResolutions(game.weeks, rhythmOf(game).days);
    await notifyHouses(env, [other], {
      kind: "alianza",
      title: "Alianza rota",
      body: notice("aviso.rota", id, {
        jugador: houseInSentence(house.name),
        pacto: row.name,
        n: ALLIANCE.noticeResolutions,
        "día": endsAt <= last ? resolutionDay(game, endsAt) : "final de la partida",
      }),
      url: `/partida/${game.id}`,
      dedupe: `alianza:rota:${id}`,
    });
  }
  return { ok: true, id, endsAt };
}

/**
 * Tras la resolución `n`: las alianzas cuyo aviso termina dejan de existir y
 * las propuestas sin contestar caducan. Va en el lote de la resolución.
 */
export function allianceNightStatements(db: D1Database, game: GameRow, n: number, rows: AllianceRow[], at: string): D1PreparedStatement[] {
  const out: D1PreparedStatement[] = [];
  for (const r of rows) {
    if (r.status === "breaking" && r.ends_resolution != null && r.ends_resolution <= n) {
      out.push(
        db.prepare("UPDATE alliances SET status = 'ended', closed_at = ? WHERE id = ? AND status = 'breaking'").bind(at, r.id),
        db.prepare(
          "INSERT INTO event_log (game_id, resolution_id, type, visible_to, payload) VALUES (?, (SELECT id FROM resolutions WHERE game_id = ? AND number = ?), 'alianza_fin', NULL, ?)",
        ).bind(game.id, game.id, n, JSON.stringify({ id: r.id, name: r.name, a: r.house_a, b: r.house_b })),
      );
    }
    if (r.status === "proposed" && r.expires_resolution <= n) {
      out.push(db.prepare("UPDATE alliances SET status = 'expired', closed_at = ? WHERE id = ? AND status = 'proposed'").bind(at, r.id));
    }
  }
  return out;
}

/** Lo que ve una casa de las alianzas: el registro público y sus propuestas. */
export function alliancesView(rows: AllianceRow[], house: HouseId, now: Date) {
  const until = cooldownEnd(rows, house, now);
  return {
    activas: ALLIANCE.enabled,
    nochesDeAviso: ALLIANCE.noticeResolutions,
    resolucionesPropuesta: ALLIANCE.proposalResolutions,
    diasSinFirmar: ALLIANCE.cooldownDays,
    umbralTropas: ALLIANCE.warnTroops,
    maximo: ALLIANCE.maxPerHouse,
    // Si rompiste hace poco, hasta cuándo no puedes firmar.
    sinFirmarHasta: until ? until.toISOString() : null,
    // El registro de pactos es público: alianzas en vigor y en aviso de todo el reino.
    lista: rows
      .filter((r) => r.status === "active" || r.status === "breaking")
      .map((r) => ({
        id: r.id,
        nombre: r.name,
        casas: [r.house_a, r.house_b],
        estado: r.status === "active" ? "activa" : "aviso",
        desde: r.signed_resolution,
        terminaTras: r.status === "breaking" ? r.ends_resolution : null,
        rotaPor: r.broken_by,
      })),
    // Las propuestas solo las ven sus dos casas.
    propuestas: rows
      .filter((r) => r.status === "proposed" && (r.house_a === house || r.house_b === house))
      .map((r) => ({
        id: r.id,
        nombre: r.name,
        de: r.proposed_by,
        para: r.proposed_by === r.house_a ? r.house_b : r.house_a,
        caducaTras: r.expires_resolution,
      })),
  };
}
