// Service worker de TeamFinder: solo notificaciones push (sin caché offline, para no servir datos viejos).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "TeamFinder", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "TeamFinder";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icono/app/192",
      badge: "/icono/app/192",
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/notificaciones" },
      tag: data.url || "teamfinder",
    }),
  );
});

// Al pulsar la notificación: abre (o enfoca) la web en la página del aviso.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/notificaciones", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
