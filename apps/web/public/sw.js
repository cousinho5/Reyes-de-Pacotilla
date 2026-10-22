// Service worker de Reyes de Pacotilla: guarda el juego para que abra sin
// conexión (bloque 6), recibe las notificaciones push y abre la partida al tocarlas.
//
// - Los archivos de /assets/ llevan su huella en el nombre y no cambian nunca: se
//   sirven de lo guardado y, si no están, se bajan y se guardan.
// - Las páginas (index.html) se piden a la red y, si no contesta a tiempo o no hay
//   conexión, se sirve la última guardada.
// - La API nunca se guarda aquí: lo último que se vio de cada partida lo guarda el
//   cliente (api.ts), que sabe de quién es y lo borra al salir.

const CACHE = "reyes-juego-v1";
/** Archivos guardados como mucho; los más viejos (de versiones anteriores) se van. */
const MAX_FILES = 80;
/** Tiempo que se espera a la red por la página antes de servir la guardada. */
const PAGE_TIMEOUT_MS = 3000;

// Al instalarse guarda la página y lo que ella carga (el JS y el CSS de la primera
// visita llegan antes de que el service worker mande).
async function precache() {
  const cache = await caches.open(CACHE);
  const res = await fetch("/", { cache: "no-cache" });
  if (!res.ok) return;
  const html = await res.clone().text();
  await cache.put("/", res);
  const files = new Set(html.match(/\/assets\/[^"']+/g) ?? []);
  // Y las letras que pide el CSS.
  for (const css of [...files].filter((f) => f.endsWith(".css"))) {
    const text = await fetch(css).then((r) => r.text()).catch(() => "");
    for (const m of text.matchAll(/url\(([^)]+\.woff2)\)/g)) files.add(new URL(m[1].replace(/["']/g, ""), self.location.origin + css).pathname);
  }
  await cache.addAll([...files, "/manifest.webmanifest", "/icono-192.png"]);
}
self.addEventListener("install", (event) => {
  event.waitUntil(precache().catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("reyes-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);

async function trim(cache) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_FILES))) await cache.delete(k);
}

async function fromCacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    await cache.put(request, res.clone());
    trim(cache);
  }
  return res;
}

async function page(request) {
  const cache = await caches.open(CACHE);
  const network = fetch(request).then(async (res) => {
    // Todas las rutas del cliente son la misma página: se guarda como "/".
    if (res.ok) await cache.put("/", res.clone());
    return res;
  });
  const saved = () => cache.match("/");
  const late = new Promise((resolve) => setTimeout(resolve, PAGE_TIMEOUT_MS)).then(saved);
  try {
    // La red manda; si tarda demasiado y hay página guardada, se usa esa.
    return await Promise.race([network, late.then((r) => r ?? network)]);
  } catch {
    return (await saved()) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") event.respondWith(page(request));
  else if (url.pathname.startsWith("/assets/") || /\.(png|webmanifest)$/.test(url.pathname)) event.respondWith(fromCacheFirst(request));
});

self.addEventListener("push", (event) => {
  let data = { title: "Reyes de Pacotilla", body: "Hay novedades en el reino.", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // Mensaje sin JSON: se muestra el texto por defecto.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icono-192.png",
      badge: "/icono-192.png",
      data: { url: data.url },
      lang: "es",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (w.url.startsWith(self.location.origin)) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
