"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Bell, Smartphone, Mail, MessageSquare, Shield, Volume2 } from "lucide-react"
import { useNotifications } from "@/contexts/notification-context"

export function NotificationSettings() {
  const { isPushEnabled, enablePushNotifications, disablePushNotifications } = useNotifications()
  const [settings, setSettings] = useState({
    pushNotifications: isPushEnabled,
    emailNotifications: true,
    smsNotifications: false,
    appleBusinessChat: true,
    jobNotifications: true,
    paymentNotifications: true,
    systemNotifications: true,
    networkNotifications: true,
    soundEnabled: true,
    quietHours: false,
    quietStart: "22:00",
    quietEnd: "08:00",
  })

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const success = await enablePushNotifications()
      setSettings({ ...settings, pushNotifications: success })
    } else {
      const success = await disablePushNotifications()
      setSettings({ ...settings, pushNotifications: !success })
    }
  }

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Notification Settings</h3>
        <p className="text-sm text-gray-600">Customize how and when you receive notifications</p>
      </div>

      {/* Delivery Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Delivery Methods
          </CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-5 w-5 text-gray-500" />
              <div>
                <Label htmlFor="push">Push Notifications</Label>
                <p className="text-sm text-gray-500">Receive notifications in your browser</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isPushEnabled && <Badge variant="secondary">Enabled</Badge>}
              <Switch id="push" checked={settings.pushNotifications} onCheckedChange={handlePushToggle} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <div>
                <Label htmlFor="email">Email Notifications</Label>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
            </div>
            <Switch
              id="email"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-5 w-5 text-gray-500" />
              <div>
                <Label htmlFor="sms">SMS Notifications</Label>
                <p className="text-sm text-gray-500">Receive urgent notifications via SMS</p>
              </div>
            </div>
            <Switch
              id="sms"
              checked={settings.smsNotifications}
              onCheckedChange={(checked) => handleSettingChange("smsNotifications", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-5 w-5 text-gray-500" />
              <div>
                <Label htmlFor="apple-business">Apple Business Chat</Label>
                <p className="text-sm text-gray-500">Receive notifications via Apple Business Chat</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Premium</Badge>
              <Switch
                id="apple-business"
                checked={settings.appleBusinessChat}
                onCheckedChange={(checked) => handleSettingChange("appleBusinessChat", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Categories</CardTitle>
          <CardDescription>Control which types of notifications you receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="job-notifications">Job Notifications</Label>
              <p className="text-sm text-gray-500">New jobs, assignments, and updates</p>
            </div>
            <Switch
              id="job-notifications"
              checked={settings.jobNotifications}
              onCheckedChange={(checked) => handleSettingChange("jobNotifications", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="payment-notifications">Payment Notifications</Label>
              <p className="text-sm text-gray-500">Payment confirmations and updates</p>
            </div>
            <Switch
              id="payment-notifications"
              checked={settings.paymentNotifications}
              onCheckedChange={(checked) => handleSettingChange("paymentNotifications", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="system-notifications">System Notifications</Label>
              <p className="text-sm text-gray-500">System updates and maintenance alerts</p>
            </div>
            <Switch
              id="system-notifications"
              checked={settings.systemNotifications}
              onCheckedChange={(checked) => handleSettingChange("systemNotifications", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="network-notifications">Network Notifications</Label>
              <p className="text-sm text-gray-500">Operator network invitations and updates</p>
            </div>
            <Switch
              id="network-notifications"
              checked={settings.networkNotifications}
              onCheckedChange={(checked) => handleSettingChange("networkNotifications", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sound & Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Volume2 className="h-5 w-5 mr-2" />
            Sound & Timing
          </CardTitle>
          <CardDescription>Customize notification sounds and quiet hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sound">Notification Sounds</Label>
              <p className="text-sm text-gray-500">Play sound when notifications arrive</p>
            </div>
            <Switch
              id="sound"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => handleSettingChange("soundEnabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="quiet-hours">Quiet Hours</Label>
              <p className="text-sm text-gray-500">Reduce notifications during specified hours</p>
            </div>
            <Switch
              id="quiet-hours"
              checked={settings.quietHours}
              onCheckedChange={(checked) => handleSettingChange("quietHours", checked)}
            />
          </div>

          {settings.quietHours && (
            <div className="grid grid-cols-2 gap-4 ml-6">
              <div>
                <Label htmlFor="quiet-start">Start Time</Label>
                <input
                  type="time"
                  id="quiet-start"
                  value={settings.quietStart}
                  onChange={(e) => handleSettingChange("quietStart", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <Label htmlFor="quiet-end">End Time</Label>
                <input
                  type="time"
                  id="quiet-end"
                  value={settings.quietEnd}
                  onChange={(e) => handleSettingChange("quietEnd", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Privacy & Security
          </CardTitle>
          <CardDescription>Manage your notification privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Data Protection</h4>
            <p className="text-sm text-blue-800">
              Your notification data is encrypted and stored securely. We never share your personal information with
              third parties without your consent.
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Apple Business Chat Integration</h4>
            <p className="text-sm text-green-800">
              When enabled, notifications can be sent via Apple Business Chat for a more integrated iOS experience. This
              requires your Apple ID and is subject to Apple's privacy policy.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  )
}
