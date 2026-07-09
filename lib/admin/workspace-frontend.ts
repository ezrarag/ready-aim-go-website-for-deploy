import { FieldValue, type Firestore } from "firebase-admin/firestore"
import { getDefaultModules, type ClientModule, type ModuleKey } from "@/lib/client-directory"
import {
  buildSubscriptionsFromActiveProducts,
  getActiveProductKeys,
  getProductsForModuleKeys,
  normalizeClientSubscriptions,
} from "@/lib/admin/products"

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function getSuggestedWorkspacePublicUrl(data: Record<string, unknown>): string | null {
  const vercelProjects = Array.isArray(data.vercelProjects) ? data.vercelProjects : []
  for (const project of vercelProjects) {
    const url = readString((project as Record<string, unknown>).url)
    if (url) return url
  }
  return readString(data.deployUrl)
}

const MODULE_KEYS: ModuleKey[] = ["web", "app", "rd", "housing", "transportation", "insurance"]

function readModuleKeys(value: unknown): ModuleKey[] {
  return Array.isArray(value)
    ? value.filter((item): item is ModuleKey => typeof item === "string" && MODULE_KEYS.includes(item as ModuleKey))
    : []
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : []
}

function normalizePreviewUrl(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function asClientModule(value: unknown, fallback: ClientModule): ClientModule {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    return {
      enabled: typeof record.enabled === "boolean" ? record.enabled : fallback.enabled,
      overview: typeof record.overview === "string" ? record.overview : fallback.overview,
      links: record.links && typeof record.links === "object" && !Array.isArray(record.links)
        ? (record.links as Record<string, string>)
        : fallback.links,
      metrics: record.metrics && typeof record.metrics === "object" && !Array.isArray(record.metrics)
        ? (record.metrics as Record<string, unknown>)
        : fallback.metrics,
    }
  }
  return fallback
}

export function buildClientModules(current: Record<string, unknown>, enabledKeys: ModuleKey[]): Record<ModuleKey, ClientModule> {
  const defaults = getDefaultModules()
  const currentModules = current.modules && typeof current.modules === "object" && !Array.isArray(current.modules)
    ? (current.modules as Record<string, unknown>)
    : {}

  const enabled = new Set(enabledKeys)
  return MODULE_KEYS.reduce((modules, key) => {
    const base = asClientModule(currentModules[key], defaults[key])
    modules[key] = { ...base, enabled: enabled.has(key) }
    return modules
  }, {} as Record<ModuleKey, ClientModule>)
}

