// Repetición narrada (bloque 3, paso 3): una frase de Fray Abundio en cada paso
// de la repetición de la noche, con las cifras exactas. Sale de la semilla de la
// noche, así que al volver a verla dice lo mismo, y no repite variante en la
// misma noche. Cuando el combate es de la casa que mira, le habla de «vuestra
// merced».

import { fill, houseInSentence } from "./bulletin";
import { seededRandom } from "./random";
import { PHRASES, type PhraseKey } from "./texts/cronista";
import type { HouseId, TileId } from "./types";

/** Un paso de la repetición, con los datos de su evento tal como se guardan. */
export type NightStepFacts =
  | { kind: "combate" | "choque" | "rebote" | "tregua" | "capitan"; data: Record<string, unknown> }
  | { kind: "asedio" | "repliegue"; data: Record<string, unknown>[] }
  | { kind: "marcha" | "fin" };

export interface NightContext {
  seed: string;
  /** Casa que mira la repetición (para «vuestra merced»). */
  me?: HouseId | null;
  /** Nombre de cada casa tal cual ("Casa del Nabo"). */
  houseName: (id: HouseId) => string | undefined;
  tileName: (id: TileId) => string | undefined;
}

type Side = { house: HouseId | null; role: string; troops: number; joint?: HouseId[] };

/**
 * Una línea por paso, o null si el paso no tiene frase del banco (la
 * repetición pone entonces su texto de siempre).
 */
export function narrateNight(steps: NightStepFacts[], ctx: NightContext): (string | null)[] {
  const rand = seededRandom(`${ctx.seed}:noche`);
  const used = new Set<string>();
  const name = (id: unknown) => {
    const n = id == null ? undefined : ctx.houseName(id as HouseId);
    return n ? houseInSentence(n) : "la guarnición neutral";
  };
  const tile = (id: unknown) => ctx.tileName(id as TileId) ?? "una casilla";
  const say = (key: PhraseKey, vars: Record<string, string | number>): string => {
    const all = (PHRASES[key] as readonly string[]).map((t, i) => ({ t, i }));
    const fresh = all.filter((x) => !used.has(`${key}.${x.i}`));
    const pool = fresh.length > 0 ? fresh : all;
    const pick = pool[Math.floor(rand() * pool.length)]!;
    used.add(`${key}.${pick.i}`);
    return capitalize(fill(pick.t, vars));
  };
  const me = ctx.me ?? null;

  return steps.map((s) => {
    switch (s.kind) {
      case "combate": {
        const d = s.data;
        const sides = (d.sides ?? []) as Side[];
        const def = sides.find((x) => x.role === "defensa");
        const atk = sides.filter((x) => x.role === "ataque");
        const winner = d.winner as HouseId | null;
        const casilla = tile(d.tile);
        if (d.conquered === true) {
          const w = atk.find((x) => x.house === winner);
          const band = atk.filter((x) => x.house === winner || (w?.joint ?? []).includes(x.house as HouseId));
          const vars = { ganador: name(winner), perdedor: name(d.previousOwner), casilla, n: band.reduce((a, x) => a + x.troops, 0), m: def?.troops ?? 0 };
          if (d.previousOwner == null) return say(me != null && winner === me ? "noche.neutral_tu" : "noche.neutral", vars);
          if (me != null && winner === me) return say("noche.ganas", vars);
          if (me != null && d.previousOwner === me) return say("noche.pierdes", vars);
          return say("noche.gana", vars);
        }
        // Resiste quien defendía (una casa o la guarnición neutral).
        const first = [...atk].sort((a, b) => b.troops - a.troops)[0];
        if (!def || !first) return null;
        const vars = { defensor: name(def.house), atacante: name(first.house), casilla, n: def.troops, m: first.troops };
        if (me != null && def.house === me) return say("noche.resistes", vars);
        if (me != null && atk.some((x) => x.house === me)) {
          const mine = atk.find((x) => x.house === me)!;
          return say("noche.fallas", { ...vars, m: mine.troops });
        }
        return say("noche.resiste", vars);
      }
      case "choque": {
        const d = s.data;
        if (d.winner == null) return null;
        const sides = (d.sides ?? []) as { house: HouseId }[];
        return say("noche.choque", { a: name(sides[0]?.house), b: name(sides[1]?.house), ganador: name(d.winner) });
      }
      case "rebote": {
        const hs = (s.data.houses ?? []) as HouseId[];
        return say("noche.rebote", { a: name(hs[0]), b: name(hs[1]), casilla: tile(s.data.tile) });
      }
      case "tregua":
        return say("noche.tregua", { casilla: tile(s.data.tile) });
      case "capitan":
        return say("noche.capitan", { captor: name(s.data.by), jugador: name(s.data.house), casilla: tile(s.data.tile) });
      case "asedio": {
        // Varios asedios a la vez: la repetición los cuenta sin frase.
        if (s.data.length !== 1) return null;
        const d = s.data[0]!;
        return say("noche.asedio", { sitiador: name(d.house), casilla: tile(d.tile), noches: Number(d.nights) });
      }
      case "repliegue": {
        if (s.data.length !== 1) return null;
        const d = s.data[0]!;
        return say("noche.repliegue", { jugador: name(d.house), n: Number(d.troops), destino: tile(d.to) });
      }
      case "fin":
        return say("noche.fin", {});
      case "marcha":
        return null;
    }
  });
}

function capitalize(s: string): string {
  return s.replace(/^([¡¿«"'(\s]*)(\p{L})/u, (_, lead: string, c: string) => lead + c.toUpperCase());
}
