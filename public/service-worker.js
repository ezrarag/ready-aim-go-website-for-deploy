/* A copy of the original sw.js so we can register it with a stable path.
   If you later rename or remove this file, make sure you update the path
   in lib/push-notifications.ts as well. */

self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      data: data.data,
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      tag: data.tag || "readyaimgo-notification",
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  if (event.action === "view") {
    event.waitUntil(clients.openWindow(event.notification.data.actionUrl || "/"))
  } else {
    event.waitUntil(clients.openWindow(event.notification.data.url || "/"))
  }
})

self.addEventListener("notificationclose", (event) => {
  console.log("Notification dismissed:", event.notification.tag)
})
