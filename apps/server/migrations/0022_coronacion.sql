-- Bloque 13 (docs/bloque13.md, puntos 3 y 10).
-- `territory_snapshots`: de quién es cada casilla al cerrar cada semana (tras la
-- resolución del domingo), para el mapa semana a semana de la coronación.
-- `owners` es un JSON [[tile_id, house_id], ...] con las casillas que tienen dueño.
CREATE TABLE territory_snapshots (
  game_id   INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  week      INTEGER NOT NULL CHECK (week >= 1),
  owners    TEXT    NOT NULL,
  PRIMARY KEY (game_id, week)
);

-- `share_key`: la clave del enlace público de la coronación (sin cuenta). Se
-- crea al acabar la partida; nadie la puede adivinar.
ALTER TABLE games ADD COLUMN share_key TEXT;
CREATE UNIQUE INDEX games_share_key ON games(share_key) WHERE share_key IS NOT NULL;
