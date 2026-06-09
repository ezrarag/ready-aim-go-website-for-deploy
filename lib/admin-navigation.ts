export type AdminHubView = "overview" | "clients" | "people" | "workspaces" | "tasks" | "billing"

export type AdminNavItem = {
  id: AdminHubView
  label: string
  href: string
}

export const ADMIN_HUB_VIEWS: AdminNavItem[] = [
  { id: "overview", label: "Overview", href: "/dashboard" },
  { id: "clients", label: "Clients", href: "/dashboard?view=clients" },
  { id: "people", label: "People", href: "/dashboard?view=people" },
  { id: "workspaces", label: "Workspaces", href: "/dashboard?view=workspaces" },
  { id: "tasks", label: "Tasks", href: "/dashboard?view=tasks" },
  { id: "billing", label: "Billing", href: "/dashboard?view=billing" },
]

export const ADMIN_NAV_ITEMS = ADMIN_HUB_VIEWS

/** @deprecated The admin dashboard now uses ADMIN_HUB_VIEWS. */
export const CLIENT_SECTION_ITEMS: AdminNavItem[] = [
  { id: "clients", label: "Clients", href: "/dashboard?view=clients" },
  { id: "people", label: "People", href: "/dashboard?view=people" },
  { id: "workspaces", label: "Workspaces", href: "/dashboard?view=workspaces" },
  { id: "tasks", label: "Tasks", href: "/dashboard?view=tasks" },
  { id: "billing", label: "Billing", href: "/dashboard?view=billing" },
]

/** @deprecated The admin dashboard now uses ADMIN_HUB_VIEWS. */
export const ADVANCED_ADMIN_TOOLS: AdminNavItem[] = ADMIN_HUB_VIEWS

export const ADMIN_ROUTE_REDIRECTS: Record<string, string> = {
  "/dashboard/clients": "/dashboard?view=clients",
  "/dashboard/clients/access": "/dashboard?view=people",
  "/dashboard/clients/activity": "/dashboard",
  "/dashboard/clients/assets": "/dashboard?view=workspaces",
  "/dashboard/clients/contracts": "/dashboard?view=billing",
  "/dashboard/clients/onboarding": "/dashboard?view=people",
  "/dashboard/clients/vercel-sync": "/dashboard?view=workspaces",
  "/dashboard/command": "/dashboard?view=tasks",
  "/dashboard/web-development": "/dashboard?view=workspaces",
  "/dashboard/web-development/app-store-sync": "/dashboard?view=workspaces",
  "/dashboard/finance": "/dashboard?view=billing",
  "/dashboard/admin/services": "/dashboard?view=billing",
}

export function normalizeAdminHubView(value: string | null | undefined): AdminHubView {
  return value === "clients" ||
    value === "people" ||
    value === "workspaces" ||
    value === "tasks" ||
    value === "billing"
    ? value
    : "overview"
}

export function getAdminHubHref(view: AdminHubView, params?: Record<string, string | null | undefined>) {
  const search = new URLSearchParams()
  if (view !== "overview") search.set("view", view)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return query ? `/dashboard?${query}` : "/dashboard"
}
