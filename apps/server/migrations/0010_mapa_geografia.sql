-- Bloque 1 (mapa y losetas): tipos de casilla nuevos y la costa del mapa.
-- - prado: fase 1 (sin recursos, como el páramo). lago, aldea y ruinas se
--   añaden ya al CHECK para no rehacer la tabla en las fases 2 y 3.
-- - games.map_coast: lados con costa de los mapas con geografía; NULL en los
--   de antes (el dibujo pone el mar alrededor, como siempre).
-- SQLite no deja cambiar un CHECK, así que la tabla se vuelve a crear con los
-- mismos datos. Las órdenes y el Capitán apuntan a tiles(id): se apartan antes
-- y se devuelven después, como en 0005.
PRAGMA defer_foreign_keys = true;

CREATE TABLE orders_copia AS SELECT * FROM orders;
DELETE FROM orders;
CREATE TABLE capitanes_copia AS SELECT id, captain_tile FROM houses WHERE captain_tile IS NOT NULL;
UPDATE houses SET captain_tile = NULL WHERE captain_tile IS NOT NULL;

CREATE TABLE tiles_nueva (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  x               INTEGER NOT NULL,
  y               INTEGER NOT NULL,
  type            TEXT    NOT NULL CHECK (type IN
                  ('castillo','campos','bosque','cantera','montana','puerto','fortaleza','paramo',
                   'prado','lago','aldea','ruinas')),
  name            TEXT    NOT NULL,
  castle_of       INTEGER REFERENCES houses(id),
  owner_house_id  INTEGER REFERENCES houses(id),
  troops          INTEGER NOT NULL DEFAULT 0 CHECK (troops >= 0),
  fortified_until INTEGER,
  jinetes         INTEGER NOT NULL DEFAULT 0 CHECK (jinetes >= 0),
  catapultas      INTEGER NOT NULL DEFAULT 0 CHECK (catapultas >= 0),
  besieged_by     INTEGER REFERENCES houses(id),
  siege_nights    INTEGER NOT NULL DEFAULT 0 CHECK (siege_nights >= 0),
  UNIQUE (game_id, x, y),
  CHECK (type <> 'castillo' OR (castle_of IS NOT NULL AND owner_house_id = castle_of))
);

INSERT INTO tiles_nueva (id, game_id, x, y, type, name, castle_of, owner_house_id, troops, fortified_until,
                         jinetes, catapultas, besieged_by, siege_nights)
  SELECT id, game_id, x, y, type, name, castle_of, owner_house_id, troops, fortified_until,
         jinetes, catapultas, besieged_by, siege_nights FROM tiles;

DROP TABLE tiles;
ALTER TABLE tiles_nueva RENAME TO tiles;
CREATE INDEX tiles_owner ON tiles(game_id, owner_house_id);

INSERT INTO orders SELECT * FROM orders_copia;
DROP TABLE orders_copia;
UPDATE houses SET captain_tile = (SELECT c.captain_tile FROM capitanes_copia c WHERE c.id = houses.id)
  WHERE id IN (SELECT id FROM capitanes_copia);
DROP TABLE capitanes_copia;

ALTER TABLE games ADD COLUMN map_coast TEXT CHECK (map_coast IN ('oeste-este', 'norte-sur'));
