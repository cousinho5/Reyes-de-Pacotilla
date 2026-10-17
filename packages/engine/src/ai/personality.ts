// Personalidades de los bots. Cada rasgo es un número que pesa en las
// decisiones; no hay reglas distintas por personalidad, solo pesos distintos.

import type { ObjectiveKey } from "../objectives";

export interface Personality {
  /** Fuerza que quiere reunir respecto a la defensa estimada antes de atacar (1,1 = temerario, 1,6 = prudente). */
  margin: number;
  /** Qué parte de las tropas enemigas vecinas teme que le ataquen (0-1). */
  caution: number;
  /** Ganas de atacar casillas de otras casas frente a neutrales (0 = nunca, 1 = igual, >1 = las prefiere). */
  houseBias: number;
  /** Manía al líder: valor extra por quitarle casillas y reparo a comerciar con él (0-1). */
  leaderHatred: number;
  /** Ganas de comerciar: ofrece más a menudo y acepta tratos más justos (0-1). */
  trade: number;
  /** Tendencia a especializarse en un edificio en vez de subirlos todos a la par (0-1). */
  specialize: number;
  /** Peso del ejército frente a los edificios al gastar (0,5 = poco, 1,5 = mucho). */
  military: number;
}

export const PERSONALITIES = {
  /** Equilibrada: se expande, construye y comercia con sensatez. */
  estratega: { margin: 1.25, caution: 0.8, houseBias: 0.8, leaderHatred: 0.5, trade: 0.6, specialize: 0.3, military: 1.0 },
  /** Vive del comercio: busca socios nuevos y evita las guerras. */
  mercader: { margin: 1.4, caution: 0.9, houseBias: 0.4, leaderHatred: 0.3, trade: 1.0, specialize: 0.5, military: 0.7 },
  /** Ejército grande y ataques con poco margen, también contra casas. */
  guerrero: { margin: 1.1, caution: 0.6, houseBias: 1.3, leaderHatred: 0.6, trade: 0.3, specialize: 0.2, military: 1.6 },
  /** Construye, se especializa y defiende lo suyo. */
  arquitecta: { margin: 1.5, caution: 1.0, houseBias: 0.3, leaderHatred: 0.2, trade: 0.6, specialize: 1.0, military: 0.5 },
  /** Va a por el líder y por las presas débiles. */
  oportunista: { margin: 1.2, caution: 0.7, houseBias: 1.1, leaderHatred: 1.0, trade: 0.5, specialize: 0.3, military: 1.1 },
} satisfies Record<string, Personality>;

export type PersonalityName = keyof typeof PERSONALITIES;
export const PERSONALITY_NAMES = Object.keys(PERSONALITIES) as PersonalityName[];

/** Elige entre los dos objetivos ofrecidos el que mejor encaja con la personalidad. */
export function chooseObjective(options: readonly ObjectiveKey[], p: Personality): ObjectiveKey {
  const fit: Record<ObjectiveKey, number> = {
    puerto_y_fortaleza: 0.4 + 0.3 * p.houseBias,
    niveles_17: 0.4 + 0.5 * (1 - p.specialize) * (2 - p.military),
    oro_200: 0.6 + 0.3 * p.trade,
    comercio_con_tres: 0.3 + 0.9 * p.trade,
    fortaleza: 0.5 + 0.3 * p.military,
    casillas_ajenas: 0.2 + 0.6 * p.houseBias,
    tropas_40: 0.3 + 0.5 * p.military,
    cinco_casillas: 0.5 + 0.3 * p.military,
    obra_maestra: 0.1 + 0.9 * p.specialize,
    diez_tratos: 0.2 + 0.8 * p.trade,
  };
  return [...options].sort((a, b) => fit[b] - fit[a])[0]!;
}
