// Gran Subasta y cartas de la Corona en D1.
// - El martes (tarea "anuncio") se guardan los tres lotes de la semana.
// - Hasta el cierre del miércoles cada casa puja a ciegas en Oro (una puja por lote).
// - En la resolución del miércoles se adjudican los lotes, antes de la campaña,
//   en el mismo lote atómico que la resolución.
// - Las cartas se usan desde el castillo; Tregua y Tambores actúan en la
//   resolución siguiente y Espía amplía la vista hasta entonces.

import {
  CARDS,
  EVENTS,
  auctionLots,
  doubleLot,
  eventDoublesAuction,
  eventLine,
  eventOfWeek,
  eventText,
  checkCard,
  lotLabel,
  resolveAuction,
  resolutionInfo,
  totalResolutions,
  withRhythm,
  type Bid,
  type CardContext,
  type CardEffect,
  type CardKey,
  type CardParams,
  type HouseId,
  type Lot,
  type Resource,
} from "@reyes/engine";
import { randomCode } from "./auth";
import { notifyHouses, type NotifyEnv } from "./notify";
import { gameNow, loadHouses, rhythmOf, type GameRow, type HouseRow } from "./state";

export interface LotRow {
  id: number;
  week: number;
  slot: number;
  kind: "resources" | "card";
  payload: string;
  winner_house_id: number | null;
  price: number | null;
}

export interface CardRow {
  id: number;
  house_id: number;
  card_key: CardKey;
  used_at: string | null;
  used_params: string | null;
}

export function lotOf(row: LotRow): Lot {
  const data = JSON.parse(row.payload) as Record<string, unknown>;
  return row.kind === "card"
    ? { slot: row.slot, kind: "card", card: data.card as CardKey, count: (data.count as number | undefined) ?? 1 }
    : { slot: row.slot, kind: "resources", resources: data as Partial<Record<Resource, number>> };
}

/** Semana de la subasta abierta: la de la próxima resolución si es miércoles. */
export function openAuctionWeek(game: GameRow): number | null {
  const next = game.current_resolution + 1;
  const { days } = rhythmOf(game);
  if (next > totalResolutions(game.weeks, days)) return null;
  const info = resolutionInfo(next, days);
  return info.kind === "miercoles" ? info.week : null;
}

/** Tarea del martes: el evento de la semana y los lotes de la Gran Subasta. */
export async function announceAuction(env: NotifyEnv, game: GameRow, week: number): Promise<void> {
  const db = env.DB;
  const event = eventOfWeek(game.seed, week);
  const lots = auctionLots(game.seed, week).map((l) => (eventDoublesAuction(event) ? doubleLot(l) : l));
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO game_events (game_id, week, event_key, params, announced_at) VALUES (?, ?, ?, ?, ?)").bind(
      game.id,
      week,
      event.key,
      JSON.stringify(event),
      gameNow(game).toISOString(),
    ),
    db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) VALUES (?, 'anuncio_evento', NULL, ?)").bind(
      game.id,
      JSON.stringify({ week, key: event.key, nombre: EVENTS[event.key].nombre, texto: eventText(event), linea: eventLine(game.seed, week, event) }),
    ),
    db.prepare("INSERT INTO job_runs (game_id, job_key) VALUES (?, ?)").bind(game.id, `anuncio:${week}`),
    ...lots.map((l) =>
      db.prepare("INSERT OR IGNORE INTO auction_lots (game_id, week, slot, kind, payload) VALUES (?, ?, ?, ?, ?)").bind(
        game.id,
        week,
        l.slot,
        l.kind,
        JSON.stringify(l.kind === "card" ? { card: l.card, count: l.count ?? 1 } : l.resources),
      ),
    ),
    db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) VALUES (?, 'anuncio_subasta', NULL, ?)").bind(
      game.id,
      JSON.stringify({ week, lots: lots.map(lotLabel) }),
    ),
  ]);
  const houses = await loadHouses(db, game.id);
  await notifyHouses(env, houses.map((h) => h.id), {
    kind: "subasta",
    title: "Se enciende la vela de la Gran Subasta",
    body: `Lotes: ${lots.map(lotLabel).join(", ")}. Pujas hasta mañana a las 21:00. Evento de la semana: ${EVENTS[event.key].nombre}. ${eventText(event)}`,
    url: `/partida/${game.id}`,
    dedupe: `subasta:${game.id}:${week}`,
  });
}

