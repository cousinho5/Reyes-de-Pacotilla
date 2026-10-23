-- Bloque 13 (docs/bloque13.md, punto 10).
-- `cinematics`: qué cinemáticas salen solas al entrar. 'todas' o solo el
-- prólogo y la coronación ('esenciales'). Las demás siguen en la lista de Reino.
ALTER TABLE houses ADD COLUMN cinematics TEXT NOT NULL DEFAULT 'todas' CHECK (cinematics IN ('todas', 'esenciales'));
