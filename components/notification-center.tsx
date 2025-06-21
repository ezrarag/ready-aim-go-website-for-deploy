"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  ExternalLink,
  Search,
  BarChart3,
  Settings,
  LayoutTemplateIcon as Template,
} from "lucide-react"
import { useNotifications } from "@/contexts/notification-context"
import type { Notification } from "@/lib/types/notifications"
import { formatDistanceToNow } from "date-fns"
import { NotificationAnalytics } from "./notification-analytics"
import { NotificationTemplates } from "./notification-templates"
import { NotificationSettings } from "./notification-settings"

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onView: (id: string) => void
}

function NotificationItem({ notification, onMarkAsRead, onDelete, onView }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getCategoryColor = () => {
    switch (notification.category) {
      case "job":
        return "bg-blue-100 text-blue-800"
      case "payment":
        return "bg-green-100 text-green-800"
      case "network":
        return "bg-purple-100 text-purple-800"
      case "system":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleClick = () => {
    onView(notification.id)
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
  }

  return (
    <Card
      className={`mb-3 cursor-pointer hover:shadow-md transition-shadow ${
        !notification.read ? "border-l-4 border-l-indigo-500 bg-indigo-50/30" : ""
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {getIcon()}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`text-sm font-medium ${!notification.read ? "text-gray-900" : "text-gray-600"}`}>
                  {notification.title}
                </h4>
                {!notification.read && <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>}
              </div>
              <p className="text-sm text-gray-600 mb-2">{notification.description}</p>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className={getCategoryColor()}>
                  {notification.category}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                </span>
              </div>
              {notification.actionUrl && notification.actionLabel && (
                <Button variant="link" size="sm" className="p-0 h-auto mt-2">
                  {notification.actionLabel}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!notification.read && (
                <DropdownMenuItem onClick={() => onMarkAsRead(notification.id)}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as read
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(notification.id)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getNotificationsByCategory,
    searchQuery,
    setSearchQuery,
    searchResults,
    trackNotificationEvent,
  } = useNotifications()

  const [activeTab, setActiveTab] = useState("all")

  const getFilteredNotifications = () => {
    const baseNotifications = searchQuery ? searchResults : notifications

    switch (activeTab) {
      case "unread":
        return baseNotifications.filter((n) => !n.read)
      case "job":
        return baseNotifications.filter((n) => n.category === "job")
      case "payment":
        return baseNotifications.filter((n) => n.category === "payment")
      case "system":
        return baseNotifications.filter((n) => n.category === "system")
      case "analytics":
        return [] // Analytics tab doesn't show notifications
      case "templates":
        return [] // Templates tab doesn't show notifications
      case "settings":
        return [] // Settings tab doesn't show notifications
      default:
        return baseNotifications
    }
  }

  const filteredNotifications = getFilteredNotifications()

  const handleNotificationView = (id: string) => {
    trackNotificationEvent(id, "viewed")
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification Center</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={clearAllNotifications} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardDescription>Manage your ReadyAimGo notifications and stay updated on your operations</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
            <TabsTrigger value="job">Jobs ({getNotificationsByCategory("job").length})</TabsTrigger>
            <TabsTrigger value="payment">Payments ({getNotificationsByCategory("payment").length})</TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Template className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          {/* Search bar for notification tabs */}
          {!["analytics", "templates", "settings"].includes(activeTab) && (
            <div className="mt-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <TabsContent value={activeTab} className="mt-4">
            {activeTab === "analytics" ? (
              <NotificationAnalytics />
            ) : activeTab === "templates" ? (
              <NotificationTemplates />
            ) : activeTab === "settings" ? (
              <NotificationSettings />
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchQuery ? "No matching notifications" : "No notifications"}
                    </h3>
                    <p className="text-gray-600">
                      {searchQuery
                        ? `No notifications match "${searchQuery}"`
                        : activeTab === "unread"
                          ? "You're all caught up! No unread notifications."
                          : "You don't have any notifications yet."}
                    </p>
                  </div>
                ) : (
                  <div>
                    {filteredNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        onView={handleNotificationView}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
