import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabase/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' })
const priceId = process.env.STRIPE_PRICE_ID!

export async function POST(req: NextRequest) {
  // Get the current user from Supabase auth (cookie-based session)
  // In production, you may want to verify the user more robustly
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      { price: priceId, quantity: 1 },
    ],
    customer_email: user.email,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?canceled=1`,
    metadata: {
      user_id: user.id,
    },
  })

  return NextResponse.json({ url: session.url })
} 