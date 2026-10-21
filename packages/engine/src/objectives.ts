// Objetivos secretos (diseño, sección 11.3). Cada casa recibe dos al azar y
// elige uno; si se cumple al final, da +6 de Prestigio. Solo están los que se
// pueden comprobar con lo que hay construido; los de subastas y pactos llegan
// con la versión 1.

import { seededRandom, shuffle } from "./random";
import { OBJECTIVE_TARGETS } from "./rules";
import type { BuildingKind, HouseId, Tile } from "./types";

const T = OBJECTIVE_TARGETS;

export const OBJECTIVES = {
  // Antes «puerto y fortaleza»: con la geografía del bloque 1 los puertos quedan
  // en la costa y las fortalezas tierra adentro, y solo se cumplía el 13% de las veces.
  puerto_y_montana: "Controlar un puerto y una montaña al final de la partida.",
  niveles_17: `Sumar ${T.totalLevels} niveles entre tus cinco edificios (se empieza con 7).`,
  tesoro: `Terminar con ${T.gold} de Oro o más en el tesoro.`,
  comercio_con_tres: `Cerrar tratos válidos con ${T.tradePartners} casas distintas a lo largo de la partida.`,
  fortaleza: "Controlar una fortaleza al final de la partida.",
  casillas_ajenas: `Tomar ${T.tilesTakenFromHouses} casillas a otras casas a lo largo de la partida.`,
  tropas_40: `Terminar con ${T.troops} tropas o más.`,
  cinco_casillas: `Controlar ${T.tiles} casillas o más al final, sin contar el castillo.`,
  obra_maestra: "Tener un edificio a nivel 5.",
  diez_tratos: `Cerrar ${T.validTrades} tratos válidos a lo largo de la partida.`,
  subastas: `Ganar ${T.auctionsWon} lotes de la Gran Subasta.`,
};

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
  /** Casillas que la casa ha tomado a otras casas en toda la partida. */
  tilesTakenFromHouses: number;
  /** Lotes de la Gran Subasta ganados en toda la partida. */
  auctionsWon: number;
}

export function objectiveMet(key: ObjectiveKey, ctx: ObjectiveContext): boolean {
  const own = ctx.tiles.filter((t) => t.owner === ctx.house);
  const levels = Object.values(ctx.buildings);
  switch (key) {
    case "puerto_y_montana":
      return own.some((t) => t.type === "puerto") && own.some((t) => t.type === "montana");
    case "niveles_17":
      return levels.reduce((a, l) => a + l, 0) >= T.totalLevels;
    case "tesoro":
      return ctx.gold >= T.gold;
    case "comercio_con_tres":
      return ctx.partnersAllGame >= Math.min(T.tradePartners, ctx.otherHouses);
    case "fortaleza":
      return own.some((t) => t.type === "fortaleza");
    case "casillas_ajenas":
      return ctx.tilesTakenFromHouses >= T.tilesTakenFromHouses;
    case "tropas_40":
      return own.reduce((a, t) => a + t.troops, 0) >= T.troops;
    case "cinco_casillas":
      return own.filter((t) => t.type !== "castillo").length >= T.tiles;
    case "obra_maestra":
      return levels.some((l) => l === 5);
    case "diez_tratos":
      return ctx.validTradesAllGame >= T.validTrades;
    case "subastas":
      return ctx.auctionsWon >= T.auctionsWon;
    default:
      // Objetivos retirados del catálogo: ya no se pueden cumplir.
      return false;
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
