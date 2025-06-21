"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, User, TrendingUp, Users, Calendar, DollarSign, Activity } from "lucide-react"
import { useNotifications } from "@/contexts/notification-context"
import { NotificationBell } from "@/components/notification-bell"

export default function DashboardPage() {
  const { addNotification } = useNotifications()

  useEffect(() => {
    // Add some sample notifications when the dashboard loads
    const sampleNotifications = [
      {
        title: "Welcome to ReadyAimGo",
        description: "You're now connected to the BEAM network and ready to start operating.",
        type: "success" as const,
        category: "system" as const,
      },
      {
        title: "New Job Available",
        description: "Property maintenance job in downtown area - $850 estimated value.",
        type: "info" as const,
        category: "job" as const,
        actionUrl: "/jobs/123",
        actionLabel: "View Job",
      },
      {
        title: "Payment Received",
        description: "Payment of $1,250 has been processed for completed job #456.",
        type: "success" as const,
        category: "payment" as const,
      },
    ]

    // Add notifications with a delay to simulate real-time updates
    sampleNotifications.forEach((notification, index) => {
      setTimeout(
        () => {
          addNotification(notification)
        },
        (index + 1) * 2000,
      )
    })
  }, [addNotification])

  const handleNewJobClick = () => {
    addNotification({
      title: "Job Scheduling",
      description: "Job scheduling feature is coming soon! You'll be notified when it's available.",
      type: "info",
      category: "system",
    })
  }

  const handleFindOperatorsClick = () => {
    addNotification({
      title: "Operator Network",
      description: "Searching for available operators in your area...",
      type: "info",
      category: "network",
    })
  }

  const handleAnalyticsClick = () => {
    addNotification({
      title: "Analytics Loading",
      description: "Your performance metrics are being compiled. This may take a few moments.",
      type: "info",
      category: "system",
    })
  }

  const handleSettingsClick = () => {
    addNotification({
      title: "Settings Update",
      description: "Account settings page is under construction. Check back soon!",
      type: "warning",
      category: "system",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">ReadyAimGo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <Button variant="ghost" size="icon" onClick={handleSettingsClick}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to your Dashboard</h1>
          <p className="text-gray-600">Here's what's happening with your ReadyAimGo operations today.</p>
        </div>

        {/* Status Badge */}
        <div className="mb-8">
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">✓ Connected to BEAM Network</Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,345</div>
              <p className="text-xs text-muted-foreground">+20.1% from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">+5 from yesterday</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network Connections</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">+12 this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-muted-foreground">+2% from last week</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest operations and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New job assigned: Property Maintenance</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">BEAM sync completed successfully</p>
                      <p className="text-xs text-gray-500">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Payment received: $850</p>
                      <p className="text-xs text-gray-500">6 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New operator joined your network</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" onClick={handleNewJobClick}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule New Job
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={handleFindOperatorsClick}>
                  <Users className="mr-2 h-4 w-4" />
                  Find Operators
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={handleAnalyticsClick}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Analytics
                </Button>
                <Button className="w-full justify-start" variant="outline" onClick={handleSettingsClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </Button>
              </CardContent>
            </Card>

            {/* BEAM Status */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>BEAM Connection</CardTitle>
                <CardDescription>System status and sync information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Sync</span>
                    <span className="text-sm text-gray-500">2 min ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Transfer</span>
                    <span className="text-sm text-gray-500">Real-time</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
