export interface PushNotificationConfig {
  vapidPublicKey: string
  appleBusinessId?: string
  appleTeamId?: string
  appleKeyId?: string
}

export class PushNotificationService {
  private config: PushNotificationConfig
  private registration: ServiceWorkerRegistration | null = null

  constructor(config: PushNotificationConfig) {
    this.config = config
  }

  async initialize(): Promise<boolean> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push notifications not supported")
      return false
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register("/sw.js")
      console.log("Service Worker registered:", this.registration)

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready
      return true
    } catch (error) {
      console.error("Service Worker registration failed:", error)
      return false
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      throw new Error("Notifications not supported")
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  async subscribe(): Promise<PushSubscription | null> {
    if (!this.registration) {
      throw new Error("Service Worker not registered")
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.config.vapidPublicKey),
      })

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription)
      return subscription
    } catch (error) {
      console.error("Push subscription failed:", error)
      return null
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        await this.removeSubscriptionFromServer(subscription)
      }
      return true
    } catch (error) {
      console.error("Unsubscribe failed:", error)
      return false
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    // In a real app, send this to your backend
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey("p256dh")),
        auth: this.arrayBufferToBase64(subscription.getKey("auth")),
      },
      appleBusinessId: this.config.appleBusinessId,
    }

    // Store locally for demo purposes
    localStorage.setItem("push-subscription", JSON.stringify(subscriptionData))

    // In production, send to your backend:
    // await fetch('/api/push/subscribe', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(subscriptionData)
    // })
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    localStorage.removeItem("push-subscription")

    // In production:
    // await fetch('/api/push/unsubscribe', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ endpoint: subscription.endpoint })
    // })
  }

  // Apple Business Messaging integration
  async sendAppleBusinessMessage(message: {
    title: string
    body: string
    data?: Record<string, any>
  }): Promise<boolean> {
    if (!this.config.appleBusinessId) {
      console.warn("Apple Business ID not configured")
      return false
    }

    try {
      // In production, this would call your backend which integrates with Apple Business Chat
      const appleMessage = {
        businessId: this.config.appleBusinessId,
        message: {
          type: "text",
          text: `${message.title}\n\n${message.body}`,
        },
        metadata: message.data,
      }

      // Simulate API call to Apple Business Chat
      console.log("Sending Apple Business Message:", appleMessage)

      // In production:
      // const response = await fetch('/api/apple-business-chat/send', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(appleMessage)
      // })
      // return response.ok

      return true
    } catch (error) {
      console.error("Apple Business Message failed:", error)
      return false
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return ""
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }
}

// Initialize push notification service
export const pushService = new PushNotificationService({
  vapidPublicKey: "BEl62iUYgUivxIkv69yViEuiBIa40HI6YLOw2kINzrnHJmrYkXvdHiunv4QUoIXcDkdkk73ZhHJcqkgYVDdw", // Demo key
  appleBusinessId: "your-apple-business-id",
  appleTeamId: "your-apple-team-id",
  appleKeyId: "your-apple-key-id",
})
