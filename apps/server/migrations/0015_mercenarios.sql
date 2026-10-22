-- Mercenarios de alquiler (bloque 5, punto 3): 6 de Oro por tropa, aparecen en
-- el castillo como Mesnada, no comen Pan y se van solos a los 7 días. Cada fila
-- es una contratación: `units` baja si la casa se queda con menos tropas que
-- mercenarios (murieron), y la fila se borra el día `leaves_on` (fecha local de
-- la partida) al amanecer, cuando se quitan esas tropas.
CREATE TABLE mercenaries (
  id         INTEGER PRIMARY KEY,
  game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  house_id   INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  units      INTEGER NOT NULL CHECK (units > 0),
  gold       INTEGER NOT NULL CHECK (gold >= 0),
  hired_at   TEXT    NOT NULL,
  leaves_on  TEXT    NOT NULL
);
CREATE INDEX mercenaries_by_house ON mercenaries(house_id, leaves_on);
