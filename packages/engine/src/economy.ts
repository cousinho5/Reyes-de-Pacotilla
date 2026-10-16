import {
  BUILDING_PRODUCTION,
  BUILDING_RESOURCE,
  LAST_PLACE_HELP,
  STRETCH_FREE_TILES,
  STRETCH_PAN,
  TILE_PRODUCTION,
  TROOPS_PER_PAN,
  UPGRADE_COST,
} from "./rules";
import { RESOURCES, type BuildingKind, type Resource, type Resources, type Tile } from "./types";

export function emptyResources(): Resources {
  return { pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 0 };
}

export function addResources(a: Resources, b: Partial<Resources>, factor = 1): Resources {
  const out = { ...a };
  for (const r of RESOURCES) out[r] += (b[r] ?? 0) * factor;
  return out;
}

export function canAfford(have: Resources, cost: Partial<Resources>): boolean {
  return RESOURCES.every((r) => have[r] >= (cost[r] ?? 0));
}

/** Resta un coste; lanza un error si no llega (la base de datos también lo impide). */
export function pay(have: Resources, cost: Partial<Resources>): Resources {
  if (!canAfford(have, cost)) throw new Error("Recursos insuficientes");
  return addResources(have, cost, -1);
}

/** Coste de subir un edificio desde su nivel actual; null si ya está al máximo. */
export function upgradeCost(currentLevel: number): Partial<Resources> | null {
  const next = currentLevel + 1;
  if (next < 2 || next > 5) return null;
  return UPGRADE_COST[next as 2 | 3 | 4 | 5];
}

/** Producción diaria de una casa: edificios + casillas controladas + ayuda al último. */
export function dailyProduction(
  buildings: Record<BuildingKind, number>,
  ownedTiles: Pick<Tile, "type">[],
  help?: Resource | null,
): Resources {
  let out = emptyResources();
  for (const [kind, level] of Object.entries(buildings) as [BuildingKind, number][]) {
    out[BUILDING_RESOURCE[kind]] += BUILDING_PRODUCTION[level] ?? 0;
  }
  for (const t of ownedTiles) out = addResources(out, TILE_PRODUCTION[t.type]);
  if (help) out[help] += LAST_PLACE_HELP;
  return out;
}

/** Pan que cuesta mantener el ejército y las tierras cada domingo. */
export function weeklyUpkeep(totalTroops: number, controlledTiles: number): number {
  const troops = Math.ceil(totalTroops / TROOPS_PER_PAN);
  const stretch = Math.max(0, controlledTiles - STRETCH_FREE_TILES) * STRETCH_PAN;
  return troops + stretch;
}
