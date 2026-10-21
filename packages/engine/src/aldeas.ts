// Aldeas y Ruinas (bloque 1, fase 3).
// - Aldea: no produce; quien la tiene puede reclutar en ella como en su castillo.
// - Ruinas: la primera casa que entra se lleva un premio (recursos de un tipo o
//   una carta de la Corona, según la semilla de la partida) y quedan como Prado.

import { areAdjacent } from "./map";
import { CARD_KEYS, type CardKey } from "./cards";
import { seededRandom } from "./random";
import { FEATURES } from "./rules";
import { RESOURCES, type HouseId, type Resource, type Tile, type TileId } from "./types";

export type RuinPrize = { kind: "recursos"; resource: Resource; amount: number } | { kind: "carta"; card: CardKey };

/** Premio de unas ruinas: sale de la semilla de la partida y de dónde están (siempre el mismo). */
export function ruinPrize(seed: string, at: { x: number; y: number }): RuinPrize {
  const rand = seededRandom(`${seed}:ruinas:${at.x},${at.y}`);
  if (rand() < FEATURES.cardChance) return { kind: "carta", card: CARD_KEYS[Math.floor(rand() * CARD_KEYS.length)]! };
  return { kind: "recursos", resource: RESOURCES[Math.floor(rand() * RESOURCES.length)]!, amount: FEATURES.prize };
}

export interface RuinClaim {
  house: HouseId;
  tile: TileId;
  prize: RuinPrize;
}

/**
 * Tras una resolución: las ruinas que ya tienen dueño le dan su premio y pasan
 * a ser Prado. No modifica la entrada.
 */
export function claimRuins<T extends Tile>(tiles: T[], seed: string): { tiles: T[]; claims: RuinClaim[] } {
  const claims: RuinClaim[] = [];
  const out = tiles.map((t) => {
    if (t.type !== "ruinas" || t.owner == null) return t;
    claims.push({ house: t.owner, tile: t.id, prize: ruinPrize(seed, t) });
    return { ...t, type: "prado" as const };
  });
  return { tiles: out, claims };
}

/** ¿Puede la casa reclutar en esta casilla? En su castillo o en una aldea suya. */
export function canRecruitAt(tile: Tile, house: HouseId): boolean {
  if (tile.type === "castillo") return tile.castleOf === house && tile.owner === house;
  return tile.type === "aldea" && tile.owner === house;
}

/** Sitios donde puede reclutar una casa: su castillo primero y luego sus aldeas. */
export function recruitSites<T extends Tile>(tiles: T[], house: HouseId): T[] {
  return tiles
    .filter((t) => canRecruitAt(t, house))
    .sort((a, b) => (a.type === "castillo" ? -1 : b.type === "castillo" ? 1 : a.id - b.id));
}

/**
 * Dónde recluta un bot (o el piloto automático): en una aldea suya que esté en
 * el frente (junto a casillas de otra casa) si el castillo no tiene enemigos al
 * lado; si no, en el castillo.
 */
export function recruitSite<T extends Tile>(tiles: T[], house: HouseId): T | undefined {
  const sites = recruitSites(tiles, house);
  const castle = sites.find((t) => t.type === "castillo");
  const enemyNear = (t: Tile) => tiles.some((o) => o.owner != null && o.owner !== house && areAdjacent(o, t));
  if (castle && enemyNear(castle)) return castle;
  return sites.find((t) => t.type === "aldea" && enemyNear(t)) ?? castle ?? sites[0];
}
