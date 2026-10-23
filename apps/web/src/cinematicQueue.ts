// Bloque 13: qué cinemáticas salen solas al entrar. Van en orden y, si hay
// muchas pendientes (quien vuelve tras varios días), solo las MAX_AUTO últimas;
// las demás se dan por pasadas y quedan como nuevas en la lista de Reino. El
// prólogo y la coronación salen siempre. Con el ajuste «solo prólogo y
// coronación» (`essential`), las demás se pasan todas.

import type { CinematicItem } from "./api";

export const MAX_AUTO = 2;
const ALWAYS = new Set<CinematicItem["tipo"]>(["prologo", "coronacion"]);

export function autoQueue(
  items: readonly CinematicItem[],
  playable: (i: CinematicItem) => boolean,
  seenHere: ReadonlySet<string> = new Set(),
  essential = false,
): { play: CinematicItem[]; skip: CinematicItem[] } {
  const pending = items.filter((i) => !i.vista && i.sola && playable(i) && !seenHere.has(i.clave)).sort((a, b) => a.orden - b.orden);
  const minor = pending.filter((i) => !ALWAYS.has(i.tipo));
  const skip = minor.slice(0, essential ? minor.length : Math.max(0, minor.length - MAX_AUTO));
  const skipped = new Set(skip.map((i) => i.clave));
  return { play: pending.filter((i) => !skipped.has(i.clave)), skip };
}

/** Las que este cliente sabe dibujar (cinematics.tsx). */
export const canPlay = (item: CinematicItem) => item.tipo === "prologo" || (item.tipo === "evento" && !!item.datos);

const KIND_NAME: Record<CinematicItem["tipo"], string> = {
  prologo: "Prólogo: la muerte del rey",
  evento: "Evento de la semana",
  fantasma: "El fantasma de Aldric",
  ultima: "La última semana",
  coronacion: "La coronación",
};

/** Nombre en la lista de Reino. */
export function cinematicTitle(item: CinematicItem): string {
  const name = typeof item.datos?.nombre === "string" ? item.datos.nombre : null;
  if (item.tipo === "evento" && name) return `Semana ${item.semana}: ${name}`;
  if (item.tipo === "fantasma") return `${KIND_NAME.fantasma} (semana ${item.semana})`;
  return KIND_NAME[item.tipo];
}

/** Lo visto en este navegador, por si aún no ha llegado al servidor (sin red). */
export function seenHere(game: number): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(`cinematicas:${game}`) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markSeenHere(game: number, keys: string[]) {
  try {
    const all = seenHere(game);
    keys.forEach((k) => all.add(k));
    localStorage.setItem(`cinematicas:${game}`, JSON.stringify([...all]));
  } catch {
    /* sin almacenamiento: el servidor lo recuerda igual */
  }
}
