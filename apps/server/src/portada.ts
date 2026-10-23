// Bloque 7: lo que la portada cuenta de cada partida en `/api/yo`. La carga lee
// filas amplias y `homeSummary` (pura, con sus pruebas) se queda solo con lo que
// esa casa puede ver: sus combates, las ofertas para ella, el Prestigio (público)
// y de quién es cada casilla (también público). Nada de tropas ni recursos.

import { resolutionInfo, resolutionInstant, totalResolutions } from "@reyes/engine";
import { clockOf } from "./jobs";
import { combatHouses } from "./reino";
import { ordersOpen } from "./scheduler";
import { gameNow, rhythmOf, type GameRow } from "./state";

export type CombatResult = "resistio" | "perdida" | "conquista" | "fallo";

export interface HomeSummary {
  /** La noche que se está preparando (la próxima resolución) y cuántas hay. */
  noche: number | null;
  totalNoches: number;
  semana: number;
  cierre: string | null;
  ordenesAbiertas: boolean;
  /** Con las órdenes abiertas, si esta casa aún no ha dado ninguna para esa noche. */
  faltanOrdenes: boolean;
  /** Los combates de la última noche en los que estuvo esta casa. */
  ataques: { casilla: string; resultado: CombatResult }[];
  /** El último boletín publicado (el cliente sabe si ya lo leyó). */
  boletin: { semana: number; edicion: "domingo" | "miercoles" } | null;
  /** Ofertas abiertas que esta casa puede aceptar. */
  ofertas: number;
  /** Prestigio de cada casa tras la última noche, de primero a último. */
  clasificacion: { casa: number; total: number }[];
  /** Puesto de esta casa ahora y tras la noche anterior (1 = primero). */
  puesto: number | null;
  puestoAntes: number | null;
  /** De quién es cada casilla: x, y, casa (0 = nadie) y 1 si es un castillo. */
  mapa: { columnas: number; filas: number; casillas: [number, number, number, number][] } | null;
  /** Al acabar: quién ganó, tu puesto y cuándo acabó. */
  final: { ganador: number | null; puesto: number | null; fecha: string | null } | null;
  /** Solo en las pruebas: la hora simulada de la partida, para que el cliente ajuste la cuenta atrás. */
  ahora?: string;
}

export interface HomeInput {
  house: number;
  status: GameRow["status"];
  /** Última resolución hecha. */
  current: number;
  total: number;
  days: number[];
  ordersOpen: boolean;
  closeAt: string | null;
  /** Órdenes de esta casa para la próxima noche. */
  orders: number;
  /** Combates públicos de la última noche (de todas las casas). */
  combats: Record<string, unknown>[];
  tileNames: Map<number, string>;
  bulletin: { week: number; edition: "domingo" | "miercoles" } | null;
  /** Ofertas abiertas de la partida. */
  offers: { from_house_id: number; to_house_id: number | null }[];
  /** Fotos de Prestigio de la última noche y de la anterior. */
  snapshots: { house_id: number; resolution_no: number; total: number }[];
  map: { cols: number; rows: number; tiles: { x: number; y: number; type: string; owner: number | null }[] } | null;
  final: { winner: number | null; ranking: { house: number; total: number }[]; at?: string } | null;
}

function ranking(rows: HomeInput["snapshots"], resolution: number) {
  return rows
    .filter((r) => r.resolution_no === resolution)
    .sort((a, b) => b.total - a.total || a.house_id - b.house_id)
    .map((r) => ({ casa: r.house_id, total: r.total }));
}

/**
 * Cómo le fue a esta casa en un combate. `allies` son, si la casilla aguanta,
 * quienes la defendían con el dueño y, si cae, quienes entraron con el ganador.
 */
export function combatResult(c: Record<string, unknown>, house: number): CombatResult {
  const along = Array.isArray(c.allies) && c.allies.includes(house);
  if (c.conquered) return c.previousOwner === house ? "perdida" : c.winner === house || along ? "conquista" : "fallo";
  return c.previousOwner === house || along ? "resistio" : "fallo";
}

