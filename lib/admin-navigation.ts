export type AdminNavItem = {
  id: string
  label: string
  href: string
  children?: AdminNavItem[]
}

export const CLIENT_SECTION_ITEMS: AdminNavItem[] = [
  { id: "all-clients", label: "All Clients", href: "/dashboard/clients" },
  { id: "client-onboarding", label: "Client Onboarding", href: "/dashboard/clients/onboarding" },
  { id: "client-contracts", label: "Contracts", href: "/dashboard/clients/contracts" },
  { id: "client-access", label: "BEAM Portal Access", href: "/dashboard/clients/access" },
  { id: "client-assets", label: "Client Assets", href: "/dashboard/clients/assets" },
  { id: "client-activity", label: "Client Story / Activity", href: "/dashboard/clients/activity" },
  { id: "vercel-sync", label: "Vercel Sync", href: "/dashboard/clients/vercel-sync" },
]

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "clients", label: "Clients", href: "/dashboard/clients", children: CLIENT_SECTION_ITEMS },
  { id: "web-development", label: "Web Development", href: "/dashboard/web-development" },
  { id: "infra-services", label: "Infra Services", href: "/dashboard/admin/services" },
  { id: "transportation", label: "Transportation", href: "/dashboard/transportation" },
  { id: "real-estate", label: "Real Estate", href: "/dashboard/real-estate" },
  { id: "staff", label: "ReadyAimGo Staff", href: "/dashboard/staff" },
  { id: "beam-participants", label: "BEAM Participants", href: "/dashboard/beam-participants" },
  { id: "settings", label: "Settings", href: "/dashboard/settings" },
]
