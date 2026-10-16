// Suscripción a notificaciones push desde el navegador.

import { api } from "./api";

export type PushSupport = "ok" | "ios-no-instalada" | "no-soportado";

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** En iPhone las notificaciones solo funcionan con el juego añadido a la pantalla de inicio. */
export function pushSupport(): PushSupport {
  if (isIOS() && !isStandalone()) return "ios-no-instalada";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "no-soportado";
  return "ok";
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "ok") return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

function keyToBytes(base64url: string): Uint8Array {
  const b64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((base64url.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Pide permiso (debe llamarse desde un toque del jugador) y registra la suscripción. */
export async function enablePush(): Promise<void> {
  const support = pushSupport();
  if (support === "ios-no-instalada") throw new Error("En iPhone, primero añade el juego a la pantalla de inicio y ábrelo desde ahí.");
  if (support === "no-soportado") throw new Error("Este navegador no admite notificaciones.");
  const { clave } = await api.pushKey();
  if (!clave) throw new Error("El servidor aún no tiene configuradas las notificaciones.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Sin permiso no hay avisos. Puedes activarlo en los ajustes del navegador.");
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerServiceWorker());
  if (!reg) throw new Error("No se pudo preparar el servicio de avisos.");
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyToBytes(clave) as BufferSource,
  });
  await api.pushSubscribe(sub.toJSON());
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await api.pushUnsubscribe(sub.endpoint);
  await sub.unsubscribe();
}
