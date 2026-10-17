# Reyes de Pacotilla

Juego de estrategia asíncrono de navegador para 4-8 amigos. El rey Aldric ha muerto (un hueso de pollo, aunque el cronista lo niega) y varios pretendientes se disputan el trono de Aldricia, el Reino Más o Menos Unido. Cada día se juegan 5-10 minutos; dos veces por semana, el miércoles y el domingo a las 22:00, se resuelve todo a la vez y Fray Abundio lo cuenta a su manera.

## Documentación

- [Documento de diseño](docs/diseno.md)
- [Banco de frases de Fray Abundio](docs/banco-de-frases.md)
- [Esquema de la base de datos](docs/esquema-bd.md)
- [Simulaciones de equilibrio](docs/simulaciones.md)

## Estado: MVP 2

Ya se puede jugar una partida completa:

- Crear partida, invitar por enlace (o WhatsApp), elegir nombre, color y lema de la casa.
- Entrar con un código de 6 caracteres desde cualquier dispositivo, también desde el juego instalado en iPhone.
- Mapa generado por semilla y comprobado como justo, con niebla de guerra.
- Producción diaria, mejorar edificios, reclutar, fortificar.
- Órdenes de mover/atacar y apoyar, con simulación usando el mismo motor que el servidor.
- Resoluciones el miércoles y el domingo a las 22:00 (hora de Madrid), con mantenimiento, deserciones, ayuda al último y Prestigio en vivo.
- Comercio: ofertas públicas y dirigidas, contraofertas y aceptación atómica (dos aceptaciones simultáneas nunca cobran dos veces).
- Objetivo secreto, logros y final de partida con revelación de objetivos y coronación.
- Piloto automático para ausentes y modo vacaciones.
- Notificaciones push (ofertas, cierre de órdenes, resultados y fin) e instalación como app en el móvil.
- Crónica sencilla de lo ocurrido (el boletín de Fray Abundio llega en la versión 1).

Versión 1 (en curso):

- Gran Subasta del miércoles: tres lotes anunciados el martes, pujas ciegas en Oro y logro de ganador de subasta.
- Cartas de la Corona: Espía, Muralla, Mercenarios, Carreta, Maestro de obras, Diezmo, Tregua y Tambores de guerra.

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
node apps/server/scripts/claves-vapid.mjs >> apps/server/.dev.vars   # opcional: avisos push
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

**Automático (recomendado):** cada vez que se une algo a `main`, GitHub Actions publica el juego (`.github/workflows/publicar.yml`). Crea la base de datos la primera vez, aplica las migraciones, publica y genera la clave de sesiones y las claves de las notificaciones si faltan. Solo necesita tres secretos del repositorio (**Settings → Secrets and variables → Actions**): `CLOUDFLARE_API_TOKEN` (plantilla "Edit Cloudflare Workers" más el permiso **Cuenta → D1 → Editar**), `CLOUDFLARE_ACCOUNT_ID` y `ADMIN_SECRET` (la clave para crear partidas). También se puede lanzar a mano desde la pestaña **Actions**.

**A mano**, si alguna vez hace falta:

1. Crear la base de datos (una vez): `npx wrangler d1 create reyes` y copiar el `database_id` en `apps/server/wrangler.toml`.
2. Guardar los secretos: `npx wrangler secret put SESSION_SECRET` (una cadena larga al azar) y `npx wrangler secret put ADMIN_SECRET`.
   Para las notificaciones, generar claves con `node apps/server/scripts/claves-vapid.mjs` y guardar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` (por ejemplo `mailto:tu@correo`) con `wrangler secret put`.
3. Aplicar migraciones: `npm run db:migrate:remote -w @reyes/server`.
4. Compilar y publicar: `npm run build -w @reyes/web && npm run deploy -w @reyes/server`.

## Probar el juego tú solo

En `/crear`, marca **Partida de prueba** y elige cuántos bots rivales quieres (de 3 a 7). Eliges tu casa, pulsas **Empezar la prueba** y aparece la mesa de pruebas encima del mapa:

- **Siguiente paso**: lleva a la mañana siguiente (producción y piloto automático) o a la resolución de las 22:00.
- **Resolver**: avanza hasta pasar la próxima resolución.
- **Hasta el final**: juega toda la partida hasta la coronación.
- **Jugar como**: maneja cualquier casa, por ejemplo para atacarte a ti mismo o aceptar tu propia oferta.
- **Borrar**: elimina la prueba y sus bots.

Los bots tienen personalidad: construyen, reclutan, fortifican, atacan con apoyos, defienden, publican ofertas y aceptan las que les convienen. El reloj de la prueba es simulado: el cron real no la toca y las partidas de verdad no se ven afectadas.

## Simular partidas entre bots

```bash
npm run simular                                   # 500 partidas de 6 semanas con personalidades mezcladas
npm run simular -- --partidas 2000 --modo espejo  # todas las casas iguales
npm run simular -- --modo todos                   # personalidades y bots sencillos juntos
```

Los bots tienen personalidad (estratega, mercader, guerrero, arquitecta y oportunista): valoran recursos, atacan con apoyos, defienden, comercian y persiguen su objetivo secreto, viendo solo lo que vería una persona. Son los mismos que juegan las partidas de prueba.

Resume qué estrategias ganan, si las especialidades son justas, qué objetivos se cumplen y qué recursos sobran. Resultados y propuestas en [docs/simulaciones.md](docs/simulaciones.md).

## Crear una partida

Lo más fácil: abrir `https://TU-DOMINIO/crear`, escribir la clave de administración (`ADMIN_SECRET`), el nombre de la partida, tu nombre y la duración. Después eliges tu casa y compartes la invitación. También se puede con la API:

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
