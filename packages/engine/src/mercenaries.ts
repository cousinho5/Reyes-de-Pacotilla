// Mercenarios de alquiler (bloque 5 de la hoja de ruta): 6 de Oro por tropa,
// aparecen en el castillo como Mesnada, no comen Pan y se van solos a los 7
// días, estén donde estén. La casa solo lleva la cuenta de cuántos tiene y
// cuándo se van: no se marcan en el mapa.

import { guestStacks, takeGuests } from "./alliances";
import { MERCENARIES } from "./rules";
import type { HouseId, Tile } from "./types";
import { clampUnits } from "./units";

/** Oro que cuestan `n` mercenarios. */
export function mercenaryCost(n: number): number {
  return n * MERCENARIES.hire;
}

/**
 * Quita `n` tropas de una casa cuando se van sus mercenarios: primero del
 * castillo, luego de las casillas con más tropas (las de menor id en empate) y
 * por último de las tropas de paso en casillas aliadas (bloque 8), también por
 * el grupo más grande. Se van como Mesnada; si no queda, Jinetes y Catapultas.
 */
export function dismissTroops<T extends Tile>(tiles: T[], house: HouseId, n: number): { tiles: T[]; removed: number } {
  const own = tiles
    .filter((t) => t.owner === house)
    .sort((a, b) => Number(b.castleOf === house) - Number(a.castleOf === house) || b.troops - a.troops || a.id - b.id);
  const cut = new Map<number, number>();
  let left = n;
  for (const t of own) {
    if (left <= 0) break;
    const k = Math.min(t.troops, left);
    if (k > 0) cut.set(t.id, k);
    left -= k;
  }
  const after = tiles.map((t) => (cut.has(t.id) ? clampUnits({ ...t, troops: t.troops - cut.get(t.id)! }) : t));
  if (left <= 0) return { tiles: after, removed: n };
  const away = guestStacks(after, house)
    .sort((a, b) => b.guest.troops - a.guest.troops || a.tile.id - b.tile.id)
    .map((s) => s.tile.id);
  const gone = takeGuests(after, house, left, away);
  return { tiles: gone.tiles, removed: n - left + gone.removed };
}

/**
 * Si la casa tiene menos tropas que mercenarios, se da por hecho que murieron
 * mercenarios: se descuentan de los grupos en orden (los primeros en irse,
 * primero). Devuelve las unidades que quedan en cada grupo.
 */
export function mercenariesAlive(groups: number[], troops: number): number[] {
  let extra = groups.reduce((a, g) => a + g, 0) - troops;
  return groups.map((g) => {
    if (extra <= 0) return g;
    const k = Math.min(g, extra);
    extra -= k;
    return g - k;
  });
}
