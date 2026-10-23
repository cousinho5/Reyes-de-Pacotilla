// Mensajes de la interfaz y notificaciones con frases variadas del banco
// (bloque 3, paso 9; banco, sección 11). Siempre la información primero.

import { fill } from "./bulletin";
import { PHRASES, type PhraseKey } from "./texts/cronista";
import type { CampaignEvent, HouseId, TileId } from "./types";

/** La variante `pick` (cualquier entero: se da la vuelta) de un aviso, rellena y con mayúscula. */
export function noticeText(key: PhraseKey, pick: number, vars: Record<string, string | number> = {}): string {
  const all = PHRASES[key] as readonly string[];
  const text = fill(all[Math.abs(Math.trunc(pick)) % all.length]!, vars);
  return text.replace(/^([¡¿«"'(\s]*)(\p{L})/u, (_, lead: string, c: string) => lead + c.toUpperCase());
}

export interface CombatNotice {
  key: "aviso.combate_gana" | "aviso.combate_resiste" | "aviso.combate_pierde" | "aviso.combate_falla";
  tile: TileId;
  /** Tropas que quedan en la casilla (gana o resiste) o que vuelven (falla). */
  troops: number;
  /** Otros combates de la casa esa noche. */
  more: number;
}

/**
 * El combate más importante de una casa en una noche, para su notificación:
 * primero lo que pierde, luego lo que gana, luego lo que resiste y al final
 * sus ataques fallidos. Null si la casa no ha luchado.
 */
export function combatNotice(events: CampaignEvent[], house: HouseId): CombatNotice | null {
  const found: CombatNotice[] = [];
  for (const e of events) {
    if (e.type !== "combate") continue;
    const side = e.sides.find((s) => s.house === house);
    if (!side) continue;
    const kept = e.kept?.find((k) => k.house === house)?.troops ?? e.survivors;
    if (e.conquered && e.previousOwner === house) found.push({ key: "aviso.combate_pierde", tile: e.tile, troops: 0, more: 0 });
    else if (e.conquered && e.winner === house) found.push({ key: "aviso.combate_gana", tile: e.tile, troops: kept, more: 0 });
    else if (side.role === "defensa" && e.winner === house) found.push({ key: "aviso.combate_resiste", tile: e.tile, troops: kept, more: 0 });
    else if (side.role === "ataque" && e.winner !== house) {
      const back = events.find((r) => r.type === "repliegue" && r.house === house && r.from === e.tile);
      found.push({ key: "aviso.combate_falla", tile: e.tile, troops: back?.type === "repliegue" ? back.troops : 0, more: 0 });
    }
  }
  if (found.length === 0) return null;
  const order: CombatNotice["key"][] = ["aviso.combate_pierde", "aviso.combate_gana", "aviso.combate_resiste", "aviso.combate_falla"];
  const best = [...found].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))[0]!;
  return { ...best, more: found.length - 1 };
}
