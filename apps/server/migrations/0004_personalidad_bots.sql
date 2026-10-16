-- Personalidad de cada bot de las partidas de prueba (estratega, mercader,
-- guerrero, arquitecta u oportunista; ver packages/engine/src/ai).
ALTER TABLE houses ADD COLUMN bot_personality TEXT;
