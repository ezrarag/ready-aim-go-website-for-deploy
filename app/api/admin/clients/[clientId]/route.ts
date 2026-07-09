import { type NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getFirestoreDb } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { writeAuditLog, extractActorKey } from "@/lib/audit-log"
import { normalizePhoneToE164 } from "@/lib/telnyx"
import { readAdminProductKeys } from "@/lib/admin/products"
import { syncClientProductSelections } from "@/lib/admin/client-product-sync"

type Params = { params: Promise<{ clientId: string }> }

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

// GET /api/admin/clients/[clientId]
export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { clientId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("clients").doc(clientId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: serializeFirestoreDocument(doc.id, doc.data()) })
  } catch (err) {
    console.error("GET /api/admin/clients/[clientId]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/clients/[clientId]
export async function PATCH(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { clientId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const body = (await request.json()) as Record<string, unknown>
    const patch = { ...body, updatedAt: new Date().toISOString() }
    const activeProducts = readAdminProductKeys(body.activeProducts)
    if (typeof patch.phone === "string") {
      patch.phone = normalizePhoneToE164(patch.phone) || ""
    }
    // Strip protected fields from caller payload
    delete patch.id
    delete patch.createdAt
    delete patch.subscriptions
    delete patch.activeProducts

    const ref = db.collection("clients").doc(clientId)
    const existing = await ref.get()
    if (!existing.exists) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    const currentData = existing.data() as Record<string, unknown>
    const currentWorkspaceId = readString(currentData.workspaceId)
    const requestedWorkspaceId =
      body.workspaceId === null ? null : readString(body.workspaceId)

    if ("workspaceId" in body) {
      if (requestedWorkspaceId) {
        const workspaceRef = db.collection("workspaces").doc(requestedWorkspaceId)
        const workspaceSnap = await workspaceRef.get()
        if (!workspaceSnap.exists) {
          return NextResponse.json(
            { success: false, error: `Workspace "${requestedWorkspaceId}" not found.` },
            { status: 404 }
          )
        }
        const workspaceData = workspaceSnap.data() as Record<string, unknown>
        const linkedClientId = readString(workspaceData.clientId)
        if (linkedClientId && linkedClientId !== clientId) {
          return NextResponse.json(
            {
              success: false,
              error: `Workspace "${requestedWorkspaceId}" is already linked to client "${linkedClientId}".`,
            },
            { status: 409 }
          )
        }
      }
      patch.workspaceId = requestedWorkspaceId
    }

    await ref.update(patch)

    if (activeProducts !== undefined) {
      await syncClientProductSelections(db, {
        clientId,
        activeProducts,
        workspaceId: requestedWorkspaceId ?? currentWorkspaceId,
      })
    }

    if ("workspaceId" in body) {
      if (currentWorkspaceId && currentWorkspaceId !== requestedWorkspaceId) {
        await db.collection("workspaces").doc(currentWorkspaceId).set(
          {
            clientId: FieldValue.delete(),
            updatedAt: patch.updatedAt,
          },
          { merge: true }
        )
      }

      if (requestedWorkspaceId) {
        await db.collection("workspaces").doc(requestedWorkspaceId).set(
          {
            clientId,
            ...(typeof body.name === "string" && body.name.trim() ? { name: body.name.trim() } : {}),
            updatedAt: patch.updatedAt,
          },
          { merge: true }
        )
      }
    }

    if (typeof patch.phone === "string") {
      await db.collection("clientComms").doc(clientId).set(
        {
          clientId,
          phone: patch.phone,
          updatedAt: patch.updatedAt,
        },
        { merge: true }
      )
    }

    await writeAuditLog({
      collection: "clients",
      docId: clientId,
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: patch,
    })

    const updated = await ref.get()
    return NextResponse.json({ success: true, data: serializeFirestoreDocument(updated.id, updated.data()) })
  } catch (err) {
    console.error("PATCH /api/admin/clients/[clientId]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/clients/[clientId] — soft-delete via status: "archived"
export async function DELETE(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { clientId } = await context.params

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const ref = db.collection("clients").doc(clientId)
    const existing = await ref.get()
    if (!existing.exists) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 })
    }

    const now = new Date().toISOString()
    const data = existing.data() as Record<string, unknown>
    const workspaceId = readString(data.workspaceId)

    await ref.update({ status: "archived", updatedAt: now })

    if (workspaceId) {
      await db.collection("workspaces").doc(workspaceId).set(
        {
          clientId: FieldValue.delete(),
          updatedAt: now,
        },
        { merge: true }
      )
    }

    const reposSnap = await db.collection("repos").where("clientId", "==", clientId).limit(200).get()
    if (!reposSnap.empty) {
      const batch = db.batch()
      for (const doc of reposSnap.docs) {
        batch.set(
          doc.ref,
          {
            archivedClientId: clientId,
            clientId: FieldValue.delete(),
            updatedAt: now,
          },
          { merge: true }
        )
      }
      await batch.commit()
    }

    await writeAuditLog({
      collection: "clients",
      docId: clientId,
      action: "archive",
      actorKey: extractActorKey(request.headers.get("authorization")),
    })

    return NextResponse.json({ success: true, data: { id: clientId, status: "archived", workspaceUnlinked: Boolean(workspaceId) } })
  } catch (err) {
    console.error("DELETE /api/admin/clients/[clientId]:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
