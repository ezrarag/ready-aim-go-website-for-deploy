import { Suspense } from 'react'
import { getPartnerBySlug } from '@/lib/firestore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Stripe from 'stripe'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'

async function getSessionData(sessionId: string) {
  // Check environment variable at runtime, not build time
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not configured')
    return null
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-06-30.basil' })

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    if (!session || session.payment_status !== 'paid') {
      return null
    }

    const partnerSlug = session.metadata?.partnerSlug
    if (!partnerSlug) {
      return null
    }

    // Get partner info
    const partner = await getPartnerBySlug(partnerSlug)

    return {
      amountTotal: session.amount_total || 0,
      currency: session.currency || 'usd',
      partnerSlug,
      partnerName: partner?.name || 'Partner',
      customerEmail: session.customer_details?.email,
      customerName: session.metadata?.userName,
    }
  } catch (error) {
    console.error('Error fetching session:', error)
    return null
  }
}

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const sessionId = searchParams.session_id

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Session Not Found</h1>
          <p className="text-gray-600 mb-6">
            We couldn't find your payment session. Please contact support if you completed a payment.
          </p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <Suspense fallback={<ThankYouSkeleton />}>
      <ThankYouContent sessionId={sessionId} />
    </Suspense>
  )
}

async function ThankYouContent({ sessionId }: { sessionId: string }) {
  const sessionData = await getSessionData(sessionId)

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Payment Not Found</h1>
          <p className="text-gray-600 mb-6">
            We couldn't verify your payment. Please contact support if you completed a payment.
          </p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const amountDollars = (sessionData.amountTotal / 100).toFixed(2)
  const displayName = sessionData.customerName || sessionData.customerEmail || 'Friend'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4 py-16">
      <Card className="p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900">
            Thank you, {displayName}!
          </h1>
          <p className="text-xl text-gray-700">
            Your contribution of ${amountDollars} has been recorded for {sessionData.partnerName}.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4 text-gray-900">What You've Unlocked</h2>
          <p className="text-gray-700 mb-4">
            We'll use this contribution toward securing vehicles and scheduling events for your choir and students.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Priority access to the mobility fleet</li>
            <li>Support for orchestra, BEAM students, and ministry events</li>
            <li>Discounted services for your projects</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={`/partners/${sessionData.partnerSlug}`}>
            <Button variant="outline" className="w-full sm:w-auto">
              Back to Partner Page
            </Button>
          </Link>
          <Link href="/">
            <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">
              Return Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

function ThankYouSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="p-8 max-w-md w-full">
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded-full w-16 mx-auto mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto"></div>
        </div>
      </Card>
    </div>
  )
}

