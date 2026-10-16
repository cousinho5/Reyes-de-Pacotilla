// Comercio (diseño, sección 9): ofertas de "doy X, pido Y" que se ejecutan de
// forma atómica. Aquí solo las comprobaciones puras; el servidor las aplica.

import { RESOURCES, type Resources } from "./types";
import { canAfford } from "./economy";

export const MAX_OPEN_PUBLIC_OFFERS = 3;
export const MAX_PER_RESOURCE = 500;

export function totalOf(r: Partial<Resources>): number {
  return RESOURCES.reduce((a, k) => a + (r[k] ?? 0), 0);
}

/** Normaliza un paquete de recursos: solo enteros positivos de recursos conocidos. */
export function cleanBundle(input: unknown): Partial<Resources> | null {
  if (!input || typeof input !== "object") return null;
  const out: Partial<Resources> = {};
  for (const r of RESOURCES) {
    const v = (input as Record<string, unknown>)[r];
    if (v == null || v === 0) continue;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > MAX_PER_RESOURCE) return null;
    out[r] = v;
  }
  return out;
}

export function checkOffer(
  give: Partial<Resources> | null,
  want: Partial<Resources> | null,
  have: Resources,
): { ok: true } | { ok: false; error: string } {
  if (!give || !want) return { ok: false, error: "Cantidades no válidas." };
  if (totalOf(give) === 0 || totalOf(want) === 0) return { ok: false, error: "Hay que ofrecer algo y pedir algo." };
  if (RESOURCES.some((r) => (give[r] ?? 0) > 0 && (want[r] ?? 0) > 0)) {
    return { ok: false, error: "No tiene sentido dar y pedir el mismo recurso." };
  }
  if (!canAfford(have, give)) return { ok: false, error: "No tienes lo que ofreces." };
  return { ok: true };
}
