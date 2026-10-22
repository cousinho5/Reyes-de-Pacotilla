-- Bloque 12 (docs/bloque12.md, puntos 5 y 8).
-- `repeat`: la orden se copia a la noche siguiente al resolver, hasta que se
-- quite o deje de ser posible. Solo en asedios y en apoyos a la defensa.
-- `close_warning`: la casa quiere el aviso 1 hora antes del cierre si aún no
-- ha dado órdenes (se puede apagar en la pestaña Castillo).
ALTER TABLE orders ADD COLUMN repeat INTEGER NOT NULL DEFAULT 0 CHECK (repeat IN (0, 1));
ALTER TABLE houses ADD COLUMN close_warning INTEGER NOT NULL DEFAULT 1 CHECK (close_warning IN (0, 1));
