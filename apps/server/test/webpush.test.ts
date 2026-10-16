import { createECDH, createPublicKey, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
// Implementación independiente del estándar (la que usa la biblioteca web-push de Node).
// @ts-expect-error: http_ece no trae tipos
import ece from "http_ece";
import { b64urlDecode, b64urlEncode, encryptPayload, vapidAuthorization } from "../src/webpush";

describe("Notificaciones push", () => {
  it("el cifrado RFC 8291 lo descifra una implementación independiente", async () => {
    // El navegador: par de claves P-256 y secreto de autenticación.
    const ua = createECDH("prime256v1");
    ua.generateKeys();
    const auth = new Uint8Array(16).map((_, i) => i * 7 + 3);
    const message = JSON.stringify({ title: "Te han hecho una oferta", body: "La Casa Roca quiere comerciar contigo. ¿Pan por Hierro?" });

    const body = await encryptPayload(
      { p256dh: b64urlEncode(new Uint8Array(ua.getPublicKey())), auth: b64urlEncode(auth) },
      new TextEncoder().encode(message),
    );

    const plain = ece.decrypt(Buffer.from(body), {
      version: "aes128gcm",
      privateKey: ua,
      authSecret: Buffer.from(auth).toString("base64url"),
    });
    expect(plain.toString("utf8")).toBe(message);
  });

  it("la firma VAPID es un JWT ES256 válido con el origen del servicio", async () => {
    const server = createECDH("prime256v1");
    server.generateKeys();
    const publicKey = b64urlEncode(new Uint8Array(server.getPublicKey()));
    const privateKey = b64urlEncode(new Uint8Array(server.getPrivateKey()));
    const header = await vapidAuthorization(
      "https://fcm.googleapis.com/fcm/send/abc",
      { publicKey, privateKey, subject: "mailto:reyes@example.com" },
      Date.UTC(2026, 9, 16, 12),
    );
    const m = header.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/)!;
    expect(m[4]).toBe(publicKey);
    const claims = JSON.parse(Buffer.from(m[2]!, "base64url").toString());
    expect(claims).toMatchObject({ aud: "https://fcm.googleapis.com", sub: "mailto:reyes@example.com" });
    expect(claims.exp).toBe(Date.UTC(2026, 9, 16, 12) / 1000 + 12 * 3600);

    const pub = b64urlDecode(publicKey);
    const key = createPublicKey({
      key: { kty: "EC", crv: "P-256", x: b64urlEncode(pub.slice(1, 33)), y: b64urlEncode(pub.slice(33)) },
      format: "jwk",
    });
    const ok = verify("sha256", Buffer.from(`${m[1]}.${m[2]}`), { key, dsaEncoding: "ieee-p1363" }, Buffer.from(m[3]!, "base64url"));
    expect(ok).toBe(true);
  });
});
