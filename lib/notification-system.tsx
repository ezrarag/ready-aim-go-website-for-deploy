"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
// TODO: Implement Firebase database operations
import { pushService } from "@/lib/push-notifications"

export interface NotificationPreferences {
  email: boolean
  push: boolean
  sms: boolean
  appleBusinessChat: boolean
  inApp: boolean
  categories: {
    projects: boolean
    payments: boolean
    operators: boolean
    system: boolean
    marketing: boolean
  }
  frequency: "immediate" | "hourly" | "daily" | "weekly"
  quietHours: {
    enabled: boolean
    start: string // "22:00"
    end: string // "08:00"
  }
}

export interface NotificationChannel {
  id: string
  type: "email" | "push" | "sms" | "apple_business_chat" | "in_app"
  enabled: boolean
  config: Record<string, any>
}

export interface NotificationTemplate {
  id: string
  name: string
  category: string
  channels: string[]
  subject: string
  content: string
  variables: string[]
}

export interface EnhancedNotification {
  id: string
  userId: string
  title: string
  description: string
  type: "info" | "success" | "warning" | "error"
  category: "projects" | "payments" | "operators" | "system" | "marketing"
  priority: "low" | "medium" | "high" | "urgent"
  channels: NotificationChannel[]
  templateId?: string
  variables?: Record<string, any>
  scheduledFor?: Date
  sentAt?: Date
  readAt?: Date
  actionUrl?: string
  actionLabel?: string
  metadata: Record<string, any>
  createdAt: Date
}

interface NotificationSystemContextType {
  notifications: EnhancedNotification[]
  preferences: NotificationPreferences
  templates: NotificationTemplate[]
  channels: NotificationChannel[]

  // Core functions
  sendNotification: (notification: Partial<EnhancedNotification>) => Promise<void>
  scheduleNotification: (notification: Partial<EnhancedNotification>, scheduledFor: Date) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  deleteNotification: (id: string) => Promise<void>

  // Preferences
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>

  // Templates
  createTemplate: (template: Omit<NotificationTemplate, "id">) => Promise<void>
  sendFromTemplate: (templateId: string, variables: Record<string, any>, userId: string) => Promise<void>

  // Channels
  configureChannel: (channelId: string, config: Record<string, any>) => Promise<void>
  testChannel: (channelId: string) => Promise<boolean>

  // Apple Business Messaging
  sendAppleBusinessMessage: (userId: string, message: string, metadata?: Record<string, any>) => Promise<boolean>

  // Analytics
  getAnalytics: (timeRange: "24h" | "7d" | "30d") => Promise<any>
}

const NotificationSystemContext = createContext<NotificationSystemContextType | undefined>(undefined)

