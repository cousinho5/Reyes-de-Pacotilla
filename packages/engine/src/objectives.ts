// Objetivos secretos (diseño, sección 11.3). Cada casa recibe dos al azar y
// elige uno; si se cumple al final, da +6 de Prestigio. Solo están los que se
// pueden comprobar con lo que hay construido; los de subastas y pactos llegan
// con la versión 1.

import { guestTroops } from "./alliances";
import { seededRandom, shuffle } from "./random";
import { OBJECTIVE_TARGETS, SHORT_OBJECTIVES } from "./rules";
import type { BuildingKind, HouseId, Tile } from "./types";

export type ObjectiveTargets = { [K in keyof typeof OBJECTIVE_TARGETS]: number };

/** Umbrales de las ambiciones para una partida de `weeks` semanas (sin semanas, los de siempre). */
export function objectiveTargets(weeks?: number): ObjectiveTargets {
  return { ...OBJECTIVE_TARGETS, ...(weeks != null ? SHORT_OBJECTIVES[weeks] : {}) };
}

/** Texto de una ambición para una partida de `weeks` semanas. */
export function objectiveText(key: ObjectiveKey, weeks?: number): string {
  const T = objectiveTargets(weeks);
  switch (key) {
    // Antes «puerto y fortaleza»: con la geografía del bloque 1 los puertos quedan
    // en la costa y las fortalezas tierra adentro, y solo se cumplía el 13% de las veces.
    case "puerto_y_montana":
      return "Controlar un puerto y una montaña al final de la partida.";
    case "niveles_17":
      return `Sumar ${T.totalLevels} niveles entre tus cinco edificios (se empieza con 7).`;
    case "tesoro":
      return `Terminar con ${T.gold} de Oro o más en el tesoro.`;
    case "comercio_con_tres":
      return `Cerrar tratos válidos con ${T.tradePartners} casas distintas a lo largo de la partida.`;
    case "fortaleza":
      return "Controlar una fortaleza al final de la partida.";
    case "casillas_ajenas":
      return `Tomar ${T.tilesTakenFromHouses} casillas a otras casas a lo largo de la partida.`;
    case "tropas_40":
      return `Terminar con ${T.troops} tropas o más.`;
    case "cinco_casillas":
      return `Controlar ${T.tiles} casillas o más al final, sin contar el castillo.`;
    case "obra_maestra":
      return `Tener un edificio a nivel ${T.masterpieceLevel}.`;
    case "diez_tratos":
      return `Cerrar ${T.validTrades} tratos válidos a lo largo de la partida.`;
    case "subastas":
      return `Ganar ${T.auctionsWon} lotes de la Gran Subasta.`;
  }
}

const KEYS = [
  "puerto_y_montana",
  "niveles_17",
  "tesoro",
  "comercio_con_tres",
  "fortaleza",
  "casillas_ajenas",
  "tropas_40",
  "cinco_casillas",
  "obra_maestra",
  "diez_tratos",
  "subastas",
] as const;

/** Textos con los umbrales de siempre (partidas de 4 semanas o más); para otra duración, `objectiveText`. */
export const OBJECTIVES = Object.fromEntries(KEYS.map((k) => [k, objectiveText(k)])) as Record<(typeof KEYS)[number], string>;

export type ObjectiveKey = keyof typeof OBJECTIVES;
export const OBJECTIVE_KEYS = Object.keys(OBJECTIVES) as ObjectiveKey[];

export interface ObjectiveContext {
  house: HouseId;
  tiles: Pick<Tile, "type" | "owner" | "troops" | "guests">[];
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
  /** Semanas de la partida (las cortas tienen umbrales más bajos, `SHORT_OBJECTIVES`). */
  weeks?: number;
}

export function objectiveMet(key: ObjectiveKey, ctx: ObjectiveContext): boolean {
  const own = ctx.tiles.filter((t) => t.owner === ctx.house);
  const levels = Object.values(ctx.buildings);
  const T = objectiveTargets(ctx.weeks);
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
      // Cuentan también las tropas de paso en casillas aliadas (bloque 8).
      return own.reduce((a, t) => a + t.troops, 0) + guestTroops(ctx.tiles, ctx.house) >= T.troops;
    case "cinco_casillas":
      return own.filter((t) => t.type !== "castillo").length >= T.tiles;
    case "obra_maestra":
      return levels.some((l) => l >= T.masterpieceLevel);
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
