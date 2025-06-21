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
    // Handle action button clicks
    event.waitUntil(clients.openWindow(event.notification.data.actionUrl || "/"))
  } else {
    // Handle notification click
    event.waitUntil(clients.openWindow(event.notification.data.url || "/"))
  }
})

self.addEventListener("notificationclose", (event) => {
  // Track notification dismissal
  console.log("Notification dismissed:", event.notification.tag)
})
