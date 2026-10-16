// Avisos a los jugadores (diseño, sección 13). Cada aviso tiene una clave
// única por persona, así nunca se manda dos veces el mismo.

import { sendPush, type VapidKeys } from "./webpush";

export interface NotifyEnv {
  DB: D1Database;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

export interface Notice {
  kind: string;
  title: string;
  body: string;
  url: string;
  /** Clave del aviso; se le añade el usuario para que sea única por persona. */
  dedupe: string;
}

export function vapidFrom(env: NotifyEnv): VapidKeys | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  return {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT ?? "mailto:reyes@example.com",
  };
}

/** Avisa a las personas de unas casas. Nunca lanza: un aviso fallido no rompe el juego. */
export async function notifyHouses(env: NotifyEnv, houseIds: number[], notice: Notice): Promise<void> {
  if (houseIds.length === 0) return;
  try {
    const marks = houseIds.map(() => "?").join(",");
    const { results: people } = await env.DB.prepare(
      `SELECT DISTINCT user_id, game_id FROM houses WHERE id IN (${marks})`,
    )
      .bind(...houseIds)
      .all<{ user_id: number; game_id: number }>();
    const vapid = vapidFrom(env);
    for (const p of people) {
      const key = `${notice.dedupe}:${p.user_id}`;
      const inserted = await env.DB.prepare(
        "INSERT OR IGNORE INTO notifications (user_id, game_id, kind, dedupe_key, body) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(p.user_id, p.game_id, notice.kind, key, `${notice.title}. ${notice.body}`)
        .run();
      if (!inserted.meta.changes || !vapid) continue;
      const { results: subs } = await env.DB.prepare(
        "SELECT id, endpoint, keys_json FROM push_subscriptions WHERE user_id = ?",
      )
        .bind(p.user_id)
        .all<{ id: number; endpoint: string; keys_json: string }>();
      let sent = false;
      for (const s of subs) {
        const keys = JSON.parse(s.keys_json) as { p256dh: string; auth: string };
        try {
          const status = await sendPush(
            { endpoint: s.endpoint, ...keys },
            { title: notice.title, body: notice.body, url: notice.url },
            vapid,
          );
          if (status === 404 || status === 410) {
            await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(s.id).run();
          } else if (status < 300) {
            sent = true;
          }
        } catch (err) {
          console.error("Aviso push fallido:", err);
        }
      }
      if (sent) {
        await env.DB.prepare("UPDATE notifications SET sent_at = ? WHERE dedupe_key = ?")
          .bind(new Date().toISOString(), key)
          .run();
      }
    }
  } catch (err) {
    console.error("Error al avisar:", err);
  }
}
