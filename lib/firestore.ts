import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAuth as getAdminAuth, type Auth as AdminAuth } from 'firebase-admin/auth'
import type {
  ClientDirectoryEntry,
  ClientStatus,
  DeployStatus,
  StripeStatus,
  ModuleKey,
  ClientModule,
  ClientUpdate,
  UpdateStatus,
  ClientUpdateVideo,
} from './client-directory'
import { getDefaultModules } from './client-directory'
import { collectClientDeployHosts, collectClientGithubRepos, parseRepoSlug } from './pulse-selectors'
import { pulseReportSchema } from './pulse-report'
import { clientRoleSuggestionSnapshotSchema } from './client-role-suggestions'
import { clientWorkspaceSchema, type ClientWorkspace } from './client-workspace'

let app: App | null = null
let db: Firestore | null = null

export function getFirestoreDb(): Firestore | null {
  if (db) {
    return db
  }

  // Initialize Firebase Admin if not already initialized
  if (getApps().length === 0) {
    // Check for service account key in environment variables first, but fall back
    // to individual credential fields if the JSON blob is malformed.
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()

    if (serviceAccountKey?.startsWith("{")) {
      try {
        const serviceAccount = JSON.parse(serviceAccountKey)
        app = initializeApp({
          credential: cert(serviceAccount),
        })
      } catch (error) {
        console.error(
          "Error parsing FIREBASE_SERVICE_ACCOUNT_KEY; falling back to individual Firebase credential fields:",
          error
        )
      }
    }

    if (!app) {
      // ── Security guard ────────────────────────────────────────────────────────
      // NEXT_PUBLIC_ vars are inlined into client bundles. A private key must
      // NEVER carry that prefix. Fail loudly so the misconfiguration is caught
      // at startup rather than silently leaking credentials to the browser.
      if (process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY) {
        console.error(
          "[SECURITY] NEXT_PUBLIC_FIREBASE_PRIVATE_KEY is set. Firebase Admin private keys " +
          "must use a server-only variable (FIREBASE_PRIVATE_KEY or FIREBASE_ADMIN_PRIVATE_KEY). " +
          "Remove NEXT_PUBLIC_FIREBASE_PRIVATE_KEY from your environment immediately."
        )
        return null
      }

      // Prefer the server-only FIREBASE_PROJECT_ID; fall back to the public var
      // for backward compatibility with existing deployments.
      const projectId =
        process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      const clientEmail =
        process.env.FIREBASE_CLIENT_EMAIL ||
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
        process.env.FIREBASE_AMIN_CLIENT_EMAIL
      const privateKey = (
        process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY
      )?.replace(/\\n/g, '\n')

      // Validate required fields - return null instead of throwing during build time
      if (!projectId || !clientEmail || !privateKey) {
        console.warn(
          "Firebase Admin credentials are incomplete. Set FIREBASE_SERVICE_ACCOUNT_KEY to valid JSON, " +
          "or set FIREBASE_PROJECT_ID (server-only), FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
        )
        return null
      }

      try {
        app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
      } catch (error) {
        console.error('Error initializing Firebase Admin:', error)
        // Return null instead of throwing during build time
        return null
      }
    }
  } else {
    app = getApps()[0]
  }

  // Ensure app was successfully initialized
  if (!app) {
    // Return null instead of throwing during build time
    return null
  }

  db = getFirestore(app)
  return db
}

export function getFirebaseAdminAuth(): AdminAuth | null {
  const firestore = getFirestoreDb()
  if (!firestore || !app) {
    return null
  }

  return getAdminAuth(app)
}

/** Returns Firebase Storage bucket for uploads (e.g. client update videos). Ensures Firestore app is initialized first. */
export function getStorageBucket(): ReturnType<ReturnType<typeof import("firebase-admin/storage").getStorage>["bucket"]> | null {
  getFirestoreDb()
  if (getApps().length === 0) return null
  try {
    const { getStorage } = require("firebase-admin/storage") as typeof import("firebase-admin/storage")
    const projectId =
      process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const bucketName =
      process.env.FIREBASE_STORAGE_BUCKET ||
      (projectId ? `${projectId}.appspot.com` : null)
    if (!bucketName) return null
    return getStorage().bucket(bucketName)
  } catch {
    return null
  }
}

