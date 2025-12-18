import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPartnerBySlug } from '@/lib/firestore'

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
    const body = await req.json()
    const { partnerSlug, amountCents, userEmail, userName } = body

    // Validate required fields
    if (!partnerSlug || !amountCents) {
      return NextResponse.json(
        { error: 'Missing required fields: partnerSlug, amountCents' },
        { status: 400 }
      )
    }

    if (amountCents < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least $1.00 (100 cents)' },
        { status: 400 }
      )
    }

    // Look up partner
    const partner = await getPartnerBySlug(partnerSlug)

    if (!partner || !partner.id) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Readyaimgo Mobility Fleet Contribution',
              description: `Contribution for ${partner.name}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      customer_email: userEmail || undefined,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/partners/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/partners/${partnerSlug}?canceled=1`,
      metadata: {
        partnerSlug: partner.slug,
        partnerId: partner.id,
        purpose: 'fleet_contribution',
        userName: userName || '',
        userEmail: userEmail || '',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

