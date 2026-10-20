// Cambio con la Corona (hoja de ruta, bloque 5, en estudio): la Corona vende y
// compra recursos a cambio de Oro, a un precio que sube con la escasez y con
// lo que se le ha comprado últimamente.

import { CROWN } from "./rules";
import { RESOURCES, type Resources } from "./types";

export interface CrownPrices {
  /** Oro que cobra la Corona por 1 unidad. */
  sell: Resources;
  /** Oro que paga la Corona por 1 unidad. */
  buy: Resources;
}

/**
 * `realm`: lo que guardan entre todas las casas. `net`: unidades compradas a la
 * Corona menos vendidas en los últimos 7 días.
 */
export function crownPrices(realm: Resources, net: Resources): CrownPrices {
  const sell = { pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 1 } as Resources;
  const buy = { ...sell };
  const goods = RESOURCES.filter((r) => r !== "oro");
  const reference = CROWN.reference === "oro" ? realm.oro : goods.reduce((a, r) => a + realm[r], 0) / goods.length;
  for (const r of goods) {
    const scarcity = ((reference + 10) / (realm[r] + 10)) ** CROWN.scarcity;
    const value = Math.min(CROWN.max, Math.max(CROWN.min, CROWN.base * scarcity * (1 + CROWN.demandStep * net[r])));
    sell[r] = value * CROWN.sellMarkup;
    buy[r] = value * CROWN.buyMarkdown;
  }
  return { sell, buy };
}