// Partner types
export interface Partner {
  id?: string
  slug: string
  name: string
  contactEmail?: string
  contactName?: string
  orgType: string
  createdAt?: FirebaseFirestore.Timestamp | Date
}

export interface Contribution {
  id?: string
  partnerId: string
  partnerSlug: string
  stripeSessionId: string
  amountCents: number
  currency: string
  purpose: string
  userEmail?: string
  userName?: string
  createdAt?: FirebaseFirestore.Timestamp | Date
}

type FirestoreClientDoc = {
  storyId?: unknown
  name?: unknown
  brands?: unknown
  status?: unknown
  lastActivity?: unknown
  updatedAt?: unknown
  pulseSummary?: unknown
  deployStatus?: unknown
  deployUrl?: unknown
  githubRepo?: unknown
  githubRepos?: unknown
  deployHosts?: unknown
  vercelProjectId?: unknown
  vercelProjectName?: unknown
  vercelProjectDomains?: unknown
  vercelProjectUpdatedAt?: unknown
  pulseReport?: unknown
  roleSuggestionSnapshot?: unknown
  stripeStatus?: unknown
  revenue?: unknown
  meetings?: unknown
  emails?: unknown
  commits?: unknown
  lastDeploy?: unknown
  storyVideoUrl?: unknown
  showOnFrontend?: unknown
  isNewStory?: unknown
  websiteUrl?: unknown
  appUrl?: unknown
  appStoreUrl?: unknown
  appStoreConnectAppId?: unknown
  appStoreConnectName?: unknown
  appStoreConnectBundleId?: unknown
  appStoreConnectPlatform?: unknown
  appStoreConnectSku?: unknown
  appStoreConnectVersionString?: unknown
  appStoreConnectBuildNumber?: unknown
  appStoreConnectBuildState?: unknown
  appStoreConnectBetaGroups?: unknown
  appStoreConnectUpdatedAt?: unknown
  rdUrl?: unknown
  housingUrl?: unknown
  transportationUrl?: unknown
  insuranceUrl?: unknown
  modules?: unknown
}

async function getClientDocumentByRef(
  clientRef: string
): Promise<{ id: string; data: FirestoreClientDoc } | null> {
  const db = getFirestoreDb()
  if (!db) return null

  const normalizedRef = clientRef.trim()
  if (!normalizedRef) return null

  const directDoc = await db.collection("clients").doc(normalizedRef).get()
  if (directDoc.exists) {
    return {
      id: directDoc.id,
      data: directDoc.data() as FirestoreClientDoc,
    }
  }

  const byStoryId = await db
    .collection("clients")
    .where("storyId", "==", normalizedRef)
    .limit(1)
    .get()

  if (byStoryId.empty) return null

  const storyDoc = byStoryId.docs[0]
  return {
    id: storyDoc.id,
    data: storyDoc.data() as FirestoreClientDoc,
  }
}

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []

const asClientStatus = (value: unknown): ClientStatus =>
  value === "active" || value === "inactive" || value === "onboarding" ? value : "onboarding"

const asDeployStatus = (value: unknown): DeployStatus =>
  value === "live" || value === "building" || value === "error" ? value : "building"

const asStripeStatus = (value: unknown): StripeStatus =>
  value === "connected" || value === "pending" || value === "error" ? value : "pending"

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback

const MODULE_KEYS: ModuleKey[] = ["web", "app", "rd", "housing", "transportation", "insurance"]

