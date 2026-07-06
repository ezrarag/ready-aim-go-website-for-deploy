import type { NextRequest } from "next/server"

import type { Firestore } from "firebase-admin/firestore"

import { resolvePortalIdentity, type PortalIdentity } from "@/lib/portal-auth"

export type WorkspaceQuestionnaireAccess = {
  identity: PortalIdentity
  workspace: FirebaseFirestore.DocumentSnapshot
  workspaceData: Record<string, unknown>
}

export async function resolveWorkspaceQuestionnaireAccess(
  request: NextRequest,
  db: Firestore,
  workspaceId: string
): Promise<WorkspaceQuestionnaireAccess | null> {
  const identity = await resolvePortalIdentity(request)
  if (!identity) return null

  const workspace = await db.collection("workspaces").doc(workspaceId).get()
  if (!workspace.exists) return null

  const workspaceData = (workspace.data() as Record<string, unknown> | undefined) ?? {}
  const workspaceClientId =
    typeof workspaceData.clientId === "string" ? workspaceData.clientId.trim() : ""

  if (workspaceClientId && identity.clientIds.includes(workspaceClientId)) {
    return { identity, workspace, workspaceData }
  }

  const memberSnap = await db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("members")
    .doc(identity.uid)
    .get()

  if (!memberSnap.exists) return null
  return { identity, workspace, workspaceData }
}
