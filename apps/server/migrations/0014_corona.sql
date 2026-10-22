-- Cambio con la Corona (bloque 5, punto 2). La Corona solo vende, sin tope. Cada
-- compra queda aquí: el precio sube con las unidades compradas en los últimos 7
-- días entre todas las casas. `at` es la hora de la partida (gameNow).
CREATE TABLE crown_purchases (
  id        INTEGER PRIMARY KEY,
  game_id   INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  house_id  INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  resource  TEXT    NOT NULL CHECK (resource IN ('pan','madera','piedra','hierro')),
  units     INTEGER NOT NULL CHECK (units > 0),
  gold      INTEGER NOT NULL CHECK (gold >= 0),
  at        TEXT    NOT NULL
);
CREATE INDEX crown_purchases_by_game ON crown_purchases(game_id, at);