function asModule(value: unknown): ClientModule {
  if (value && typeof value === "object" && "enabled" in value) {
    const o = value as Record<string, unknown>
    return {
      enabled: typeof o.enabled === "boolean" ? o.enabled : true,
      overview: typeof o.overview === "string" ? o.overview : undefined,
      links: o.links && typeof o.links === "object" && !Array.isArray(o.links)
        ? (o.links as Record<string, string>)
        : undefined,
      metrics: o.metrics && typeof o.metrics === "object" && !Array.isArray(o.metrics)
        ? (o.metrics as Record<string, unknown>)
        : undefined,
    }
  }
  return { enabled: true }
}

function asModules(value: unknown): Record<ModuleKey, ClientModule> {
  const defaultModules = getDefaultModules()
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultModules
  const out = { ...defaultModules }
  const obj = value as Record<string, unknown>
  for (const key of MODULE_KEYS) {
    if (key in obj) out[key] = asModule(obj[key])
  }
  return out
}

const mapClientDoc = (id: string, doc: FirestoreClientDoc): ClientDirectoryEntry => {
  const normalizedId = id || asString(doc.storyId, "unknown")
  const githubRepo = asString(doc.githubRepo) || undefined
  const deployUrl = asString(doc.deployUrl) || undefined
  const githubRepos = collectClientGithubRepos({
    githubRepo,
    githubRepos: asStringArray(doc.githubRepos),
  })
  const deployHosts = collectClientDeployHosts({
    deployUrl,
    deployHosts: asStringArray(doc.deployHosts),
  })
  const parsedPulseReport = pulseReportSchema.safeParse(doc.pulseReport)
  const parsedRoleSuggestionSnapshot = clientRoleSuggestionSnapshotSchema.safeParse(doc.roleSuggestionSnapshot)

  return {
    id: normalizedId,
    storyId: asString(doc.storyId, normalizedId),
    name: asString(doc.name, normalizedId.toUpperCase()),
    brands: asStringArray(doc.brands),
    status: asClientStatus(doc.status),
    lastActivity: asString(doc.lastActivity, "Recently updated"),
    updatedAt: asString(doc.updatedAt) || undefined,
    pulseSummary: asString(doc.pulseSummary),
    deployStatus: asDeployStatus(doc.deployStatus),
    deployUrl,
    githubRepo,
    githubRepos,
    deployHosts,
    vercelProjectId: asString(doc.vercelProjectId) || undefined,
    vercelProjectName: asString(doc.vercelProjectName) || undefined,
    vercelProjectDomains: asStringArray(doc.vercelProjectDomains),
    vercelProjectUpdatedAt: asString(doc.vercelProjectUpdatedAt) || undefined,
    stripeStatus: asStripeStatus(doc.stripeStatus),
    revenue: asNumber(doc.revenue),
    meetings: asNumber(doc.meetings),
    emails: asNumber(doc.emails),
    commits: asNumber(doc.commits),
    lastDeploy: asString(doc.lastDeploy),
    storyVideoUrl: asString(doc.storyVideoUrl),
    showOnFrontend: asBoolean(doc.showOnFrontend, true),
    isNewStory: typeof doc.isNewStory === "boolean" ? doc.isNewStory : false,
    websiteUrl: asString(doc.websiteUrl) || undefined,
    appUrl: asString(doc.appUrl) || undefined,
    appStoreUrl: asString(doc.appStoreUrl) || undefined,
    appStoreConnectAppId: asString(doc.appStoreConnectAppId) || undefined,
    appStoreConnectName: asString(doc.appStoreConnectName) || undefined,
    appStoreConnectBundleId: asString(doc.appStoreConnectBundleId) || undefined,
    appStoreConnectPlatform: asString(doc.appStoreConnectPlatform) || undefined,
    appStoreConnectSku: asString(doc.appStoreConnectSku) || undefined,
    appStoreConnectVersionString: asString(doc.appStoreConnectVersionString) || undefined,
    appStoreConnectBuildNumber: asString(doc.appStoreConnectBuildNumber) || undefined,
    appStoreConnectBuildState: asString(doc.appStoreConnectBuildState) || undefined,
    appStoreConnectBetaGroups: asStringArray(doc.appStoreConnectBetaGroups),
    appStoreConnectUpdatedAt: asString(doc.appStoreConnectUpdatedAt) || undefined,
    rdUrl: asString(doc.rdUrl) || undefined,
    housingUrl: asString(doc.housingUrl) || undefined,
    transportationUrl: asString(doc.transportationUrl) || undefined,
    insuranceUrl: asString(doc.insuranceUrl) || undefined,
    modules: asModules(doc.modules),
    pulseReport: parsedPulseReport.success ? parsedPulseReport.data : undefined,
    roleSuggestionSnapshot: parsedRoleSuggestionSnapshot.success ? parsedRoleSuggestionSnapshot.data : undefined,
  }
}

