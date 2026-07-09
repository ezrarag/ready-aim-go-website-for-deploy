import { type NextRequest, NextResponse } from "next/server"

import { extractActorKey, writeAuditLog } from "@/lib/audit-log"
import { getFirestoreDb, getStorageBucket } from "@/lib/firestore"
import { buildDefaultInvoiceFromContract } from "@/lib/invoice-service"
import { isInternalMutationAuthorized, isInternalReadAuthorized } from "@/lib/internal-api-auth"
import type { ExtractedContractMilestone } from "@/lib/types/contracts"

type Params = { params: Promise<{ contractId: string }> }

function readString(value: unknown, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function readNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]+/g, ""))
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function readNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  return readNumber(value)
}

function readMilestones(value: unknown): ExtractedContractMilestone[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    const label = readString(record.label, 280)
    if (!label) return []
    const triggerType = readString(record.triggerType, 40)
    return [{
      label,
      amount: readNumber(record.amount),
      triggerType:
        triggerType === "signing" || triggerType === "delivery" || triggerType === "manual"
          ? triggerType
          : "manual",
    }]
  })
}

function addDaysIso(days: number | null) {
  const date = new Date()
  if (typeof days === "number" && Number.isFinite(days) && days > 0) {
    date.setDate(date.getDate() + days)
  }
  return date.toISOString()
}

function toCents(amount: number) {
  return Math.max(0, Math.round(amount * 100))
}

