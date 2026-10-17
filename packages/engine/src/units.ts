// Tipos de tropa (diseño v3, fase 3): Mesnada, Jinetes y Catapultas. Cada
// casilla guarda cuántas tropas tiene en total (`troops`) y, de ellas,
// cuántas son Jinetes y Catapultas; el resto es Mesnada. Los valores, en
// rules.ts (UNITS).

import { UNITS } from "./rules";
import type { Tile, TileType } from "./types";

export const UNIT_KINDS = ["mesnada", "jinetes", "catapultas"] as const;
export type UnitKind = (typeof UNIT_KINDS)[number];
export type Units = Record<UnitKind, number>;

/** Composición de un grupo con `troops`, `jinetes` y `catapultas`. */
export function unitsOf(g: { troops: number; jinetes?: number; catapultas?: number }): Units {
  const jinetes = Math.max(0, Math.min(g.troops, g.jinetes ?? 0));
  const catapultas = Math.max(0, Math.min(g.troops - jinetes, g.catapultas ?? 0));
  return { mesnada: g.troops - jinetes - catapultas, jinetes, catapultas };
}

export function totalUnits(u: Units): number {
  return u.mesnada + u.jinetes + u.catapultas;
}

/** Los campos de una casilla o grupo para una composición (sin ceros de más). */
export function unitFields(u: Units): { troops: number; jinetes?: number; catapultas?: number } {
  return {
    troops: totalUnits(u),
    ...(u.jinetes > 0 ? { jinetes: u.jinetes } : {}),
    ...(u.catapultas > 0 ? { catapultas: u.catapultas } : {}),
  };
}

/** Pone en la casilla la composición `u` (y quita los tipos que ya no tiene). */
export function setUnits<T extends Tile>(t: T, u: Units): T {
  const { jinetes: _j, catapultas: _c, ...rest } = t;
  return { ...(rest as T), ...unitFields(u) };
}

export function addUnits(a: Units, b: Units): Units {
  return { mesnada: a.mesnada + b.mesnada, jinetes: a.jinetes + b.jinetes, catapultas: a.catapultas + b.catapultas };
}

export function subUnits(a: Units, b: Units): Units {
  return {
    mesnada: Math.max(0, a.mesnada - b.mesnada),
    jinetes: Math.max(0, a.jinetes - b.jinetes),
    catapultas: Math.max(0, a.catapultas - b.catapultas),
  };
}

/**
 * Corrige una casilla cuyo total de tropas bajó por otra vía (deserciones,
 * bandidos): primero se van las Catapultas, luego los Jinetes que sobren.
 */
export function clampUnits<T extends Tile>(t: T): T {
  const u = unitsOf(t);
  if ((t.jinetes ?? 0) === u.jinetes && (t.catapultas ?? 0) === u.catapultas) return t;
  return setUnits(t, u);
}

export function isPlain(type: TileType): boolean {
  return UNITS.plains.includes(type);
}

/** Jinetes y Catapultas no suben a la montaña. */
export function canEnter(u: Units, type: TileType): boolean {
  return type !== "montana" || (u.jinetes === 0 && u.catapultas === 0);
}

/**
 * Fuerza de un grupo antes de bonificaciones.
 * - Mesnada: 1.
 * - Jinetes: 1; en el bosque, 0,5; al atacar una casilla llana sin murallas
 *   (ni fortificada ni fortaleza), 2.
 * - Catapultas: 0 (no luchan).
 */
export function rawStrength(u: Units, where: Pick<Tile, "type">, opts: { charge?: boolean } = {}): number {
  if (!UNITS.enabled) return totalUnits(u);
  let rider = 1;
  if (where.type === "bosque") rider = UNITS.jinetes.forest;
  else if (opts.charge) rider = UNITS.jinetes.charge;
  return u.mesnada + u.jinetes * rider;
}

/**
 * Supervivientes de un grupo que gana conservando `kept` tropas: las bajas se
 * reparten en proporción y, en el redondeo, caen antes las Catapultas y los
 * Jinetes que la Mesnada.
 */
export function keepUnits(u: Units, kept: number): Units {
  const total = totalUnits(u);
  if (kept >= total) return { ...u };
  if (kept <= 0 || total === 0) return { mesnada: 0, jinetes: 0, catapultas: 0 };
  const ratio = kept / total;
  let catapultas = Math.floor(u.catapultas * ratio);
  let jinetes = Math.floor(u.jinetes * ratio);
  let mesnada = kept - catapultas - jinetes;
  if (mesnada > u.mesnada) {
    let extra = mesnada - u.mesnada;
    mesnada = u.mesnada;
    const j = Math.min(extra, u.jinetes - jinetes);
    jinetes += j;
    extra -= j;
    catapultas += Math.min(extra, u.catapultas - catapultas);
  }
  return { mesnada, jinetes, catapultas };
}

/**
 * Lo que vuelve de un ataque fallido: la mitad (hacia abajo) de la Mesnada y
 * los Jinetes; las Catapultas se pierden siempre.
 */
export function retreatUnits(u: Units): Units {
  const back = Math.floor((u.mesnada + u.jinetes) / 2);
  const jinetes = Math.min(u.jinetes, Math.floor(u.jinetes / 2));
  return { mesnada: back - jinetes, jinetes, catapultas: 0 };
}

/** Composición de una orden (si no dice nada, todo Mesnada). */
export function orderUnits(o: { troops: number; jinetes?: number; catapultas?: number }): Units {
  return unitsOf(o);
}

/** Tropas que cuentan para el mantenimiento: cada Catapulta come como dos. */
export function upkeepTroops(tiles: Pick<Tile, "troops" | "jinetes" | "catapultas">[]): number {
  const extra = UNITS.enabled ? UNITS.catapultas.upkeep - 1 : 0;
  return tiles.reduce((a, t) => a + t.troops + unitsOf(t).catapultas * extra, 0);
}
