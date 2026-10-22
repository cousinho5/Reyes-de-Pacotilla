// Niebla de guerra (diseño, sección 6.2): cada casa ve con detalle sus
// casillas y las adyacentes; del resto solo sabe quién las controla.
// Terreno (diseño v3): desde una montaña propia se ve más lejos (atalaya), y
// en el bosque de otra casa no se ve cuántas tropas hay (emboscada).

import { areAdjacent, distance } from "./map";
import { TERRAIN } from "./rules";
import type { HouseId, Tile, TileId } from "./types";

export interface VisibleTile extends Omit<Tile, "troops" | "fortifiedUntil"> {
  /** null si la casilla está fuera de la vista de la casa, o emboscada en un bosque. */
  troops: number | null;
  fortifiedUntil: number | null;
  visible: boolean;
  /** Se ve la casilla, pero sus tropas se esconden en el bosque. */
  hidden?: boolean;
}

/**
 * `spied`: casas vigiladas con la carta Espía (se ven todas sus casillas). Los
 * aliados en vigor también se pasan aquí: ven lo mismo que el otro (bloque 8).
 * Las casillas donde la casa tiene tropas de paso cuentan como propias para ver.
 */
export function visibleTileIds(tiles: Tile[], house: HouseId, spied: HouseId[] = []): Set<TileId> {
  const own = tiles.filter(
    (t) => t.owner === house || (t.owner != null && spied.includes(t.owner)) || !!t.guests?.some((g) => g.house === house),
  );
  const ids = new Set<TileId>(own.map((t) => t.id));
  // Atalaya: desde una montaña propia (no de una casa espiada) se ve más lejos.
  const towers = own.filter((t) => t.owner === house && t.type === "montana");
  for (const t of tiles) {
    if (own.some((o) => areAdjacent(o, t))) ids.add(t.id);
    else if (towers.some((o) => distance(o, t) <= TERRAIN.watchtower)) ids.add(t.id);
  }
  return ids;
}

/**
 * Emboscada: tropas de otra casa en un bosque. Se ve quién lo controla, pero no
 * cuántas tropas hay (salvo con la carta Espía). Las guarniciones neutrales no
 * se esconden: todo el mundo sabe cuántas hay.
 */
export function ambushed(t: Pick<Tile, "type" | "owner">, house: HouseId, spied: HouseId[] = []): boolean {
  return TERRAIN.ambush && t.type === "bosque" && t.owner != null && t.owner !== house && !spied.includes(t.owner);
}

/** Lo que el servidor puede enviar a una casa: nunca más de lo que ve. */
export function projectForHouse(tiles: Tile[], house: HouseId, spied: HouseId[] = []): VisibleTile[] {
  const visible = visibleTileIds(tiles, house, spied);
  return tiles.map((t) => {
    const v = visible.has(t.id);
    const inside = !!t.guests?.some((g) => g.house === house);
    const hidden = v && !inside && ambushed(t, house, spied);
    // Si no se ven las tropas, tampoco de qué tipo son, ni las tropas de paso.
    const { jinetes: _j, catapultas: _c, guests: _g, ...base } = t;
    const shown = v && !hidden ? t : base;
    return {
      ...shown,
      troops: v && !hidden ? t.troops : null,
      fortifiedUntil: v ? (t.fortifiedUntil ?? null) : null,
      visible: v,
      ...(hidden ? { hidden: true } : {}),
    };
  });
}
