// Cambio con la Corona (bloque 5 de la hoja de ruta): la Corona vende recursos
// por Oro a un precio que sube con la escasez en el reino y con lo que se le ha
// comprado en los últimos 7 días. Solo vende, y sin tope: cada unidad que se
// compra encarece la siguiente, también dentro de la misma compra.

import { CROWN } from "./rules";
import { RESOURCES, type Resource, type Resources } from "./types";

/** Recursos que vende la Corona (todos menos el Oro). */
export const CROWN_GOODS: Resource[] = RESOURCES.filter((r) => r !== "oro");

/**
 * Lo que necesita el precio de un recurso, sin la demanda: la escasez en el
 * reino. `realm`: lo que guardan entre todas las casas.
 */
function scarcityOf(realm: Resources, r: Resource): number {
  const reference = CROWN.reference === "oro" ? realm.oro : CROWN_GOODS.reduce((a, g) => a + realm[g], 0) / CROWN_GOODS.length;
  return ((reference + 10) / (realm[r] + 10)) ** CROWN.scarcity;
}

/**
 * Oro que cobra la Corona por una unidad de `r` cuando en los últimos 7 días
 * se le han comprado `bought` unidades de ese recurso (entre todas las casas).
 */
export function crownUnitPrice(realm: Resources, r: Resource, bought: number): number {
  const value = Math.min(CROWN.max, Math.max(CROWN.min, CROWN.base * scarcityOf(realm, r) * (1 + CROWN.demandStep * bought)));
  return value * CROWN.markup;
}

/** Precio de la próxima unidad de cada recurso (el Oro, a 1). */
export function crownPrices(realm: Resources, bought: Resources): Resources {
  const prices = { pan: 0, madera: 0, piedra: 0, hierro: 0, oro: 1 } as Resources;
  for (const r of CROWN_GOODS) prices[r] = crownUnitPrice(realm, r, bought[r]);
  return prices;
}

/**
 * Oro que cuesta comprar `units` de `r` de una vez: cada unidad al precio que
 * deja la anterior, y el total redondeado hacia arriba.
 */
export function crownQuote(realm: Resources, r: Resource, bought: number, units: number): number {
  let total = 0;
  for (let i = 0; i < units; i++) total += crownUnitPrice(realm, r, bought + i);
  // El redondeo quita el ruido de coma flotante antes de subir al entero.
  return Math.ceil(Math.round(total * 1e6) / 1e6);
}

/** Unidades de `r` que se pueden comprar con `gold` de Oro. */
export function crownAffordable(realm: Resources, r: Resource, bought: number, gold: number): number {
  let n = 0;
  let total = 0;
  for (;;) {
    const next = total + crownUnitPrice(realm, r, bought + n);
    if (Math.ceil(Math.round(next * 1e6) / 1e6) > gold) return n;
    total = next;
    n++;
  }
}

/**
 * Precio de referencia (bloque 10): lo que vale en Oro una unidad de `r` con
 * los precios de la Corona sin su recargo. `prices`: el precio de la próxima
 * unidad de cada recurso, como lo da `crownPrices` (el Oro vale 1).
 */
export function referenceUnit(prices: Partial<Resources>, r: Resource): number {
  return r === "oro" ? 1 : (prices[r] ?? 0) / CROWN.markup;
}

/** Lo que vale en Oro un lote con el precio de referencia, redondeado. */
export function referenceValue(bundle: Partial<Resources>, prices: Partial<Resources>): number {
  const total = RESOURCES.reduce((a, r) => a + (bundle[r] ?? 0) * referenceUnit(prices, r), 0);
  return Math.round(Math.round(total * 1e6) / 1e6);
}

/**
 * «Precio justo»: cuántas unidades de `r` valen lo mismo que `bundle`, con el
 * precio de referencia. Como poco 1; 0 si `r` no tiene precio.
 */
export function fairAmount(bundle: Partial<Resources>, prices: Partial<Resources>, r: Resource): number {
  const unit = referenceUnit(prices, r);
  if (unit <= 0) return 0;
  const total = RESOURCES.reduce((a, k) => a + (bundle[k] ?? 0) * referenceUnit(prices, k), 0);
  return Math.max(1, Math.round(Math.round((total / unit) * 1e6) / 1e6));
}
