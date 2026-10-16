-- MVP 2: aceptación segura de ofertas.
-- accept_token identifica el intento de aceptación que ganó: los cambios de
-- recursos y el trato solo se aplican si el token de la oferta es el propio,
-- así dos aceptaciones simultáneas nunca cobran dos veces.
ALTER TABLE offers ADD COLUMN accepted_by INTEGER REFERENCES houses(id);
ALTER TABLE offers ADD COLUMN accept_token TEXT;

-- Plantilla del piloto automático elegida y última vez que actuó.
ALTER TABLE houses ADD COLUMN autopilot_ran_on TEXT;
