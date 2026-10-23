-- Bloque 13 (docs/bloque13.md, paso 2): qué cinemáticas ha visto cada casa,
-- para que salgan una sola vez en cualquier dispositivo. La clave es la de la
-- cinemática ("prologo", "evento:3", "fantasma:2", "ultima", "coronacion").
-- `watched` es 0 si no llegó a verse porque había demasiadas pendientes a la
-- vez: ya no sale sola, pero la lista de Reino la marca como nueva.
CREATE TABLE cinematics_seen (
  house_id        INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  key             TEXT    NOT NULL CHECK (length(key) BETWEEN 1 AND 40),
  watched         INTEGER NOT NULL DEFAULT 1 CHECK (watched IN (0, 1)),
  seen_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (house_id, key)
);
