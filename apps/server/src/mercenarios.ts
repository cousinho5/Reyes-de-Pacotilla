// Mercenarios de alquiler (bloque 5): contratarlos (app.ts y los bots de
// pruebas.ts) y despedirlos al amanecer del día en que cumplen (jobs.ts, en el
// mismo lote que la producción, como en el simulador).

import { MERCENARIES, dismissTroops, guestTroops, localDate, mercenariesAlive, mercenaryCost, type Tile } from "@reyes/engine";
import { gameNow, guestStatements, type GameRow, type HouseRow } from "./state";

export interface MercenaryRow {
  id: number;
  house_id: number;
  units: number;
  leaves_on: string;
}

/** AAAA-MM-DD más `n` días. */
export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
}

export async function loadMercenaries(db: D1Database, gameId: number): Promise<MercenaryRow[]> {
  const { results } = await db
    .prepare("SELECT id, house_id, units, leaves_on FROM mercenaries WHERE game_id = ? ORDER BY leaves_on, id")
    .bind(gameId)
    .all<MercenaryRow>();
  return results;
}

/** El día (fecha local) en que se van los que se contratan ahora. */
export function leavingDay(game: GameRow): string {
  return addDays(localDate(gameNow(game), game.timezone), MERCENARIES.days);
}

/**
 * El lote de una contratación: cobra el Oro, pone las tropas en el castillo y
 * apunta cuándo se van. Si falta Oro, el CHECK de la base de datos lo deshace.
 */
export function hireStatements(db: D1Database, game: GameRow, house: HouseRow, n: number): D1PreparedStatement[] {
  const gold = mercenaryCost(n);
  return [
    db.prepare("UPDATE houses SET oro = oro - ? WHERE id = ?").bind(gold, house.id),
    db.prepare("UPDATE tiles SET troops = troops + ? WHERE game_id = ? AND castle_of = ?").bind(n, game.id, house.id),
    db.prepare("INSERT INTO mercenaries (game_id, house_id, units, gold, hired_at, leaves_on) VALUES (?, ?, ?, ?, ?, ?)").bind(
      game.id,
      house.id,
      n,
      gold,
      gameNow(game).toISOString(),
      leavingDay(game),
    ),
  ];
}

/**
 * Al amanecer de `date`: se van los mercenarios que cumplen (se quitan sus
 * tropas, primero del castillo) y, si a una casa le quedan menos tropas que
 * mercenarios, se descuentan los que murieron. Devuelve las sentencias para el
 * lote de la producción. Cada casilla solo se escribe si nadie la ha tocado
 * entretanto.
 */
export function mercenaryDawnStatements(
  db: D1Database,
  game: GameRow,
  date: string,
  rows: MercenaryRow[],
  tiles: Tile[],
): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = [];
  let current = tiles;
  for (const house of [...new Set(rows.map((r) => r.house_id))]) {
    const mine = rows.filter((r) => r.house_id === house);
    const due = mine.filter((r) => r.leaves_on <= date);
    const stay = mine.filter((r) => r.leaves_on > date);
    const leaving = due.reduce((a, r) => a + r.units, 0);
    let removed = 0;
    if (leaving > 0) {
      const out = dismissTroops(current, house, leaving);
      current = out.tiles;
      removed = out.removed;
    }
    for (const r of due) statements.push(db.prepare("DELETE FROM mercenaries WHERE id = ?").bind(r.id));
    // Las tropas de paso (bloque 8) también son de la casa.
    const troops = current.filter((t) => t.owner === house).reduce((a, t) => a + t.troops, 0) + guestTroops(current, house);
    const alive = mercenariesAlive(
      stay.map((r) => r.units),
      troops,
    );
    // Los que murieron ya no se quitan al cumplir: solo se corrige la cuenta.
    stay.forEach((r, i) => {
      if (alive[i] === r.units) return;
      statements.push(
        alive[i]! > 0
          ? db.prepare("UPDATE mercenaries SET units = ? WHERE id = ?").bind(alive[i], r.id)
          : db.prepare("DELETE FROM mercenaries WHERE id = ?").bind(r.id),
      );
    });
    if (leaving > 0) {
      statements.push(
        db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) VALUES (?, 'mercenarios', ?, ?)").bind(
          game.id,
          house,
          JSON.stringify({ house, units: removed, dead: leaving - removed }),
        ),
      );
    }
  }
  const before = new Map(tiles.map((t) => [t.id, t]));
  for (const t of current) {
    const old = before.get(t.id)!;
    if (old.troops === t.troops && (old.jinetes ?? 0) === (t.jinetes ?? 0) && (old.catapultas ?? 0) === (t.catapultas ?? 0)) continue;
    statements.push(
      db.prepare(
        "UPDATE tiles SET troops = ?, jinetes = ?, catapultas = ? WHERE id = ? AND owner_house_id = ? AND troops = ? AND jinetes = ? AND catapultas = ?",
      ).bind(t.troops, t.jinetes ?? 0, t.catapultas ?? 0, t.id, t.owner, old.troops, old.jinetes ?? 0, old.catapultas ?? 0),
    );
  }
  // Bloque 8: si se fueron mercenarios de las tropas de paso.
  statements.push(...guestStatements(db, game.id, tiles, current));
  return statements;
}

/** Mercenarios que tiene ahora cada casa (no comen el domingo). */
export function mercenaryCount(rows: MercenaryRow[], house: number): number {
  return rows.filter((r) => r.house_id === house).reduce((a, r) => a + r.units, 0);
}
