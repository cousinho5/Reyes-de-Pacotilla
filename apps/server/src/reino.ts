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
