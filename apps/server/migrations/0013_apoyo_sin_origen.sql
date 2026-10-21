-- Apoyo sin elegir origen (bloque 4, punto 1). Un apoyo al ataque con
-- supports_any = 1 suma al primer ataque que llegue a la casilla esa noche: el
-- de su casa si ataca; si no, el de la orden que se cambió antes (updated_at).
ALTER TABLE orders ADD COLUMN supports_any INTEGER NOT NULL DEFAULT 0 CHECK (supports_any IN (0, 1));
