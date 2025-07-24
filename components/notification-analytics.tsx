"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { Download, TrendingUp, Eye, MousePointer, CheckCircle } from "lucide-react"
import { useNotifications } from "@/contexts/notification-context"
import type { AnalyticsMetrics } from "@/lib/types/notification-templates"

export function NotificationAnalytics() {
  const { getAnalytics } = useNotifications()
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)

  useEffect(() => {
    setMetrics(getAnalytics())
  }, [getAnalytics])

  const exportData = () => {
    if (!metrics) return

    const data = {
      metrics,
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `notification-analytics-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!metrics) {
    return <div>Loading analytics...</div>
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSent}</div>
            <p className="text-xs text-muted-foreground">Notifications delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viewed</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalViewed}</div>
            <p className="text-xs text-muted-foreground">{metrics.readRate.toFixed(1)}% view rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicked</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClicked}</div>
            <p className="text-xs text-muted-foreground">{metrics.clickThroughRate.toFixed(1)}% CTR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.engagementRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Overall engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Metrics Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
            <CardDescription>Notification activity over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.dailyMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sent" stroke="#8884d8" name="Sent" />
                <Line type="monotone" dataKey="viewed" stroke="#82ca9d" name="Viewed" />
                <Line type="monotone" dataKey="clicked" stroke="#ffc658" name="Clicked" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Notifications by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.topCategories}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Detailed breakdown of notification performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>View Rate</span>
                <span>{metrics.readRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.readRate} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Click-Through Rate</span>
                <span>{metrics.clickThroughRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.clickThroughRate} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Engagement Rate</span>
                <span>{metrics.engagementRate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.engagementRate} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Templates */}
      {metrics.topTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Templates</CardTitle>
            <CardDescription>Most used notification templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topTemplates.map((template, index) => (
                <div key={template.templateId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium">{template.name}</span>
                  </div>
                  <Badge>{template.count} uses</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={exportData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Analytics
        </Button>
      </div>
    </div>
  )
}
