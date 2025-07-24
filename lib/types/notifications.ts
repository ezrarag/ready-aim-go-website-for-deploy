export interface Notification {
  id: string
  title: string
  description: string
  type: "info" | "success" | "warning" | "error"
  category: "system" | "job" | "payment" | "network" | "general"
  timestamp: Date
  read: boolean
  persistent?: boolean // Whether it should be stored in the notification center
  actionUrl?: string
  actionLabel?: string
}

export interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  clearAllNotifications: () => void
  getNotificationsByCategory: (category: string) => Notification[]
}