// --- Client updates subcollection ---
// Standardized shape: clients/{clientId}/updates/{updateId}
// category stored as type (ModuleKey); published as status === "published"

/** Raw Firestore document shape for clients/{clientId}/updates/{updateId}. */
export type FirestoreUpdateDoc = {
  type?: string
  title?: string
  body?: string
  details?: string
  summary?: string
  createdAt?: FirebaseFirestore.Timestamp | Date | string
  status?: string
  published?: boolean
  createdByUid?: string
  links?: Record<string, string>
  video?: ClientUpdateVideo
  versionLabel?: string
  tags?: string[]
}

function mapUpdateDoc(id: string, data: FirebaseFirestore.DocumentData): ClientUpdate {
  const createdAt = data.createdAt
  const createdAtStr =
    createdAt?.toDate?.()?.toISOString?.() ??
    (typeof createdAt === "string" ? createdAt : new Date().toISOString())
  const video = data.video as Record<string, string> | undefined
  const bodyStr = typeof data.body === "string" ? data.body : undefined
  const detailsStr = typeof data.details === "string" ? data.details : undefined
  return {
    id,
    createdAt: createdAtStr,
    createdByUid: typeof data.createdByUid === "string" ? data.createdByUid : undefined,
    type: MODULE_KEYS.includes(data.type as ModuleKey) ? (data.type as ModuleKey) : "web",
    title: typeof data.title === "string" ? data.title : "",
    summary: typeof data.summary === "string" ? data.summary : undefined,
    details: detailsStr,
    body: bodyStr || detailsStr || undefined,
    status: data.status === "published" || data.published === true ? "published" : "draft",
    links: data.links && typeof data.links === "object" ? (data.links as Record<string, string>) : undefined,
    video: video
      ? {
          publicUrl: video.publicUrl,
          storagePath: video.storagePath,
          thumbnailUrl: video.thumbnailUrl,
        }
      : undefined,
    versionLabel: typeof data.versionLabel === "string" ? data.versionLabel : undefined,
    tags: Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === "string") : undefined,
  }
}

export async function getClientUpdates(
  clientRef: string,
  opts: { type?: ModuleKey; status?: UpdateStatus; limit?: number } = {}
): Promise<ClientUpdate[]> {
  const resolvedClientId = await resolveClientDocumentId(clientRef)
  if (!resolvedClientId) return []

  const db = getFirestoreDb()
  if (!db) return []
  const limit = Math.min(opts.limit ?? 50, 100)
  const ref = db.collection("clients").doc(resolvedClientId).collection("updates")

  try {
    if (opts.type != null && opts.status != null) {
      const snapshot = await ref
        .where("type", "==", opts.type)
        .where("status", "==", opts.status)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get()
      return snapshot.docs.map((d) => mapUpdateDoc(d.id, d.data()))
    }
  } catch (queryError) {
    console.warn("getClientUpdates indexed query failed (missing index?), falling back to in-memory filter:", queryError)
  }

  try {
    const snapshot = await ref.orderBy("createdAt", "desc").limit(200).get()
    let list = snapshot.docs.map((d) => mapUpdateDoc(d.id, d.data()))
    if (opts.type) list = list.filter((u) => u.type === opts.type)
    if (opts.status) list = list.filter((u) => u.status === opts.status)
    return list.slice(0, limit)
  } catch (e) {
    console.warn("getClientUpdates failed:", e)
    return []
  }
}

