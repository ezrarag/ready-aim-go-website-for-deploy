import { notFound } from 'next/navigation'
import { getPartnerBySlug, ensureCarlotPartner } from '@/lib/firestore'
import { Card } from '@/components/ui/card'
import { Truck, DollarSign, Star } from 'lucide-react'
import { ContributionForm } from './contribution-form'

export default async function PartnerPage({
  params,
}: {
  params: { slug: string }
}) {
  // Ensure Carlot partner exists (idempotent)
  if (params.slug === 'carlot') {
    await ensureCarlotPartner()
  }

  const partner = await getPartnerBySlug(params.slug)

  if (!partner) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 md:px-8 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-gray-900">
            Help power a mobility fleet for your choir, students, and community.
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Your contribution helps secure 4 SUVs and 2 box trucks used for orchestra, BEAM students, and ministry events.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Truck className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Fleet</h3>
              <p className="text-gray-600">
                Vehicles used for orchestra, BEAM students, and your church events.
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Earnings</h3>
              <p className="text-gray-600">
                Clients and students pay to use the fleet; that revenue covers costs and creates surplus.
              </p>
            </Card>

            <Card className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Your Benefits</h3>
              <p className="text-gray-600">
                Priority access to vehicles and discounted services for your projects.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Contribution Tier Selector */}
      <section className="py-16 px-4 sm:px-6 md:px-8 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">Choose Your Contribution</h2>
          <ContributionForm partnerSlug={partner.slug} partnerName={partner.name} />
        </div>
      </section>
    </div>
  )
}

