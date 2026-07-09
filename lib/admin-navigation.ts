export type AdminHubView = "clients" | "people" | "workspaces" | "tasks" | "billing" | "guides"

export type AdminNavItem = {
  id: AdminHubView
  label: string
  href: string
}

export const ADMIN_HUB_VIEWS: AdminNavItem[] = [
  { id: "clients", label: "People", href: "/dashboard?view=clients" },
  { id: "workspaces", label: "Workspaces", href: "/dashboard?view=workspaces" },
  { id: "tasks", label: "Tasks", href: "/dashboard?view=tasks" },
  { id: "billing", label: "Billing", href: "/dashboard?view=billing" },
  { id: "guides", label: "Guides", href: "/dashboard?view=guides" },
]

export const ADMIN_NAV_ITEMS = ADMIN_HUB_VIEWS

/** @deprecated The admin dashboard now uses ADMIN_HUB_VIEWS. */
export const CLIENT_SECTION_ITEMS: AdminNavItem[] = [
  { id: "clients", label: "People", href: "/dashboard?view=clients" },
  { id: "workspaces", label: "Workspaces", href: "/dashboard?view=workspaces" },
  { id: "tasks", label: "Tasks", href: "/dashboard?view=tasks" },
  { id: "billing", label: "Billing", href: "/dashboard?view=billing" },
]

/** @deprecated The admin dashboard now uses ADMIN_HUB_VIEWS. */
export const ADVANCED_ADMIN_TOOLS: AdminNavItem[] = ADMIN_HUB_VIEWS

export const ADMIN_ROUTE_REDIRECTS: Record<string, string> = {
  "/dashboard/clients": "/dashboard?view=clients",
  "/dashboard/clients/access": "/dashboard?view=clients",
  "/dashboard/clients/activity": "/dashboard?view=workspaces",
  "/dashboard/clients/assets": "/dashboard?view=workspaces",
  "/dashboard/clients/contracts": "/dashboard?view=billing",
  "/dashboard/clients/onboarding": "/dashboard?view=clients",
  "/dashboard/clients/vercel-sync": "/dashboard?view=workspaces",
  "/dashboard/command": "/dashboard?view=tasks",
  "/dashboard/web-development": "/dashboard?view=workspaces",
  "/dashboard/web-development/app-store-sync": "/dashboard?view=workspaces",
  "/dashboard/finance": "/dashboard?view=billing",
  "/dashboard/admin/services": "/dashboard?view=billing",
}

export function normalizeAdminHubView(value: string | null | undefined): AdminHubView {
  return value === "people"
    ? "clients"
    : value === "clients" ||
    value === "workspaces" ||
    value === "tasks" ||
    value === "billing" ||
    value === "guides"
    ? value
    : "workspaces"
}

export function getAdminHubHref(view: AdminHubView, params?: Record<string, string | null | undefined>) {
  const search = new URLSearchParams()
  search.set("view", view)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) search.set(key, value)
  }
  const query = search.toString()
  return query ? `/dashboard?${query}` : "/dashboard"
}
