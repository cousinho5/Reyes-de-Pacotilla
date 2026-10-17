-- Sistema de guerra v3: una resolución cada día. Cada partida guarda sus días
-- con resolución (0 = lunes ... 6 = domingo). Las partidas que ya existían
-- siguen con miércoles y domingo; las nuevas se crean con los siete días.
ALTER TABLE games ADD COLUMN resolution_days TEXT NOT NULL DEFAULT '2,6';

-- Las resoluciones de un día que no es miércoles ni domingo son de tipo 'dia'.
-- SQLite no deja cambiar un CHECK, así que la tabla se vuelve a crear. El
-- registro de eventos apunta a resolutions(id): se aparta antes y se devuelve
-- después (como las órdenes en 0005), para no dejar filas huérfanas.
CREATE TABLE event_log_copia AS SELECT * FROM event_log;
DELETE FROM event_log;

CREATE TABLE resolutions_nueva (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  number          INTEGER NOT NULL,
  week            INTEGER NOT NULL,
  kind            TEXT    NOT NULL CHECK (kind IN ('miercoles','domingo','dia')),
  scheduled_at    TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','running','done','failed')),
  state_before    TEXT,
  orders_json     TEXT,
  finished_at     TEXT,
  UNIQUE (game_id, number)
);

INSERT INTO resolutions_nueva (id, game_id, number, week, kind, scheduled_at, status, state_before, orders_json, finished_at)
  SELECT id, game_id, number, week, kind, scheduled_at, status, state_before, orders_json, finished_at FROM resolutions;

DROP TABLE resolutions;
ALTER TABLE resolutions_nueva RENAME TO resolutions;

INSERT INTO event_log SELECT * FROM event_log_copia;
DROP TABLE event_log_copia;
