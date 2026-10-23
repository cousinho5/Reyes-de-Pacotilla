-- Bloque 3 (docs/bloque3.md, puntos 1 y 6).
-- Dos boletines por semana: `edition` es 'domingo' (el de siempre) o
-- 'miercoles' (la hoja volandera). La clave pasa a ser (partida, semana, edición),
-- así que la tabla se rehace con los boletines que ya había como del domingo.
CREATE TABLE bulletins_nueva (
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  week            INTEGER NOT NULL,
  edition         TEXT    NOT NULL DEFAULT 'domingo' CHECK (edition IN ('domingo', 'miercoles')),
  content         TEXT    NOT NULL,                  -- JSON: líneas ya rellenadas, notas al margen
  published_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (game_id, week, edition)
);
INSERT INTO bulletins_nueva (game_id, week, edition, content, published_at)
  SELECT game_id, week, 'domingo', content, published_at FROM bulletins;
DROP TABLE bulletins;
ALTER TABLE bulletins_nueva RENAME TO bulletins;

-- Proclamas: una frase propia por casa y semana, de 140 letras como mucho, que
-- sale firmada en el boletín del domingo. Se puede cambiar hasta el cierre.
CREATE TABLE proclamations (
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  house_id        INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  week            INTEGER NOT NULL,
  text            TEXT    NOT NULL CHECK (length(text) BETWEEN 1 AND 140),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (game_id, house_id, week)
);
