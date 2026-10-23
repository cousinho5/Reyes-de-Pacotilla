// Memoria de Fray Abundio (bloque 3, punto 5): rivalidades, venganzas, récords,
// rachas y remontadas, a partir del registro público de la partida. Solo dentro
// de cada partida. Aquí se detecta qué recordar; las frases las pone el boletín.

import type { PhraseKey } from "./texts/cronista";
import type { HouseId, TileId } from "./types";

/** Un hecho del registro con la resolución en la que pasó (null si no fue en una). */
export interface LoggedFact {
  type: string;
  data: Record<string, unknown>;
  resolution?: number | null;
}

export interface MemoryInput {
  /** Hechos públicos anteriores al boletín (de toda la partida). */
  past: LoggedFact[];
  /** Hechos públicos de este boletín. */
  now: LoggedFact[];
  /** Clasificación del boletín del domingo anterior (primero, segundo…) y la de ahora. */
  previousRanking?: HouseId[];
  ranking?: HouseId[];
}

export interface Memory {
  key: PhraseKey;
  /** Cifras y casas: las casas van como HouseId y las casillas como TileId; el boletín pone los nombres. */
  houses: Record<string, HouseId>;
  tiles: Record<string, TileId>;
  numbers: Record<string, number>;
}

/** Combates seguidos entre dos casas a partir de los que se vuelve a contar la rivalidad. */
export const RIVALRY_MILESTONES = [3, 5, 8, 12, 20];
/** Rachas de noches seguidas conquistando que merecen línea. */
export const STREAK_MILESTONES = [3, 5, 7, 10];
/** Una batalla entra en los récords con este total de tropas como mínimo. */
export const RECORD_BATTLE_MIN = 12;
/** Un asedio entra en los récords con estas noches como mínimo. */
export const RECORD_SIEGE_MIN = 4;
/** Puestos que hay que subir en una semana para que sea remontada. */
export const COMEBACK_PLACES = 3;

interface Fight {
  tile: TileId;
  winner: HouseId | null;
  previousOwner: HouseId | null;
  conquered: boolean;
  houses: HouseId[];
  troops: number;
  resolution: number | null;
}

function fights(facts: LoggedFact[]): Fight[] {
  return facts
    .filter((f) => f.type === "combate")
    .map((f) => {
      const sides = (f.data.sides ?? []) as { house: HouseId | null; troops: number }[];
      return {
        tile: f.data.tile as TileId,
        winner: (f.data.winner ?? null) as HouseId | null,
        previousOwner: (f.data.previousOwner ?? null) as HouseId | null,
        conquered: f.data.conquered === true,
        houses: [...new Set(sides.map((s) => s.house).filter((h): h is HouseId => h != null))],
        troops: sides.reduce((a, s) => a + (s.troops ?? 0), 0),
        resolution: f.resolution ?? null,
      };
    });
}

const pairKey = (a: HouseId, b: HouseId) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/**
 * Lo que el cronista recuerda en este boletín, de lo más sonado a lo menos.
 * Determinista: el orden depende solo de los hechos.
 */
