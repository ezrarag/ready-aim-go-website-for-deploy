export type AdminNavItem = {
  id: string
  label: string
  href: string
  children?: AdminNavItem[]
}

export const WEB_DEVELOPMENT_SECTION_ITEMS: AdminNavItem[] = [
  { id: "web-development-overview", label: "Overview", href: "/dashboard/web-development" },
  { id: "vercel-sync", label: "Vercel Sync", href: "/dashboard/clients/vercel-sync" },
  { id: "app-store-sync", label: "App Store Sync", href: "/dashboard/web-development/app-store-sync" },
]

export const CLIENT_SECTION_ITEMS: AdminNavItem[] = [
  { id: "all-clients", label: "All Clients", href: "/dashboard/clients" },
  { id: "client-onboarding", label: "Client Onboarding", href: "/dashboard/clients/onboarding" },
  { id: "client-contracts", label: "Contracts", href: "/dashboard/clients/contracts" },
  { id: "client-access", label: "BEAM Portal Access", href: "/dashboard/clients/access" },
  { id: "client-assets", label: "Client Assets", href: "/dashboard/clients/assets" },
  { id: "client-activity", label: "Client Story / Activity", href: "/dashboard/clients/activity" },
  { id: "vercel-sync", label: "Vercel Sync", href: "/dashboard/clients/vercel-sync" },
]

export const OPERATIONS_SYSTEM_ITEMS: AdminNavItem[] = [
  { id: "infra-services", label: "Infra Services", href: "/dashboard/admin/services" },
  { id: "build-tracker", label: "Build Tracker", href: "/dashboard/admin/build-tracker" },
  { id: "comms", label: "Communications", href: "/dashboard/comms" },
  { id: "calendar", label: "Calendar", href: "/dashboard/calendar" },
  { id: "finance", label: "Finance", href: "/dashboard/finance" },
]

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "clients", label: "Clients", href: "/dashboard/clients", children: CLIENT_SECTION_ITEMS },
  {
    id: "web-development",
    label: "Web Development",
    href: "/dashboard/web-development",
    children: WEB_DEVELOPMENT_SECTION_ITEMS,
  },
  {
    id: "operations-systems",
    label: "Operations Systems",
    href: "/dashboard/admin/services",
    children: OPERATIONS_SYSTEM_ITEMS,
  },
  { id: "transportation", label: "Transportation", href: "/dashboard/transportation" },
  { id: "real-estate", label: "Real Estate", href: "/dashboard/real-estate" },
  { id: "staff", label: "ReadyAimGo Staff", href: "/dashboard/staff" },
  { id: "beam-participants", label: "BEAM Participants", href: "/dashboard/beam-participants" },
  { id: "settings", label: "Settings", href: "/dashboard/settings" },
]
