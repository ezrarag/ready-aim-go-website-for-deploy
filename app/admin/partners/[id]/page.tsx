import { redirect, notFound } from 'next/navigation'
import { getPartnerById, getContributionsByPartnerId, type Contribution } from '@/lib/firestore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Calendar, DollarSign, Mail, User } from 'lucide-react'

async function checkAdmin() {
  try {
    // Placeholder - implement proper Firebase Auth check
    return true
  } catch (error) {
    return false
  }
}

async function getPartnerDetails(partnerId: string) {
  const partner = await getPartnerById(partnerId)
  
  if (!partner) {
    return null
  }

  const contributions = await getContributionsByPartnerId(partnerId)

  return {
    partner,
    contributions,
  }
}

export default async function PartnerDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  const isAdmin = await checkAdmin()
  
  if (!isAdmin) {
    redirect('/login')
  }

  const data = await getPartnerDetails(params.id)

  if (!data) {
    notFound()
  }

  const { partner, contributions } = data
  const totalContributed = contributions.reduce((sum, c) => sum + (c.amountCents || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/partners">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Partners
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{partner.name}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Partner Information</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Slug</div>
                <div className="font-medium text-gray-900">{partner.slug}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Organization Type</div>
                <div className="font-medium text-gray-900">{partner.orgType}</div>
              </div>
              {partner.contactName && (
                <div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Contact Name
                  </div>
                  <div className="font-medium text-gray-900">{partner.contactName}</div>
                </div>
              )}
              {partner.contactEmail && (
                <div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Contact Email
                  </div>
                  <div className="font-medium text-gray-900">{partner.contactEmail}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Created
                </div>
                <div className="font-medium text-gray-900">
                  {partner.createdAt 
                    ? new Date(partner.createdAt instanceof Date ? partner.createdAt : partner.createdAt.toDate()).toLocaleDateString()
                    : 'N/A'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Contribution Summary</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Total Contributed
                </div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  ${(totalContributed / 100).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Number of Contributions</div>
                <div className="text-xl font-semibold text-gray-900 mt-1">
                  {contributions.length}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Contributions</h2>
          {contributions.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No contributions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Contributor</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Session ID</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((contrib) => (
                    <tr key={contrib.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {contrib.createdAt 
                          ? new Date(contrib.createdAt instanceof Date ? contrib.createdAt : contrib.createdAt.toDate()).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        ${((contrib.amountCents || 0) / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {contrib.userName || contrib.userEmail || 'Anonymous'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 font-mono text-xs">
                        {contrib.stripeSessionId.substring(0, 20)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

