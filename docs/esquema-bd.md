# Esquema de la base de datos

Esquema de Reyes de Pacotilla para Cloudflare D1, que usa SQL de SQLite. Corresponde al diseño v2. El SQL completo está al final y será la migración inicial (`migrations/0001_inicial.sql`) del repositorio.

## 1. Decisiones principales

- **Las tropas viven en las casillas.** Como solo una casa puede controlar cada casilla, basta con guardar en la casilla su dueño y su número de tropas (o la guarnición neutral si no tiene dueño). No hace falta una tabla de ejércitos, y el motor de resolución trabaja con un estado muy simple.

- **Los recursos nunca pueden ser negativos.** Cada recurso tiene una restricción `>= 0`. Si un intercambio, una mejora o una puja no se puede pagar, la base de datos rechaza la operación y, como se ejecuta en un lote atómico, no se aplica nada a medias. Así lo garantiza la propia base, no solo el código.

- **Lo que se puede calcular, se calcula.** El Prestigio actual, la niebla de guerra, quién va último o qué tratos cuentan para el comercio se calculan a partir de los datos. Solo se guardan fotos cuando hacen falta para la historia (Prestigio en cada resolución, boletines).

- **Todo lo programado es idempotente.** Las resoluciones y las demás tareas del cron (producción diaria, anuncios, avisos) tienen claves únicas. Si el cron se ejecuta dos veces o reintenta tras un fallo, la segunda vez no hace nada.

- **Cada resolución se puede repetir.** Al cerrar las órdenes se congelan el estado de entrada y las órdenes en la fila de la resolución. Como el motor es una función pura, se puede volver a ejecutar para depurar o comprobar un resultado.

- **Un registro de eventos para todo.** Combates, rebotes, tratos, pactos, logros y eventos van al registro, con su visibilidad. De ahí salen el boletín de Fray Abundio, la pantalla de resolución, las notificaciones y la Crónica Definitiva.

- **Los catálogos viven en el código.** Los tipos de edificio, eventos, cartas, objetivos secretos y frases son claves de texto definidas en el código y en el archivo de textos (`es.json`), no tablas. Así se cambian sin migrar la base.

## 2. Tablas por área

### Cuentas

| Tabla | Para qué |
| --- | --- |
| `users` | Una persona. Sin contraseñas: un código corto (guardado como hash) y una versión de sesión que, al subirla, cierra todas las sesiones si el código se filtra. Guarda también su último escudo para reutilizarlo. |
| `push_subscriptions` | Los dispositivos de cada persona que reciben notificaciones. |

### Partida

| Tabla | Para qué |
| --- | --- |
| `games` | La partida: estado (sala de espera, en juego, terminada), duración, zona horaria, horas de cierre y resolución, lunes de inicio, semilla del mapa, código para unirse y última resolución completada. |
| `houses` | Un jugador en una partida: nombre, escudo, lema, los cinco recursos, objetivo secreto (las dos opciones y la elegida), ayuda al último, piloto automático y última conexión. El color y la combinación forma + símbolo son únicos por partida. |
| `buildings` | Los cinco edificios de cada casa con su nivel (1 a 5). |

### Mapa y órdenes

| Tabla | Para qué |
| --- | --- |
| `tiles` | Cada casilla: posición, tipo, nombre, dueño, tropas y hasta qué resolución está fortificada. Los castillos son casillas con `castle_of`, y la base exige que su dueño sea siempre esa casa. |
| `orders` | Órdenes para la siguiente resolución: mover o apoyar, desde qué casilla, con cuántas tropas y hacia dónde. En un apoyo a un ataque se guarda también de dónde sale el ataque apoyado. "Mantener" no se guarda: es lo que hacen las tropas sin orden. |

### Resoluciones e historia

| Tabla | Para qué |
| --- | --- |
| `resolutions` | Una fila por resolución, con su número único, la hora prevista en UTC, el estado y el estado y las órdenes congelados. |
| `job_runs` | Registro de tareas del cron con clave única ("produccion:2026-10-20"), para no repetirlas. |
| `event_log` | Todo lo que pasa, en JSON. `visible_to` aplica la niebla de guerra: vacío si es público o una casa concreta si solo esa casa debe verlo. |
| `prestige_snapshots` | El Prestigio de cada casa tras cada resolución, con su desglose. Sirve para la clasificación histórica y para detectar cambios de líder en el boletín. |

### Comercio y diplomacia