export async function GET(request: NextRequest, context: Params) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { contractId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const doc = await db.collection("contracts").doc(contractId).get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Contract not found." }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { id: doc.id, ...(doc.data() ?? {}) } })
  } catch (error) {
    console.error("GET /api/contracts/[contractId]:", error)
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
    const { contractId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const ref = db.collection("contracts").doc(contractId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Contract not found." }, { status: 404 })
    }

    const contentType = request.headers.get("content-type") || ""
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const file = form.get("file")
      if (file instanceof Blob && "name" in file && file.size > 0) {
        const bucket = getStorageBucket()
        if (!bucket) {
          return NextResponse.json({ success: false, error: "Storage not configured" }, { status: 503 })
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-")
        const storagePath = `contracts/${contractId}/${Date.now()}-${safeName}`
        await bucket.file(storagePath).save(Buffer.from(await file.arrayBuffer()), {
          metadata: { contentType: file.type || "application/octet-stream" },
        })
        await bucket.file(storagePath).makePublic()
        patch.fileUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`
        patch.attachmentUrl = patch.fileUrl
        patch.storagePath = storagePath
      }
      if (form.has("status")) patch.status = readString(form.get("status"), 120) || "draft"
      if (form.has("title")) patch.title = readString(form.get("title"), 280)
      if (form.has("notes")) patch.notes = readString(form.get("notes"), 12000) || null
    } else {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
      if ("title" in body) patch.title = readString(body.title, 280)
      if ("status" in body) patch.status = readString(body.status, 120) || "draft"
      if ("type" in body) patch.type = readString(body.type, 120) || null
      if ("notes" in body) patch.notes = readString(body.notes, 12000) || null
      if ("attachmentUrl" in body) patch.attachmentUrl = readString(body.attachmentUrl, 2000) || null
      if ("fileUrl" in body) patch.fileUrl = readString(body.fileUrl, 2000) || null
      if ("clientId" in body) patch.clientId = readString(body.clientId, 240) || null
      if ("workspaceId" in body) patch.workspaceId = readString(body.workspaceId, 240) || null
      if ("payerEntity" in body) patch.payerEntity = readString(body.payerEntity, 280)
      if ("payerContact" in body) patch.payerContact = readString(body.payerContact, 800)
      if ("contractorName" in body) patch.contractorName = readString(body.contractorName, 280)
      if ("totalFee" in body) patch.totalFee = readNumber(body.totalFee)
      if ("currency" in body) patch.currency = readString(body.currency, 24).toLowerCase() || "usd"
      if ("paymentTermsDays" in body) patch.paymentTermsDays = readNullableNumber(body.paymentTermsDays)
      if ("deadlineDate" in body) patch.deadlineDate = readString(body.deadlineDate, 80) || null
      if ("milestones" in body) patch.milestones = readMilestones(body.milestones)

      if (body.confirm === true) {
        const current = (snap.data() ?? {}) as Record<string, unknown>
        if ((current.status === "confirmed") || Array.isArray(current.createdInvoiceIds)) {
          return NextResponse.json({ success: false, error: "Contract already confirmed." }, { status: 409 })
        }

        const clientId = readString(("clientId" in patch ? patch.clientId : current.clientId), 240)
        const workspaceId = readString(("workspaceId" in patch ? patch.workspaceId : current.workspaceId), 240)
        const title = readString(("title" in patch ? patch.title : current.title), 280) || "Contract invoice"
        const payerEntity = readString(("payerEntity" in patch ? patch.payerEntity : current.payerEntity), 280)
        const payerContact = readString(("payerContact" in patch ? patch.payerContact : current.payerContact), 800)
        const contractorName = readString(("contractorName" in patch ? patch.contractorName : current.contractorName), 280) || "ReadyAimGo"
        const currency = readString(("currency" in patch ? patch.currency : current.currency), 24).toLowerCase() || "usd"
        const paymentTermsDays = readNullableNumber("paymentTermsDays" in patch ? patch.paymentTermsDays : current.paymentTermsDays)
        const deadlineDate = readString(("deadlineDate" in patch ? patch.deadlineDate : current.deadlineDate), 80) || null
        const totalFee = readNumber("totalFee" in patch ? patch.totalFee : current.totalFee)
        let milestones = "milestones" in patch ? readMilestones(patch.milestones) : readMilestones(current.milestones)

        if (!clientId) {
          return NextResponse.json({ success: false, error: "Pick a client before confirming." }, { status: 400 })
        }

        if (milestones.length === 0 && totalFee > 0) {
          milestones = [{ label: "Contract milestone", amount: totalFee, triggerType: "manual" }]
          patch.milestones = milestones
        }

        if (milestones.length === 0) {
          return NextResponse.json({ success: false, error: "Add at least one milestone before confirming." }, { status: 400 })
        }

        const invoiceCollection = db.collection("clients").doc(clientId).collection("invoices")
        const invoiceIds: string[] = []
        const now = new Date().toISOString()
        const issueDate = now
        const dueDate = deadlineDate || addDaysIso(paymentTermsDays)

        for (const [index, milestone] of milestones.entries()) {
          const invoiceRef = invoiceCollection.doc()
          const invoice = buildDefaultInvoiceFromContract({
            clientId,
            workspaceId,
            contractId,
            templateId: "contract_milestone",
            title: `${title} — ${milestone.label}`,
            amountCents: toCents(milestone.amount),
            billingPeriod: milestone.triggerType,
            issueDate,
            dueDate,
            from: {
              name: contractorName,
              company: contractorName,
              address: "Milwaukee, WI",
              email: "support@readyaimgo.biz",
            },
            billTo: {
              name: payerEntity || "",
              company: payerEntity || "",
              address: "",
              email: payerContact || "",
            },
            description: milestone.label,
          })

          await invoiceRef.set({
            ...invoice,
            status: "draft",
            milestoneIndex: index,
            milestoneLabel: milestone.label,
            createdAt: now,
            updatedAt: now,
            currency,
          })
          invoiceIds.push(invoiceRef.id)
        }

        patch.status = "confirmed"
        patch.confirmedAt = now
        patch.createdInvoiceIds = invoiceIds
      }
    }

    await ref.set(patch, { merge: true })

    await writeAuditLog({
      collection: "contracts",
      docId: contractId,
      action: "update",
      actorKey: extractActorKey(request.headers.get("authorization")),
      payload: patch,
    })

    const refreshed = await ref.get()
    return NextResponse.json({ success: true, data: { id: refreshed.id, ...(refreshed.data() ?? {}) } })
  } catch (error) {
    console.error("PATCH /api/contracts/[contractId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { contractId } = await context.params
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    const ref = db.collection("contracts").doc(contractId)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Contract not found." }, { status: 404 })
    }

    const data = snap.data() as Record<string, unknown>
    const storagePath = readString(data.storagePath, 2000)
    if (storagePath) {
      const bucket = getStorageBucket()
      await bucket?.file(storagePath).delete().catch(() => null)
    }

    await ref.delete()

    await writeAuditLog({
      collection: "contracts",
      docId: contractId,
      action: "delete",
      actorKey: extractActorKey(request.headers.get("authorization")),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/contracts/[contractId]:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
