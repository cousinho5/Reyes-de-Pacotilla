// Bloque 3: qué boletines ha leído ya esta casa (en este navegador), para la ventana emergente.

import type { GameState } from "./api";

export const bulletinKey = (b: { semana: number; edicion?: "domingo" | "miercoles" }) => `${b.semana}:${b.edicion ?? "domingo"}`;

/** El último boletín que esta casa ha visto (en este navegador). */
export function bulletinSeen(game: number): string | null {
  try {
    return localStorage.getItem(`boletin:${game}`);
  } catch {
    // Sin almacenamiento no se sabe: mejor no insistir con la ventana.
    return "?";
  }
}
export function markBulletinSeen(game: number, key: string) {
  try {
    localStorage.setItem(`boletin:${game}`, key);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

/** Los boletines sin leer, del más nuevo al más viejo (la Crónica Definitiva, la primera). */
export function unreadBulletins(state: GameState): { semana: number; edicion?: "domingo" | "miercoles" }[] {
  const list = [...(state.boletines ?? [])].sort((a, b) => (a.semana === 0 ? -1 : b.semana === 0 ? 1 : 0));
  const seen = bulletinSeen(state.partida.id);
  if (seen === "?") return [];
  const at = seen == null ? list.length : list.findIndex((b) => bulletinKey(b) === seen);
  return list.slice(0, at < 0 ? list.length : at);
}
