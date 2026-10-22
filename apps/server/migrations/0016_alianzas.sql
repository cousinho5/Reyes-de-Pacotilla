-- Alianzas (bloque 8, docs/alianzas.md). La tabla `pacts` de la primera
-- migración nunca se usó; las alianzas tienen su propia tabla.
--
-- Una fila por propuesta: `proposed` mientras espera respuesta (caduca tras la
-- resolución `expires_resolution`), `active` en vigor desde la resolución
-- `signed_resolution`, `breaking` durante el aviso (deja de existir al
-- terminar la resolución `ends_resolution`) y `ended` después. Las propuestas
-- sin firmar acaban en `declined`, `withdrawn` o `expired`. Entre dos casas
-- solo puede haber una abierta (propuesta, en vigor o en aviso).
-- Las horas (`*_at`) son las de la partida (gameNow).
CREATE TABLE alliances (
  id                  INTEGER PRIMARY KEY,
  game_id             INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name                TEXT    NOT NULL,
  house_a             INTEGER NOT NULL REFERENCES houses(id),
  house_b             INTEGER NOT NULL REFERENCES houses(id),
  proposed_by         INTEGER NOT NULL REFERENCES houses(id),
  status              TEXT    NOT NULL DEFAULT 'proposed'
                      CHECK (status IN ('proposed','active','breaking','ended','declined','withdrawn','expired')),
  proposed_at         TEXT    NOT NULL,
  expires_resolution  INTEGER NOT NULL,
  signed_resolution   INTEGER,
  signed_at           TEXT,
  broken_by           INTEGER REFERENCES houses(id),
  broken_at           TEXT,
  ends_resolution     INTEGER,
  closed_at           TEXT,
  CHECK (house_a < house_b),
  CHECK (proposed_by IN (house_a, house_b))
);
CREATE UNIQUE INDEX alliances_open_pair ON alliances(game_id, house_a, house_b)
  WHERE status IN ('proposed','active','breaking');
CREATE INDEX alliances_by_game ON alliances(game_id, status);

-- Tropas de paso: tropas de una casa dentro de una casilla de su aliada.
-- `troops` es el total; `jinetes` y `catapultas`, lo que hay de cada tipo.
CREATE TABLE tile_guests (
  game_id     INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  tile_id     INTEGER NOT NULL REFERENCES tiles(id) ON DELETE CASCADE,
  house_id    INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  troops      INTEGER NOT NULL CHECK (troops > 0),
  jinetes     INTEGER NOT NULL DEFAULT 0 CHECK (jinetes >= 0),
  catapultas  INTEGER NOT NULL DEFAULT 0 CHECK (catapultas >= 0),
  PRIMARY KEY (tile_id, house_id),
  CHECK (jinetes + catapultas <= troops)
);
CREATE INDEX tile_guests_by_game ON tile_guests(game_id);

-- Órdenes que salen de las tropas de paso (desde la casilla aliada).
ALTER TABLE orders ADD COLUMN guest INTEGER NOT NULL DEFAULT 0;
