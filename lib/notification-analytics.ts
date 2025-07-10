import type { NotificationAnalytics, AnalyticsMetrics } from "./types/notification-templates"

const isBrowser = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined"

export class NotificationAnalyticsService {
  private analytics: NotificationAnalytics[] = []

  constructor() {
    this.loadAnalytics()
  }

  private loadAnalytics() {
    if (!isBrowser()) return
    const stored = localStorage.getItem("readyaimgo-notification-analytics")
    if (stored) {
      try {
        this.analytics = JSON.parse(stored).map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }))
      } catch (error) {
        console.error("Failed to load analytics:", error)
      }
    }
  }

  private saveAnalytics() {
    if (!isBrowser()) return
    localStorage.setItem("readyaimgo-notification-analytics", JSON.stringify(this.analytics))
  }

  trackEvent(
    notificationId: string,
    event: NotificationAnalytics["event"],
    templateId?: string,
    metadata?: Record<string, any>,
  ) {
    const analyticsEvent: NotificationAnalytics = {
      id: crypto.randomUUID(),
      notificationId,
      templateId,
      event,
      timestamp: new Date(),
      metadata,
    }

    this.analytics.push(analyticsEvent)
    this.saveAnalytics()
  }

  getMetrics(dateRange?: { start: Date; end: Date }): AnalyticsMetrics {
    let filteredAnalytics = this.analytics

    if (dateRange) {
      filteredAnalytics = this.analytics.filter((a) => a.timestamp >= dateRange.start && a.timestamp <= dateRange.end)
    }

    const totalSent = filteredAnalytics.filter((a) => a.event === "sent").length
    const totalViewed = filteredAnalytics.filter((a) => a.event === "viewed").length
    const totalClicked = filteredAnalytics.filter((a) => a.event === "clicked").length
    const totalDismissed = filteredAnalytics.filter((a) => a.event === "dismissed").length
    const totalRead = filteredAnalytics.filter((a) => a.event === "read").length

    const engagementRate = totalSent > 0 ? ((totalViewed + totalClicked + totalRead) / totalSent) * 100 : 0
    const clickThroughRate = totalViewed > 0 ? (totalClicked / totalViewed) * 100 : 0
    const readRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0

    // Calculate top categories
    const categoryCount: Record<string, number> = {}
    filteredAnalytics.forEach((a) => {
      if (a.metadata?.category) {
        categoryCount[a.metadata.category] = (categoryCount[a.metadata.category] || 0) + 1
      }
    })
    const topCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calculate top templates
    const templateCount: Record<string, { count: number; name: string }> = {}
    filteredAnalytics.forEach((a) => {
      if (a.templateId) {
        if (!templateCount[a.templateId]) {
          templateCount[a.templateId] = { count: 0, name: a.metadata?.templateName || "Unknown" }
        }
        templateCount[a.templateId].count++
      }
    })
    const topTemplates = Object.entries(templateCount)
      .map(([templateId, data]) => ({ templateId, name: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calculate daily metrics for the last 7 days
    const dailyMetrics = this.getDailyMetrics(filteredAnalytics, 7)

    return {
      totalSent,
      totalViewed,
      totalClicked,
      totalDismissed,
      totalRead,
      engagementRate,
      clickThroughRate,
      readRate,
      topCategories,
      topTemplates,
      dailyMetrics,
    }
  }

  private getDailyMetrics(analytics: NotificationAnalytics[], days: number) {
    const dailyData: Record<string, { sent: number; viewed: number; clicked: number }> = {}

    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      dailyData[dateStr] = { sent: 0, viewed: 0, clicked: 0 }
    }

    analytics.forEach((a) => {
      const dateStr = a.timestamp.toISOString().split("T")[0]
      if (dailyData[dateStr]) {
        if (a.event === "sent") dailyData[dateStr].sent++
        if (a.event === "viewed") dailyData[dateStr].viewed++
        if (a.event === "clicked") dailyData[dateStr].clicked++
      }
    })

    return Object.entries(dailyData)
      .map(([date, metrics]) => ({ date, ...metrics }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  exportAnalytics(): string {
    if (!isBrowser()) return "[]"
    return JSON.stringify(this.analytics, null, 2)
  }
}

export const analyticsService = new NotificationAnalyticsService()
