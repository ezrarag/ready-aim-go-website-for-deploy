import type { Firestore } from "firebase-admin/firestore"

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

export async function updateWorkspaceFrontEndSettings(
  db: Firestore,
  workspaceId: string,
  updates: { showOnFrontend?: boolean; publicUrl?: string | null }
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

  await ref.update(workspaceUpdates)

  const clientId = readString(current.clientId)
  let clientMirrored = false

  if (clientId) {
    const clientRef = db.collection("clients").doc(clientId)
    const clientSnap = await clientRef.get()
    if (clientSnap.exists) {
      const clientUpdates: Record<string, unknown> = { updatedAt: now }
      if (updates.showOnFrontend !== undefined) clientUpdates.showOnFrontend = updates.showOnFrontend
      if (updates.publicUrl !== undefined) clientUpdates.websiteUrl = updates.publicUrl
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
    updatedAt: now,
    clientMirrored,
  }
}