export function findMemories(input: MemoryInput): Memory[] {
  const out: Memory[] = [];
  const past = fights(input.past);
  const now = fights(input.now);

  // Venganza: recupera una casilla que antes le quitó esa misma casa.
  for (const f of now) {
    if (!f.conquered || f.winner == null || f.previousOwner == null) continue;
    const taken = [...past, ...now.slice(0, now.indexOf(f))]
      .filter((p) => p.tile === f.tile && p.conquered && p.winner === f.previousOwner && p.previousOwner === f.winner)
      .at(-1);
    if (!taken) continue;
    const nights = taken.resolution != null && f.resolution != null ? f.resolution - taken.resolution : null;
    out.push({
      key: "memoria.venganza",
      houses: { jugador: f.winner, rival: f.previousOwner },
      tiles: { casilla: f.tile },
      numbers: nights != null && nights > 0 ? { noches: nights } : {},
    });
    break;
  }

  // Récord: la batalla con más tropas de toda la partida (y de un tamaño respetable).
  const before = Math.max(0, ...past.map((p) => p.troops));
  const biggest = [...now].sort((a, b) => b.troops - a.troops)[0];
  if (biggest && biggest.troops >= RECORD_BATTLE_MIN && biggest.troops > before && biggest.houses.length > 0) {
    out.push({
      key: "memoria.record_batalla",
      houses: biggest.winner != null ? { ganador: biggest.winner } : {},
      tiles: { casilla: biggest.tile },
      numbers: { n: biggest.troops },
    });
  }

  // Remontada y caída del líder (solo con las dos clasificaciones).
  if (input.previousRanking && input.ranking) {
    const prev = input.previousRanking;
    const rank = input.ranking;
    const lastPlace = prev.length;
    const comeback = rank
      .map((h) => ({ h, antes: prev.indexOf(h) + 1, ahora: rank.indexOf(h) + 1 }))
      .filter((r) => r.antes > 0 && (r.antes - r.ahora >= COMEBACK_PLACES || (r.antes === lastPlace && lastPlace >= 4 && r.ahora <= 3)))
      .sort((a, b) => b.antes - b.ahora - (a.antes - a.ahora) || a.ahora - b.ahora)[0];
    if (comeback) out.push({ key: "memoria.remontada", houses: { jugador: comeback.h }, tiles: {}, numbers: { antes: comeback.antes, ahora: comeback.ahora } });
    const fallen = prev[0];
    const now1 = fallen != null ? rank.indexOf(fallen) + 1 : 0;
    if (fallen != null && now1 >= 3) out.push({ key: "memoria.caida", houses: { jugador: fallen }, tiles: {}, numbers: { ahora: now1 } });
  }

  // Rivalidad: dos casas que se vuelven a enfrentar y llegan a una cifra redonda.
  const count = new Map<string, number>();
  for (const p of past) if (p.houses.length === 2) count.set(pairKey(p.houses[0]!, p.houses[1]!), (count.get(pairKey(p.houses[0]!, p.houses[1]!)) ?? 0) + 1);
  const rivalries: Memory[] = [];
  for (const f of now) {
    if (f.houses.length !== 2) continue;
    const k = pairKey(f.houses[0]!, f.houses[1]!);
    const n = (count.get(k) ?? 0) + 1;
    count.set(k, n);
    if (RIVALRY_MILESTONES.includes(n)) {
      const [a, b] = k.split("-").map(Number) as [HouseId, HouseId];
      rivalries.push({ key: "memoria.rivalidad", houses: { jugador: a, rival: b }, tiles: {}, numbers: { veces: n } });
    }
  }
  // De las que llegan a su cifra, la más larga.
  const rivalry = rivalries.sort((x, y) => y.numbers.veces! - x.numbers.veces!)[0];
  if (rivalry) out.push(rivalry);

  // Racha: noches seguidas conquistando algo, hasta la última de este boletín.
  const lastNight = Math.max(-1, ...now.map((f) => f.resolution ?? -1));
  if (lastNight > 0) {
    const conquests = new Map<HouseId, Set<number>>();
    for (const f of [...past, ...now]) {
      if (!f.conquered || f.winner == null || f.resolution == null) continue;
      if (!conquests.has(f.winner)) conquests.set(f.winner, new Set());
      conquests.get(f.winner)!.add(f.resolution);
    }
    const streaks = [...conquests.entries()]
      .map(([h, nights]) => {
        let k = 0;
        while (nights.has(lastNight - k)) k++;
        return { h, k };
      })
      .filter((s) => STREAK_MILESTONES.includes(s.k))
      .sort((a, b) => b.k - a.k || a.h - b.h);
    if (streaks[0]) out.push({ key: "memoria.racha", houses: { jugador: streaks[0].h }, tiles: {}, numbers: { veces: streaks[0].k } });
  }

  // Récord: el asedio más largo de la partida.
  const sieges = (facts: LoggedFact[]) => facts.filter((f) => f.type === "asedio").map((f) => ({ house: f.data.house as HouseId, tile: f.data.tile as TileId, nights: Number(f.data.nights) }));
  const longestBefore = Math.max(0, ...sieges(input.past).map((s) => s.nights));
  const siege = sieges(input.now).sort((a, b) => b.nights - a.nights)[0];
  if (siege && siege.nights >= RECORD_SIEGE_MIN && siege.nights > longestBefore) {
    out.push({ key: "memoria.record_asedio", houses: { sitiador: siege.house }, tiles: { casilla: siege.tile }, numbers: { noches: siege.nights } });
  }

  return out;
}
