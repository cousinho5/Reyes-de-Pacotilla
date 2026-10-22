-- Capitán como unidad propia (bloque 4, punto 3).
-- Órdenes: el Capitán puede moverse solo, con una orden de mover de 0 tropas.
-- SQLite no deja cambiar un CHECK, así que la tabla se vuelve a crear con los
-- mismos datos (nada apunta a orders).
CREATE TABLE orders_nueva (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  house_id        INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  resolution_no   INTEGER NOT NULL,
  kind            TEXT    NOT NULL CHECK (kind IN ('move','support','siege')),
  from_tile_id    INTEGER NOT NULL REFERENCES tiles(id),
  troops          INTEGER NOT NULL CHECK (troops > 0 OR (troops = 0 AND kind = 'move' AND captain = 1)),
  target_tile_id  INTEGER NOT NULL REFERENCES tiles(id),
  supported_from_tile_id INTEGER REFERENCES tiles(id),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  jinetes         INTEGER NOT NULL DEFAULT 0 CHECK (jinetes >= 0),
  catapultas      INTEGER NOT NULL DEFAULT 0 CHECK (catapultas >= 0),
  captain         INTEGER NOT NULL DEFAULT 0 CHECK (captain IN (0, 1)),
  CHECK (kind = 'support' OR supported_from_tile_id IS NULL),
  CHECK (from_tile_id <> target_tile_id)
);
INSERT INTO orders_nueva (id, game_id, house_id, resolution_no, kind, from_tile_id, troops, target_tile_id, supported_from_tile_id, updated_at, jinetes, catapultas, captain)
  SELECT id, game_id, house_id, resolution_no, kind, from_tile_id, troops, target_tile_id, supported_from_tile_id, updated_at, jinetes, catapultas, captain FROM orders;
DROP TABLE orders;
ALTER TABLE orders_nueva RENAME TO orders;
CREATE INDEX orders_by_resolution ON orders(game_id, resolution_no);

-- Rescate: el precio en Oro que pide quien tiene preso al Capitán de esta casa
-- (NULL = aún no ha pedido nada). Se borra al soltarlo, al fugarse o al pagarlo.
ALTER TABLE houses ADD COLUMN captain_ransom INTEGER CHECK (captain_ransom IS NULL OR captain_ransom > 0);
