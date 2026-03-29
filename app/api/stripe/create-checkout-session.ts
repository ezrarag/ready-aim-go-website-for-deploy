import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
// TODO: Implement Firebase database operations

export async function POST(req: NextRequest) {
  try {
    // Check environment variables at runtime, not build time
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'STRIPE_SECRET_KEY is not configured' },
        { status: 500 }
      )
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_APP_URL is not configured' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-06-30.basil' })

    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const priceIdFromBody =
      typeof body.priceId === 'string' && body.priceId.startsWith('price_') ? body.priceId : null
    const priceId = priceIdFromBody || process.env.STRIPE_PRICE_ID

    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe price id missing: set STRIPE_PRICE_ID or pass priceId in body' },
        { status: 500 }
      )
    }
    const email =
      typeof body.email === 'string' && body.email.includes('@') ? body.email.trim() : null
    const userId = typeof body.userId === 'string' ? body.userId : undefined

    if (!email) {
      return NextResponse.json(
        { error: 'email is required in JSON body for checkout' },
        { status: 400 }
      )
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        { price: priceId, quantity: 1 },
      ],
      customer_email: email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?canceled=1`,
      metadata: {
        ...(userId ? { user_id: userId } : {}),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout session creation error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
} 