| Tabla | Para qué |
| --- | --- |
| `offers` | Ofertas públicas o dirigidas, con lo que se da y lo que se pide de cada recurso. Las contraofertas enlazan con la oferta original. |
| `trades` | Intercambios ejecutados, vengan de una oferta o de un tratado. La columna `valid` se calcula sola: vale 1 si cada lado entrega al menos 10 recursos. |
| `treaties` | Tratados comerciales semanales (versión 2), con su cancelación avisada. |
| `pacts` | Pactos de no agresión: propuesto, activo, roto (y por quién) o rechazado. |

### Subasta, cartas, eventos y cronista

| Tabla | Para qué |
| --- | --- |
| `auction_lots` y `bids` | Los tres lotes de cada semana y las pujas ciegas, una por casa y lote. Si alguien cambia su puja, se actualiza su hora, así que en caso de empate gana la puja más temprana tal y como quedó. |
| `cards` | Cartas de la Corona de cada casa y cuándo se usaron. |
| `game_events` | El evento de cada semana, con sus parámetros y cuándo se anunció y se aplicó. |
| `achievements` | Logros por casa, con contador para el de la subasta (máximo 3). |
| `bribes` | Sobornos al cronista: uno por casa y semana como máximo. |
| `bulletins` | Boletines publicados. La Crónica Definitiva se guarda como la semana 0. |
| `phrase_usage` | Frases del banco ya usadas en la partida, para no repetirlas. |
| `notifications` | Avisos enviados, con una clave que evita mandar el mismo dos veces. |

## 3. Cómo funcionan las operaciones clave

**Aceptar una oferta.** En un solo lote atómico: se restan y suman los recursos de las dos casas, se marca la oferta como aceptada y se crea el trato. Si a alguna de las dos le falta algo, la restricción de recursos falla y no cambia nada. En D1 esto se hace con `db.batch()`, porque D1 no admite `BEGIN` y `COMMIT` explícitos; un lote se ejecuta como una sola transacción.

**Producción diaria.** El cron se ejecuta cada hora. Si en Madrid ya ha pasado la medianoche y no existe la tarea `produccion:<fecha>` de esa partida, se crea esa fila y en el mismo lote se suma la producción de edificios y casillas, más la ayuda al último. Si la fila ya existe, no se hace nada.

**Resolución.**
1. Al llegar la hora de cierre, se congelan el estado y las órdenes en `resolutions`.
2. A la hora de resolución, el motor (función pura) calcula el nuevo estado y los eventos.
3. En un lote atómico se actualizan casillas, recursos y logros, se escriben los eventos y la foto de Prestigio, se marca la resolución como hecha y se avanza `games.current_resolution`.
4. Después se generan el boletín (si es domingo) y las notificaciones.

**Niebla de guerra.** El servidor nunca envía al navegador más de lo que el jugador puede ver. Para cada casa se calculan sus casillas y las adyacentes; de esas se envían las tropas y la fortificación, y del resto solo el dueño. El registro de eventos se filtra por `visible_to`.

**Prestigio en vivo.** Se calcula con una consulta sobre casillas, edificios, Oro, tratos válidos de los últimos 7 días y logros. Con un máximo de 36 casillas y 8 casas es una consulta pequeña. La foto se guarda en cada resolución.

**Piloto automático.** Si `last_seen_at` tiene más de 3 días o `vacation` está activo, el cron genera las órdenes y las mejoras según la plantilla de la casa antes del cierre, y aplica la bonificación de defensa en la resolución.

## 4. Comprobado

He creado el esquema en SQLite 3.45 (la familia de D1), con una partida de ejemplo, y he comprobado que:

- Un intercambio válido se ejecuta y se marca como válido para el comercio.
- Un intercambio que una casa no puede pagar falla entero, sin cambios a medias.
- La base rechaza: un castillo sin dueño, un color repetido, un escudo repetido (misma forma y símbolo), un edificio a nivel 6, una resolución duplicada, una producción diaria duplicada y una orden de mover con datos de apoyo.

## 5. Pendiente para la implementación

- Validaciones que quedan en el código, porque dependen de varias filas: que las tropas ordenadas desde una casilla no superen las que hay, que los destinos sean adyacentes y que haya como máximo 3 ofertas públicas abiertas por casa.
- Índices adicionales si alguna consulta lo pide al probar (con estos volúmenes no hará falta).
- Una carpeta de migraciones para los cambios futuros.

## 6. Migración 0002 (MVP 2)

