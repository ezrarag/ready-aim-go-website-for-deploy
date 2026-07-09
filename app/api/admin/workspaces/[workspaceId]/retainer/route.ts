import { type NextRequest, NextResponse } from "next/server"

import { extractActorKey, writeAuditLog } from "@/lib/audit-log"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import { normalizeWalletPool } from "@/lib/wallet-pools"

type Params = { params: Promise<{ workspaceId: string }> }

function readString(value: unknown, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const workspaceSnap = await db.collection("workspaces").doc(workspaceId).get()
    if (!workspaceSnap.exists) {
      return NextResponse.json({ success: false, error: "Workspace not found." }, { status: 404 })
    }

    const workspaceData = workspaceSnap.data() as Record<string, unknown>
    const clientId = readString(workspaceData.clientId)
    if (!clientId) {
      return NextResponse.json({ success: true, clientId: null, retainer: null, pools: [] })
    }

    const clientSnap = await db.collection("clients").doc(clientId).get()
    const clientData = (clientSnap.data() ?? {}) as Record<string, unknown>
    const poolSnap = await db.collection("walletPools").limit(100).get()

    return NextResponse.json({
      success: true,
      clientId,
      retainer: clientData.retainer ?? null,
      pools: poolSnap.docs.map((doc) => normalizeWalletPool(doc.id, doc.data() as Record<string, unknown>)),
    })
  } catch (error) {
    console.error("GET /api/admin/workspaces/[workspaceId]/retainer:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { workspaceId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const workspaceRef = db.collection("workspaces").doc(workspaceId)
    const workspaceSnap = await workspaceRef.get()
    if (!workspaceSnap.exists) {
      return NextResponse.json({ success: false, error: "Workspace not found." }, { status: 404 })
    }

    const workspaceData = workspaceSnap.data() as Record<string, unknown>
    const workspaceClientId = readString(workspaceData.clientId)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const clientId = readString(body.clientId) || workspaceClientId

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Link this workspace to a client before configuring retainer data." },
        { status: 400 }
      )
    }

    const amountTotal = Math.max(0, readNumber(body.amountTotal))
    const currency = (readString(body.currency) || "usd").toLowerCase()
    const source = readString(body.source) || "manual"
    const poolId = readString(body.poolId)
    const poolName = readString(body.poolName, 280)
    const active = body.active !== false

    if (!poolId) {
      return NextResponse.json({ success: false, error: "poolId is required." }, { status: 400 })
    }

    const clientRef = db.collection("clients").doc(clientId)
    const clientSnap = await clientRef.get()
    if (!clientSnap.exists) {
      return NextResponse.json({ success: false, error: "Client not found." }, { status: 404 })
    }

    const poolRef = db.collection("walletPools").doc(poolId)
    const poolSnap = await poolRef.get()
    if (!poolSnap.exists) {
      await poolRef.set({
        id: poolId,
        name: poolName || poolId,
        currency,
        active: true,
        notes: "Created from workspace retainer configuration.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    } else if (poolName) {
      await poolRef.set({ name: poolName, updatedAt: new Date().toISOString() }, { merge: true })
    }

    await clientRef.set(
      {
        retainer: {
          amountTotal,
          currency,
          source,
          poolId,
          active,
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )

    await writeAuditLog({
      collection: "clients",
      docId: clientId,
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: {
        operation: "workspace-retainer-config",
        workspaceId,
        retainer: { amountTotal, currency, source, poolId, active },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/admin/workspaces/[workspaceId]/retainer:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
