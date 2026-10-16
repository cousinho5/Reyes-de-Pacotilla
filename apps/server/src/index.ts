import { app, type Env } from "./app";
import { runHourly } from "./jobs";

export default {
  fetch: app.fetch,
  // Cron horario (ver wrangler.toml): decide en hora local qué toca hacer.
  scheduled(controller, env, ctx) {
    ctx.waitUntil(runHourly(env, new Date(controller.scheduledTime)));
  },
} satisfies ExportedHandler<Env>;
