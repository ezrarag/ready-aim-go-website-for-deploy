import type { Firestore } from "firebase-admin/firestore"

import { type ModuleKey } from "@/lib/client-directory"
import {
  buildSubscriptionsFromActiveProducts,
  getModuleKeysForProducts,
  type AdminProductKey,
} from "@/lib/admin/products"
import { buildClientModules } from "@/lib/admin/workspace-frontend"

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export async function syncClientProductSelections(
  db: Firestore,
  input: {
    clientId: string
    activeProducts: AdminProductKey[]
    workspaceId?: string | null
  }
) {
  const clientRef = db.collection("clients").doc(input.clientId)
  const clientSnap = await clientRef.get()
  if (!clientSnap.exists) {
    throw new Error(`Client "${input.clientId}" not found.`)
  }

  const clientData = (clientSnap.data() as Record<string, unknown>) || {}
  const now = new Date().toISOString()
  const frontEndProducts = getModuleKeysForProducts(input.activeProducts)
  const resolvedWorkspaceId =
    input.workspaceId?.trim() || readString(clientData.workspaceId)

  await clientRef.set(
    {
      modules: buildClientModules(clientData, frontEndProducts),
      subscriptions: buildSubscriptionsFromActiveProducts(clientData, input.activeProducts),
      updatedAt: now,
    },
    { merge: true }
  )

  if (resolvedWorkspaceId) {
    await db.collection("workspaces").doc(resolvedWorkspaceId).set(
      {
        frontEndProducts,
        updatedAt: now,
      },
      { merge: true }
    )
  }

  return {
    clientId: input.clientId,
    workspaceId: resolvedWorkspaceId ?? null,
    activeProducts: input.activeProducts,
    frontEndProducts: frontEndProducts as ModuleKey[],
    updatedAt: now,
  }
}
