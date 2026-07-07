import { FieldValue, type Firestore } from "firebase-admin/firestore"

export function readAdminString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function readAdminStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

export function safeProjectDocId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180)
}

export async function healWorkspaceChildClientIds(
  db: Firestore,
  workspaceId: string,
  clientId: string
) {
  const collections = ["projects", "contracts"] as const
  const now = new Date().toISOString()
  const healed: Record<(typeof collections)[number], string[]> = {
    projects: [],
    contracts: [],
  }

  for (const collectionName of collections) {
    const snapshot = await db
      .collection(collectionName)
      .where("workspaceId", "==", workspaceId)
      .get()

    let batch = db.batch()
    let batchWrites = 0

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Record<string, unknown>
      if (readAdminString(data.clientId)) continue

      batch.set(
        docSnap.ref,
        {
          clientId,
          clientIdHealedFromWorkspaceId: workspaceId,
          clientIdHealedAt: now,
          updatedAt: now,
        },
        { merge: true }
      )
      healed[collectionName].push(docSnap.id)
      batchWrites += 1

      if (batchWrites >= 450) {
        await batch.commit()
        batch = db.batch()
        batchWrites = 0
      }
    }

    if (batchWrites > 0) {
      await batch.commit()
    }
  }

  return {
    total: healed.projects.length + healed.contracts.length,
    ...healed,
  }
}

export async function attachProjectToWorkspace(
  db: Firestore,
  workspaceId: string,
  projectId: string
) {
  await db.collection("workspaces").doc(workspaceId).set(
    {
      projectIds: FieldValue.arrayUnion(projectId),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  )
}
