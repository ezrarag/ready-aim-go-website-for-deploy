import { getAdminDb } from "@/lib/firebase/admin"

export interface EmailMessagePayload {
  from: string
  to: string
  subject: string
  bodyText: string
  receivedAt?: string
  messageId?: string
}

export interface IngestedClientIntel {
  id: string
  clientId: string
  workspaceId: string | null
  fromEmail: string
  subject: string
  summary: string
  detectedMilestone: string | null
  paymentMentioned: boolean
  prototypeFeedbackMentioned: boolean
  receivedAt: string
}

/**
 * Ingests incoming client emails from haugabr2@uwm.edu or support@readyaimgo.biz,
 * matches them against active clients/contracts, and logs workspace intelligence.
 */
export async function processIncomingEmail(email: EmailMessagePayload): Promise<IngestedClientIntel> {
  const db = getAdminDb()
  const fromEmail = email.from.toLowerCase()
  const text = `${email.subject}\n${email.bodyText}`.toLowerCase()

  // 1. Identify Client Document based on sender email or subject keywords
  let clientId = "together-for-homes"
  let workspaceId: string | null = "together-for-homes-permit-dashboard"

  if (fromEmail.includes("1kfriends.org") || text.includes("together for homes") || text.includes("1000 friends")) {
    clientId = "together-for-homes"
    workspaceId = text.includes("permit") ? "together-for-homes-permit-dashboard" : "together-for-homes-site"
  } else if (fromEmail.includes("lamichoacanaplus") || text.includes("michoacana")) {
    clientId = "lamichoacanaplus"
    workspaceId = "lamichoacanaplus"
  }

  // 2. Intelligence detection rules
  const paymentMentioned = text.includes("paid") || text.includes("check") || text.includes("invoice") || text.includes("$") || text.includes("payment") || text.includes("zelle")
  const prototypeFeedbackMentioned = text.includes("prototype") || text.includes("design") || text.includes("feedback") || text.includes("review") || text.includes("staging")

  let detectedMilestone: string | null = null
  if (text.includes("signing") || text.includes("deposit") || text.includes("milestone 1")) {
    detectedMilestone = "1. Signing"
  } else if (text.includes("prototype") || text.includes("milestone 2")) {
    detectedMilestone = "2. Prototype delivery"
  } else if (text.includes("final") || text.includes("launch") || text.includes("milestone 3")) {
    detectedMilestone = "3. Final delivery"
  }

  const now = new Date().toISOString()
  const intelDoc: IngestedClientIntel = {
    id: `intel-${Date.now()}`,
    clientId,
    workspaceId,
    fromEmail: email.from,
    subject: email.subject,
    summary: email.bodyText.slice(0, 300),
    detectedMilestone,
    paymentMentioned,
    prototypeFeedbackMentioned,
    receivedAt: email.receivedAt || now,
  }

  // Log intelligence doc to client subcollection
  await db
    .collection("clients")
    .doc(clientId)
    .collection("email_intelligence")
    .doc(intelDoc.id)
    .set({
      ...intelDoc,
      createdAt: now,
    }, { merge: true })

  // Log audit timeline entry
  await db.collection("auditLogs").add({
    action: "email_intelligence_ingested",
    clientId,
    workspaceId,
    details: `Ingested email from ${email.from}: "${email.subject}" (Milestone: ${detectedMilestone || "None"})`,
    createdAt: now,
  })

  return intelDoc
}
