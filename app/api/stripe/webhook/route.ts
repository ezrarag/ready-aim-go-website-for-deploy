import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getContributionBySessionId, createContribution } from '@/lib/firestore'
import { handleValueProfileCheckoutCompleted } from '@/lib/value-profile-payments'

export async function POST(req: NextRequest) {
  // Check environment variables at runtime, not build time
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe environment variables not configured')
    return NextResponse.json(
      { error: 'Stripe configuration missing' },
      { status: 500 }
    )
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-06-30.basil' })
  
  const sig = req.headers.get('stripe-signature')
  const body = await req.text()
  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.metadata?.purpose === 'value_profile_payment') {
      try {
        await handleValueProfileCheckoutCompleted(session)
      } catch (error) {
        console.error('Error processing value profile payment:', error)
      }
    }
    
    // Handle partner contributions (fleet_contribution)
    if (session.metadata?.purpose === 'fleet_contribution') {
      const partnerSlug = session.metadata.partnerSlug
      const partnerId = session.metadata.partnerId
      const stripeSessionId = session.id
      const amountTotal = session.amount_total || 0
      const currency = session.currency || 'usd'
      const userEmail = session.customer_details?.email || session.metadata.userEmail || undefined
      const userName = session.metadata.userName || undefined

      if (!partnerSlug || !partnerId) {
        console.error('Missing partnerSlug or partnerId in webhook metadata')
        return NextResponse.json({ received: true }) // Don't fail the webhook
      }

      // Check if contribution already exists (idempotency)
      const existing = await getContributionBySessionId(stripeSessionId)

      if (existing) {
        console.log('Contribution already recorded:', stripeSessionId)
        return NextResponse.json({ received: true })
      }

      // Create contribution in Firestore
      try {
        await createContribution({
          partnerId,
          partnerSlug,
          stripeSessionId,
          amountCents: amountTotal,
          currency: currency,
          purpose: 'fleet_contribution',
          userEmail,
          userName,
        })
        console.log('Successfully recorded contribution:', stripeSessionId)
      } catch (error) {
        console.error('Error recording contribution:', error)
        // Don't fail the webhook - Stripe already processed the payment
      }
    }

    // Handle deliverable payments
    if (session.metadata?.purpose === 'deliverable_payment') {
      const clientId = session.metadata.clientId
      const deliverableId = session.metadata.deliverableId
      const stripeSessionId = session.id
      const amountTotal = session.amount_total || 0

      if (!clientId || !deliverableId) {
        console.error('Missing clientId or deliverableId in deliverable_payment metadata')
        return NextResponse.json({ received: true })
      }

      try {
        const { getFirestoreDb } = await import('@/lib/firestore')
        const db = getFirestoreDb()
        if (!db) throw new Error('Firestore unavailable')

        const deliverableRef = db
          .collection('clients')
          .doc(clientId)
          .collection('deliverables')
          .doc(deliverableId)

        const deliverableDoc = await deliverableRef.get()
        if (!deliverableDoc.exists) {
          console.error('Deliverable not found:', deliverableId)
          return NextResponse.json({ received: true })
        }

        const data = deliverableDoc.data() as Record<string, unknown>
        // Idempotency: skip if already marked paid
        if (data.status === 'paid') {
          console.log('Deliverable already marked paid:', deliverableId)
          return NextResponse.json({ received: true })
        }

        const now = new Date().toISOString()

        // Mark deliverable as paid
        await deliverableRef.update({
          status: 'paid',
          paidAt: now,
          stripeSessionId,
          updatedAt: now,
        })

        // Write billing record to clients/{clientId}/billingRecords
        await db.collection('clients').doc(clientId).collection('billingRecords').add({
          clientId,
          deliverableId,
          stripeSessionId,
          amount: amountTotal,
          paidAt: now,
          createdAt: now,
        })

        console.log('Deliverable payment recorded:', deliverableId)
      } catch (error) {
        console.error('Error processing deliverable_payment:', error)
        // Don't fail the webhook — Stripe already processed the payment
      }
    }

    // Handle subscription payments (existing logic - keep if needed)
    // Note: This may need to be migrated to Firestore if you have a profiles collection
    // For now, leaving as-is since it's not part of the partner onramp
  }

  // Optionally handle subscription updates/cancellations here

  return NextResponse.json({ received: true })
}
