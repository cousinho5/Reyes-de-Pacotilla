// Niebla de guerra (diseño, sección 6.2): cada casa ve con detalle sus
// casillas y las adyacentes; del resto solo sabe quién las controla.

import { areAdjacent } from "./map";
import type { HouseId, Tile, TileId } from "./types";

export interface VisibleTile extends Omit<Tile, "troops" | "fortifiedUntil"> {
  /** null si la casilla está fuera de la vista de la casa. */
  troops: number | null;
  fortifiedUntil: number | null;
  visible: boolean;
}

export function visibleTileIds(tiles: Tile[], house: HouseId): Set<TileId> {
  const own = tiles.filter((t) => t.owner === house);
  const ids = new Set<TileId>(own.map((t) => t.id));
  for (const t of tiles) if (own.some((o) => areAdjacent(o, t))) ids.add(t.id);
  return ids;
}

/** Lo que el servidor puede enviar a una casa: nunca más de lo que ve. */
export function projectForHouse(tiles: Tile[], house: HouseId): VisibleTile[] {
  const visible = visibleTileIds(tiles, house);
  return tiles.map((t) => {
    const v = visible.has(t.id);
    return {
      ...t,
      troops: v ? t.troops : null,
      fortifiedUntil: v ? (t.fortifiedUntil ?? null) : null,
      visible: v,
    };
  });
}
