// Rescate del Capitán (bloque 4): el lote que paga un rescate, para las
// personas (app.ts) y los bots de las partidas de prueba (pruebas.ts).

/**
 * Paga `price` de Oro de `prisoner` a `captor` y devuelve el Capitán a su
 * castillo. Cada paso exige que el trato siga igual (mismo carcelero y mismo
 * precio) y la liberación va al final, así que si algo cambió entretanto no se
 * mueve nada. Si falta Oro, el CHECK de la base de datos deshace el lote entero.
 * El tercer resultado dice si se pagó (changes > 0).
 */
export function ransomStatements(
  db: D1Database,
  gameId: number,
  prisoner: number,
  captor: number,
  price: number,
  castleTile: number | null,
): D1PreparedStatement[] {
  const same = "SELECT 1 FROM houses WHERE id = ? AND captain_captured_by = ? AND captain_ransom = ?";
  return [
    db.prepare(`UPDATE houses SET oro = oro + ? WHERE id = ? AND EXISTS (${same})`).bind(price, captor, prisoner, captor, price),
    db.prepare(`UPDATE houses SET oro = oro - ? WHERE id = ? AND EXISTS (${same})`).bind(price, prisoner, prisoner, captor, price),
    db.prepare(
      "UPDATE houses SET captain_tile = ?, captain_captured_by = NULL, captain_free_at = NULL, captain_ransom = NULL WHERE id = ? AND captain_captured_by = ? AND captain_ransom = ?",
    ).bind(castleTile, prisoner, captor, price),
    db.prepare("INSERT INTO event_log (game_id, type, visible_to, payload) SELECT ?, 'capitan_libre', NULL, ? WHERE changes() > 0").bind(
      gameId,
      JSON.stringify({ house: prisoner, by: captor, reason: "rescate", oro: price }),
    ),
  ];
}