export function NotificationSystemProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: true,
    sms: false,
    appleBusinessChat: true,
    inApp: true,
    categories: {
      projects: true,
      payments: true,
      operators: true,
      system: true,
      marketing: false,
    },
    frequency: "immediate",
    quietHours: {
      enabled: false,
      start: "22:00",
      end: "08:00",
    },
  })
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: "email",
      type: "email",
      enabled: true,
      config: { provider: "sendgrid" },
    },
    {
      id: "push",
      type: "push",
      enabled: true,
      config: { vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY },
    },
    {
      id: "apple_business_chat",
      type: "apple_business_chat",
      enabled: true,
      config: {
        businessId: process.env.NEXT_PUBLIC_APPLE_BUSINESS_ID,
        teamId: process.env.APPLE_TEAM_ID,
        keyId: process.env.APPLE_KEY_ID,
      },
    },
  ])

  // Initialize notification system
  useEffect(() => {
    initializeNotificationSystem()
  }, [])

  const initializeNotificationSystem = async () => {
    try {
      // TODO: preferences / templates / inbox from Firestore
      if (preferences.push) {
        await pushService.initialize()
      }
    } catch (error) {
      console.error("Failed to initialize notification system:", error)
    }
  }

  const sendNotification = async (notification: Partial<EnhancedNotification>) => {
    try {
      const fullNotification: EnhancedNotification = {
        id: crypto.randomUUID(),
        userId: notification.userId || "",
        title: notification.title || "",
        description: notification.description || "",
        type: notification.type || "info",
        category: notification.category || "system",
        priority: notification.priority || "medium",
        channels: notification.channels || getDefaultChannels(notification.category || "system"),
        metadata: notification.metadata || {},
        createdAt: new Date(),
        ...notification,
      }

      // Send through configured channels
      await sendThroughChannels(fullNotification)

      setNotifications((prev) => [fullNotification, ...prev])
    } catch (error) {
      console.error("Failed to send notification:", error)
    }
  }

  const sendThroughChannels = async (notification: EnhancedNotification) => {
    const enabledChannels = notification.channels.filter((channel) => channel.enabled)

    for (const channel of enabledChannels) {
      try {
        switch (channel.type) {
          case "email":
            await sendEmailNotification(notification, channel.config)
            break
          case "push":
            await sendPushNotification(notification, channel.config)
            break
          case "sms":
            await sendSMSNotification(notification, channel.config)
            break
          case "apple_business_chat":
            await sendAppleBusinessMessage(
              notification.userId,
              `${notification.title}\n\n${notification.description}`,
              notification.metadata,
            )
            break
          case "in_app":
            showInAppNotification(notification)
            break
        }
      } catch (error) {
        console.error(`Failed to send notification through ${channel.type}:`, error)
      }
    }
  }

  const sendAppleBusinessMessage = async (
    userId: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<boolean> => {
    try {
      // TODO: load user Apple Business Chat id from Firestore
      const user: { apple_business_chat_id?: string; notification_preferences?: { appleBusinessChat?: boolean } } = {}

      if (!user?.apple_business_chat_id) {
        console.log("User doesn't have Apple Business Chat enabled")
        return false
      }

      if (!user.notification_preferences?.appleBusinessChat) {
        console.log("User has disabled Apple Business Chat notifications")
        return false
      }

      const response = await fetch("/api/notifications/apple-business-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessChatId: user.apple_business_chat_id,
          message,
          metadata,
        }),
      })

      if (!response.ok) {
        throw new Error(`Apple Business Chat API error: ${response.statusText}`)
      }

      await response.json()

      return true
    } catch (error) {
      console.error("Apple Business Chat delivery failed:", error)

      return false
    }
  }

  const sendEmailNotification = async (notification: EnhancedNotification, config: any) => {
    // Implementation for email notifications (SendGrid, etc.)
    console.log("Sending email notification:", notification.title)
  }

  const sendPushNotification = async (notification: EnhancedNotification, config: any) => {
    try {
      await pushService.sendAppleBusinessMessage({
        title: notification.title,
        body: notification.description,
        data: notification.metadata,
      })
    } catch (error) {
      console.error("Push notification failed:", error)
    }
  }

  const sendSMSNotification = async (notification: EnhancedNotification, config: any) => {
    // Implementation for SMS notifications (Twilio, etc.)
    console.log("Sending SMS notification:", notification.title)
  }

  const showInAppNotification = (notification: EnhancedNotification) => {
    // This would integrate with your toast/notification UI system
    console.log("Showing in-app notification:", notification.title)
  }

  const getDefaultChannels = (category: string): NotificationChannel[] => {
    // Return default channels based on category and user preferences
    return channels.filter((channel) => {
      switch (category) {
        case "projects":
          return preferences.categories.projects && channel.enabled
        case "payments":
          return preferences.categories.payments && channel.enabled
        case "operators":
          return preferences.categories.operators && channel.enabled
        case "system":
          return preferences.categories.system && channel.enabled
        default:
          return channel.enabled
      }
    })
  }

  const scheduleNotification = async (notification: Partial<EnhancedNotification>, scheduledFor: Date) => {
    try {
      const scheduledNotification = {
        ...notification,
        scheduledFor,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      }

      console.log("Notification scheduled for:", scheduledFor)
    } catch (error) {
      console.error("Failed to schedule notification:", error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)))
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (error) {
      console.error("Failed to delete notification:", error)
    }
  }

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences }

      setPreferences(updatedPreferences)
    } catch (error) {
      console.error("Failed to update preferences:", error)
    }
  }

  const createTemplate = async (template: Omit<NotificationTemplate, "id">) => {
    try {
      const newTemplate = {
        ...template,
        id: crypto.randomUUID(),
      }

      setTemplates((prev) => [...prev, newTemplate])
    } catch (error) {
      console.error("Failed to create template:", error)
    }
  }

  const sendFromTemplate = async (templateId: string, variables: Record<string, any>, userId: string) => {
    try {
      const template = templates.find((t) => t.id === templateId)
      if (!template) throw new Error("Template not found")

      // Replace variables in template content
      let content = template.content
      let subject = template.subject

      Object.entries(variables).forEach(([key, value]) => {
        content = content.replace(new RegExp(`{{${key}}}`, "g"), String(value))
        subject = subject.replace(new RegExp(`{{${key}}}`, "g"), String(value))
      })

      await sendNotification({
        userId,
        title: subject,
        description: content,
        category: template.category as any,
        templateId,
        variables,
      })
    } catch (error) {
      console.error("Failed to send from template:", error)
    }
  }

  const configureChannel = async (channelId: string, config: Record<string, any>) => {
    try {
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId ? { ...channel, config: { ...channel.config, ...config } } : channel,
        ),
      )

    } catch (error) {
      console.error("Failed to configure channel:", error)
    }
  }

  const testChannel = async (channelId: string): Promise<boolean> => {
    try {
      const channel = channels.find((c) => c.id === channelId)
      if (!channel) return false

      // Send test notification through the channel
      await sendNotification({
        userId: "current-user-id", // Replace with actual user ID
        title: "Test Notification",
        description: `This is a test notification for the ${channel.type} channel.`,
        type: "info",
        category: "system",
        channels: [channel],
      })

      return true
    } catch (error) {
      console.error("Channel test failed:", error)
      return false
    }
  }

  const getAnalytics = async (_timeRange: "24h" | "7d" | "30d") => {
    try {
      // TODO: notification analytics from Firestore
      return null
    } catch (error) {
      console.error("Failed to get analytics:", error)
      return null
    }
  }

  const value: NotificationSystemContextType = {
    notifications,
    preferences,
    templates,
    channels,
    sendNotification,
    scheduleNotification,
    markAsRead,
    deleteNotification,
    updatePreferences,
    createTemplate,
    sendFromTemplate,
    configureChannel,
    testChannel,
    sendAppleBusinessMessage,
    getAnalytics,
  }

  return <NotificationSystemContext.Provider value={value}>{children}</NotificationSystemContext.Provider>
}

export function useNotificationSystem() {
  const context = useContext(NotificationSystemContext)
  if (context === undefined) {
    throw new Error("useNotificationSystem must be used within a NotificationSystemProvider")
  }
  return context
}