/**
 * Sentencias que adjudican los lotes de la semana. Van dentro del lote atómico
 * de la resolución del miércoles. Cada adjudicación comprueba en la propia base
 * que el ganador aún tiene el Oro; si no, el lote queda sin adjudicar.
 */
export async function auctionStatements(
  db: D1Database,
  game: GameRow,
  week: number,
  houses: HouseRow[],
): Promise<{ statements: D1PreparedStatement[]; events: { type: string; visibleTo: number | null; payload: unknown }[] }> {
  const { results: rows } = await db
    .prepare("SELECT * FROM auction_lots WHERE game_id = ? AND week = ? ORDER BY slot")
    .bind(game.id, week)
    .all<LotRow>();
  if (rows.length === 0) return { statements: [], events: [] };
  const { results: bidRows } = await db
    .prepare(
      `SELECT b.lot_id, b.house_id, b.amount, b.placed_at FROM bids b JOIN auction_lots l ON l.id = b.lot_id
       WHERE l.game_id = ? AND l.week = ?`,
    )
    .bind(game.id, week)
    .all<{ lot_id: number; house_id: number; amount: number; placed_at: string }>();
  const slotOf = new Map(rows.map((r) => [r.id, r.slot]));
  const bids: Bid[] = bidRows.map((b) => ({ slot: slotOf.get(b.lot_id)!, house: b.house_id, amount: b.amount, placedAt: b.placed_at }));
  const results = resolveAuction(rows.map(lotOf), bids, new Map(houses.map((h) => [h.id, h.oro])));

  const statements: D1PreparedStatement[] = [];
  const events: { type: string; visibleTo: number | null; payload: unknown }[] = [];
  for (const r of results) {
    const row = rows.find((x) => x.slot === r.slot)!;
    const lot = lotOf(row);
    if (r.winner == null) {
      events.push({ type: "subasta", visibleTo: null, payload: { slot: r.slot, lot: lotLabel(lot), winner: null, price: 0 } });
      continue;
    }
    const won = `(SELECT winner_house_id FROM auction_lots WHERE id = ${row.id}) = ${r.winner}`;
    statements.push(
      db.prepare(
        "UPDATE auction_lots SET winner_house_id = ?, price = ? WHERE id = ? AND winner_house_id IS NULL AND (SELECT oro FROM houses WHERE id = ?) >= ?",
      ).bind(r.winner, r.price, row.id, r.winner, r.price),
      db.prepare(`UPDATE houses SET oro = oro - ? WHERE id = ? AND ${won}`).bind(r.price, r.winner),
      db.prepare(
        `INSERT INTO achievements (game_id, house_id, achievement_key) SELECT ?, ?, 'ganador_subasta' WHERE ${won}
         ON CONFLICT (game_id, house_id, achievement_key) DO UPDATE SET times = MIN(3, times + 1)`,
      ).bind(game.id, r.winner),
    );
    if (lot.kind === "card") {
      for (let k = 0; k < (lot.count ?? 1); k++) {
        statements.push(
          db.prepare(`INSERT INTO cards (game_id, house_id, card_key, acquired_at) SELECT ?, ?, ?, ? WHERE ${won}`).bind(
            game.id,
            r.winner,
            lot.card,
            gameNow(game).toISOString(),
          ),
        );
      }
    } else {
      const g = lot.resources;
      statements.push(
        db.prepare(
          `UPDATE houses SET pan = pan + ?, madera = madera + ?, piedra = piedra + ?, hierro = hierro + ?, oro = oro + ? WHERE id = ? AND ${won}`,
        ).bind(g.pan ?? 0, g.madera ?? 0, g.piedra ?? 0, g.hierro ?? 0, g.oro ?? 0, r.winner),
      );
    }
    events.push({ type: "subasta", visibleTo: null, payload: { slot: r.slot, lot: lotLabel(lot), winner: r.winner, price: r.price } });
  }
  return { statements, events };
}

