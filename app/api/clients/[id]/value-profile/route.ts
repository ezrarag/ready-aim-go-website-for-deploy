import { type NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import Stripe from "stripe"

import {
  getClientDirectoryEntryById,
  getFirestoreDb,
  resolveClientDocumentId,
} from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { normalizeRAGService, RAG_SERVICES_COLLECTION } from "@/lib/rag-services"
import {
  VALUE_PROFILE_COLLECTION,
  VALUE_PROFILE_PAYMENTS_COLLECTION,
  VALUE_PROFILE_STATE_DOC,
  computeInfrastructureCostAttribution,
  computeNewlyUnlockedDeliverables,
  computeUnlockedDeliverables,
  getCurrentThreshold,
  normalizeValuePaymentRecord,
  normalizeValueProfile,
  normalizeValueThresholds,
  uniqueStrings,
  type ValuePaymentRecord,
  type ValueProfile,
} from "@/lib/value-profile"

export const dynamic = "force-dynamic"

const STRIPE_API_VERSION = "2025-06-30.basil"

function getValueProfileRef(db: FirebaseFirestore.Firestore, clientId: string) {
  return db
    .collection("clients")
    .doc(clientId)
    .collection(VALUE_PROFILE_COLLECTION)
    .doc(VALUE_PROFILE_STATE_DOC)
}

function stripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
  })
}

function escapeStripeSearchValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
}

function stripeIntentToPayment(intent: Stripe.PaymentIntent): ValuePaymentRecord {
  return {
    id: intent.id,
    amount: (intent.amount_received || intent.amount || 0) / 100,
    currency: intent.currency || "usd",
    status: intent.status,
    source: "stripe",
    description: intent.description || intent.metadata?.purpose || "Stripe payment",
    clientEmail: intent.receipt_email || intent.metadata?.clientEmail || undefined,
    stripePaymentIntentId: intent.id,
    createdAt: new Date(intent.created * 1000).toISOString(),
  }
}

async function getLiveStripePaymentHistory({
  clientId,
  profile,
}: {
  clientId: string
  profile: ValueProfile
}): Promise<{ payments: ValuePaymentRecord[]; error?: string }> {
  const stripe = stripeClient()
  if (!stripe) return { payments: [] }

  try {
    const payments: ValuePaymentRecord[] = []

    if (profile.stripeCustomerId) {
      const byCustomer = await stripe.paymentIntents.list({
        customer: profile.stripeCustomerId,
        limit: 20,
      })
      payments.push(...byCustomer.data.map(stripeIntentToPayment))
    }

    const byMetadata = await stripe.paymentIntents.search({
      query: `metadata['clientId']:'${escapeStripeSearchValue(clientId)}'`,
      limit: 20,
    })
    payments.push(...byMetadata.data.map(stripeIntentToPayment))

    return { payments }
  } catch (error) {
    console.warn("Unable to load Stripe payment history:", error)
    return {
      payments: [],
      error: error instanceof Error ? error.message : "Unable to load Stripe payment history.",
    }
  }
}

function mergePaymentHistory(payments: ValuePaymentRecord[]) {
  const merged = new Map<string, ValuePaymentRecord>()

  for (const payment of payments) {
    const key = payment.stripePaymentIntentId || payment.stripeCheckoutSessionId || payment.id
    if (!merged.has(key)) {
      merged.set(key, payment)
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0
    return rightTime - leftTime
  })
}

