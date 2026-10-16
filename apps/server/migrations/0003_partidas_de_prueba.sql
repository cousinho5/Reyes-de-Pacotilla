-- Partidas de prueba: bots, reloj simulado y "jugar como" otra casa.
-- El cron horario no las toca; el tiempo solo avanza con los botones de la mesa de pruebas.

ALTER TABLE games ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0;
ALTER TABLE games ADD COLUMN test_bots INTEGER;          -- bots que se añaden al empezar
ALTER TABLE games ADD COLUMN sim_now TEXT;               -- instante simulado (ISO, UTC)
ALTER TABLE games ADD COLUMN played_house_id INTEGER;    -- casa que maneja ahora quien creó la prueba

ALTER TABLE houses ADD COLUMN is_bot INTEGER NOT NULL DEFAULT 0;
