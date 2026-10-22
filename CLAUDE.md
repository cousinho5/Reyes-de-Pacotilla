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
- `npm run prueba-humo`: prueba de la API de punta a punta contra el servidor local (59 comprobaciones, incluidas dos aceptaciones simultáneas de una oferta, las compras a la Corona, los mercenarios y las alianzas).
- `npm run simular`: simula cientos de partidas entre bots con personalidad (`packages/engine/src/ai`, partida en `packages/engine/src/simulation.ts`, informe en `scripts/simular.ts`; `--modo espejo|todos|clasico`). Los mismos bots juegan las partidas de prueba (`apps/server/src/pruebas.ts`) y solo usan lo que vería una persona. Antes de cambiar valores de `rules.ts`, simular antes y después y anotar el resultado en `docs/simulaciones.md`. El simulador reproduce el orden de tareas de `jobs.ts`: si cambia uno, cambiar el otro.
- Mapa y losetas (bloque 1 de la hoja de ruta, el primero en hacerse): decisiones, fases y la evaluación con sus simulaciones en `docs/bloque1.md`. El generador con geografía es `generateGeographicMap` (`mapgen.ts`, valores en `MAP_GEN` de `rules.ts`); el de antes sigue como `generateClassicMap` y `npm run simular -- --geografia no` lo usa para comparar. La costa del mapa se guarda en `games.map_coast` y el dibujo pone el marco de mar y montañas con ella. Ríos y lagos (fase 2): `RIVERS` en `rules.ts`, `packages/engine/src/rivers.ts`; cada casilla guarda sus lados con río en `tiles.river` (`Tile.river`, un bit por lado en el orden de `neighbourCoords`) y el combate usa `crossesRiver`/`bridgeBetween` de `terrain.ts`; `npm run simular -- --rios no` compara; `--semilla x` cambia la tanda de partidas para ver el ruido. Aldeas y Ruinas (fase 3): `FEATURES` en `rules.ts` y `packages/engine/src/aldeas.ts` (premio con `ruinPrize`/`claimRuins` tras cada resolución, en `jobs.ts` y en el simulador; reclutar en una aldea con `canRecruitAt`, y los bots con `recruitSite`); `--aldeas no` y `--ruinas no` comparan.
- Alianzas (bloque 8 de la hoja de ruta): reglas, dudas resueltas y pasos en `docs/alianzas.md`. Motor hecho: `ALLIANCE` en `rules.ts`, `packages/engine/src/alliances.ts` (`allied` = en vigor, `bound` = en vigor o en aviso) y `resolveCampaign`/`checkOrders` con `alliances`; las tropas de paso son `Tile.guests` y las órdenes que salen de ellas llevan `guest`. Si algo cuenta las tropas de una casa, sumar `guestTroops`. Bots: `ai/alliances.ts` y `ALLIANCE_BOTS`; en el simulador, `--alianzas no`, `--alianzas-tope 1` y `--alianzas-ganas`. Servidor: migración 0016 (`alliances`, `tile_guests`, `orders.guest`), `apps/server/src/alianzas.ts` (lo usan la API y `botsDiplomacy` de `pruebas.ts`); `loadTiles` trae las tropas de paso y, si una tarea cambia casillas con el motor, guardarlas con `guestStatements`. Los aliados en vigor comparten visión: sumarlos a `spied` en `projectForHouse`. Cliente: `DiplomacyPanel.tsx` (en Comercio) y `alliancesOf`/`myAllies`/`myBreaking` de `apps/web/src/plan.ts`; las órdenes de tropas de paso llevan `dePaso`.
- Vista del castillo (bloque 2 de la hoja de ruta): decisiones y pasos en `docs/bloque2.md`.
- Mejora del cronista (bloque 3 de la hoja de ruta): decisiones y pasos en `docs/bloque3.md`.
- Retoques de batalla (bloque 4 de la hoja de ruta): decisiones y pasos en `docs/bloque4.md`.
- Retoques de recursos (bloque 5 de la hoja de ruta): decisiones y pasos en `docs/bloque5.md`. Hecho: Corona en `packages/engine/src/crown.ts` y `apps/server/src/corona.ts`; mercenarios en `packages/engine/src/mercenaries.ts` y `apps/server/src/mercenarios.ts`. En el simulador: `--oro-mejora`, `--corona no`, `--mercenarios no|soldada`, `--mercenarios-tope`, `--tesoro`, `--mejora-madera-piedra` y `--riqueza-tope`.
- Optimización y controles en móvil (bloque 6 de la hoja de ruta): medidas, decisiones y pasos en `docs/bloque6.md`.
- Diseño de la sección Mapa (bloque 9 de la hoja de ruta): decisiones y pasos en `docs/bloque9.md`.
- Diseño de la sección Órdenes (bloque 12 de la hoja de ruta): decisiones y pasos en `docs/bloque12.md`.
- Diseño de la sección Comercio (bloque 10 de la hoja de ruta): decisiones y pasos en `docs/bloque10.md`.
- Diseño de la sección Reino (bloque 11 de la hoja de ruta): decisiones y pasos en `docs/bloque11.md`.
- Historia y cinemáticas (bloque 13 de la hoja de ruta): decisiones y pasos en `docs/bloque13.md`.
- Página de inicio (bloque 7 de la hoja de ruta): decisiones y pasos en `docs/bloque7.md`.
- `npm run simular-mapa -- [partidas] [casas]`: compara tamaños de mapa y páramos (`MAP_LAYOUT` en `rules.ts`); `SEMANAS=4` y `TODAS=1` para más variantes.
- Sistema de guerra v3 (propuesta en el documento "Reyes de Pacotilla: propuesta del nuevo sistema de guerra"). Hecho: hexágonos "odd-r" (`GRID` en `rules.ts`, dibujo en `apps/web/src/art/grid.ts`), una resolución al día y terreno (`TERRAIN` en `rules.ts`, `packages/engine/src/terrain.ts`: defensa por terreno, emboscada, atalaya, caminos y travesías; los caminos los calcula el motor y el dibujo los pinta tal cual) y tipos de tropa (`UNITS` en `rules.ts`, `packages/engine/src/units.ts`: `troops` es el total y `jinetes`/`catapultas` lo que hay de cada tipo, en casillas y órdenes; si algo baja `troops` por otra vía, pasar la casilla por `clampUnits`) y asedios (`SIEGE` en `rules.ts`, orden `siege` en `combat.ts`; las casillas guardan `besiegedBy`/`siegeNights` y las casas `siege_nights` para el Prestigio) y Capitán y Gloria (`CAPTAIN` y `GLORY` en `rules.ts`; el motor recibe y devuelve `captains` en `resolveCampaign` y `gloryFromEvents` cuenta la Gloria; en la base de datos, `houses.captain_*`, `houses.glory` y `orders.captain`) y repetición, avisos y órdenes en cola (`packages/engine/src/plan.ts`: `threats`, `bannersSeen`, `fitOrders`, `planNights`; `QUEUE` en `rules.ts`; las órdenes en cola son filas de `orders` con un `resolution_no` posterior y, al llegar su noche, `jobs.ts` las pasa por `fitOrders`; la repetición vive en `apps/web/src/components/NightReplay.tsx` y la proyección del cliente en `apps/web/src/plan.ts`). Cada partida guarda sus días con resolución en `games.resolution_days` (las antiguas, `2,6`): en el servidor, el calendario usa siempre `rhythmOf(game)` y las llamadas al motor que fortifican van dentro de `withRhythm`. Toda distancia o adyacencia pasa por `distance`/`areAdjacent` de `map.ts`, nunca por Manhattan a mano. `HEX=1 npm run simular-mapa`, `npm run simular -- --terreno no` y `--tropas no` y `--asedios no` y `--capitan no` comparan con el juego anterior.
- `node apps/server/scripts/claves-vapid.mjs`: genera las claves VAPID de las notificaciones push.
- Cron en local: `POST /cdn-cgi/local/explorer/api/local/scheduled?worker=reyes-de-pacotilla` con `{"cron":"0 * * * *"}`. La ruta `/__scheduled` no sirve porque la atienden los archivos estáticos.
- Partidas de prueba (`apps/server/src/pruebas.ts`): bots y reloj simulado (`games.sim_now`). En el servidor, la hora de una partida se obtiene siempre con `gameNow(game)`, nunca con `new Date()`, para que las pruebas funcionen.
- Pixel art con pxl (proceso completo en `docs/pixel-art.md`): skill en `.claude/skills/pxl-pixel-art` (`node .claude/skills/pxl-pixel-art/bin/pxl.js`). Sirve de taller para diseñar y revisar arte (PNG y GIF); el juego sigue dibujando desde `apps/web/src/art`. Para pasar un dibujo al juego: `node scripts/pxl-a-juego.mjs <dibujo.px.js> <nombre> --salida apps/web/src/art/<archivo>.ts` (genera un `Sprite`, o una lista si es una animación; con `--mapa`, rejillas con la paleta `WORLD` para `world.ts`, como las tropas de `apps/web/src/art/tropas.ts`; necesita Node 22.18). Prueba: `docs/maquetas/bloque13/pxl/pregonero.px.js`.
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
