// Objetivos secretos (diseño, sección 11.3). Cada casa recibe dos al azar y
// elige uno; si se cumple al final, da +6 de Prestigio. Solo están los que se
// pueden comprobar con lo que hay construido; los de subastas y pactos llegan
// con la versión 1.

import { seededRandom, shuffle } from "./random";
import type { BuildingKind, HouseId, Tile } from "./types";

export const OBJECTIVES = {
  dos_puertos: "Controlar 2 puertos al final de la partida.",
  edificios_nivel_3: "Tener los 5 edificios a nivel 3 o más.",
  oro_100: "Terminar con 100 de Oro o más en el tesoro.",
  comercio_con_todas: "Cerrar tratos válidos con todas las demás casas a lo largo de la partida.",
  fortaleza: "Controlar una fortaleza al final de la partida.",
  casilla_ajena: "Tomar al menos una casilla a otra casa.",
  tropas_30: "Terminar con 30 tropas o más.",
  seis_casillas: "Controlar 6 casillas o más al final, sin contar el castillo.",
  obra_maestra: "Tener un edificio a nivel 5.",
  diez_tratos: "Cerrar 10 tratos válidos a lo largo de la partida.",
} as const;

export type ObjectiveKey = keyof typeof OBJECTIVES;
export const OBJECTIVE_KEYS = Object.keys(OBJECTIVES) as ObjectiveKey[];

export interface ObjectiveContext {
  house: HouseId;
  tiles: Pick<Tile, "type" | "owner" | "troops">[];
  buildings: Record<BuildingKind, number>;
  gold: number;
  /** Casas distintas con las que hubo trato válido en toda la partida. */
  partnersAllGame: number;
  /** Número de casas rivales. */
  otherHouses: number;
  /** Tratos válidos en toda la partida. */
  validTradesAllGame: number;
  /** Si en algún combate la casa tomó una casilla que era de otra casa. */
  tookTileFromHouse: boolean;
}

export function objectiveMet(key: ObjectiveKey, ctx: ObjectiveContext): boolean {
  const own = ctx.tiles.filter((t) => t.owner === ctx.house);
  const levels = Object.values(ctx.buildings);
  switch (key) {
    case "dos_puertos":
      return own.filter((t) => t.type === "puerto").length >= 2;
    case "edificios_nivel_3":
      return levels.every((l) => l >= 3);
    case "oro_100":
      return ctx.gold >= 100;
    case "comercio_con_todas":
      return ctx.otherHouses > 0 && ctx.partnersAllGame >= ctx.otherHouses;
    case "fortaleza":
      return own.some((t) => t.type === "fortaleza");
    case "casilla_ajena":
      return ctx.tookTileFromHouse;
    case "tropas_30":
      return own.reduce((a, t) => a + t.troops, 0) >= 30;
    case "seis_casillas":
      return own.filter((t) => t.type !== "castillo").length >= 6;
    case "obra_maestra":
      return levels.some((l) => l === 5);
    case "diez_tratos":
      return ctx.validTradesAllGame >= 10;
  }
}

/**
 * Reparte dos objetivos distintos a cada casa, de forma reproducible a partir
 * de la semilla de la partida. Se recorre el catálogo barajado para que los
 * objetivos se repitan lo menos posible entre casas.
 */
export function dealObjectives(seed: string, houses: HouseId[]): Map<HouseId, [ObjectiveKey, ObjectiveKey]> {
  const rand = seededRandom(`${seed}:objetivos`);
  let deck = shuffle(OBJECTIVE_KEYS, rand);
  const out = new Map<HouseId, [ObjectiveKey, ObjectiveKey]>();
  for (const h of houses) {
    if (deck.length < 2) deck = shuffle(OBJECTIVE_KEYS, rand);
    const a = deck.shift()!;
    let i = deck.findIndex((k) => k !== a);
    if (i < 0) {
      deck = shuffle(OBJECTIVE_KEYS.filter((k) => k !== a), rand);
      i = 0;
    }
    const b = deck.splice(i, 1)[0]!;
    out.set(h, [a, b]);
  }
  return out;
}
