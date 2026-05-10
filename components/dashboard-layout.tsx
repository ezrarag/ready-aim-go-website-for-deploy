"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { useTheme } from "next-themes"
import {
  Bell,
  DollarSign,
  FolderOpen,
  Globe,
  LayoutDashboard,
  ListTodo,
  Loader2,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Server,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ADMIN_NAV_ITEMS, type AdminNavItem } from "@/lib/admin-navigation"
import { isAdminRoute } from "@/lib/auth-routes"
import { ensureAuthPersistence } from "@/lib/firebase-client"
import { useUserWithRole } from "@/hooks/use-user-with-role"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const NAV_GROUPS = [
  {
    label: "Core",
    itemIds: ["dashboard", "clients", "projects", "files", "tasks", "billing", "settings"],
  },
  {
    label: "System",
    itemIds: ["system"],
  },
]

function getNavIcon(itemId: string) {
  switch (itemId) {
    case "dashboard": return LayoutDashboard
    case "clients":   return Users
    case "projects":  return Globe
    case "files":     return FolderOpen
    case "tasks":     return ListTodo
    case "billing":   return DollarSign
    case "settings":  return Settings
    case "system":    return Server
    default:          return LayoutDashboard
  }
}

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isNavItemActive(pathname: string, item: AdminNavItem): boolean {
  return isItemActive(pathname, item.href) || Boolean(item.children?.some((child) => isItemActive(pathname, child.href)))
}

function getGroupedNavItems() {
  const itemById = new Map(ADMIN_NAV_ITEMS.map((item) => [item.id, item]))
  const groupedIds = new Set(NAV_GROUPS.flatMap((group) => group.itemIds))
  const groups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.itemIds
      .map((itemId) => itemById.get(itemId))
      .filter((item): item is AdminNavItem => Boolean(item)),
  })).filter((group) => group.items.length > 0)
  const ungroupedItems = ADMIN_NAV_ITEMS.filter((item) => !groupedIds.has(item.id))

  if (ungroupedItems.length === 0) {
    return groups
  }

  return [...groups, { label: "Other", items: ungroupedItems }]
}

function getActiveNavItem(pathname: string) {
  for (const item of ADMIN_NAV_ITEMS) {
    const activeChild = item.children?.find((child) => isItemActive(pathname, child.href))

    if (activeChild) {
      return activeChild
    }

    if (isItemActive(pathname, item.href)) {
      return item
    }
  }

  return ADMIN_NAV_ITEMS[0]
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
  const navGroups = getGroupedNavItems()

  const renderChildLinks = (item: AdminNavItem) => {
    if (collapsed || !item.children?.length) {
      return null
    }

    return (
      <div className="ml-5 mt-1 space-y-1 border-l border-border/70 pl-3">
        {item.children.map((child) => {
          const childActive = isItemActive(pathname, child.href)
          return (
            <Link
              key={child.id}
              href={child.href}
              onClick={onNavigate}
              aria-current={childActive ? "page" : undefined}
              className={`block rounded-md px-3 py-1.5 text-[13px] leading-5 transition-colors ${
                childActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {child.label}
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <nav aria-label="Dashboard navigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
      <div className="space-y-4">
        {navGroups.map((group, groupIndex) => (
          <div key={group.label} className="space-y-1.5">
            {collapsed && groupIndex > 0 ? <div className="mx-3 border-t border-border/70" /> : null}
            {!collapsed ? (
              <div className="px-3 text-[11px] font-semibold uppercase text-muted-foreground/70">
                {group.label}
              </div>
            ) : null}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = getNavIcon(item.id)
                const active = isNavItemActive(pathname, item)

                return (
                  <div key={item.id} className="space-y-1">
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex min-h-10 items-center rounded-lg py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      } ${collapsed ? "justify-center px-2" : "px-3"}`}
                      title={collapsed ? item.label : undefined}
                    >
                      {active && !collapsed ? (
                        <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-primary" />
                      ) : null}
                      <Icon className={`h-4 w-4 flex-shrink-0 ${collapsed ? "" : "mr-3"}`} />
                      {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    </Link>

                    {renderChildLinks(item)}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const { session, loading: authLoading, error: authError } = useUserWithRole()
  const requiresAdmin = isAdminRoute(pathname)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!requiresAdmin || authLoading) {
      return
    }

    const redirectToLogin = () => {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }

    if (!session) {
      redirectToLogin()
      return
    }

    if (session.profile?.role !== "admin") {
      ;(async () => {
        const auth = await ensureAuthPersistence()
        await signOut(auth)
        redirectToLogin()
      })()
    }
  }, [authLoading, pathname, requiresAdmin, router, session])

  if (requiresAdmin && authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Checking administrator access...
        </div>
      </div>
    )
  }

  if (requiresAdmin && authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold">Unable to check access</h1>
          <p className="mt-2 text-sm text-muted-foreground">{authError}</p>
          <Button className="mt-4" asChild>
            <Link href={`/login?redirect=${encodeURIComponent(pathname)}`}>Go to login</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (requiresAdmin && (!session || session.profile?.role !== "admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Redirecting to administrator login...
        </div>
      </div>
    )
  }

  const isDark = mounted && resolvedTheme === "dark"
  const activeNavItem = getActiveNavItem(pathname)

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex h-full w-[calc(100vw-2rem)] max-w-80 min-h-0 flex-col border-r border-border bg-card shadow-xl">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="min-w-0">
              <h1 className="text-lg font-bold">ReadyAimGo Ops</h1>
              <p className="truncate text-xs text-muted-foreground">Clients, delivery areas, staff, and BEAM</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
          </div>
          <SidebarLinks pathname={pathname} collapsed={false} onNavigate={() => setSidebarOpen(false)} />
          <div className="shrink-0 border-t border-border p-4">
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

      <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:min-h-0 lg:flex-col ${sidebarCollapsed ? "lg:w-20" : "lg:w-72"} transition-all duration-200`}>
        <div className="flex h-full min-h-0 flex-col border-r border-border bg-card overflow-hidden">
          <div className={`flex h-16 shrink-0 items-center border-b border-border ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
            {!sidebarCollapsed ? (
              <div className="min-w-0">
                <h1 className="text-lg font-bold">ReadyAimGo Ops</h1>
                <p className="truncate text-xs text-muted-foreground">Operating model navigation</p>
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
          <div className="shrink-0 border-t border-border p-3">
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

      <div className={`min-h-screen ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-72"} transition-all duration-200`}>
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase text-muted-foreground">Dashboard</p>
            <h2 className="truncate text-sm font-semibold text-foreground">{activeNavItem.label}</h2>
          </div>

          <div className="hidden flex-1 justify-center md:flex">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute inset-y-0 left-3 h-full w-4 text-muted-foreground" />
              <Input
                className="h-9 pl-9"
                placeholder="Search clients, routes, websites, or participants..."
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

        <main className="min-h-[calc(100vh-4rem)] py-6">
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
