# Reyes de Pacotilla

Juego de estrategia asíncrono de navegador para 4-8 amigos. El rey Aldric ha muerto (un hueso de pollo, aunque el cronista lo niega) y varios pretendientes se disputan el trono de Aldricia, el Reino Más o Menos Unido. Cada día se juegan 5-10 minutos; dos veces por semana, el miércoles y el domingo a las 22:00, se resuelve todo a la vez y Fray Abundio lo cuenta a su manera.

## Documentación

- [Documento de diseño](docs/diseno.md)
- [Banco de frases de Fray Abundio](docs/banco-de-frases.md)
- [Esquema de la base de datos](docs/esquema-bd.md)

## Estado: MVP 1

Ya se puede jugar una partida completa:

- Crear partida, invitar por enlace (o WhatsApp), elegir nombre, color y lema de la casa.
- Entrar con un código de 6 caracteres desde cualquier dispositivo, también desde el juego instalado en iPhone.
- Mapa generado por semilla y comprobado como justo, con niebla de guerra.
- Producción diaria, mejorar edificios, reclutar, fortificar.
- Órdenes de mover/atacar y apoyar, con simulación usando el mismo motor que el servidor.
- Resoluciones el miércoles y el domingo a las 22:00 (hora de Madrid), con mantenimiento, deserciones, ayuda al último y Prestigio en vivo.
- Crónica sencilla de lo ocurrido (el boletín de Fray Abundio llega en la versión 1).

## Desarrollo en local

Requisitos: Node 20 o superior y npm 11.

```bash
npm install
npm test             # pruebas del motor y del calendario
npm run typecheck
```

Servidor local (sirve también el cliente compilado):

```bash
# Secretos locales (una vez)
printf 'SESSION_SECRET="secreto-local"\nADMIN_SECRET="admin-local"\n' > apps/server/.dev.vars
npm run db:migrate:local -w @reyes/server
npm run dev:server   # compila el cliente y arranca en http://localhost:8787
```

Prueba de humo de la API (con el servidor local en marcha):

```bash
npm run prueba-humo
```

Lanzar el cron a mano en local:

```bash
curl -X POST "http://localhost:8787/cdn-cgi/local/explorer/api/local/scheduled?worker=reyes-de-pacotilla" \
  -H 'content-type: application/json' -d '{"cron":"0 * * * *"}'
```

Para desarrollar el cliente con recarga en caliente: `npm run dev:web` (en otra terminal, con el servidor local en marcha).

## Publicar en Cloudflare

1. Crear la base de datos (una vez): `npx wrangler d1 create reyes` y copiar el `database_id` en `apps/server/wrangler.toml`.
2. Guardar los secretos: `npx wrangler secret put SESSION_SECRET` (una cadena larga al azar) y `npx wrangler secret put ADMIN_SECRET`.
3. Aplicar migraciones: `npm run db:migrate:remote -w @reyes/server`.
4. Compilar y publicar: `npm run build -w @reyes/web && npm run deploy -w @reyes/server`.

## Crear una partida

```bash
curl -X POST https://TU-DOMINIO/api/partidas \
  -H "x-admin: TU_ADMIN_SECRET" -H "content-type: application/json" \
  -d '{"nombre": "Primer interregno", "semanas": 2, "creador": "Pablo"}'
```

La respuesta trae el código de invitación (el enlace es `https://TU-DOMINIO/unirse/CODIGO`) y el código de acceso de quien la crea. Con 4 casas dentro, quien la creó la empieza desde la sala de espera; arranca el lunes siguiente.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `packages/engine` | Motor puro: reglas, combate, mapa, niebla, economía, Prestigio y calendario |
| `apps/server` | Cloudflare Worker (Hono + D1) con la API, el cron horario y la prueba de humo |
| `apps/web` | Cliente React + Vite (PWA) |
| `docs` | Diseño, banco de frases y esquema |