export async function getLatestPublishedUpdate(
  clientRef: string,
  type: ModuleKey
): Promise<ClientUpdate | null> {
  const list = await getClientUpdates(clientRef, { type, status: "published", limit: 1 })
  return list[0] ?? null
}

export async function createClientUpdate(
  clientRef: string,
  data: Omit<ClientUpdate, "id" | "createdAt">
): Promise<string> {
  const resolvedClientId = await resolveClientDocumentId(clientRef)
  if (!resolvedClientId) throw new Error("Client not found")

  const db = getFirestoreDb()
  if (!db) throw new Error("Firebase not initialized")
  const ref = db.collection("clients").doc(resolvedClientId).collection("updates").doc()
  const createdAt = new Date()
  const bodyOrDetails = data.body ?? data.details ?? null
  await ref.set({
    createdAt,
    createdByUid: data.createdByUid ?? null,
    type: data.type,
    title: data.title,
    summary: data.summary ?? null,
    details: data.details ?? bodyOrDetails,
    body: typeof data.body === "string" ? data.body : bodyOrDetails,
    status: data.status ?? "draft",
    links: data.links ?? null,
    video: data.video ?? null,
    versionLabel: data.versionLabel ?? null,
    tags: data.tags ?? null,
  })
  return ref.id
}

export async function updateClientUpdate(
  clientRef: string,
  updateId: string,
  data: Partial<Omit<ClientUpdate, "id" | "createdAt" | "createdByUid">>
): Promise<void> {
  const resolvedClientId = await resolveClientDocumentId(clientRef)
  if (!resolvedClientId) throw new Error("Client not found")

  const db = getFirestoreDb()
  if (!db) throw new Error("Firebase not initialized")
  const ref = db.collection("clients").doc(resolvedClientId).collection("updates").doc(updateId)
  const payload: Record<string, unknown> = {}
  if (data.type !== undefined) payload.type = data.type
  if (data.title !== undefined) payload.title = data.title
  if (data.summary !== undefined) payload.summary = data.summary
  if (data.details !== undefined) payload.details = data.details
  if (data.body !== undefined) payload.body = data.body
  if (data.status !== undefined) payload.status = data.status
  if (data.links !== undefined) payload.links = data.links
  if (data.video !== undefined) payload.video = data.video
  if (data.versionLabel !== undefined) payload.versionLabel = data.versionLabel
  if (data.tags !== undefined) payload.tags = data.tags
  if (Object.keys(payload).length === 0) return
  await ref.update(payload)
}

export async function getClientUpdateById(
  clientRef: string,
  updateId: string
): Promise<ClientUpdate | null> {
  const resolvedClientId = await resolveClientDocumentId(clientRef)
  if (!resolvedClientId) return null

  const db = getFirestoreDb()
  if (!db) return null
  const doc = await db.collection("clients").doc(resolvedClientId).collection("updates").doc(updateId).get()
  if (!doc.exists) return null
  return mapUpdateDoc(doc.id, doc.data()!)
}

export async function getClientWorkspace(
  clientRef: string
): Promise<ClientWorkspace | null> {
  const resolvedClientId = await resolveClientDocumentId(clientRef)
  if (!resolvedClientId) return null

  const db = getFirestoreDb()
  if (!db) return null

  const doc = await db.collection("clients").doc(resolvedClientId).collection("workspace").doc("state").get()
  if (!doc.exists) return null

  const parsed = clientWorkspaceSchema.safeParse(doc.data())
  return parsed.success ? parsed.data : null
}