/** Efectos de cartas que actúan en la resolución `n`: casillas en tregua y tambores. */
export async function cardsForResolution(
  db: D1Database,
  gameId: number,
  n: number,
): Promise<{ truceTiles: number[]; attackBonus: Partial<Record<HouseId, number>> }> {
  const { results } = await db
    .prepare("SELECT house_id, card_key, used_params FROM cards WHERE game_id = ? AND used_at IS NOT NULL AND card_key IN ('tregua','tambores')")
    .bind(gameId)
    .all<{ house_id: number; card_key: CardKey; used_params: string }>();
  const truceTiles: number[] = [];
  const attackBonus: Partial<Record<HouseId, number>> = {};
  for (const c of results) {
    const e = (JSON.parse(c.used_params) as { effect?: CardEffect }).effect ?? {};
    if (e.truce && e.truce.resolution === n) truceTiles.push(e.truce.tile);
    if (e.drums && e.drums.resolution === n) attackBonus[c.house_id] = (attackBonus[c.house_id] ?? 0) + e.drums.bonus;
  }
  return { truceTiles, attackBonus };
}

/** Casas que una casa vigila con Espía (hasta la próxima resolución incluida). */
export async function spiedHouses(db: D1Database, game: GameRow, houseId: number): Promise<HouseId[]> {
  const { results } = await db
    .prepare("SELECT used_params FROM cards WHERE game_id = ? AND house_id = ? AND card_key = 'espia' AND used_at IS NOT NULL")
    .bind(game.id, houseId)
    .all<{ used_params: string }>();
  const out: HouseId[] = [];
  for (const r of results) {
    const spy = (JSON.parse(r.used_params) as { effect?: CardEffect }).effect?.spy;
    if (spy && spy.until > game.current_resolution) out.push(spy.house);
  }
  return out;
}

/**
 * Usar una carta: valida con el motor y prepara las sentencias. La primera
 * marca la carta como usada solo si aún no lo estaba; las demás dependen de ella.
 */
export function useCardStatements(
  db: D1Database,
  game: GameRow,
  house: HouseRow,
  card: CardRow,
  params: CardParams,
  ctx: CardContext,
): { ok: true; statements: D1PreparedStatement[]; effect: CardEffect } | { ok: false; error: string } {
  const check = withRhythm(rhythmOf(game), () => checkCard(card.card_key, params, ctx));
  if (!check.ok) return check;
  const e = check.effect;
  const now = gameNow(game).toISOString();
  // Como en la aceptación de ofertas: un token único dice si este uso es el que quedó guardado.
  const used = JSON.stringify({ params, effect: e, token: randomCode(16) });
  const mine = "(SELECT used_params FROM cards WHERE id = ?) = ?";
  const st: D1PreparedStatement[] = [
    db.prepare("UPDATE cards SET used_at = ?, used_params = ? WHERE id = ? AND used_at IS NULL").bind(now, used, card.id),
  ];
  if (e.resources) {
    const r = e.resources;
    st.push(
      db.prepare(
        `UPDATE houses SET pan = pan + ?, madera = madera + ?, piedra = piedra + ?, hierro = hierro + ?, oro = oro + ? WHERE id = ? AND ${mine}`,
      ).bind(r.pan ?? 0, r.madera ?? 0, r.piedra ?? 0, r.hierro ?? 0, r.oro ?? 0, house.id, card.id, used),
    );
  }
  if (e.castleTroops) {
    st.push(db.prepare(`UPDATE tiles SET troops = troops + ? WHERE game_id = ? AND castle_of = ? AND ${mine}`).bind(e.castleTroops, game.id, house.id, card.id, used));
  }
  if (e.fortify) {
    st.push(
      db.prepare(`UPDATE tiles SET fortified_until = ? WHERE id = ? AND owner_house_id = ? AND ${mine}`).bind(e.fortify.until, e.fortify.tile, house.id, card.id, used),
    );
  }
  if (e.upgrade) {
    st.push(
      db.prepare(`UPDATE buildings SET level = level + 1 WHERE house_id = ? AND kind = ? AND level = ? AND ${mine}`).bind(
        house.id,
        e.upgrade,
        ctx.buildings[e.upgrade],
        card.id,
        used,
      ),
    );
  }
  st.push(
    db.prepare(`INSERT INTO event_log (game_id, type, visible_to, payload) SELECT ?, 'carta', ?, ? WHERE ${mine}`).bind(
      game.id,
      house.id,
      JSON.stringify({ house: house.id, card: card.card_key, params }),
      card.id,
      used,
    ),
  );
  return { ok: true, statements: st, effect: e };
}

