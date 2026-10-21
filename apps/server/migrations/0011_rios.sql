-- Bloque 1, fase 2: ríos. Cada casilla guarda por qué lados pasa un río, un
-- bit por lado en el orden de neighbourCoords (motor, map.ts). Los lagos ya
-- estaban en el CHECK de tiles (0010).
ALTER TABLE tiles ADD COLUMN river INTEGER NOT NULL DEFAULT 0 CHECK (river >= 0 AND river < 64);