export async function upsertClientWorkspace(
  clientRef: string,
  workspace: ClientWorkspace
): Promise<void> {
  const resolvedClientId = await resolveClientDocumentId(clientRef)
  if (!resolvedClientId) throw new Error("Client not found")

  const db = getFirestoreDb()
  if (!db) throw new Error("Firebase not initialized")

  const normalized = clientWorkspaceSchema.parse({
    ...workspace,
    updatedAt: new Date().toISOString(),
  })

  await db
    .collection("clients")
    .doc(resolvedClientId)
    .collection("workspace")
    .doc("state")
    .set(normalized, { merge: true })

  await db.collection("clients").doc(resolvedClientId).set(
    {
      updatedAt: normalized.updatedAt,
    },
    { merge: true }
  )
}

/** Create a new client document with baseline modules (for Add Client flow). */
export async function createClientDocument(
  data: Partial<ClientDirectoryEntry> & { name: string; storyId: string }
): Promise<string> {
  const db = getFirestoreDb()
  if (!db) throw new Error("Firebase not initialized")
  const ref = db.collection("clients").doc()
  const modules = data.modules ?? getDefaultModules()
  const githubRepos = collectClientGithubRepos({
    githubRepo: data.githubRepo,
    githubRepos: data.githubRepos,
  })
  const deployHosts = collectClientDeployHosts({
    deployUrl: data.deployUrl,
    deployHosts: data.deployHosts,
  })
  const primaryGithubRepo = parseRepoSlug(data.githubRepo ?? "") || githubRepos[0] || null
  const normalizedDeployUrl = data.deployUrl ?? null
  const normalizedPulseReport = data.pulseReport ? pulseReportSchema.safeParse(data.pulseReport) : null

  await ref.set({
    storyId: data.storyId,
    name: data.name,
    brands: data.brands ?? [],
    status: data.status ?? "onboarding",
    lastActivity: data.lastActivity ?? "Recently updated",
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    pulseSummary: data.pulseSummary ?? null,
    pulseReport: normalizedPulseReport?.success ? normalizedPulseReport.data : null,
    roleSuggestionSnapshot: data.roleSuggestionSnapshot ?? null,
    deployStatus: data.deployStatus ?? "building",
    deployUrl: normalizedDeployUrl,
    githubRepo: primaryGithubRepo,
    githubRepos,
    deployHosts,
    stripeStatus: data.stripeStatus ?? "pending",
    revenue: data.revenue ?? 0,
    meetings: data.meetings ?? 0,
    emails: data.emails ?? 0,
    commits: data.commits ?? 0,
    lastDeploy: data.lastDeploy ?? null,
    storyVideoUrl: data.storyVideoUrl ?? null,
    showOnFrontend: data.showOnFrontend ?? true,
    isNewStory: data.isNewStory ?? false,
    websiteUrl: data.websiteUrl ?? null,
    appUrl: data.appUrl ?? null,
    appStoreUrl: data.appStoreUrl ?? null,
    rdUrl: data.rdUrl ?? null,
    housingUrl: data.housingUrl ?? null,
    transportationUrl: data.transportationUrl ?? null,
    insuranceUrl: data.insuranceUrl ?? null,
    vercelProjectId: data.vercelProjectId ?? null,
    vercelProjectName: data.vercelProjectName ?? null,
    vercelProjectDomains: data.vercelProjectDomains ?? [],
    vercelProjectUpdatedAt: data.vercelProjectUpdatedAt ?? null,
    appStoreConnectAppId: data.appStoreConnectAppId ?? null,
    appStoreConnectName: data.appStoreConnectName ?? null,
    appStoreConnectBundleId: data.appStoreConnectBundleId ?? null,
    appStoreConnectPlatform: data.appStoreConnectPlatform ?? null,
    appStoreConnectSku: data.appStoreConnectSku ?? null,
    appStoreConnectVersionString: data.appStoreConnectVersionString ?? null,
    appStoreConnectBuildNumber: data.appStoreConnectBuildNumber ?? null,
    appStoreConnectBuildState: data.appStoreConnectBuildState ?? null,
    appStoreConnectBetaGroups: data.appStoreConnectBetaGroups ?? [],
    appStoreConnectUpdatedAt: data.appStoreConnectUpdatedAt ?? null,
    modules,
  })
  return ref.id
}

