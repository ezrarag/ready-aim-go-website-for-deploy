import type { Firestore } from "firebase-admin/firestore"
import { getDefaultModules, type ClientModule, type ModuleKey } from "@/lib/client-directory"

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

function buildClientModules(current: Record<string, unknown>, enabledKeys: ModuleKey[]): Record<ModuleKey, ClientModule> {
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
  updates: { showOnFrontend?: boolean; publicUrl?: string | null; frontEndProducts?: ModuleKey[] }
) {
  const ref = db.collection("workspaces").doc(workspaceId)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new Error("Workspace not found")
  }

  const current = snap.data() as Record<string, unknown>
  const now = new Date().toISOString()
  const workspaceUpdates: Record<string, unknown> = { updatedAt: now }

  if (updates.showOnFrontend !== undefined) workspaceUpdates.showOnFrontend = updates.showOnFrontend
  if (updates.publicUrl !== undefined) workspaceUpdates.publicUrl = updates.publicUrl
  if (updates.frontEndProducts !== undefined) workspaceUpdates.frontEndProducts = updates.frontEndProducts

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
      if (updates.frontEndProducts !== undefined) {
        clientUpdates.modules = buildClientModules(clientCurrent, updates.frontEndProducts)
      }
      await clientRef.update(clientUpdates)
      clientMirrored = true
    }
  }

  return {
    id: workspaceId,
    clientId,
    showOnFrontend:
      updates.showOnFrontend !== undefined
        ? updates.showOnFrontend
        : current.showOnFrontend === true,
    publicUrl:
      updates.publicUrl !== undefined
        ? updates.publicUrl
        : readString(current.publicUrl),
    frontEndProducts:
      updates.frontEndProducts !== undefined
        ? updates.frontEndProducts
        : readModuleKeys(current.frontEndProducts),
    updatedAt: now,
    clientMirrored,
  }
}
