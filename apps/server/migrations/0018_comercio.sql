-- Bloque 10 (docs/bloque10.md, puntos 5 y 8).
-- `expires_after`: número de la resolución tras la que la oferta se retira sola
-- si sigue abierta (se pone al crearla: la resolución actual + TRADE.offerNights).
-- `expired`: 1 si se retiró por caducar, para enseñarla como «caducada».
-- `note`: frase corta de quien hace la oferta, de 80 letras como mucho.
ALTER TABLE offers ADD COLUMN expires_after INTEGER;
ALTER TABLE offers ADD COLUMN expired INTEGER NOT NULL DEFAULT 0 CHECK (expired IN (0, 1));
ALTER TABLE offers ADD COLUMN note TEXT CHECK (note IS NULL OR length(note) <= 80);

-- Las ofertas abiertas de antes caducan como si se acabaran de hacer.
UPDATE offers SET expires_after = (SELECT current_resolution + 3 FROM games WHERE games.id = offers.game_id)
WHERE status = 'open';
