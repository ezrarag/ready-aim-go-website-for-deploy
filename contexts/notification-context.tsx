"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { Notification, NotificationContextType } from "@/lib/types/notifications"
import type { NotificationTemplate } from "@/lib/types/notification-templates"
import { useToast } from "@/hooks/use-toast"
import { defaultTemplates, replaceTemplateVariables } from "@/lib/notification-templates"
import { analyticsService } from "@/lib/notification-analytics"
import { pushService } from "@/lib/push-notifications"

interface ExtendedNotificationContextType extends NotificationContextType {
  // Template management
  templates: NotificationTemplate[]
  addTemplate: (template: Omit<NotificationTemplate, "id" | "createdAt" | "usageCount">) => void
  updateTemplate: (id: string, template: Partial<NotificationTemplate>) => void
  deleteTemplate: (id: string) => void
  sendFromTemplate: (templateId: string, variables: Record<string, string>) => void

  // Search functionality
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: Notification[]

  // Analytics
  getAnalytics: () => any
  trackNotificationEvent: (notificationId: string, event: string, templateId?: string) => void

  // Push notifications
  isPushEnabled: boolean
  enablePushNotifications: () => Promise<boolean>
  disablePushNotifications: () => Promise<boolean>
}

const NotificationContext = createContext<ExtendedNotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [templates, setTemplates] = useState<NotificationTemplate[]>(defaultTemplates)
  const [searchQuery, setSearchQuery] = useState("")
  const [isPushEnabled, setIsPushEnabled] = useState(false)
  const { toast } = useToast()

  // Load data on mount
  useEffect(() => {
    loadNotifications()
    loadTemplates()
    initializePushNotifications()
  }, [])

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("readyaimgo-notifications", JSON.stringify(notifications))
  }, [notifications])

  // Save templates to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("readyaimgo-templates", JSON.stringify(templates))
  }, [templates])

  const loadNotifications = () => {
    const stored = localStorage.getItem("readyaimgo-notifications")
    if (stored) {
      try {
        const parsed = JSON.parse(stored).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }))
        setNotifications(parsed)
      } catch (error) {
        console.error("Failed to load notifications:", error)
      }
    }
  }

  const loadTemplates = () => {
    const stored = localStorage.getItem("readyaimgo-templates")
    if (stored) {
      try {
        const parsed = JSON.parse(stored).map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
        }))
        setTemplates(parsed)
      } catch (error) {
        console.error("Failed to load templates:", error)
        setTemplates(defaultTemplates)
      }
    }
  }

  const initializePushNotifications = async () => {
    const initialized = await pushService.initialize()
    if (initialized) {
      const permission = Notification.permission
      setIsPushEnabled(permission === "granted")
    }
  }

  const addNotification = (notificationData: Omit<Notification, "id" | "timestamp" | "read">) => {
    const notification: Notification = {
      ...notificationData,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    }

    // Track analytics
    analyticsService.trackEvent(notification.id, "sent", undefined, {
      category: notification.category,
      type: notification.type,
    })

    // Add to stored notifications if persistent (default true)
    if (notificationData.persistent !== false) {
      setNotifications((prev) => [notification, ...prev])
    }

    // Show toast notification
    const toastVariant = notification.type === "error" ? "destructive" : "default"
    toast({
      title: notification.title,
      description: notification.description,
      variant: toastVariant,
    })

    // Send push notification if enabled
    if (isPushEnabled) {
      sendPushNotification(notification)
    }
  }

  const sendPushNotification = async (notification: Notification) => {
    try {
      // In a real app, this would be sent from your backend
      const pushData = {
        title: notification.title,
        body: notification.description,
        data: {
          notificationId: notification.id,
          category: notification.category,
          actionUrl: notification.actionUrl,
        },
        actions: notification.actionUrl
          ? [
              {
                action: "view",
                title: notification.actionLabel || "View",
              },
            ]
          : [],
      }

      // Send via Apple Business Messaging if available
      await pushService.sendAppleBusinessMessage(pushData)
    } catch (error) {
      console.error("Push notification failed:", error)
    }
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => {
        if (notification.id === id && !notification.read) {
          analyticsService.trackEvent(id, "read")
          return { ...notification, read: true }
        }
        return notification
      }),
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => {
        if (!notification.read) {
          analyticsService.trackEvent(notification.id, "read")
        }
        return { ...notification, read: true }
      }),
    )
  }

  const deleteNotification = (id: string) => {
    analyticsService.trackEvent(id, "dismissed")
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }

  const clearAllNotifications = () => {
    notifications.forEach((notification) => {
      analyticsService.trackEvent(notification.id, "dismissed")
    })
    setNotifications([])
  }

  const getNotificationsByCategory = (category: string) => {
    return notifications.filter((notification) => notification.category === category)
  }

  // Template management
  const addTemplate = (templateData: Omit<NotificationTemplate, "id" | "createdAt" | "usageCount">) => {
    const template: NotificationTemplate = {
      ...templateData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      usageCount: 0,
    }
    setTemplates((prev) => [...prev, template])
  }

  const updateTemplate = (id: string, templateData: Partial<NotificationTemplate>) => {
    setTemplates((prev) => prev.map((template) => (template.id === id ? { ...template, ...templateData } : template)))
  }

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((template) => template.id !== id))
  }

  const sendFromTemplate = (templateId: string, variables: Record<string, string>) => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    const title = replaceTemplateVariables(template.title, variables)
    const description = replaceTemplateVariables(template.description, variables)
    const actionUrl = template.actionUrl ? replaceTemplateVariables(template.actionUrl, variables) : undefined

    // Update template usage count
    updateTemplate(templateId, { usageCount: template.usageCount + 1 })

    // Send notification
    addNotification({
      title,
      description,
      type: template.type,
      category: template.category,
      actionUrl,
      actionLabel: template.actionLabel,
    })

    // Track template usage
    analyticsService.trackEvent(crypto.randomUUID(), "sent", templateId, {
      templateName: template.name,
      category: template.category,
    })
  }

  // Search functionality
  const searchResults = notifications.filter((notification) => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()
    return (
      notification.title.toLowerCase().includes(query) ||
      notification.description.toLowerCase().includes(query) ||
      notification.category.toLowerCase().includes(query) ||
      notification.type.toLowerCase().includes(query)
    )
  })

  // Analytics
  const getAnalytics = () => {
    return analyticsService.getMetrics()
  }

  const trackNotificationEvent = (notificationId: string, event: string, templateId?: string) => {
    analyticsService.trackEvent(notificationId, event as any, templateId)
  }

  // Push notifications
  const enablePushNotifications = async (): Promise<boolean> => {
    try {
      const permission = await pushService.requestPermission()
      if (permission === "granted") {
        const subscription = await pushService.subscribe()
        setIsPushEnabled(!!subscription)
        return !!subscription
      }
      return false
    } catch (error) {
      console.error("Failed to enable push notifications:", error)
      return false
    }
  }

  const disablePushNotifications = async (): Promise<boolean> => {
    try {
      const success = await pushService.unsubscribe()
      setIsPushEnabled(false)
      return success
    } catch (error) {
      console.error("Failed to disable push notifications:", error)
      return false
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.read).length

  const value: ExtendedNotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getNotificationsByCategory,
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    sendFromTemplate,
    searchQuery,
    setSearchQuery,
    searchResults,
    getAnalytics,
    trackNotificationEvent,
    isPushEnabled,
    enablePushNotifications,
    disablePushNotifications,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