export function homeSummary(i: HomeInput): HomeSummary {
  const next = i.current + 1;
  const active = i.status === "active";
  const now = ranking(i.snapshots, i.current);
  const before = ranking(i.snapshots, i.current - 1);
  const place = (list: { casa: number }[]) => {
    const at = list.findIndex((r) => r.casa === i.house);
    return at < 0 ? null : at + 1;
  };
  const finalPlace = i.final ? i.final.ranking.findIndex((r) => r.house === i.house) : -1;
  return {
    noche: active && next <= i.total ? next : null,
    totalNoches: i.total,
    semana: Math.max(1, resolutionInfo(Math.min(Math.max(next, 1), i.total), i.days).week),
    cierre: active ? i.closeAt : null,
    ordenesAbiertas: active && i.ordersOpen,
    faltanOrdenes: active && i.ordersOpen && i.orders === 0,
    ataques: i.combats
      .filter((c) => combatHouses(c).has(i.house))
      .map((c) => ({ casilla: i.tileNames.get(c.tile as number) ?? "una casilla", resultado: combatResult(c, i.house) })),
    boletin: i.bulletin ? { semana: i.bulletin.week, edicion: i.bulletin.edition } : null,
    ofertas: active
      ? i.offers.filter((o) => o.from_house_id !== i.house && (o.to_house_id == null || o.to_house_id === i.house)).length
      : 0,
    clasificacion: i.final ? i.final.ranking.map((r) => ({ casa: r.house, total: r.total })) : now,
    puesto: i.final ? (finalPlace < 0 ? null : finalPlace + 1) : place(now),
    puestoAntes: i.final ? null : place(before),
    mapa: i.map
      ? {
          columnas: i.map.cols,
          filas: i.map.rows,
          casillas: i.map.tiles.map((t) => [t.x, t.y, t.owner ?? 0, t.type === "castillo" ? 1 : 0]),
        }
      : null,
    final: i.final ? { ganador: i.final.winner, puesto: finalPlace < 0 ? null : finalPlace + 1, fecha: i.final.at ?? null } : null,
  };
}

/** Carga lo de una partida empezada para `homeSummary`. */
export async function loadHomeSummary(db: D1Database, game: GameRow, house: number): Promise<HomeSummary> {
  const days = rhythmOf(game).days;
  const total = totalResolutions(game.weeks, days);
  const clock = clockOf(game);
  const now = gameNow(game);
  const next = game.current_resolution + 1;
  const [tiles, orders, combats, bulletin, offers, snapshots, end] = await Promise.all([
    db
      .prepare("SELECT id, x, y, type, name, owner_house_id FROM tiles WHERE game_id = ? ORDER BY y, x")
      .bind(game.id)
      .all<{ id: number; x: number; y: number; type: string; name: string; owner_house_id: number | null }>(),
    db
      .prepare("SELECT COUNT(*) AS n FROM orders WHERE house_id = ? AND resolution_no = ?")
      .bind(house, next)
      .first<{ n: number }>(),
    db
      .prepare(
        `SELECT e.payload FROM event_log e JOIN resolutions r ON r.id = e.resolution_id
         WHERE e.game_id = ? AND e.type = 'combate' AND e.visible_to IS NULL AND r.number = ? ORDER BY e.id`,
      )
      .bind(game.id, game.current_resolution)
      .all<{ payload: string }>(),
    db
      .prepare("SELECT week, edition FROM bulletins WHERE game_id = ? ORDER BY published_at DESC, week DESC LIMIT 1")
      .bind(game.id)
      .first<{ week: number; edition: "domingo" | "miercoles" }>(),
    db
      .prepare("SELECT from_house_id, to_house_id FROM offers WHERE game_id = ? AND status = 'open' AND (to_house_id IS NULL OR to_house_id = ?)")
      .bind(game.id, house)
      .all<{ from_house_id: number; to_house_id: number | null }>(),
    db
      .prepare("SELECT house_id, resolution_no, total FROM prestige_snapshots WHERE game_id = ? AND resolution_no IN (?, ?)")
      .bind(game.id, game.current_resolution, game.current_resolution - 1)
      .all<{ house_id: number; resolution_no: number; total: number }>(),
    game.status === "finished"
      ? db.prepare("SELECT payload, at FROM event_log WHERE game_id = ? AND type = 'fin' ORDER BY id DESC LIMIT 1").bind(game.id).first<{ payload: string; at: string }>()
      : Promise.resolve(null),
  ]);
  const summary = homeSummary({
    house,
    status: game.status,
    current: game.current_resolution,
    total,
    days,
    ordersOpen: !!clock && game.status === "active" && ordersOpen(now, clock),
    closeAt: clock && next <= total ? resolutionInstant(clock.startDate, next, clock.closeTime, clock.timezone, clock.days).toISOString() : null,
    orders: orders?.n ?? 0,
    combats: combats.results.map((r) => JSON.parse(r.payload) as Record<string, unknown>),
    tileNames: new Map(tiles.results.map((t) => [t.id, t.name])),
    bulletin: bulletin ?? null,
    offers: offers.results,
    snapshots: snapshots.results,
    map:
      game.map_cols && game.map_rows
        ? { cols: game.map_cols, rows: game.map_rows, tiles: tiles.results.map((t) => ({ x: t.x, y: t.y, type: t.type, owner: t.owner_house_id })) }
        : null,
    final: end ? { ...(JSON.parse(end.payload) as { winner: number | null; ranking: { house: number; total: number }[] }), at: end.at } : null,
  });
  return game.is_test === 1 && game.sim_now ? { ...summary, ahora: now.toISOString() } : summary;
}
