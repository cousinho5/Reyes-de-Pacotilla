// Comprobaciones y efectos de las acciones diarias y del domingo. Puras: el
// servidor las usa para validar y calcular, y luego escribe en un lote atómico.

import { canAfford, upgradeCost, weeklyUpkeep } from "./economy";
import { distance } from "./map";
import { FORTIFY_COST, RHYTHM, TERRAIN, TROOP_COST, TROOPS_PER_PAN } from "./rules";
import type { BuildingKind, HouseId, Resources, Tile } from "./types";

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function checkUpgrade(
  levels: Record<BuildingKind, number>,
  kind: BuildingKind,
  have: Resources,
): ActionResult<{ cost: Partial<Resources>; newLevel: number }> {
  const level = levels[kind];
  const cost = upgradeCost(level);
  if (!cost) return { ok: false, error: "Este edificio ya está al nivel máximo." };
  if (!canAfford(have, cost)) return { ok: false, error: "No hay recursos suficientes para la mejora." };
  return { ok: true, value: { cost, newLevel: level + 1 } };
}

export function recruitCost(count: number): Partial<Resources> {
  const out: Partial<Resources> = {};
  for (const [r, v] of Object.entries(TROOP_COST) as [keyof Resources, number][]) out[r] = v * count;
  return out;
}

export function checkRecruit(count: number, have: Resources): ActionResult<{ cost: Partial<Resources> }> {
  if (!Number.isInteger(count) || count < 1 || count > 100) return { ok: false, error: "Número de tropas no válido." };
  const cost = recruitCost(count);
  if (!canAfford(have, cost)) return { ok: false, error: "No hay Hierro o Pan suficientes." };
  return { ok: true, value: { cost } };
}

/**
 * Fortificar dura RHYTHM.fortify resoluciones. `nextResolution` es la
 * próxima resolución que se va a ejecutar.
 */
export function checkFortify(
  tile: Tile,
  house: HouseId,
  nextResolution: number,
  have: Resources,
): ActionResult<{ cost: Partial<Resources>; fortifiedUntil: number }> {
  if (tile.owner !== house) return { ok: false, error: "Solo puedes fortificar tus casillas." };
  if (tile.type === "castillo") return { ok: false, error: "Los castillos no necesitan fortificarse." };
  const until = nextResolution + RHYTHM.fortify - 1;
  if ((tile.fortifiedUntil ?? 0) >= until) return { ok: false, error: "Esta casilla ya está fortificada." };
  const cost = fortifyCost(tile);
  if (!canAfford(have, cost)) return { ok: false, error: "Hace falta Piedra para fortificar." };
  return { ok: true, value: { cost, fortifiedUntil: until } };
}

export interface UpkeepResult {
  /** Pan que cuesta la semana. */
  cost: number;
  /** Pan que se paga de verdad (no puede pasar de lo que hay). */
  paid: number;
  /** Tropas que desertan por no poder pagar. */
  deserted: number;
  tiles: Tile[];
}

/**
 * Mantenimiento del domingo: 1 Pan cada 3 tropas y 2 Pan por casilla a partir
 * de la quinta. Si no llega, desertan las tropas que falten por cubrir,
 * empezando por las más alejadas del castillo.
 */
export function applyUpkeep(tiles: Tile[], house: HouseId, pan: number, factor = 1): UpkeepResult {
  const own = tiles.filter((t) => t.owner === house);
  const castle = own.find((t) => t.type === "castillo");
  const totalTroops = own.reduce((a, t) => a + t.troops, 0);
  const controlled = own.filter((t) => t.type !== "castillo").length;
  // `factor`: eventos que encarecen o perdonan el mantenimiento de la semana.
  const cost = Math.round(weeklyUpkeep(totalTroops, controlled) * factor);
  if (pan >= cost) return { cost, paid: cost, deserted: 0, tiles };

  const shortfall = cost - pan;
  let toDesert = Math.min(totalTroops, shortfall * TROOPS_PER_PAN);
  const deserted = toDesert;
  const order = [...own].sort((a, b) => {
    const da = castle ? distance(a, castle) : 0;
    const db = castle ? distance(b, castle) : 0;
    return db - da || a.id - b.id;
  });
  const updated = new Map(tiles.map((t) => [t.id, { ...t }]));
  for (const t of order) {
    if (toDesert <= 0) break;
    const tile = updated.get(t.id)!;
    const leave = Math.min(tile.troops, toDesert);
    tile.troops -= leave;
    toDesert -= leave;
  }
  return { cost, paid: pan, deserted, tiles: tiles.map((t) => updated.get(t.id)!) };
}

/** Casa última en Prestigio (en empate, la de menor id, para ser deterministas). */
export function lastPlace(prestige: { house: HouseId; total: number }[]): HouseId | null {
  if (prestige.length === 0) return null;
  return [...prestige].sort((a, b) => a.total - b.total || a.house - b.house)[0]!.house;
}

/** Lo que cuesta fortificar una casilla: en una cantera, menos (la piedra está a mano). */
export function fortifyCost(tile: Pick<Tile, "type">): Partial<Resources> {
  return tile.type === "cantera" ? TERRAIN.quarryFortify : FORTIFY_COST;
}
