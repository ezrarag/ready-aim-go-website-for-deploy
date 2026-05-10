export type AdminNavItem = {
  id: string
  label: string
  href: string
  children?: AdminNavItem[]
}

// ── Sub-arrays (exported for consumers such as ClientSectionNav) ──────────────

export const CLIENT_SECTION_ITEMS: AdminNavItem[] = [
  { id: "clients-all",        label: "All Clients",   href: "/dashboard/clients" },
  { id: "clients-onboarding", label: "Onboarding",    href: "/dashboard/clients/onboarding" },
  { id: "clients-contracts",  label: "Contracts",     href: "/dashboard/clients/contracts" },
  { id: "clients-team",       label: "Team & Access", href: "/dashboard/clients/access" },
  { id: "clients-assets",     label: "Assets",        href: "/dashboard/clients/assets" },
  { id: "clients-activity",   label: "Activity",      href: "/dashboard/clients/activity" },
]

export const PROJECTS_SECTION_ITEMS: AdminNavItem[] = [
  { id: "projects-overview",  label: "Overview",       href: "/dashboard/web-development" },
  { id: "projects-vercel",    label: "Vercel Sync",    href: "/dashboard/clients/vercel-sync" },
  { id: "projects-appstore",  label: "App Store Sync", href: "/dashboard/web-development/app-store-sync" },
]

export const BILLING_SECTION_ITEMS: AdminNavItem[] = [
  { id: "billing-finance",   label: "Finance",        href: "/dashboard/finance" },
  { id: "billing-services",  label: "Infra Services", href: "/dashboard/admin/services" },
]

export const SYSTEM_SECTION_ITEMS: AdminNavItem[] = [
  { id: "system-admin",       label: "Admin Overview",    href: "/dashboard/admin" },
  { id: "system-builds",      label: "Build Tracker",     href: "/dashboard/admin/build-tracker" },
  { id: "system-comms",       label: "Communications",    href: "/dashboard/comms" },
  { id: "system-calendar",    label: "Calendar",          href: "/dashboard/calendar" },
  { id: "system-directory",   label: "Website Directory", href: "/dashboard/admin/website-directory" },
  { id: "system-staff",       label: "Staff",             href: "/dashboard/staff" },
  { id: "system-beam",        label: "BEAM Participants", href: "/dashboard/beam-participants" },
  { id: "system-transport",   label: "Transportation",    href: "/dashboard/transportation" },
  { id: "system-realestate",  label: "Real Estate",       href: "/dashboard/real-estate" },
]

// ── Deprecated aliases — preserved for backward compatibility ─────────────────

/** @deprecated Use PROJECTS_SECTION_ITEMS */
export const WEB_DEVELOPMENT_SECTION_ITEMS: AdminNavItem[] = PROJECTS_SECTION_ITEMS

/** @deprecated Use SYSTEM_SECTION_ITEMS */
export const OPERATIONS_SYSTEM_ITEMS: AdminNavItem[] = SYSTEM_SECTION_ITEMS

// ── Primary navigation tree ───────────────────────────────────────────────────

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  // Core
  { id: "dashboard", label: "Dashboard",        href: "/dashboard" },
  { id: "clients",   label: "Clients",          href: "/dashboard/clients",        children: CLIENT_SECTION_ITEMS },
  { id: "projects",  label: "Projects",         href: "/dashboard/web-development", children: PROJECTS_SECTION_ITEMS },
  { id: "files",     label: "Files & Assets",   href: "/dashboard/clients/assets" },
  { id: "tasks",     label: "Tasks",            href: "/dashboard/command" },
  { id: "billing",   label: "Services & Billing", href: "/dashboard/finance",       children: BILLING_SECTION_ITEMS },
  { id: "settings",  label: "Settings",         href: "/dashboard/settings" },
  // Admin-only advanced tools
  { id: "system",    label: "System",           href: "/dashboard/admin",           children: SYSTEM_SECTION_ITEMS },
]
