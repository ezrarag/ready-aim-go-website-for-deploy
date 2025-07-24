"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { supabase } from "@/lib/supabase/client"
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
      // Load user preferences from Supabase
      const { data: userPrefs } = await supabase.from("notification_preferences").select("*").single()

      if (userPrefs) {
        setPreferences(userPrefs.preferences)
      }

      // Load notification templates
      const { data: templatesData } = await supabase.from("notification_templates").select("*")

      if (templatesData) {
        setTemplates(templatesData)
      }

      // Initialize push notifications
      if (preferences.push) {
        await pushService.initialize()
      }

      // Set up real-time subscription for new notifications
      const subscription = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
          },
          (payload) => {
            const newNotification = payload.new as EnhancedNotification
            setNotifications((prev) => [newNotification, ...prev])

            // Handle real-time notification display
            if (preferences.inApp) {
              showInAppNotification(newNotification)
            }
          },
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
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

      // Save to database
      const { error } = await supabase.from("notifications").insert(fullNotification)

      if (error) throw error

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
      // Get user's Apple Business Chat preferences
      const { data: user } = await supabase
        .from("users")
        .select("apple_business_chat_id, notification_preferences")
        .eq("id", userId)
        .single()

      if (!user?.apple_business_chat_id) {
        console.log("User doesn't have Apple Business Chat enabled")
        return false
      }

      // Check if user has Apple Business Chat enabled in preferences
      if (!user.notification_preferences?.appleBusinessChat) {
        console.log("User has disabled Apple Business Chat notifications")
        return false
      }

      // Send through Apple Business Chat API
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

      const result = await response.json()

      // Log successful delivery
      await supabase.from("notification_logs").insert({
        notification_id: metadata?.notificationId,
        channel: "apple_business_chat",
        status: "delivered",
        delivered_at: new Date(),
        metadata: result,
      })

      return true
    } catch (error) {
      console.error("Apple Business Chat delivery failed:", error)

      // Log failed delivery
      await supabase.from("notification_logs").insert({
        notification_id: metadata?.notificationId,
        channel: "apple_business_chat",
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        attempted_at: new Date(),
      })

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

      await supabase.from("scheduled_notifications").insert(scheduledNotification)

      console.log("Notification scheduled for:", scheduledFor)
    } catch (error) {
      console.error("Failed to schedule notification:", error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await supabase.from("notifications").update({ readAt: new Date() }).eq("id", id)

      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n)))
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from("notifications").delete().eq("id", id)

      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (error) {
      console.error("Failed to delete notification:", error)
    }
  }

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences }

      await supabase.from("notification_preferences").upsert({
        user_id: "current-user-id", // Replace with actual user ID
        preferences: updatedPreferences,
      })

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

      await supabase.from("notification_templates").insert(newTemplate)

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

      // Save to database
      await supabase.from("notification_channels").upsert({
        id: channelId,
        config,
      })
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

  const getAnalytics = async (timeRange: "24h" | "7d" | "30d") => {
    try {
      const { data } = await supabase
        .from("notification_analytics")
        .select("*")
        .gte("created_at", getTimeRangeDate(timeRange))

      return data
    } catch (error) {
      console.error("Failed to get analytics:", error)
      return null
    }
  }

  const getTimeRangeDate = (range: string): string => {
    const now = new Date()
    switch (range) {
      case "24h":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
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
