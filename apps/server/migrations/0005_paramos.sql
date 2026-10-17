-- Páramos: un tipo de casilla nuevo que no produce (versión 1, mapas de 7 y 8
-- casas más grandes). SQLite no deja cambiar un CHECK, así que la tabla se
-- vuelve a crear con los mismos datos. Las órdenes apuntan a tiles(id): se
-- apartan antes y se devuelven después, para que borrar la tabla vieja no
-- deje órdenes huérfanas.
CREATE TABLE orders_copia AS SELECT * FROM orders;
DELETE FROM orders;

CREATE TABLE tiles_nueva (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  x               INTEGER NOT NULL,
  y               INTEGER NOT NULL,
  type            TEXT    NOT NULL CHECK (type IN
                  ('castillo','campos','bosque','cantera','montana','puerto','fortaleza','paramo')),
  name            TEXT    NOT NULL,
  castle_of       INTEGER REFERENCES houses(id),
  owner_house_id  INTEGER REFERENCES houses(id),
  troops          INTEGER NOT NULL DEFAULT 0 CHECK (troops >= 0),
  fortified_until INTEGER,
  UNIQUE (game_id, x, y),
  CHECK (type <> 'castillo' OR (castle_of IS NOT NULL AND owner_house_id = castle_of))
);

INSERT INTO tiles_nueva (id, game_id, x, y, type, name, castle_of, owner_house_id, troops, fortified_until)
  SELECT id, game_id, x, y, type, name, castle_of, owner_house_id, troops, fortified_until FROM tiles;

DROP TABLE tiles;
ALTER TABLE tiles_nueva RENAME TO tiles;
CREATE INDEX tiles_owner ON tiles(game_id, owner_house_id);

INSERT INTO orders SELECT * FROM orders_copia;
DROP TABLE orders_copia;
