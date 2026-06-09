"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { signOut } from "firebase/auth"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ADMIN_NAV_ITEMS, normalizeAdminHubView, type AdminHubView, type AdminNavItem } from "@/lib/admin-navigation"
import { isAdminRoute } from "@/lib/auth-routes"
import { ensureAuthPersistence } from "@/lib/firebase-client"
import { useUserWithRole } from "@/hooks/use-user-with-role"

interface DashboardLayoutProps {
  children: React.ReactNode
}

function getActiveNavItem(view: AdminHubView) {
  return ADMIN_NAV_ITEMS.find((item) => item.id === view) ?? ADMIN_NAV_ITEMS[0]
}

function NavLinks({
  activeView,
  onNavigate,
}: {
  activeView: AdminHubView
  onNavigate?: () => void
}) {
  return (
    <nav aria-label="Dashboard navigation" className="flex flex-wrap items-center gap-2">
      {ADMIN_NAV_ITEMS.map((item: AdminNavItem) => {
        const active = item.id === activeView

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-card hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function AccessState({
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
  busy,
}: {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
  onAction?: () => void
  busy?: boolean
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-6 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <LayoutDashboard className="h-5 w-5 text-primary" />
          )}
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        {actionLabel && onAction ? (
          <Button className="mt-5" onClick={onAction}>{actionLabel}</Button>
        ) : actionHref && actionLabel ? (
          <Button className="mt-5" asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const { session, loading: authLoading, error: authError } = useUserWithRole()
  const requiresAdmin = isAdminRoute(pathname)
  const activeView = normalizeAdminHubView(searchParams.get("view"))
  const activeNavItem = getActiveNavItem(activeView)
  const isDark = mounted && resolvedTheme === "dark"

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!requiresAdmin || authLoading || authError || session) {
      return
    }

    router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
  }, [authError, authLoading, pathname, requiresAdmin, router, session])

  const handleSignOut = async () => {
    const auth = await ensureAuthPersistence()
    await signOut(auth)
    router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
  }

  if (requiresAdmin && authLoading) {
    return (
      <AccessState
        title="Checking administrator access"
        description="Reading the Firebase auth session and users/{uid} admin profile."
        busy
      />
    )
  }

  if (requiresAdmin && authError) {
    return (
      <AccessState
        title="Unable to check administrator access"
        description={authError}
        actionHref={`/login?redirect=${encodeURIComponent(pathname)}`}
        actionLabel="Return to login"
      />
    )
  }

  if (requiresAdmin && !session) {
    return (
      <AccessState
        title="Redirecting to administrator login"
        description="No active Firebase session was found for this browser."
        busy
      />
    )
  }

  if (requiresAdmin && session && session.profile?.role !== "admin") {
    return (
      <AccessState
        title="Administrator access required"
        description={`Signed in as ${session.email ?? "this user"}, but users/{uid}.role is not admin.`}
        onAction={handleSignOut}
        actionLabel="Use another account"
      />
    )
  }

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                  RAG
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    ReadyAimGo Admin
                  </p>
                  <h1 className="truncate text-base font-semibold text-foreground">{activeNavItem.label}</h1>
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <Badge variant="outline" className="max-w-[220px] truncate">
                {session?.email ?? "Admin"}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label="Toggle dashboard navigation"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          <div className="hidden lg:block">
            <NavLinks activeView={activeView} />
          </div>

          {mobileNavOpen ? (
            <div className="space-y-4 rounded-xl border border-border bg-card p-3 lg:hidden">
              <NavLinks activeView={activeView} onNavigate={() => setMobileNavOpen(false)} />
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                >
                  {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  Theme
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Diagnostics
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