// Partner helpers
export async function getPartnerBySlug(slug: string): Promise<Partner | null> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot fetch partner')
    return null
  }
  const partnersRef = db.collection('partners')
  const snapshot = await partnersRef.where('slug', '==', slug).limit(1).get()
  
  if (snapshot.empty) {
    return null
  }
  
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as Partner
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot fetch partner')
    return null
  }
  const doc = await db.collection('partners').doc(id).get()
  
  if (!doc.exists) {
    return null
  }
  
  return { id: doc.id, ...doc.data() } as Partner
}

export async function getAllPartners(): Promise<Partner[]> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot fetch partners')
    return []
  }
  const snapshot = await db.collection('partners').orderBy('createdAt', 'desc').get()
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Partner))
}

// Contribution helpers
export async function createContribution(contribution: Omit<Contribution, 'id' | 'createdAt'>): Promise<string> {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error('Firebase not initialized - cannot create contribution')
  }
  const docRef = await db.collection('contributions').add({
    ...contribution,
    createdAt: new Date(),
  })
  return docRef.id
}

export async function getContributionBySessionId(sessionId: string): Promise<Contribution | null> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot fetch contribution')
    return null
  }
  const snapshot = await db.collection('contributions')
    .where('stripeSessionId', '==', sessionId)
    .limit(1)
    .get()
  
  if (snapshot.empty) {
    return null
  }
  
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as Contribution
}

export async function getContributionsByPartnerId(partnerId: string): Promise<Contribution[]> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot fetch contributions')
    return []
  }
  const snapshot = await db.collection('contributions')
    .where('partnerId', '==', partnerId)
    .orderBy('createdAt', 'desc')
    .get()
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contribution))
}

export async function getContributionsByPartnerSlug(partnerSlug: string): Promise<Contribution[]> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot fetch contributions')
    return []
  }
  const snapshot = await db.collection('contributions')
    .where('partnerSlug', '==', partnerSlug)
    .get()
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contribution))
}

// Seed Carlot partner if it doesn't exist
export async function ensureCarlotPartner(): Promise<void> {
  const db = getFirestoreDb()
  if (!db) {
    console.error('Firebase not initialized - cannot seed partner')
    return
  }
  const existing = await getPartnerBySlug('carlot')
  
  if (!existing) {
    await db.collection('partners').add({
      slug: 'carlot',
      name: 'Dorve Church Choir',
      contactName: 'Carlot Dorve',
      contactEmail: 'carlot@example.com',
      orgType: 'church_choir',
      createdAt: new Date(),
    })
    console.log('Created Carlot partner seed')
  }
}

export async function getAllClientDirectoryEntries(): Promise<ClientDirectoryEntry[]> {
  const db = getFirestoreDb()
  if (!db) {
    console.warn("Firebase not initialized - returning empty client list")
    return []
  }

  try {
    const snapshot = await db.collection("clients").orderBy("name", "asc").get()
    return snapshot.docs.map((doc) => mapClientDoc(doc.id, doc.data() as FirestoreClientDoc))
  } catch (orderError) {
    console.warn("Falling back to unordered clients query:", orderError)
    try {
      const snapshot = await db.collection("clients").get()
      return snapshot.docs.map((doc) => mapClientDoc(doc.id, doc.data() as FirestoreClientDoc))
    } catch (e) {
      console.warn("Failed to fetch clients:", e)
      return []
    }
  }
}

export async function getClientDirectoryEntryById(clientId: string): Promise<ClientDirectoryEntry | null> {
  const resolved = await getClientDocumentByRef(clientId)
  if (!resolved) return null

  return mapClientDoc(resolved.id, resolved.data)
}

export async function resolveClientDocumentId(clientRef: string): Promise<string | null> {
  const resolved = await getClientDocumentByRef(clientRef)
  return resolved?.id ?? null
}
