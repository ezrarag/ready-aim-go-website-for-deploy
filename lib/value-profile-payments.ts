import { FieldValue } from "firebase-admin/firestore"
import type Stripe from "stripe"

import { getFirestoreDb } from "@/lib/firestore"
import {
  VALUE_PROFILE_COLLECTION,
  VALUE_PROFILE_PAYMENTS_COLLECTION,
  VALUE_PROFILE_STATE_DOC,
  computeNewlyUnlockedDeliverables,
  computeUnlockedDeliverables,
  getCurrentThreshold,
  normalizeValueProfile,
  uniqueStrings,
} from "@/lib/value-profile"

function getValueProfileRef(db: FirebaseFirestore.Firestore, clientId: string) {
  return db
    .collection("clients")
    .doc(clientId)
    .collection(VALUE_PROFILE_COLLECTION)
    .doc(VALUE_PROFILE_STATE_DOC)
}

async function writeProjectUnlocks({
  db,
  clientId,
  projectId,
  deliverables,
  totalPaid,
  currentThresholdId,
}: {
  db: FirebaseFirestore.Firestore
  clientId: string
  projectId?: string
  deliverables: string[]
  totalPaid: number
  currentThresholdId?: string
}) {
  const refs = new Map<string, FirebaseFirestore.DocumentReference>()

  if (projectId) {
    const projectRef = db.collection("projects").doc(projectId)
    const projectSnapshot = await projectRef.get()
    if (projectSnapshot.exists) refs.set(projectRef.path, projectRef)
  }

  const directProjectRef = db.collection("projects").doc(clientId)
  const directProjectSnapshot = await directProjectRef.get()
  if (directProjectSnapshot.exists) refs.set(directProjectRef.path, directProjectRef)

  const projectQuerySnapshot = await db
    .collection("projects")
    .where("clientId", "==", clientId)
    .get()

  for (const projectDoc of projectQuerySnapshot.docs) {
    refs.set(projectDoc.ref.path, projectDoc.ref)
  }

  if (refs.size === 0) return

  const batch = db.batch()
  for (const ref of refs.values()) {
    const update: Record<string, unknown> = {
      valueProfileTotalPaid: totalPaid,
      valueProfileCurrentThresholdId: currentThresholdId ?? null,
      valueProfileUpdatedAt: FieldValue.serverTimestamp(),
    }

    if (deliverables.length > 0) {
      update.deliverables = FieldValue.arrayUnion(...deliverables)
      update.unlockedDeliverables = FieldValue.arrayUnion(...deliverables)
    }

    batch.set(ref, update, { merge: true })
  }

  await batch.commit()
}

export async function handleValueProfileCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  if (session.payment_status !== "paid") return

  const clientId = session.metadata?.clientId?.trim().toLowerCase()
  if (!clientId) {
    console.warn("Value profile payment missing clientId metadata:", session.id)
    return
  }

  const db = getFirestoreDb()
  if (!db) {
    throw new Error("Firebase not initialized")
  }

  const profileRef = getValueProfileRef(db, clientId)
  const paymentRef = profileRef.collection(VALUE_PROFILE_PAYMENTS_COLLECTION).doc(session.id)
  const amount = (session.amount_total ?? 0) / 100
  const currency = session.currency || "usd"
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id

  const result = await db.runTransaction(async (transaction) => {
    const [profileSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(paymentRef),
    ])
    const existingProfile = normalizeValueProfile(
      clientId,
      (profileSnapshot.data() ?? {}) as Record<string, unknown>
    )

    if (paymentSnapshot.exists) {
      return {
        duplicate: true,
        newlyUnlocked: [] as string[],
        totalPaid: existingProfile.totalPaid,
        currentThresholdId: existingProfile.currentThresholdId,
      }
    }

    const nextTotalPaid = existingProfile.totalPaid + amount
    const thresholdUnlocked = computeUnlockedDeliverables(
      existingProfile.thresholds,
      nextTotalPaid
    )
    const nextUnlocked = uniqueStrings([
      ...existingProfile.unlockedDeliverables,
      ...thresholdUnlocked,
    ])
    const newlyUnlocked = computeNewlyUnlockedDeliverables(
      existingProfile.unlockedDeliverables,
      nextUnlocked
    )
    const currentThreshold = getCurrentThreshold(
      existingProfile.thresholds,
      nextTotalPaid
    )

    transaction.set(
      profileRef,
      {
        clientId,
        totalPaid: nextTotalPaid,
        currency,
        unlockedDeliverables: nextUnlocked,
        currentThresholdId: currentThreshold?.id ?? null,
        stripeCustomerId: customerId ?? existingProfile.stripeCustomerId ?? null,
        lastPaymentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: profileSnapshot.exists
          ? profileSnapshot.data()?.createdAt ?? FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    transaction.set(paymentRef, {
      id: paymentRef.id,
      amount,
      currency,
      status: "succeeded",
      source: "stripe",
      description: `Value profile payment - ${session.id}`,
      clientEmail:
        session.customer_details?.email ||
        session.metadata?.clientEmail ||
        null,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId ?? null,
      createdAt: FieldValue.serverTimestamp(),
    })

    return {
      duplicate: false,
      newlyUnlocked,
      totalPaid: nextTotalPaid,
      currentThresholdId: currentThreshold?.id,
    }
  })

  if (!result.duplicate) {
    await writeProjectUnlocks({
      db,
      clientId,
      projectId: session.metadata?.projectId,
      deliverables: result.newlyUnlocked,
      totalPaid: result.totalPaid,
      currentThresholdId: result.currentThresholdId,
    })
  }
}
