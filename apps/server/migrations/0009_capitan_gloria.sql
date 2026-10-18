-- Capitán y Gloria (sistema de guerra v3, fase 4).
-- Casas: dónde está su Capitán (NULL si está preso), quién lo tiene, hasta qué
-- resolución, y sus puntos de Gloria.
ALTER TABLE houses ADD COLUMN captain_tile INTEGER REFERENCES tiles(id);
ALTER TABLE houses ADD COLUMN captain_captured_by INTEGER REFERENCES houses(id);
ALTER TABLE houses ADD COLUMN captain_free_at INTEGER;
ALTER TABLE houses ADD COLUMN glory INTEGER NOT NULL DEFAULT 0 CHECK (glory >= 0);
-- Órdenes: el Capitán va con este grupo.
ALTER TABLE orders ADD COLUMN captain INTEGER NOT NULL DEFAULT 0 CHECK (captain IN (0, 1));
-- Las partidas en marcha reciben su Capitán en el castillo.
UPDATE houses SET captain_tile = (SELECT t.id FROM tiles t WHERE t.castle_of = houses.id)
  WHERE game_id IN (SELECT id FROM games WHERE status = 'active');
