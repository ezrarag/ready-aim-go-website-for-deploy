import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import type { ClientDeliverable } from "@/lib/types/client-billing"

// POST /api/clients/[id]/deliverables/[deliverableId]/checkout
// Creates a Stripe Checkout session for the deliverable and stores the
// session ID back to Firestore so the webhook can find it on completion.

type Params = { params: Promise<{ id: string; deliverableId: string }> }

export async function POST(request: NextRequest, context: Params) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id: clientId, deliverableId } = await context.params

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ success: false, error: "Stripe not configured" }, { status: 503 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })

    // Load deliverable
    const ref = db
      .collection("clients")
      .doc(clientId)
      .collection("deliverables")
      .doc(deliverableId)

    const doc = await ref.get()
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: "Deliverable not found" }, { status: 404 })
    }

    const deliverable = { id: doc.id, ...(doc.data() as Omit<ClientDeliverable, "id">) }

    if (deliverable.status === "paid") {
      return NextResponse.json(
        { success: false, error: "Deliverable is already paid" },
        { status: 409 }
      )
    }

    if (deliverable.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Deliverable has been cancelled" },
        { status: 409 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const successUrl =
      typeof body.successUrl === "string"
        ? body.successUrl
        : `${request.nextUrl.origin}/portal/billing/success?deliverable=${deliverableId}`
    const cancelUrl =
      typeof body.cancelUrl === "string"
        ? body.cancelUrl
        : `${request.nextUrl.origin}/portal/billing`

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-06-30.basil",
    })

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: deliverable.amount, // already in cents
            product_data: {
              name: deliverable.title,
              description: deliverable.summary || undefined,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        purpose: "deliverable_payment",
        clientId,
        deliverableId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    // Store the session ID on the deliverable so the webhook can find it
    await ref.update({
      stripeSessionId: session.id,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: { sessionId: session.id, url: session.url },
    })
  } catch (err) {
    console.error("POST /api/clients/[id]/deliverables/[deliverableId]/checkout:", err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    )
  }
}
