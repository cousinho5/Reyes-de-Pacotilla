// Bloque 11: cuentas de la pestaña Reino (clasificación, flechas y gráfica).
// Solo usan el Prestigio total de cada casa, que es público.

import type { EventView, GameState, HouseInfo } from "./api";

export interface Standing {
  house: HouseInfo;
  /** Puesto, desde 1. */
  place: number;
  total: number;
  /** Puestos ganados (positivo) o perdidos desde la noche anterior; null si no hay foto. */
  move: number | null;
  /** Prestigio que le falta para el primero (0 el primero). */
  behind: number;
}

/** Orden por Prestigio (el final, si la partida acabó) y, a igualdad, por id, como el servidor. */
function order(totals: Map<number, number>, ids: number[]): number[] {
  return [...ids].sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0) || a - b);
}

export function standings(state: GameState): Standing[] {
  const final = state.partida.final;
  const totals = new Map(
    state.casas.map((h) => [h.id, final?.ranking.find((r) => r.house === h.id)?.total ?? h.prestigio?.total ?? 0]),
  );
  const ids = final ? final.ranking.map((r) => r.house).filter((id) => totals.has(id)) : order(totals, [...totals.keys()]);
  for (const h of state.casas) if (!ids.includes(h.id)) ids.push(h.id);
  const before = state.historia?.anterior?.totales;
  const prevOrder = before && !final ? order(new Map(Object.entries(before).map(([k, v]) => [Number(k), v])), ids) : null;
  const top = totals.get(ids[0]!) ?? 0;
  return ids.map((id, i) => {
    const was = prevOrder ? prevOrder.indexOf(id) : -1;
    return {
      house: state.casas.find((h) => h.id === id)!,
      place: i + 1,
      total: totals.get(id) ?? 0,
      move: was >= 0 ? was - i : null,
      behind: top - (totals.get(id) ?? 0),
    };
  });
}

/** La frase bajo el podio para tu casa: cuánto te falta (o te sobra). */
export function podiumLine(rows: Standing[], me: number): string | null {
  const mine = rows.find((r) => r.house.id === me);
  if (!mine || rows.length < 2) return null;
  const n = (x: number) => `${x} de Prestigio`;
  if (mine.place === 1) {
    const gap = mine.total - rows[1]!.total;
    return gap > 0 ? `Vas primero, con ${n(gap)} de ventaja.` : "Vas primero, pero empatado. Fray Abundio aún no se decide.";
  }
  if (mine.place <= 3) return mine.behind > 0 ? `Estás en el podio, a ${n(mine.behind)} del primero.` : "Estás en el podio, empatado con el primero.";
  const third = rows[2]!;
  const gap = third.total - mine.total;
  return gap > 0 ? `Estás a ${n(gap)} del podio.` : "Estás empatado con el tercero: a un empujón del podio.";
}

/** Cuánto Prestigio de distancia cuenta como «pisar los talones». */
export const CHASE_GAP = 5;

/** «Te pisan los talones: X, a N»: la casa justo detrás de la tuya, si está cerca. */
export function chaserLine(rows: Standing[], me: number): string | null {
  const i = rows.findIndex((r) => r.house.id === me);
  const next = i >= 0 ? rows[i + 1] : undefined;
  if (!next) return null;
  const gap = rows[i]!.total - next.total;
  if (gap > CHASE_GAP) return null;
  return gap === 0 ? `Te pisan los talones: ${next.house.nombre}, empatado contigo.` : `Te pisan los talones: ${next.house.nombre}, a ${gap}.`;
}

export interface RacePoint {
  /** Etiqueta del punto: «S1», «S2»… y «Hoy». */
  label: string;
  totals: Record<number, number>;
}

/** Puntos de la gráfica: una foto por domingo y, mientras se juega, el Prestigio de ahora. */
export function racePoints(state: GameState): RacePoint[] {
  const points: RacePoint[] = (state.historia?.semanas ?? []).map((s) => ({ label: `S${s.semana}`, totals: s.totales }));
  const live = Object.fromEntries(state.casas.map((h) => [h.id, h.prestigio?.total ?? 0]));
  if (state.partida.estado === "finished") {
    const final = state.historia?.final ?? Object.fromEntries((state.partida.final?.ranking ?? []).map((r) => [r.house, r.total]));
    if (Object.keys(final).length) points.push({ label: "Final", totals: final });
  } else if (state.partida.resolucionActual > 0) {
    points.push({ label: "Hoy", totals: live });
  }
  return points;
}

/** Filtros de la crónica: «Todo», «Solo lo mío» y «Batallas». */
export type ChronicleFilter = "todo" | "mio" | "batallas";

export const BATTLE_TYPES = new Set(["combate", "rebote", "choque_frontal", "repliegue", "asedio", "asedio_roto", "capitan_preso", "expulsion"]);

/** Campos de un suceso que nombran casas (nunca casillas). */
const HOUSE_KEYS = ["house", "winner", "by", "previousOwner", "guest", "host", "a", "b", "captor", "de", "para"];
const HOUSE_LISTS = ["houses", "winners", "aside", "casas"];

/** Si el suceso toca a esta casa: lo que solo ve ella o donde sale nombrada. */
export function involves(e: EventView, house: number): boolean {
  if (e.privado) return true;
  const d = e.datos as Record<string, unknown>;
  if (HOUSE_KEYS.some((k) => d[k] === house)) return true;
  if (HOUSE_LISTS.some((k) => Array.isArray(d[k]) && (d[k] as unknown[]).includes(house))) return true;
  const sides = d.sides;
  return Array.isArray(sides) && sides.some((s) => s && typeof s === "object" && ((s as { house?: unknown }).house === house || ((s as { joint?: unknown[] }).joint ?? []).includes(house)));
}

export function chronicleFilter(events: EventView[], filter: ChronicleFilter, house: number): EventView[] {
  if (filter === "mio") return events.filter((e) => involves(e, house));
  if (filter === "batallas") return events.filter((e) => BATTLE_TYPES.has(e.tipo));
  return events;
}

/** Sucesos agrupados por noche, la más reciente primero (sin noche, al final). */
export function byNight<E extends Pick<EventView, "resolucion">>(events: E[]): { night: number | null; events: E[] }[] {
  const groups = new Map<number | null, E[]>();
  for (const e of events) groups.set(e.resolucion, [...(groups.get(e.resolucion) ?? []), e]);
  return [...groups.entries()].sort(([a], [b]) => (b ?? -1) - (a ?? -1)).map(([night, events]) => ({ night, events }));
}
