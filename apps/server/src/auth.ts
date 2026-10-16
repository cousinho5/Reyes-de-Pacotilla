// Cuentas sin contraseña (diseño, sección 20): cada persona tiene un código
// corto para entrar desde cualquier sitio, también desde el juego instalado en
// iPhone, que no comparte cookies con Safari. La sesión es una cookie firmada.

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0 ni I/1
export const SESSION_COOKIE = "reyes_sesion";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

export interface Session {
  userId: number;
  tokenVersion: number;
}

export function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** Normaliza lo que escribe el jugador: mayúsculas y sin espacios ni guiones. */
export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[\s-]/g, "");
}

/** Hash del código de acceso con la clave secreta del servidor (nunca se guarda el código). */
export async function hashCode(code: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`codigo:${normalizeCode(code)}`));
  return toBase64Url(new Uint8Array(sig));
}

export async function signSession(session: Session, secret: string): Promise<string> {
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify({ u: session.userId, v: session.tokenVersion })));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`sesion:${payload}`));
  return `${payload}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifySession(token: string | undefined, secret: string): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(sig),
    new TextEncoder().encode(`sesion:${payload}`),
  );
  if (!ok) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { u: number; v: number };
    return { userId: data.u, tokenVersion: data.v };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(secure: boolean) {
  return { httpOnly: true, secure, sameSite: "Lax" as const, path: "/", maxAge: SESSION_MAX_AGE };
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