async function getOrCreateValueProfile(
  db: FirebaseFirestore.Firestore,
  clientId: string
) {
  const profileRef = getValueProfileRef(db, clientId)
  const snapshot = await profileRef.get()

  if (!snapshot.exists) {
    await profileRef.set({
      clientId,
      totalPaid: 0,
      currency: "usd",
      thresholds: [],
      unlockedDeliverables: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  const nextSnapshot = snapshot.exists ? snapshot : await profileRef.get()
  return normalizeValueProfile(
    clientId,
    (nextSnapshot.data() ?? {}) as Record<string, unknown>
  )
}

async function getFirestorePayments(
  db: FirebaseFirestore.Firestore,
  clientId: string
) {
  const snapshot = await getValueProfileRef(db, clientId)
    .collection(VALUE_PROFILE_PAYMENTS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get()

  return snapshot.docs.map((doc) =>
    normalizeValuePaymentRecord(doc.id, (doc.data() ?? {}) as Record<string, unknown>)
  )
}

async function writeUnlockedDeliverablesToProjects(
  db: FirebaseFirestore.Firestore,
  clientId: string,
  deliverables: string[]
) {
  if (deliverables.length === 0) return

  const refs = new Map<string, FirebaseFirestore.DocumentReference>()
  const directRef = db.collection("projects").doc(clientId)
  const directSnapshot = await directRef.get()
  if (directSnapshot.exists) refs.set(directRef.path, directRef)

  const querySnapshot = await db
    .collection("projects")
    .where("clientId", "==", clientId)
    .get()

  for (const doc of querySnapshot.docs) {
    refs.set(doc.ref.path, doc.ref)
  }

  if (refs.size === 0) return

  const batch = db.batch()
  for (const ref of refs.values()) {
    batch.set(
      ref,
      {
        deliverables: FieldValue.arrayUnion(...deliverables),
        unlockedDeliverables: FieldValue.arrayUnion(...deliverables),
        valueProfileUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  }
  await batch.commit()
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const db = getFirestoreDb()
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized." },
        { status: 503 }
      )
    }

    const params = await context.params
    const requestedClientId = params.id
    const resolvedClientId = await resolveClientDocumentId(requestedClientId)
    if (!resolvedClientId) {
      return NextResponse.json({ success: false, error: "Client not found." }, { status: 404 })
    }

    const client = await getClientDirectoryEntryById(resolvedClientId)
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found." }, { status: 404 })
    }

    const profile = await getOrCreateValueProfile(db, resolvedClientId)
    const servicesSnapshot = await db.collection(RAG_SERVICES_COLLECTION).get()
    const services = servicesSnapshot.docs.map((doc) =>
      normalizeRAGService(doc.id, (doc.data() ?? {}) as Record<string, unknown>)
    )
    const infrastructureCosts = computeInfrastructureCostAttribution(services, {
      id: client.id,
      storyId: client.storyId,
      name: client.name,
      brands: client.brands,
    })
    const firestorePayments = await getFirestorePayments(db, resolvedClientId)
    const stripeHistory = await getLiveStripePaymentHistory({
      clientId: resolvedClientId,
      profile,
    })

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        storyId: client.storyId,
        name: client.name,
        brands: client.brands,
      },
      profile,
      infrastructureCosts,
      infrastructureMonthlyTotal: infrastructureCosts.reduce(
        (total, item) => total + item.attributedMonthlyCost,
        0
      ),
      payments: mergePaymentHistory([...firestorePayments, ...stripeHistory.payments]),
      stripeError: stripeHistory.error,
    })
  } catch (error) {
    console.error("Value profile GET error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to load value profile.",
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Firebase not initialized." },
        { status: 503 }
      )
    }

    const body = (await request.json()) as Record<string, unknown>
    if (!Array.isArray(body.thresholds)) {
      return NextResponse.json(
        { success: false, error: "thresholds must be an array." },
        { status: 400 }
      )
    }

    const params = await context.params
    const resolvedClientId = await resolveClientDocumentId(params.id)
    if (!resolvedClientId) {
      return NextResponse.json({ success: false, error: "Client not found." }, { status: 404 })
    }

    const profileRef = getValueProfileRef(db, resolvedClientId)
    const existingSnapshot = await profileRef.get()
    const existingProfile = normalizeValueProfile(
      resolvedClientId,
      (existingSnapshot.data() ?? {}) as Record<string, unknown>
    )
    const thresholds = normalizeValueThresholds(body.thresholds)
    const nextUnlocked = uniqueStrings([
      ...existingProfile.unlockedDeliverables,
      ...computeUnlockedDeliverables(thresholds, existingProfile.totalPaid),
    ])
    const newlyUnlocked = computeNewlyUnlockedDeliverables(
      existingProfile.unlockedDeliverables,
      nextUnlocked
    )
    const currentThreshold = getCurrentThreshold(thresholds, existingProfile.totalPaid)

    await profileRef.set(
      {
        clientId: resolvedClientId,
        currency: existingProfile.currency,
        totalPaid: existingProfile.totalPaid,
        thresholds,
        unlockedDeliverables: nextUnlocked,
        currentThresholdId: currentThreshold?.id ?? null,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: existingSnapshot.exists
          ? existingSnapshot.data()?.createdAt ?? FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    await writeUnlockedDeliverablesToProjects(db, resolvedClientId, newlyUnlocked)

    const updatedSnapshot = await profileRef.get()
    const profile = normalizeValueProfile(
      resolvedClientId,
      (updatedSnapshot.data() ?? {}) as Record<string, unknown>
    )

    return NextResponse.json({
      success: true,
      profile,
      newlyUnlocked,
    })
  } catch (error) {
    console.error("Value profile PATCH error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to update value profile.",
      },
      { status: 500 }
    )
  }
}
