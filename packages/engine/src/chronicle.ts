// La Crónica Definitiva (diseño 17.7, bloque 3 punto 4): al acabar la partida,
// Fray Abundio cuenta los momentos clave del interregno a favor del ganador.
// Las cifras no cambian; solo los adjetivos. Sale de los hechos públicos del
// registro y de la clasificación de cada domingo.

import { houseInSentence, fill, type Bulletin, type BulletinHouse, type BulletinSection } from "./bulletin";
import type { LoggedFact } from "./memory";
import { seededRandom } from "./random";
import { PHRASES, type PhraseKey } from "./texts/cronista";
import type { HouseId, TileId } from "./types";

export interface ChronicleInput {
  seed: string;
  houses: BulletinHouse[];
  winner: HouseId;
  /** Hechos públicos de toda la partida, con su semana (`week`) y resolución. */
  facts: (LoggedFact & { week?: number | null })[];
  /** Clasificación de cada domingo, de la semana 1 a la última (primero, segundo…). */
  weeklyRanking: HouseId[][];
  tileNames: Map<TileId, string>;
}

/** Momentos por semana y en total (sin contar prólogo y epílogo). */
const PER_WEEK = 2;
const MAX_MOMENTS = 8;

interface Moment {
  week: number;
  key: PhraseKey;
  vars: Record<string, string | number>;
  filter?: (t: string) => boolean;
  /** Cuanto más alto, antes entra. */
  weight: number;
}

