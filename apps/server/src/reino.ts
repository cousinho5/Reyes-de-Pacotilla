// Bloque 11: lo que la pestaña Reino necesita de las fotos de Prestigio. El
// total de cada casa ya es público en la clasificación: nada sale de la niebla.

export interface Snapshot {
  house_id: number;
  resolution_no: number;
  total: number;
}

/** Prestigio de cada casa (por su id) en un momento de la partida. */
export type Totals = Record<number, number>;

export interface PrestigeHistory {
  /** Un punto por semana acabada, con la foto del domingo. */
  semanas: { semana: number; totales: Totals }[];
  /** La foto de la noche anterior a la última, para las flechas de la clasificación. */
  anterior: { resolucion: number; totales: Totals } | null;
  /** Al acabar, el Prestigio final (con el objetivo secreto). */
  final: Totals | null;
}

export function prestigeHistory(rows: Snapshot[], perWeek: number, current: number, totalResolutions: number): PrestigeHistory {
  const at = (n: number) => {
    const found = rows.filter((r) => r.resolution_no === n);
    return found.length ? Object.fromEntries(found.map((r) => [r.house_id, r.total])) : null;
  };
  const semanas: PrestigeHistory["semanas"] = [];
  for (let w = 1; w * perWeek <= Math.min(current, totalResolutions); w++) {
    const totales = at(w * perWeek);
    if (totales) semanas.push({ semana: w, totales });
  }
  const before = at(current - 1);
  return {
    semanas,
    anterior: current > 1 && before ? { resolucion: current - 1, totales: before } : null,
    final: at(totalResolutions + 1),
  };
}

/** Casas que pelearon en un combate: el defensor, cada bando y quienes iban con ellos. */
export function combatHouses(c: Record<string, unknown>): Set<number> {
  const out = new Set<number>();
  const add = (h: unknown) => typeof h === "number" && out.add(h);
  add(c.previousOwner);
  for (const s of Array.isArray(c.sides) ? (c.sides as { house?: unknown; joint?: unknown[] }[]) : []) {
    add(s?.house);
    for (const j of s?.joint ?? []) add(j);
  }
  for (const a of Array.isArray(c.allies) ? c.allies : []) add(a);
  return out;
}

export interface Relation {
  /** Batallas entre las dos casas que ganó esta casa (la que mira) y que perdió. */
  ganadas: number;
  perdidas: number;
  /** Tratos válidos cerrados entre las dos. */
  tratos: number;
}

/** Bloque 11: «qué relación tiene contigo» en la ficha de casa, con sucesos públicos. */
export function relations(
  me: number,
  others: number[],
  combats: Record<string, unknown>[],
  trades: { house_a: number; house_b: number }[],
): Map<number, Relation> {
  const out = new Map(others.filter((h) => h !== me).map((h) => [h, { ganadas: 0, perdidas: 0, tratos: 0 }]));
  for (const c of combats) {
    const in_ = combatHouses(c);
    if (!in_.has(me)) continue;
    for (const [h, r] of out) {
      if (!in_.has(h)) continue;
      if (c.winner === me) r.ganadas++;
      else if (c.winner === h) r.perdidas++;
    }
  }
  for (const t of trades) {
    const other = t.house_a === me ? t.house_b : t.house_b === me ? t.house_a : null;
    const r = other != null ? out.get(other) : undefined;
    if (r) r.tratos++;
  }
  return out;
}
