// Títulos de fin de partida (bloque 13, punto 4): un título cómico por casa,
// distinto para cada una, el del dato en que más destaca, con su cifra. El
// ganador lleva además «Futuro Rey, según el cronista». Se ríen de lo que pasó
// en la partida, nunca de una persona. Las frases están en el banco (sección 21).

import { seededRandom } from "./random";
import { fill, houseInSentence } from "./bulletin";
import { PHRASES } from "./texts/cronista";
import type { HouseId } from "./types";

/** Lo que cuenta para los títulos, por casa, al acabar la partida. */
export interface TitleStats {
  house: HouseId;
  /** Casillas tomadas a otras casas. */
  conquests: number;
  /** Combates ganados atacando a través de un río sin puente. */
  riverWins: number;
  /** Ataques rechazados en casillas propias. */
  defenses: number;
  /** Noches asediando castillos. */
  siegeNights: number;
  /** Tratos cerrados. */
  trades: number;
  /** Niveles sumados entre sus cinco edificios. */
  buildingLevels: number;
  /** Oro al final. */
  gold: number;
  /** Tropas al final (también las de paso). */
  troops: number;
  /** Lotes de la Gran Subasta ganados. */
  auctions: number;
  /** Casillas que le quitaron otras casas. */
  tilesLost: number;
  /** Alianzas que rompió. */
  betrayals: number;
  /** Noches en alianza sin romperla él. */
  allianceNights: number;
  /** Oro dado al cronista en sobornos. */
  bribes: number;
  /** Ruinas saqueadas. */
  ruins: number;
  /** Puestos que subió desde su peor domingo hasta el final. */
  comeback: number;
  /** Tropas en su castillo al final. */
  castleTroops: number;
}

export type TitleKey =
  | "azote"
  | "gallina"
  | "muralla"
  | "asediador"
  | "mercader"
  | "arquitecto"
  | "tesorero"
  | "general"
  | "coleccionista"
  | "caido"
  | "traidor"
  | "aliado"
  | "mecenas"
  | "saqueador"
  | "remontada"
  | "guardian";

interface TitleDef {
  key: TitleKey;
  name: string;
  stat: Exclude<keyof TitleStats, "house">;
  /** Lo mínimo para merecerlo en la primera vuelta. */
  min: number;
}

/** En este orden se deshacen los empates. */
export const TITLES: readonly TitleDef[] = [
  { key: "azote", name: "Azote de Fronteras", stat: "conquests", min: 2 },
  { key: "gallina", name: "La Gallina que Cruzó el Vado", stat: "riverWins", min: 1 },
  { key: "muralla", name: "Muralla con Patas", stat: "defenses", min: 2 },
  { key: "asediador", name: "Asediador con Paciencia de Santo", stat: "siegeNights", min: 2 },
  { key: "mercader", name: "Mercader de Lengua Larga", stat: "trades", min: 2 },
  { key: "arquitecto", name: "Arquitecto sin Freno", stat: "buildingLevels", min: 12 },
  { key: "tesorero", name: "Tesorero de las Llaves Perdidas", stat: "gold", min: 20 },
  { key: "general", name: "General de Mil Bocas", stat: "troops", min: 10 },
  { key: "coleccionista", name: "Coleccionista de Subastas", stat: "auctions", min: 1 },
  { key: "caido", name: "Caído con Honor", stat: "tilesLost", min: 2 },
  { key: "traidor", name: "Traidor de la Corona", stat: "betrayals", min: 1 },
  { key: "aliado", name: "Aliado de Hierro", stat: "allianceNights", min: 3 },
  { key: "mecenas", name: "Mecenas del Cronista", stat: "bribes", min: 1 },
  { key: "saqueador", name: "Saqueador de Ruinas", stat: "ruins", min: 1 },
  { key: "remontada", name: "Rey de la Remontada", stat: "comeback", min: 2 },
  { key: "guardian", name: "Guardián del Castillo Propio", stat: "castleTroops", min: 1 },
];

export const FUTURE_KING = "Futuro Rey, según el cronista";

export interface EndTitle {
  house: HouseId;
  key: TitleKey;
  name: string;
  /** La cifra del título. */
  n: number;
  /** Lo que dice Fray Abundio, con la cifra. */
  line: string;
  /** El ganador: además, «Futuro Rey, según el cronista». */
  king: boolean;
}