export async function updateWorkspaceFrontEndSettings(
  db: Firestore,
  workspaceId: string,
  updates: {
    name?: string
    showOnFrontend?: boolean
    publicUrl?: string | null
    previewImageUrl?: string | null
    frontEndProducts?: ModuleKey[]
    frontEndTags?: string[]
  }
) {
  const ref = db.collection("workspaces").doc(workspaceId)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new Error("Workspace not found")
  }

  const current = snap.data() as Record<string, unknown>
  const now = new Date().toISOString()
  const workspaceUpdates: Record<string, unknown> = { updatedAt: now }

  if (updates.name !== undefined) workspaceUpdates.name = updates.name.trim() || workspaceId
  if (updates.showOnFrontend !== undefined) workspaceUpdates.showOnFrontend = updates.showOnFrontend
  if (updates.publicUrl !== undefined) workspaceUpdates.publicUrl = updates.publicUrl
  if (updates.previewImageUrl !== undefined) workspaceUpdates.previewImageUrl = normalizePreviewUrl(updates.previewImageUrl)
  if (updates.frontEndProducts !== undefined) workspaceUpdates.frontEndProducts = updates.frontEndProducts
  if (updates.frontEndTags !== undefined) workspaceUpdates.frontEndTags = updates.frontEndTags

  await ref.update(workspaceUpdates)

  const clientId = readString(current.clientId)
  let clientMirrored = false

  if (clientId) {
    const clientRef = db.collection("clients").doc(clientId)
    const clientSnap = await clientRef.get()
    if (clientSnap.exists) {
      const clientCurrent = (clientSnap.data() as Record<string, unknown>) || {}
      const clientUpdates: Record<string, unknown> = { updatedAt: now }
      if (updates.showOnFrontend !== undefined) clientUpdates.showOnFrontend = updates.showOnFrontend
      if (updates.publicUrl !== undefined) clientUpdates.websiteUrl = updates.publicUrl
      if (updates.previewImageUrl !== undefined) clientUpdates.appUrl = normalizePreviewUrl(updates.previewImageUrl)
      if (updates.frontEndProducts !== undefined) {
        clientUpdates.modules = buildClientModules(clientCurrent, updates.frontEndProducts)
        const inferredProducts = getProductsForModuleKeys(updates.frontEndProducts)
        const currentActiveProducts = getActiveProductKeys(normalizeClientSubscriptions(clientCurrent))
        const preservedUnmappedProducts = currentActiveProducts.filter((product) => product === "cohort")
        clientUpdates.subscriptions = buildSubscriptionsFromActiveProducts(
          clientCurrent,
          Array.from(new Set([...inferredProducts, ...preservedUnmappedProducts]))
        )
      }
      if (updates.frontEndTags !== undefined) clientUpdates.brands = updates.frontEndTags
      await clientRef.update(clientUpdates)
      clientMirrored = true
    }
  }

  return {
    id: workspaceId,
    clientId,
    name: updates.name !== undefined ? updates.name.trim() || workspaceId : readString(current.name) || workspaceId,
    showOnFrontend:
      updates.showOnFrontend !== undefined
        ? updates.showOnFrontend
        : current.showOnFrontend === true,
    publicUrl:
      updates.publicUrl !== undefined
        ? updates.publicUrl
        : readString(current.publicUrl),
    previewImageUrl:
      updates.previewImageUrl !== undefined
        ? normalizePreviewUrl(updates.previewImageUrl) ?? null
        : readString(current.previewImageUrl),
    frontEndProducts:
      updates.frontEndProducts !== undefined
        ? updates.frontEndProducts
        : readModuleKeys(current.frontEndProducts),
    frontEndTags:
      updates.frontEndTags !== undefined
        ? updates.frontEndTags
        : readStringArray(current.frontEndTags),
    updatedAt: now,
    clientMirrored,
  }
}

export async function relinkWorkspaceClient(
  db: Firestore,
  workspaceId: string,
  nextClientId: string | null,
  setCanonicalForClient = false
) {
  const workspaceRef = db.collection("workspaces").doc(workspaceId)
  const workspaceSnap = await workspaceRef.get()
  if (!workspaceSnap.exists) throw new Error("Workspace not found")

  const workspaceData = workspaceSnap.data() as Record<string, unknown>
  const previousClientId = readString(workspaceData.clientId)
  const normalizedClientId = nextClientId?.trim() || null
  const now = new Date().toISOString()

  if (normalizedClientId) {
    const clientSnap = await db.collection("clients").doc(normalizedClientId).get()
    if (!clientSnap.exists) throw new Error(`Client "${normalizedClientId}" not found.`)
  }

  const updates: Record<string, unknown> = { slug: workspaceId, updatedAt: now }
  if (normalizedClientId) updates.clientId = normalizedClientId
  else updates.clientId = FieldValue.delete()
  await workspaceRef.set(updates, { merge: true })

  if (previousClientId && previousClientId !== normalizedClientId) {
    const previousClientRef = db.collection("clients").doc(previousClientId)
    const previousClientSnap = await previousClientRef.get()
    if (previousClientSnap.exists) {
      const previousClientData = previousClientSnap.data() as Record<string, unknown>
      if (readString(previousClientData.workspaceId) === workspaceId) {
        await previousClientRef.set(
          {
            workspaceId: FieldValue.delete(),
            updatedAt: now,
          },
          { merge: true }
        )
      }
    }
  }

  if (normalizedClientId && setCanonicalForClient) {
    await db.collection("clients").doc(normalizedClientId).set(
      {
        workspaceId,
        updatedAt: now,
      },
      { merge: true }
    )
  }

  return {
    workspaceId,
    previousClientId,
    clientId: normalizedClientId,
    canonicalUpdated: Boolean(normalizedClientId && setCanonicalForClient),
    updatedAt: now,
  }
}
