-- Reyes de Pacotilla: esquema de base de datos v1
-- Motor: Cloudflare D1 (SQLite). Migración inicial.
-- Convenciones:
--   * Identificadores INTEGER autoincrementales; fechas en texto ISO 8601 UTC.
--   * Los recursos nunca pueden ser negativos (CHECK): un intercambio o un gasto
--     que no se pueda pagar hace fallar todo el lote atómico.
--   * Las claves de tipos (edificios, eventos, cartas, objetivos, frases) son
--     textos estables definidos en el código, no tablas.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Cuentas
-- ---------------------------------------------------------------------------

-- Una persona. Puede jugar muchas partidas. No hay contraseñas: entra con el
-- enlace de invitación o con su código corto (útil en el iPhone instalado).
CREATE TABLE users (
  id                INTEGER PRIMARY KEY,
  display_name      TEXT    NOT NULL,
  login_code_hash   TEXT    NOT NULL UNIQUE,         -- hash del código de 6 caracteres
  token_version     INTEGER NOT NULL DEFAULT 1,      -- subirlo invalida todas las sesiones
  default_house     TEXT,                            -- JSON: último escudo/nombre/lema usado
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE push_subscriptions (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT    NOT NULL UNIQUE,
  keys_json   TEXT    NOT NULL,                      -- p256dh y auth
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ---------------------------------------------------------------------------
-- Partidas y casas
-- ---------------------------------------------------------------------------

CREATE TABLE games (
  id              INTEGER PRIMARY KEY,
  name            TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'lobby'
                  CHECK (status IN ('lobby','active','finished')),
  weeks           INTEGER NOT NULL DEFAULT 6 CHECK (weeks IN (2,4,6,8)),
  timezone        TEXT    NOT NULL DEFAULT 'Europe/Madrid',
  close_time      TEXT    NOT NULL DEFAULT '21:00',  -- hora local de cierre de órdenes
  resolve_time    TEXT    NOT NULL DEFAULT '22:00',  -- hora local de resolución
  seed            TEXT    NOT NULL,                  -- semilla del mapa
  start_date      TEXT,                              -- lunes local de inicio (AAAA-MM-DD)
  map_cols        INTEGER,
  map_rows        INTEGER,
  current_resolution INTEGER NOT NULL DEFAULT 0,     -- última resolución completada
  invite_code     TEXT    NOT NULL UNIQUE,           -- para unirse a la partida en el lobby
  created_by      INTEGER NOT NULL REFERENCES users(id),
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  started_at      TEXT,
  finished_at     TEXT
);

-- Un jugador en una partida. Guarda su escudo, sus recursos y su estado.
CREATE TABLE houses (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  name            TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 20),
  -- Escudo
  color           TEXT    NOT NULL CHECK (color IN
                  ('gules','azur','sinople','sable','purpura','naranjado','aguamarina','leonado')),
  shield_shape    TEXT    NOT NULL CHECK (shield_shape IN
                  ('espanol','apuntado','almendrado','rodela','estandarte')),
  shield_division TEXT    NOT NULL DEFAULT 'pleno' CHECK (shield_division IN
                  ('pleno','partido','cortado','tronchado')),
  color2          TEXT,                              -- segundo campo si hay división
  symbol          TEXT    NOT NULL,                  -- leon, aguila, ..., gallina, nabo, ...
  metal           TEXT    NOT NULL DEFAULT 'oro' CHECK (metal IN ('oro','plata')),
  motto           TEXT    CHECK (motto IS NULL OR length(motto) <= 40),
  -- Recursos (nunca negativos)
  pan             INTEGER NOT NULL DEFAULT 0 CHECK (pan    >= 0),
  madera          INTEGER NOT NULL DEFAULT 0 CHECK (madera >= 0),
  piedra          INTEGER NOT NULL DEFAULT 0 CHECK (piedra >= 0),
  hierro          INTEGER NOT NULL DEFAULT 0 CHECK (hierro >= 0),
  oro             INTEGER NOT NULL DEFAULT 0 CHECK (oro    >= 0),
  -- Objetivo secreto: dos ofrecidos, uno elegido
  objective_options TEXT,                            -- JSON ["controlar_2_puertos","oro_100"]
  objective_key   TEXT,
  objective_met   INTEGER,                           -- se rellena al final (0/1)
  -- Ayuda al último: recurso elegido y hasta qué resolución dura
  help_resource   TEXT    CHECK (help_resource IS NULL OR help_resource IN ('pan','madera','piedra','hierro','oro')),
  help_until_resolution INTEGER,
  -- Ausencias
  autopilot_template TEXT NOT NULL DEFAULT 'equilibrada'
                  CHECK (autopilot_template IN ('defensiva','economica','equilibrada')),
  vacation        INTEGER NOT NULL DEFAULT 0,        -- modo vacaciones avisado (0/1)
  last_seen_at    TEXT,                              -- piloto automático si > 3 días
  joined_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (game_id, user_id),
  UNIQUE (game_id, color),
  UNIQUE (game_id, shield_shape, symbol)
);

-- Cinco edificios por casa, dentro del castillo. Nunca se pierden.
CREATE TABLE buildings (
  house_id   INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL CHECK (kind IN ('granja','aserradero','cantera','mina','mercado')),
  level      INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  PRIMARY KEY (house_id, kind)
);

-- ---------------------------------------------------------------------------
-- Mapa y tropas
-- ---------------------------------------------------------------------------

-- Cada casilla guarda su dueño y sus tropas. Como solo una casa controla una
-- casilla, las tropas de la casilla son las del dueño (o la guarnición neutral
-- si no tiene dueño). No hace falta una tabla de ejércitos.
CREATE TABLE tiles (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  x               INTEGER NOT NULL,
  y               INTEGER NOT NULL,
  type            TEXT    NOT NULL CHECK (type IN
                  ('castillo','campos','bosque','cantera','montana','puerto','fortaleza')),
  name            TEXT    NOT NULL,                  -- "Villa Mediocre"; castillos: el de la casa
  castle_of       INTEGER REFERENCES houses(id),     -- solo en castillos; nunca cambia
  owner_house_id  INTEGER REFERENCES houses(id),     -- NULL = neutral
  troops          INTEGER NOT NULL DEFAULT 0 CHECK (troops >= 0),
  fortified_until INTEGER,                           -- número de resolución hasta la que dura
  UNIQUE (game_id, x, y),
  CHECK (type <> 'castillo' OR (castle_of IS NOT NULL AND owner_house_id = castle_of))
);
CREATE INDEX tiles_owner ON tiles(game_id, owner_house_id);

-- Órdenes para la próxima resolución. Se pueden cambiar hasta el cierre.
-- "Mantener" es lo que hacen las tropas sin orden, así que no se guarda.
CREATE TABLE orders (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  house_id        INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  resolution_no   INTEGER NOT NULL,                  -- resolución a la que van dirigidas
  kind            TEXT    NOT NULL CHECK (kind IN ('move','support')),
  from_tile_id    INTEGER NOT NULL REFERENCES tiles(id),
  troops          INTEGER NOT NULL CHECK (troops > 0),
  target_tile_id  INTEGER NOT NULL REFERENCES tiles(id), -- destino (move) o casilla apoyada (support)
  supported_from_tile_id INTEGER REFERENCES tiles(id),   -- support: origen del ataque apoyado; NULL = apoyar la defensa
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (kind = 'support' OR supported_from_tile_id IS NULL),
  CHECK (from_tile_id <> target_tile_id)
);
CREATE INDEX orders_by_resolution ON orders(game_id, resolution_no);

-- ---------------------------------------------------------------------------
-- Resoluciones, tareas programadas y registro
-- ---------------------------------------------------------------------------

-- Una fila por resolución (miércoles y domingo). La UNIQUE impide que un
-- reintento del cron la ejecute dos veces.
CREATE TABLE resolutions (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  number          INTEGER NOT NULL,                  -- 1..2*semanas
  week            INTEGER NOT NULL,
  kind            TEXT    NOT NULL CHECK (kind IN ('miercoles','domingo')),
  scheduled_at    TEXT    NOT NULL,                  -- instante UTC calculado desde la hora local
  status          TEXT    NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','running','done','failed')),
  state_before    TEXT,                              -- JSON: estado de entrada (para repetirla)
  orders_json     TEXT,                              -- JSON: órdenes congeladas al cierre
  finished_at     TEXT,
  UNIQUE (game_id, number)
);

-- Registro de otras tareas del cron (producción diaria, anuncios del martes,
-- avisos de cierre). La clave única hace que sean idempotentes.
CREATE TABLE job_runs (
  game_id     INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  job_key     TEXT    NOT NULL,                      -- "produccion:2026-10-20", "aviso_cierre:5"
  ran_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (game_id, job_key)
);

-- Todo lo que pasa en la partida. Alimenta el boletín, las notificaciones,
-- la pantalla de resolución y la Crónica Definitiva. La visibilidad aplica
-- la niebla de guerra: NULL = público, si no, solo esa casa lo ve.
CREATE TABLE event_log (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  resolution_id   INTEGER REFERENCES resolutions(id),
  at              TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  type            TEXT    NOT NULL,                  -- combate, rebote, conquista, trato, pacto_roto...
  visible_to      INTEGER REFERENCES houses(id),
  payload         TEXT    NOT NULL                   -- JSON con los datos (casas, casilla, tropas...)
);
CREATE INDEX event_log_game ON event_log(game_id, id);

-- Prestigio en cada resolución, para la clasificación histórica y el boletín.
-- El Prestigio actual se calcula en vivo; esto es solo la foto.
CREATE TABLE prestige_snapshots (
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  house_id        INTEGER NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  resolution_no   INTEGER NOT NULL,
  total           INTEGER NOT NULL,
  breakdown       TEXT    NOT NULL,                  -- JSON {territorio, edificios, riqueza, comercio, logros}
  PRIMARY KEY (game_id, house_id, resolution_no)
);

-- ---------------------------------------------------------------------------
-- Comercio y diplomacia
-- ---------------------------------------------------------------------------

-- Ofertas públicas (to_house_id NULL) o dirigidas. Una contraoferta es otra
-- oferta con parent_offer_id. Máximo 3 públicas abiertas por casa (en el código).
CREATE TABLE offers (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  from_house_id   INTEGER NOT NULL REFERENCES houses(id),
  to_house_id     INTEGER REFERENCES houses(id),
  parent_offer_id INTEGER REFERENCES offers(id),
  give_pan INTEGER NOT NULL DEFAULT 0 CHECK (give_pan >= 0),
  give_madera INTEGER NOT NULL DEFAULT 0 CHECK (give_madera >= 0),
  give_piedra INTEGER NOT NULL DEFAULT 0 CHECK (give_piedra >= 0),
  give_hierro INTEGER NOT NULL DEFAULT 0 CHECK (give_hierro >= 0),
  give_oro INTEGER NOT NULL DEFAULT 0 CHECK (give_oro >= 0),
  want_pan INTEGER NOT NULL DEFAULT 0 CHECK (want_pan >= 0),
  want_madera INTEGER NOT NULL DEFAULT 0 CHECK (want_madera >= 0),
  want_piedra INTEGER NOT NULL DEFAULT 0 CHECK (want_piedra >= 0),
  want_hierro INTEGER NOT NULL DEFAULT 0 CHECK (want_hierro >= 0),
  want_oro INTEGER NOT NULL DEFAULT 0 CHECK (want_oro >= 0),
  status          TEXT    NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','accepted','rejected','cancelled','countered')),
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  closed_at       TEXT,
  CHECK (to_house_id IS NULL OR to_house_id <> from_house_id)
);
CREATE INDEX offers_open ON offers(game_id, status);

-- Intercambios ejecutados (de una oferta o de un tratado). "valid" marca si
-- cuenta para el Prestigio de comercio (al menos 10 recursos por cada lado).
CREATE TABLE trades (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  house_a         INTEGER NOT NULL REFERENCES houses(id),
  house_b         INTEGER NOT NULL REFERENCES houses(id),
  offer_id        INTEGER REFERENCES offers(id),
  treaty_id       INTEGER REFERENCES treaties(id),
  amount_a        INTEGER NOT NULL,                  -- recursos que entrega A
  amount_b        INTEGER NOT NULL,                  -- recursos que entrega B
  valid           INTEGER GENERATED ALWAYS AS (amount_a >= 10 AND amount_b >= 10) VIRTUAL,
  at              TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (house_a <> house_b)
);
CREATE INDEX trades_recent ON trades(game_id, at);

-- Tratados comerciales (versión 2): intercambio semanal automático.
CREATE TABLE treaties (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  house_a         INTEGER NOT NULL REFERENCES houses(id),
  house_b         INTEGER NOT NULL REFERENCES houses(id),
  a_gives         TEXT    NOT NULL,                  -- JSON {"madera":10}
  b_gives         TEXT    NOT NULL,                  -- JSON {"hierro":6}
  weeks_total     INTEGER NOT NULL CHECK (weeks_total > 0),
  weeks_done      INTEGER NOT NULL DEFAULT 0,
  status          TEXT    NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','cancelling','finished','cancelled')),
  cancel_effective_resolution INTEGER,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Pactos de no agresión: no obligan, pero quedan en el registro público.
CREATE TABLE pacts (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,                  -- "la Alianza de la Roca Eterna"
  house_a         INTEGER NOT NULL REFERENCES houses(id),
  house_b         INTEGER NOT NULL REFERENCES houses(id),
  proposed_by     INTEGER NOT NULL REFERENCES houses(id),
  status          TEXT    NOT NULL DEFAULT 'proposed'
                  CHECK (status IN ('proposed','active','broken','declined')),
  signed_at       TEXT,
  broken_by       INTEGER REFERENCES houses(id),
  broken_at       TEXT,
  CHECK (house_a <> house_b)
);

-- ---------------------------------------------------------------------------
-- Gran Subasta y cartas de la Corona
-- ---------------------------------------------------------------------------

CREATE TABLE auction_lots (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  week            INTEGER NOT NULL,
  slot            INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 3),
  kind            TEXT    NOT NULL CHECK (kind IN ('resources','card')),
  payload         TEXT    NOT NULL,                  -- JSON {"hierro":30} o {"card":"espia"}
  winner_house_id INTEGER REFERENCES houses(id),
  price           INTEGER,
  UNIQUE (game_id, week, slot)
);

-- Puja ciega: una por casa y lote. Cambiarla actualiza placed_at, así que en
-- empate gana la puja más temprana tal y como quedó.
CREATE TABLE bids (
  lot_id          INTEGER NOT NULL REFERENCES auction_lots(id) ON DELETE CASCADE,
  house_id        INTEGER NOT NULL REFERENCES houses(id),
  amount          INTEGER NOT NULL CHECK (amount > 0),
  placed_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (lot_id, house_id)
);

CREATE TABLE cards (
  id              INTEGER PRIMARY KEY,
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  house_id        INTEGER NOT NULL REFERENCES houses(id),
  card_key        TEXT    NOT NULL,                  -- espia, muralla, mercenarios, carreta
  acquired_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  used_at         TEXT,
  used_params     TEXT                               -- JSON con el objetivo de la carta
);

-- ---------------------------------------------------------------------------
-- Eventos, logros y cronista
-- ---------------------------------------------------------------------------

CREATE TABLE game_events (
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  week            INTEGER NOT NULL,
  event_key       TEXT    NOT NULL,                  -- plaga_ratas, cosecha, bandidos...
  params          TEXT,                              -- JSON (recurso afectado, casa objetivo...)
  announced_at    TEXT,
  applied_at      TEXT,
  PRIMARY KEY (game_id, week)
);

CREATE TABLE achievements (
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  house_id        INTEGER NOT NULL REFERENCES houses(id),
  achievement_key TEXT    NOT NULL CHECK (achievement_key IN
                  ('primera_fortaleza','obra_maestra','ganador_subasta')),
  times           INTEGER NOT NULL DEFAULT 1 CHECK (times BETWEEN 1 AND 3),
  first_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (game_id, house_id, achievement_key)
);

-- Soborno al cronista: uno por casa y semana.
CREATE TABLE bribes (
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  house_id        INTEGER NOT NULL REFERENCES houses(id),
  week            INTEGER NOT NULL,
  amount          INTEGER NOT NULL CHECK (amount > 0),
  template_key    TEXT    NOT NULL,                  -- frase elegida del banco
  PRIMARY KEY (game_id, house_id, week)
);

-- Boletines publicados (y la Crónica Definitiva, con week = 0).
CREATE TABLE bulletins (
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  week            INTEGER NOT NULL,
  content         TEXT    NOT NULL,                  -- JSON: líneas ya rellenadas, notas al margen
  published_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (game_id, week)
);

-- Frases del banco ya usadas en la partida, para no repetirlas.
CREATE TABLE phrase_usage (
  game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  phrase_key      TEXT    NOT NULL,                  -- "boletin.combate.gana_atacante.3"
  used_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (game_id, phrase_key)
);

-- Notificaciones enviadas; la clave evita mandar dos veces el mismo aviso.
CREATE TABLE notifications (
  id              INTEGER PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id         INTEGER REFERENCES games(id) ON DELETE CASCADE,
  kind            TEXT    NOT NULL,                  -- oferta, evento, cierre, combate, boletin
  dedupe_key      TEXT    NOT NULL UNIQUE,
  body            TEXT    NOT NULL,
  sent_at         TEXT
);