/** Lo que ve una casa de la subasta de la semana (sin las pujas de las demás). */
export async function auctionView(db: D1Database, game: GameRow, houseId: number) {
  const week = openAuctionWeek(game) ?? resolutionInfo(Math.max(1, game.current_resolution), rhythmOf(game).days).week;
  const { results: rows } = await db
    .prepare("SELECT * FROM auction_lots WHERE game_id = ? AND week = ? ORDER BY slot")
    .bind(game.id, week)
    .all<LotRow>();
  if (rows.length === 0) return null;
  const { results: mine } = await db
    .prepare(`SELECT b.lot_id, b.amount FROM bids b JOIN auction_lots l ON l.id = b.lot_id WHERE l.game_id = ? AND l.week = ? AND b.house_id = ?`)
    .bind(game.id, week, houseId)
    .all<{ lot_id: number; amount: number }>();
  // Bloque 10: cuántos sobres (pujas) tiene cada lote, sin cantidades ni de quién.
  const { results: counts } = await db
    .prepare(`SELECT b.lot_id, COUNT(*) AS n FROM bids b JOIN auction_lots l ON l.id = b.lot_id WHERE l.game_id = ? AND l.week = ? GROUP BY b.lot_id`)
    .bind(game.id, week)
    .all<{ lot_id: number; n: number }>();
  const announced = await db
    .prepare("SELECT announced_at FROM game_events WHERE game_id = ? AND week = ?")
    .bind(game.id, week)
    .first<{ announced_at: string }>();
  const open = openAuctionWeek(game) === week;
  return {
    semana: week,
    abierta: open,
    /** Cuándo se anunciaron los lotes: la vela empieza a arder entonces. */
    abre: announced?.announced_at ?? null,
    lotes: rows.map((r) => {
      const lot = lotOf(r);
      return {
        lote: r.slot,
        nombre: lotLabel(lot),
        carta: lot.kind === "card" ? { clave: lot.card, nombre: CARDS[lot.card].nombre, texto: CARDS[lot.card].texto } : null,
        recursos: lot.kind === "resources" ? lot.resources : null,
        miPuja: mine.find((m) => m.lot_id === r.id)?.amount ?? null,
        sobres: counts.find((x) => x.lot_id === r.id)?.n ?? 0,
        ganador: open ? null : r.winner_house_id,
        precio: open ? null : r.price,
      };
    }),
  };
}

/** Cartas sin usar de una casa. */
export async function handView(db: D1Database, gameId: number, houseId: number) {
  const { results } = await db
    .prepare("SELECT id, card_key FROM cards WHERE game_id = ? AND house_id = ? AND used_at IS NULL ORDER BY id")
    .bind(gameId, houseId)
    .all<{ id: number; card_key: CardKey }>();
  return results.map((c) => ({ id: c.id, clave: c.card_key, nombre: CARDS[c.card_key].nombre, texto: CARDS[c.card_key].texto, objetivo: CARDS[c.card_key].target }));
}