- `offers.accepted_by` y `offers.accept_token`: aceptación segura. El lote de aceptación marca primero la oferta con un token único y solo mueve recursos y crea el trato si el token de la oferta es el propio. Si dos casas aceptan a la vez, la segunda no cambia nada y recibe "Otra casa se te adelantó". Comprobado en la prueba de humo con dos aceptaciones simultáneas.
- `houses.autopilot_ran_on`: fecha del último día en que actuó el piloto automático, para que nunca actúe dos veces el mismo día.

Los objetivos secretos usan las columnas que ya existían (`objective_options`, `objective_key`, `objective_met`), y las notificaciones, las tablas `push_subscriptions` y `notifications`.

## 7. Migración 0003 (partidas de prueba)

Para probar el juego sin reunir a 4 personas:

- `games.is_test`: marca una partida de prueba. El cron horario no la toca.
- `games.test_bots`: cuántos bots se añaden al empezar (de 3 a 7).
- `games.sim_now`: el reloj simulado de la partida. Solo avanza con los botones de la mesa de pruebas. Todo lo que depende de la hora (órdenes abiertas, Prestigio de comercio, ofertas recientes) usa esta hora en vez de la real.
- `games.played_house_id`: la casa que maneja quien creó la prueba ("jugar como").
- `houses.is_bot`: casa de un bot. Cada bot tiene un usuario con un código que nadie conoce.

Migración 0004: `houses.bot_personality`, la personalidad de cada bot (estratega, mercader, guerrero, arquitecta u oportunista; ver `packages/engine/src/ai`).

Gran Subasta y cartas (versión 1) usan las tablas que ya estaban en la migración 0001: `auction_lots` (payload `{"hierro":30}` o `{"card":"espia"}`), `bids` (se cambia con `ON CONFLICT ... DO UPDATE`, que actualiza `placed_at`) y `cards` (`used_params` guarda `{params, effect, token}`; el token hace que usar una carta sea idempotente, como la aceptación de ofertas). La adjudicación va dentro del lote de la resolución del miércoles y cada sentencia comprueba en la propia base que el ganador aún tiene el Oro.

Boletín (versión 1): `bulletins.content` guarda el boletín ya escrito en JSON (titular, secciones, notas al margen, patrocinio, líder y `lastEventId`, el último evento del registro incluido; el siguiente boletín empieza después). `phrase_usage` guarda las frases usadas para no repetirlas y `bribes` los sobornos (`template_key` es el número de la frase comprada). Las mejoras de nivel 3 o más quedan en `event_log` como `mejora` para la sección de obras.

Borrar una prueba elimina la partida, sus filas y los usuarios de sus bots en un solo lote.

## 8. SQL completo (migración 0001)

```sql
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
  resolution_days TEXT    NOT NULL DEFAULT '2,6',    -- días con resolución, 0 = lunes; las nuevas, '0,1,2,3,4,5,6' (0006)
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
  UNIQUE (game_id, shield_shape, symbol),
  siege_nights    INTEGER NOT NULL DEFAULT 0      -- noches rodeando castillos ajenos: Prestigio (0008)
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
                  ('castillo','campos','bosque','cantera','montana','puerto','fortaleza','paramo')),
  name            TEXT    NOT NULL,                  -- "Villa Mediocre"; castillos: el de la casa
  castle_of       INTEGER REFERENCES houses(id),     -- solo en castillos; nunca cambia
  owner_house_id  INTEGER REFERENCES houses(id),     -- NULL = neutral
  troops          INTEGER NOT NULL DEFAULT 0 CHECK (troops >= 0),
  jinetes         INTEGER NOT NULL DEFAULT 0 CHECK (jinetes >= 0),     -- de esas tropas (0007)
  catapultas      INTEGER NOT NULL DEFAULT 0 CHECK (catapultas >= 0),  -- de esas tropas (0007)
  besieged_by     INTEGER REFERENCES houses(id),  -- asedio: casa que la sitia (0008)
  siege_nights    INTEGER NOT NULL DEFAULT 0,     -- noches de asedio (0008)
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
  kind            TEXT    NOT NULL CHECK (kind IN ('move','support','siege')),  -- 'siege' desde 0008
  from_tile_id    INTEGER NOT NULL REFERENCES tiles(id),
  troops          INTEGER NOT NULL CHECK (troops > 0),
  jinetes         INTEGER NOT NULL DEFAULT 0 CHECK (jinetes >= 0),     -- de esas tropas (0007)
  catapultas      INTEGER NOT NULL DEFAULT 0 CHECK (catapultas >= 0),  -- de esas tropas (0007)
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
  kind            TEXT    NOT NULL CHECK (kind IN ('miercoles','domingo','dia')),  -- 'dia': ni miércoles ni domingo (migración 0006)
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
```
