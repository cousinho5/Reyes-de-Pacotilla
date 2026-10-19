# Reyes de Pacotilla: guía para Claude

Juego de estrategia asíncrono de navegador para 4-8 amigos. El diseño completo está en `docs/diseno.md` (versión 2); el banco de frases del cronista en `docs/banco-de-frases.md`; el esquema de la base de datos en `docs/esquema-bd.md`.

## Estructura

- `packages/engine`: motor puro en TypeScript (reglas, combate, economía, Prestigio, calendario). Sin dependencias ni efectos secundarios. Lo usan el servidor y el cliente (botón Simular).
- `apps/server`: Cloudflare Worker con Hono y D1. `src/scheduler.ts` decide qué tareas tocan cada hora; `src/jobs.ts` las ejecuta en lotes atómicos.
- `apps/server/migrations`: migraciones SQL de D1. Nunca editar una migración ya aplicada: añadir una nueva.
- `apps/web`: cliente React + Vite, PWA.

## Comandos

- `npm install` (requiere npm 11: con npm 10 falla la instalación).
- `npm test`: todas las pruebas (Vitest).
- `npm run typecheck`: TypeScript en todos los paquetes.
- `npm run dev:server`: compila el cliente y arranca el Worker en http://localhost:8787 (necesita `apps/server/.dev.vars` con `SESSION_SECRET` y `ADMIN_SECRET`, y `npm run db:migrate:local -w @reyes/server`).
- `npm run prueba-humo`: prueba de la API de punta a punta contra el servidor local (42 comprobaciones, incluidas dos aceptaciones simultáneas de una oferta).
- `npm run simular`: simula cientos de partidas entre bots con personalidad (`packages/engine/src/ai`, partida en `packages/engine/src/simulation.ts`, informe en `scripts/simular.ts`; `--modo espejo|todos|clasico`). Los mismos bots juegan las partidas de prueba (`apps/server/src/pruebas.ts`) y solo usan lo que vería una persona. Antes de cambiar valores de `rules.ts`, simular antes y después y anotar el resultado en `docs/simulaciones.md`. El simulador reproduce el orden de tareas de `jobs.ts`: si cambia uno, cambiar el otro.
- Alianzas (bloque 8 de la hoja de ruta): reglas y pasos en `docs/alianzas.md`.
- `npm run simular-mapa -- [partidas] [casas]`: compara tamaños de mapa y páramos (`MAP_LAYOUT` en `rules.ts`); `SEMANAS=4` y `TODAS=1` para más variantes.
- Sistema de guerra v3 (propuesta en el documento "Reyes de Pacotilla: propuesta del nuevo sistema de guerra"). Hecho: hexágonos "odd-r" (`GRID` en `rules.ts`, dibujo en `apps/web/src/art/grid.ts`), una resolución al día y terreno (`TERRAIN` en `rules.ts`, `packages/engine/src/terrain.ts`: defensa por terreno, emboscada, atalaya, caminos y travesías; los caminos los calcula el motor y el dibujo los pinta tal cual) y tipos de tropa (`UNITS` en `rules.ts`, `packages/engine/src/units.ts`: `troops` es el total y `jinetes`/`catapultas` lo que hay de cada tipo, en casillas y órdenes; si algo baja `troops` por otra vía, pasar la casilla por `clampUnits`) y asedios (`SIEGE` en `rules.ts`, orden `siege` en `combat.ts`; las casillas guardan `besiegedBy`/`siegeNights` y las casas `siege_nights` para el Prestigio) y Capitán y Gloria (`CAPTAIN` y `GLORY` en `rules.ts`; el motor recibe y devuelve `captains` en `resolveCampaign` y `gloryFromEvents` cuenta la Gloria; en la base de datos, `houses.captain_*`, `houses.glory` y `orders.captain`) y repetición, avisos y órdenes en cola (`packages/engine/src/plan.ts`: `threats`, `bannersSeen`, `fitOrders`, `planNights`; `QUEUE` en `rules.ts`; las órdenes en cola son filas de `orders` con un `resolution_no` posterior y, al llegar su noche, `jobs.ts` las pasa por `fitOrders`; la repetición vive en `apps/web/src/components/NightReplay.tsx` y la proyección del cliente en `apps/web/src/plan.ts`). Cada partida guarda sus días con resolución en `games.resolution_days` (las antiguas, `2,6`): en el servidor, el calendario usa siempre `rhythmOf(game)` y las llamadas al motor que fortifican van dentro de `withRhythm`. Toda distancia o adyacencia pasa por `distance`/`areAdjacent` de `map.ts`, nunca por Manhattan a mano. `HEX=1 npm run simular-mapa`, `npm run simular -- --terreno no` y `--tropas no` y `--asedios no` y `--capitan no` comparan con el juego anterior.
- `node apps/server/scripts/claves-vapid.mjs`: genera las claves VAPID de las notificaciones push.
- Cron en local: `POST /cdn-cgi/local/explorer/api/local/scheduled?worker=reyes-de-pacotilla` con `{"cron":"0 * * * *"}`. La ruta `/__scheduled` no sirve porque la atienden los archivos estáticos.
- Partidas de prueba (`apps/server/src/pruebas.ts`): bots y reloj simulado (`games.sim_now`). En el servidor, la hora de una partida se obtiene siempre con `gameNow(game)`, nunca con `new Date()`, para que las pruebas funcionen.
- Para comprobar la interfaz, si el entorno tiene Chromium (por ejemplo en `/opt/pw-browsers`), usar Playwright con un viewport de móvil de 390x844.

## Reglas del proyecto

- Todo el texto que ve el jugador va en español. El recurso se llama **Pan**, nunca "Comida".
- El motor es determinista y puro: misma entrada, misma salida; no modifica la entrada; nada de `Date.now()` ni azar dentro de `packages/engine` (el azar del mapa llega como semilla).
- Las reglas de combate siguen la sección 8 del diseño. Cualquier cambio de reglas va acompañado de su prueba y de la actualización de `docs/diseno.md`.
- Los valores ajustables viven en `packages/engine/src/rules.ts`, no repartidos por el código.
- Los recursos nunca pueden ser negativos: la base de datos lo impide con `CHECK`; las operaciones con dinero van en `db.batch()` (D1 no admite `BEGIN`/`COMMIT`).
- Las tareas programadas son idempotentes: cada una registra una clave única (`job_runs` o `resolutions`) en el mismo lote que sus cambios.
- Los cron de Cloudflare van en UTC: toda la lógica horaria pasa por `schedule.ts` con la zona horaria de la partida.
- El pixel art vive en `apps/web/src/art` como rejillas de texto con paleta (nada de imágenes). Las reglas de los escudos, en `packages/engine/src/heraldry.ts`.
- Los textos de Fray Abundio salen del banco de frases; las cifras siempre exactas, el humor en los adjetivos.
- El servidor nunca envía al cliente información fuera de la niebla de guerra de esa casa.
