/* Service-Worker for ReadyAimGo
   ---------------------------------------------------------------------------
   ⚠️  If you change this file’s name, also update lib/push-notifications.ts
   ---------------------------------------------------------------------------
*/

self.addEventListener("push", (event) => {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body,
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    data: data.data,
    actions: data.actions || [],
    tag: data.tag || "readyaimgo-notification",
    requireInteraction: Boolean(data.requireInteraction),
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.actionUrl || "/"
  event.waitUntil(clients.openWindow(url))
})

self.addEventListener("notificationclose", (event) => {
  console.log("Notification closed:", event.notification.tag)
})
