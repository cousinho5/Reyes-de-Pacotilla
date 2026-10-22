// Comprobaciones y efectos de las acciones diarias y del domingo. Puras: el
// servidor las usa para validar y calcular, y luego escribe en un lote atómico.

import { guestStacks, takeGuests } from "./alliances";
import { canAfford, upgradeCost, weeklyUpkeep } from "./economy";
import { distance } from "./map";
import { BATTLE_TWEAKS, FORTIFY_COST, FORTIFY_FOREVER, FORTIFY_UPKEEP, RHYTHM, TERRAIN, TROOP_COST, TROOPS_PER_PAN, UNITS } from "./rules";
import type { BuildingKind, HouseId, Resource, Resources, Tile } from "./types";
import { clampUnits, setUnits, unitsOf, upkeepTroops, type UnitKind } from "./units";

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

/** Coste de reclutar `count` tropas de un tipo (por defecto, Mesnada). */
export function recruitCost(count: number, kind: UnitKind = "mesnada"): Partial<Resources> {
  const base = kind === "jinetes" ? UNITS.jinetes.cost : kind === "catapultas" ? UNITS.catapultas.cost : TROOP_COST;
  const out: Partial<Resources> = {};
  for (const [r, v] of Object.entries(base) as [keyof Resources, number][]) out[r] = v * count;
  return out;
}

const RESOURCE_NAME: Record<keyof Resources, string> = { pan: "Pan", madera: "Madera", piedra: "Piedra", hierro: "Hierro", oro: "Oro" };

/** «3 de Hierro, 2 de Pan y 3 de Oro», con las cifras de rules.ts. */
function costPhrase(cost: Partial<Resources>): string {
  const parts = (Object.entries(cost) as [keyof Resources, number][]).filter(([, v]) => v > 0).map(([r, v]) => `${v} de ${RESOURCE_NAME[r]}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}` : (parts[0] ?? "");
}

const SHORT: Record<UnitKind, () => string> = {
  mesnada: () => "No hay Hierro o Pan suficientes.",
  jinetes: () => `Para jinetes hacen falta ${costPhrase(UNITS.jinetes.cost)} cada uno.`,
  catapultas: () => `Para catapultas hacen falta ${costPhrase(UNITS.catapultas.cost)} cada una.`,
};

export function checkRecruit(count: number, have: Resources, kind: UnitKind = "mesnada"): ActionResult<{ cost: Partial<Resources> }> {
  if (!Number.isInteger(count) || count < 1 || count > 100) return { ok: false, error: "Número de tropas no válido." };
  if (kind !== "mesnada" && !UNITS.enabled) return { ok: false, error: "En esta partida solo hay Mesnada." };
  const cost = recruitCost(count, kind);
  if (!canAfford(have, cost)) return { ok: false, error: SHORT[kind]() };
  return { ok: true, value: { cost } };
}

/** Añade `count` tropas de un tipo a una casilla (al reclutar, en el castillo). */
export function addRecruits<T extends Tile>(tile: T, count: number, kind: UnitKind = "mesnada"): T {
  const u = unitsOf(tile);
  u[kind] += count;
  return setUnits(tile, u);
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
  const until = BATTLE_TWEAKS.fortifyUntilAttacked ? FORTIFY_FOREVER : nextResolution + RHYTHM.fortify - 1;
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
 * empezando por las más alejadas del castillo: primero las tropas de paso en
 * casillas aliadas (bloque 8), que también comen, y luego las de las casillas
 * propias. `freeTroops`: tropas que no comen (los mercenarios del bloque 5,
 * cuyo Pan pone la Corona).
 */
export function applyUpkeep(tiles: Tile[], house: HouseId, pan: number, factor = 1, freeTroops = 0): UpkeepResult {
  const own = tiles.filter((t) => t.owner === house);
  const castle = own.find((t) => t.type === "castillo");
  const away = guestStacks(tiles, house);
  const totalTroops = own.reduce((a, t) => a + t.troops, 0) + away.reduce((a, s) => a + s.guest.troops, 0);
  const controlled = own.filter((t) => t.type !== "castillo").length;
  // `factor`: eventos que encarecen o perdonan el mantenimiento de la semana.
  // Las Catapultas comen como dos tropas.
  const eaters = upkeepTroops(own) + upkeepTroops(away.map((s) => s.guest));
  const cost = Math.round(weeklyUpkeep(Math.max(0, eaters - freeTroops), controlled) * factor);
  if (pan >= cost) return { cost, paid: cost, deserted: 0, tiles };

  const shortfall = cost - pan;
  let toDesert = Math.min(totalTroops, shortfall * TROOPS_PER_PAN);
  const deserted = toDesert;
  const far = (t: Tile) => (castle ? distance(t, castle) : 0);
  const guestOrder = [...away].sort((a, b) => far(b.tile) - far(a.tile) || a.tile.id - b.tile.id).map((s) => s.tile.id);
  const gone = takeGuests(tiles, house, toDesert, guestOrder);
  toDesert -= gone.removed;
  const order = [...own].sort((a, b) => far(b) - far(a) || a.id - b.id);
  const updated = new Map(gone.tiles.map((t) => [t.id, { ...t }]));
  for (const t of order) {
    if (toDesert <= 0) break;
    const tile = updated.get(t.id)!;
    const leave = Math.min(tile.troops, toDesert);
    tile.troops -= leave;
    toDesert -= leave;
  }
  // Desertan primero los de la Mesnada; si no queda, Jinetes y Catapultas.
  return { cost, paid: pan, deserted, tiles: tiles.map((t) => clampUnits(updated.get(t.id)!)) };
}

/**
 * Mantenimiento de las fortificaciones (FORTIFY_UPKEEP) el domingo. `keep`
 * dice qué casillas quiere conservar la casa; las demás se desmantelan sin
 * coste. Si no llega para todas, se conservan en orden de id hasta donde llegue.
 */
export function applyFortifyUpkeep(
  tiles: Tile[],
  house: HouseId,
  have: Resources,
  resolution: number,
  keep: (t: Tile) => boolean = () => true,
): { tiles: Tile[]; cost: Resources; dropped: number } {
  const cost: Resources = { pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 0 };
  const per = Object.entries(FORTIFY_UPKEEP) as [Resource, number][];
  if (per.every(([, v]) => !v)) return { tiles, cost, dropped: 0 };
  const left = { ...have };
  let dropped = 0;
  const out = tiles.map((t) => {
    if (t.owner !== house || t.fortifiedUntil == null || t.fortifiedUntil < resolution) return t;
    const afford = per.every(([r, v]) => left[r] >= v);
    if (!keep(t) || !afford) {
      dropped++;
      return { ...t, fortifiedUntil: null };
    }
    for (const [r, v] of per) {
      left[r] -= v;
      cost[r] += v;
    }
    return t;
  });
  return { tiles: out, cost, dropped };
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
