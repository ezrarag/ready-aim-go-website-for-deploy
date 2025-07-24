export interface NotificationTemplate {
  id: string
  name: string
  category: "job" | "payment" | "system" | "network" | "general"
  type: "info" | "success" | "warning" | "error"
  title: string
  description: string
  variables: string[] // Variables that can be replaced like {jobId}, {amount}
  actionLabel?: string
  actionUrl?: string
  tags: string[]
  createdAt: Date
  usageCount: number
}

export interface NotificationAnalytics {
  id: string
  notificationId: string
  templateId?: string
  event: "sent" | "viewed" | "clicked" | "dismissed" | "read"
  timestamp: Date
  userId?: string
  metadata?: Record<string, any>
}

export interface AnalyticsMetrics {
  totalSent: number
  totalViewed: number
  totalClicked: number
  totalDismissed: number
  totalRead: number
  engagementRate: number
  clickThroughRate: number
  readRate: number
  topCategories: Array<{ category: string; count: number }>
  topTemplates: Array<{ templateId: string; name: string; count: number }>
  dailyMetrics: Array<{ date: string; sent: number; viewed: number; clicked: number }>
}
