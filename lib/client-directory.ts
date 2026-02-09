export type ClientStatus = "active" | "inactive" | "onboarding"
export type DeployStatus = "live" | "building" | "error"
export type StripeStatus = "connected" | "pending" | "error"

export type ModuleKey = "web" | "app" | "rd" | "housing" | "transportation" | "insurance"

export interface ClientModule {
  enabled: boolean
  overview?: string
  links?: Record<string, string>
  metrics?: Record<string, unknown>
}

export interface ClientDirectoryEntry {
  id: string
  storyId: string
  name: string
  brands: string[]
  status: ClientStatus
  lastActivity: string
  pulseSummary?: string
  deployStatus: DeployStatus
  deployUrl?: string
  stripeStatus: StripeStatus
  revenue: number
  meetings: number
  emails: number
  commits: number
  lastDeploy?: string
  storyVideoUrl?: string
  isNewStory?: boolean
  websiteUrl?: string
  appUrl?: string
  appStoreUrl?: string
  /** Data-driven story modules (web, app, rd, housing, transportation, insurance). Front-end fallback if missing. */
  modules?: Record<ModuleKey, ClientModule>
}

/** Baseline modules so front-end never breaks when Firestore has no modules. */
export function getDefaultModules(): Record<ModuleKey, ClientModule> {
  return {
    web: { enabled: true, overview: "Professional web presence that grows with your business" },
    app: { enabled: true, overview: "Mobile and web apps that connect your business to customers" },
    rd: { enabled: true, overview: "Research and development infrastructure to fuel innovation" },
    housing: { enabled: true, overview: "Managed real estate solutions for your team and operations" },
    transportation: { enabled: true, overview: "Fleet management and logistics to keep you moving" },
    insurance: { enabled: true, overview: "Comprehensive coverage tailored to your business needs" },
  }
}

// --- Client updates (GitHub-style feed) ---

export type UpdateStatus = "draft" | "published"

export interface ClientUpdateVideo {
  publicUrl?: string
  storagePath?: string
  thumbnailUrl?: string
}

export interface ClientUpdate {
  id: string
  createdAt: string
  createdByUid?: string
  type: ModuleKey
  title: string
  summary?: string
  details?: string
  /** Body text (Firestore may store as body or details). */
  body?: string
  status: UpdateStatus
  links?: Record<string, string>
  video?: ClientUpdateVideo
  versionLabel?: string
  tags?: string[]
}
