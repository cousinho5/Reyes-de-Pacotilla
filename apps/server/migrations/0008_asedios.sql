-- Asedios (sistema de guerra v3, fase 3b).
-- Casillas: quién las tiene sitiadas y cuántas noches lleva.
ALTER TABLE tiles ADD COLUMN besieged_by INTEGER REFERENCES houses(id);
ALTER TABLE tiles ADD COLUMN siege_nights INTEGER NOT NULL DEFAULT 0 CHECK (siege_nights >= 0);
-- Casas: noches que han tenido rodeado un castillo ajeno (dan Prestigio).
ALTER TABLE houses ADD COLUMN siege_nights INTEGER NOT NULL DEFAULT 0 CHECK (siege_nights >= 0);

-- Órdenes: un tipo nuevo, 'siege'. SQLite no deja cambiar un CHECK, así que la
-- tabla se vuelve a crear con los mismos datos (nada apunta a orders).
CREATE TABLE orders_nueva (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  house_id        INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  resolution_no   INTEGER NOT NULL,
  kind            TEXT    NOT NULL CHECK (kind IN ('move','support','siege')),
  from_tile_id    INTEGER NOT NULL REFERENCES tiles(id),
  troops          INTEGER NOT NULL CHECK (troops > 0),
  target_tile_id  INTEGER NOT NULL REFERENCES tiles(id),
  supported_from_tile_id INTEGER REFERENCES tiles(id),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  jinetes         INTEGER NOT NULL DEFAULT 0 CHECK (jinetes >= 0),
  catapultas      INTEGER NOT NULL DEFAULT 0 CHECK (catapultas >= 0),
  CHECK (kind = 'support' OR supported_from_tile_id IS NULL),
  CHECK (from_tile_id <> target_tile_id)
);
INSERT INTO orders_nueva (id, game_id, house_id, resolution_no, kind, from_tile_id, troops, target_tile_id, supported_from_tile_id, updated_at, jinetes, catapultas)
  SELECT id, game_id, house_id, resolution_no, kind, from_tile_id, troops, target_tile_id, supported_from_tile_id, updated_at, jinetes, catapultas FROM orders;
DROP TABLE orders;
ALTER TABLE orders_nueva RENAME TO orders;
CREATE INDEX orders_by_resolution ON orders(game_id, resolution_no);
