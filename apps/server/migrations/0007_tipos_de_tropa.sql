-- Tipos de tropa (sistema de guerra v3, fase 3). `troops` sigue siendo el
-- total de la casilla o de la orden; de ellas, estas son Jinetes y Catapultas
-- (el resto es Mesnada). Las casillas y órdenes que ya existían son todo Mesnada.
ALTER TABLE tiles ADD COLUMN jinetes INTEGER NOT NULL DEFAULT 0 CHECK (jinetes >= 0);
ALTER TABLE tiles ADD COLUMN catapultas INTEGER NOT NULL DEFAULT 0 CHECK (catapultas >= 0);
ALTER TABLE orders ADD COLUMN jinetes INTEGER NOT NULL DEFAULT 0 CHECK (jinetes >= 0);
ALTER TABLE orders ADD COLUMN catapultas INTEGER NOT NULL DEFAULT 0 CHECK (catapultas >= 0);