/** La Crónica Definitiva, con la forma de un boletín (semana 0) para leerla en el mismo pergamino. */
export function writeChronicle(input: ChronicleInput): Bulletin & { chronicle: true } {
  const rand = seededRandom(`${input.seed}:cronica`);
  const usedNow: string[] = [];
  const byId = new Map(input.houses.map((h) => [h.id, h]));
  const name = (id: unknown) => {
    const h = byId.get(id as HouseId);
    return h ? houseInSentence(h.name) : "la guarnición neutral";
  };
  const tile = (id: unknown) => input.tileNames.get(id as TileId) ?? "una casilla";
  const w = input.winner;
  const ganador = name(w);
  const say = (key: PhraseKey, vars: Record<string, string | number>, filter?: (t: string) => boolean): string => {
    const all = (PHRASES[key] as readonly string[]).map((t, i) => ({ t, i })).filter((x) => !filter || filter(x.t));
    // Solo variantes que se pueden rellenar enteras.
    const ok = all.filter((x) => [...x.t.matchAll(/\{([^}]+)\}/g)].every((m) => m[1]! in vars));
    // Sin repetir variante mientras queden otras.
    const fresh = ok.filter((x) => !usedNow.includes(`${key}.${x.i}`));
    const pool = fresh.length > 0 ? fresh : ok.length > 0 ? ok : all;
    const pick = pool[Math.floor(rand() * pool.length)]!;
    usedNow.push(`${key}.${pick.i}`);
    return fill(pick.t, vars);
  };

  const moments: Moment[] = [];
  const fights = input.facts.filter((f) => f.type === "combate" && f.week != null);
  const sideOf = (f: LoggedFact, h: HouseId) =>
    ((f.data.sides ?? []) as { house: HouseId | null; troops: number; role: string }[]).find((s) => s.house === h);

  for (const f of fights) {
    const week = f.week!;
    const d = f.data;
    const conquered = d.conquered === true;
    // Conquista del ganador a otra casa.
    if (conquered && d.winner === w && d.previousOwner != null) {
      const n = sideOf(f, w)?.troops ?? 0;
      const m = sideOf(f, d.previousOwner as HouseId)?.troops ?? 0;
      moments.push({ week, key: "cronica.conquista", vars: { ganador, semanas: week, casilla: tile(d.tile), n, m }, weight: 2 + n / 100 });
    }
    // Conquista del ganador a una guarnición neutral: de relleno, si la semana no da para más.
    if (conquered && d.winner === w && d.previousOwner == null) {
      const n = sideOf(f, w)?.troops ?? 0;
      const m = ((d.sides ?? []) as { role: string; troops: number }[]).find((x) => x.role === "defensa")?.troops ?? 0;
      moments.push({ week, key: "cronica.conquista", vars: { ganador, semanas: week, casilla: tile(d.tile), n, m }, weight: 1 + n / 100 });
    }
    // Derrota del ganador: pierde una casilla, o un ataque suyo fracasa.
    const lost = conquered && d.previousOwner === w && d.winner != null;
    const failed = !conquered && d.winner !== w && sideOf(f, w)?.role === "ataque";
    if (lost || failed) {
      const mine = sideOf(f, w)?.troops ?? 0;
      const rival = lost ? (d.winner as HouseId) : (d.winner as HouseId | null);
      if (mine > 0 && rival != null) {
        moments.push({
          week,
          key: "cronica.derrota",
          vars: { ganador, semanas: week, casilla: tile(d.tile), m: mine, rival: name(rival) },
          weight: 3 + mine / 100,
        });
      }
    }
  }
  for (const f of input.facts.filter((x) => x.type === "alianza_rota" && x.data.by === w && x.week != null)) {
    moments.push({ week: f.week!, key: "cronica.traicion", vars: { ganador, pacto: String(f.data.name ?? "alianza sin nombre") }, weight: 4 });
  }
  // La peor semana del ganador (si no fue siempre arriba).
  const places = input.weeklyRanking.map((r, i) => ({ week: i + 1, place: r.indexOf(w) + 1, last: r.length }));
  const worst = places.filter((p) => p.place >= 3).sort((a, b) => b.place - a.place || a.week - b.week)[0];
  if (worst) {
    const last = worst.place === worst.last;
    const vars: Record<string, string | number> = last ? { ganador } : { ganador, semanas: worst.week, antes: worst.place };
    // «Fue último» solo si lo fue.
    moments.push({ week: worst.week, key: "cronica.peor", vars, weight: 5, filter: (t) => last || !t.includes("último") });
  }

  // Dos momentos por semana como mucho, los de más peso, y ocho en total.
  const chosen: Moment[] = [];
  const weeks = [...new Set(moments.map((m) => m.week))].sort((a, b) => a - b);
  for (const week of weeks) {
    const best = moments.filter((m) => m.week === week).sort((a, b) => b.weight - a.weight);
    // Mejor dos de tipos distintos; si no los hay, dos del mismo.
    const first = best[0]!;
    const second = best.find((m) => m.key !== first.key) ?? best[1];
    chosen.push(first, ...(second && PER_WEEK > 1 ? [second] : []));
  }
  while (chosen.length > MAX_MOMENTS) {
    // Sobra: fuera el de menos peso.
    const idx = chosen.reduce((lo, m, i) => (m.weight < chosen[lo]!.weight ? i : lo), 0);
    chosen.splice(idx, 1);
  }

  const sections: BulletinSection[] = [{ title: "Prólogo", lines: [say("cronica.apertura", { ganador })] }];
  for (const week of [...new Set(chosen.map((m) => m.week))].sort((a, b) => a - b)) {
    sections.push({ title: `Semana ${week}`, lines: chosen.filter((m) => m.week === week).map((m) => say(m.key, m.vars, m.filter)) });
  }
  // El rival más tenaz del ganador: con quien más combates tuvo.
  const versus = new Map<HouseId, number>();
  for (const f of fights) {
    const hs = ((f.data.sides ?? []) as { house: HouseId | null }[]).map((s) => s.house);
    if (!hs.includes(w)) continue;
    for (const h of new Set(hs)) if (h != null && h !== w) versus.set(h, (versus.get(h) ?? 0) + 1);
  }
  const rival = [...versus.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  const epilogue: string[] = [];
  if (rival && rival[1] >= 2) epilogue.push(say("cronica.rival", { ganador, rival: name(rival[0]), veces: rival[1] }));
  epilogue.push(say("cronica.cierre", { ganador }));
  sections.push({ title: "Epílogo", lines: epilogue });

  return {
    week: 0,
    chronicle: true,
    headline: `CRÓNICA DEFINITIVA DEL INTERREGNO`,
    mood: "adulador",
    sections: sections.map((s) => ({ ...s, lines: s.lines.map(capitalizeFirst) })),
    margin: [],
    sponsors: [],
    leader: w,
    used: usedNow,
  };
}

function capitalizeFirst(s: string): string {
  return s.replace(/^([¡¿«"'(\s]*)(\p{L})/u, (_, lead: string, c: string) => lead + c.toUpperCase());
}
