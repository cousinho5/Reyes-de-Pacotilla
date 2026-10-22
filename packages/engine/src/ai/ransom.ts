// Rescate del Capitán (bloque 4): cómo piden y pagan los bots. Las personas
// eligen su precio; los valores, en RANSOM (rules.ts).

import { CAPTAIN, RANSOM } from "../rules";

/** Precio que pide un bot por un Capitán preso al que le quedan `nightsLeft` noches para fugarse. */
export function botRansomPrice(nightsLeft: number): number {
  const share = Math.max(0, Math.min(1, nightsLeft / CAPTAIN.escapeAfter));
  return Math.max(RANSOM.botMin, Math.round(RANSOM.botAsk * share));
}

/** Paga un bot el rescate de su Capitán: si no es mucho de su Oro y aún falta para la fuga. */
export function botPaysRansom(price: number, gold: number, nightsLeft: number): boolean {
  return price > 0 && nightsLeft >= RANSOM.botPayMinNights && price <= gold * RANSOM.botPayShare;
}
