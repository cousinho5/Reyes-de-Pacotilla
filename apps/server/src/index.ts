import { Hono } from "hono";
import { localParts } from "@reyes/engine";
import { runHourly } from "./jobs";

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/salud", (c) => {
  const p = localParts(new Date(), "Europe/Madrid");
  return c.json({
    ok: true,
    juego: "Reyes de Pacotilla",
    horaMadrid: `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`,
  });
});

export default {
  fetch: app.fetch,
  // Cron horario (ver wrangler.toml): decide en hora local qué toca hacer.
  scheduled(controller, env, ctx) {
    ctx.waitUntil(runHourly(env.DB, new Date(controller.scheduledTime)));
  },
} satisfies ExportedHandler<Env>;
