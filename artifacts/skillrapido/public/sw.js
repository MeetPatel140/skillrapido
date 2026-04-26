const CACHE = "skillrapido-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SHOW_JOB_NOTIFICATION") {
    const { title, body, jobId } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: `job-${jobId}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        data: { jobId, url: "/provider/notifications" },
        actions: [
          { action: "view", title: "View Job" },
          { action: "dismiss", title: "Dismiss" },
        ],
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow("/provider/notifications");
      })
  );
});
