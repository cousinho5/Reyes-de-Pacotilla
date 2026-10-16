// Genera un par de claves VAPID para las notificaciones push.
// Uso: node apps/server/scripts/claves-vapid.mjs
// Después: npx wrangler secret put VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY
// (y VAPID_SUBJECT con "mailto:tu@correo"). En local, en apps/server/.dev.vars.
const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
const raw = new Uint8Array(await crypto.subtle.exportKey("raw", publicKey));
const jwk = await crypto.subtle.exportKey("jwk", privateKey);
const b64url = (b) => Buffer.from(b).toString("base64url");
console.log(`VAPID_PUBLIC_KEY="${b64url(raw)}"`);
console.log(`VAPID_PRIVATE_KEY="${jwk.d}"`);
console.log(`VAPID_SUBJECT="mailto:reyes@example.com"`);
