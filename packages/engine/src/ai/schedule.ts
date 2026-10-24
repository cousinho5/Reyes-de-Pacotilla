// Cuándo juega cada bot en una partida real (`BOT_SCHEDULE`): una hora fija
// para su día, que sale de la semilla de la partida, y un retraso al
// contestar, para que no parezca que todo pasa a la vez y al instante.

import { seededRandom } from "../random";
import { BOT_SCHEDULE } from "../rules";
import type { HouseId } from "../types";

/** Hora local (en punto) a la que el bot juega su día: madrugador, de mediodía o de tarde. */
export function botHour(seed: string, house: HouseId): number {
  const [from, to] = BOT_SCHEDULE.dayHours;
  return from + Math.floor(seededRandom(`${seed}:bot:${house}`)() * (to - from + 1));
}

/** Horas que tarda el bot en contestar algo (una oferta, una propuesta), siempre las mismas para lo mismo. */
export function answerDelayHours(seed: string, house: HouseId, what: string): number {
  const [min, max] = BOT_SCHEDULE.answerDelay;
  return min + Math.floor(seededRandom(`${seed}:respuesta:${house}:${what}`)() * (max - min + 1));
}
