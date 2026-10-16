# Reyes de Pacotilla

Juego de estrategia asíncrono de navegador para 4-8 amigos. El rey Aldric ha muerto (un hueso de pollo, aunque el cronista lo niega) y varios pretendientes se disputan el trono de Aldricia, el Reino Más o Menos Unido. Cada día se juegan 5-10 minutos; dos veces por semana, el miércoles y el domingo a las 22:00, se resuelve todo a la vez y Fray Abundio lo cuenta a su manera.

## Documentación

- [Documento de diseño](docs/diseno.md)
- [Banco de frases de Fray Abundio](docs/banco-de-frases.md)
- [Esquema de la base de datos](docs/esquema-bd.md)

## Puesta en marcha

Requisitos: Node 20 o superior y npm 11.

```bash
npm install
npm test            # pruebas del motor y del calendario
npm run typecheck
npm run dev:web     # cliente en http://localhost:5173
```

### Servidor en Cloudflare

1. Crear la base de datos (una vez): `npx wrangler d1 create reyes` y copiar el `database_id` en `apps/server/wrangler.toml`.
2. Aplicar migraciones: `npm run db:migrate:local -w @reyes/server` (o `db:migrate:remote` para producción).
3. Desarrollo local: `npm run dev:server`.
4. Publicar: `npm run deploy -w @reyes/server`.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `packages/engine` | Motor puro: reglas, combate, economía, Prestigio y calendario |
| `apps/server` | Cloudflare Worker (Hono + D1) con el cron horario |
| `apps/web` | Cliente React + Vite (PWA) |
| `docs` | Diseño, banco de frases y esquema |

## Estado

Base del proyecto: motor de combate completo y probado, producción diaria y resolución de campaña conectadas a D1, calendario en hora de Madrid. Lo siguiente es el MVP 1 (cuentas por invitación, mapa con niebla de guerra, construir, reclutar y dar órdenes).
