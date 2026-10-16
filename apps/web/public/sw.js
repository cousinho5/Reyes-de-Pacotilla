// Service worker de Reyes de Pacotilla: recibe las notificaciones push y abre
// la partida al tocarlas. No cachea nada (el juego necesita datos frescos).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