/**
 * Reparte los títulos. Cada pareja casa-título vale lo que la casa tiene
 * respecto a la que más tiene en ese dato (1 = la que más); se asignan de la
 * mejor a la peor sin repetir casa ni título. Primero solo las que llegan al
 * mínimo, luego las que tienen algo y al final lo que quede.
 */
export function endTitles(
  stats: readonly TitleStats[],
  winner: HouseId | null,
  seed: string,
  names: ReadonlyMap<HouseId, string>,
): EndTitle[] {
  const top = new Map(TITLES.map((t) => [t.key, Math.max(0, ...stats.map((s) => s[t.stat]))]));
  const given = new Map<HouseId, TitleDef>();
  const taken = new Set<TitleKey>();
  const pass = (ok: (t: TitleDef, v: number) => boolean) => {
    const pairs: { s: TitleStats; t: TitleDef; score: number; order: number }[] = [];
    for (const s of stats) {
      if (given.has(s.house)) continue;
      TITLES.forEach((t, order) => {
        const v = s[t.stat];
        if (taken.has(t.key) || !ok(t, v)) return;
        const best = top.get(t.key)!;
        pairs.push({ s, t, score: best > 0 ? v / best : 0, order });
      });
    }
    pairs.sort((a, b) => b.score - a.score || a.order - b.order || a.s.house - b.s.house);
    for (const p of pairs) {
      if (given.has(p.s.house) || taken.has(p.t.key)) continue;
      given.set(p.s.house, p.t);
      taken.add(p.t.key);
    }
  };
  pass((t, v) => v >= t.min);
  pass((_t, v) => v > 0);
  pass(() => true);

  return stats.map((s) => {
    const t = given.get(s.house)!;
    const n = s[t.stat];
    const variants = PHRASES[`titulo.${t.key}`] as readonly string[];
    const pick = variants[Math.floor(seededRandom(`${seed}:titulo:${s.house}`)() * variants.length)]!;
    return {
      house: s.house,
      key: t.key,
      name: t.name,
      n,
      line: fill(pick, { casa: houseInSentence(names.get(s.house) ?? ""), n }),
      king: s.house === winner,
    };
  });
}

/** Un combate tal y como lo cuentan el motor (`CampaignEvent`) y el registro de la partida. */
export interface TitleCombat {
  winner: HouseId | null;
  previousOwner: HouseId | null;
  conquered: boolean;
  sides: { house: HouseId | null; role: "defensa" | "ataque"; river?: boolean }[];
}

/** Las cifras de los títulos que salen de los combates: conquistas, ríos, defensas y pérdidas. */
export function combatTitleStats(
  combats: readonly TitleCombat[],
): Map<HouseId, Pick<TitleStats, "conquests" | "riverWins" | "defenses" | "tilesLost">> {
  const out = new Map<HouseId, Pick<TitleStats, "conquests" | "riverWins" | "defenses" | "tilesLost">>();
  const of = (h: HouseId) => {
    let x = out.get(h);
    if (!x) out.set(h, (x = { conquests: 0, riverWins: 0, defenses: 0, tilesLost: 0 }));
    return x;
  };
  for (const c of combats) {
    const attacked = c.sides.some((x) => x.role === "ataque");
    if (c.conquered && c.winner != null && c.previousOwner != null) {
      of(c.winner).conquests++;
      of(c.previousOwner).tilesLost++;
    }
    if (c.conquered && c.winner != null && c.sides.some((x) => x.role === "ataque" && x.house === c.winner && x.river))
      of(c.winner).riverWins++;
    if (!c.conquered && attacked && c.previousOwner != null && c.winner === c.previousOwner) of(c.previousOwner).defenses++;
  }
  return out;
}

/** Puestos que subió cada casa desde su peor domingo hasta el final (clasificaciones de primero a último). */
export function comebacks(weeklyRanking: readonly (readonly HouseId[])[], final: readonly HouseId[]): Map<HouseId, number> {
  const out = new Map<HouseId, number>();
  final.forEach((h, end) => {
    const worst = Math.max(end, ...weeklyRanking.map((r) => r.indexOf(h)));
    out.set(h, worst - end);
  });
  return out;
}
