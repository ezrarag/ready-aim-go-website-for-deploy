"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Bell,
  Building2,
  Globe,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
  Truck,
  Users,
  Waves,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ADMIN_NAV_ITEMS, CLIENT_SECTION_ITEMS, type AdminNavItem } from "@/lib/admin-navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
}

function getNavIcon(itemId: string) {
  switch (itemId) {
    case "dashboard":
      return LayoutDashboard
    case "clients":
      return Users
    case "web-development":
      return Globe
    case "transportation":
      return Truck
    case "real-estate":
      return Building2
    case "staff":
      return Users
    case "beam-participants":
      return Waves
    case "settings":
      return Settings
    default:
      return LayoutDashboard
  }
}

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function SidebarLinks({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 space-y-2 px-2 py-4">
      {ADMIN_NAV_ITEMS.map((item) => {
        const Icon = getNavIcon(item.id)
        const active = isItemActive(pathname, item.href)

        return (
          <div key={item.id} className="space-y-1">
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center rounded-md py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              } ${collapsed ? "justify-center px-1" : "px-2"}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${collapsed ? "" : "mr-3"}`} />
              {!collapsed ? item.label : null}
            </Link>

            {!collapsed && item.id === "clients" ? (
              <div className="ml-8 space-y-1 border-l border-border pl-3">
                {CLIENT_SECTION_ITEMS.map((child) => {
                  const childActive = isItemActive(pathname, child.href)
                  return (
                    <Link
                      key={child.id}
                      href={child.href}
                      onClick={onNavigate}
                      className={`block rounded-md px-2 py-1.5 text-xs transition-colors ${
                        childActive
                          ? "bg-orange-500/15 text-orange-400"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      {child.label}
                    </Link>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex h-full w-80 flex-col border-r border-border bg-card shadow-xl">
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <div>
              <h1 className="text-lg font-bold">ReadyAimGo Ops</h1>
              <p className="text-xs text-muted-foreground">Clients, delivery areas, staff, and BEAM</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <SidebarLinks pathname={pathname} collapsed={false} onNavigate={() => setSidebarOpen(false)} />
          <div className="border-t border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <span className="text-sm font-medium">Dark mode</span>
              </div>
              <Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
            </div>
          </div>
        </div>
      </div>

      <div className={`hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col ${sidebarCollapsed ? "lg:w-20" : "lg:w-72"} transition-all duration-200`}>
        <div className="flex flex-grow flex-col border-r border-border bg-card">
          <div className={`flex h-16 items-center border-b border-border ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
            {!sidebarCollapsed ? (
              <div>
                <h1 className="text-lg font-bold">ReadyAimGo Ops</h1>
                <p className="text-xs text-muted-foreground">Operating model navigation</p>
              </div>
            ) : (
              <span className="text-sm font-bold">RAG</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </Button>
          </div>
          <SidebarLinks pathname={pathname} collapsed={sidebarCollapsed} />
          <div className="border-t border-border p-3">
            <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
              {!sidebarCollapsed ? (
                <div className="flex items-center gap-2">
                  {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <span className="text-sm font-medium">Dark mode</span>
                </div>
              ) : null}
              <Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} aria-label="Toggle dark mode" />
            </div>
          </div>
        </div>
      </div>

      <div className={`${sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"} transition-all duration-200`}>
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card/95 px-4 shadow-sm backdrop-blur sm:gap-x-6 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 items-center">
              <Search className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search clients, delivery areas, websites, or participants..."
                type="search"
              />
            </div>
          </div>

          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-6 w-6" />
              <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white">
                3
              </Badge>
            </Button>

            <div className="flex items-center gap-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <span className="text-sm font-medium text-white">A</span>
              </div>
              <span className="hidden text-sm font-medium text-muted-foreground lg:block">Admin</span>
            </div>
          </div>
        </div>

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
