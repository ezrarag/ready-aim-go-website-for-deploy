import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' })

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const body = await req.text()
  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.metadata?.user_id
    const customerId = session.customer as string
    const subscriptionId = session.subscription as string
    if (userId && customerId && subscriptionId) {
      await supabase.from('profiles').update({
        stripe_customer_id: customerId,
        subscription_id: subscriptionId,
        contract_accepted_at: new Date().toISOString(),
      }).eq('id', userId)
    }
  }

  // Optionally handle subscription updates/cancellations here

  return NextResponse.json({ received: true })
} 