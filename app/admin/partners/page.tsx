import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { DollarSign, Users, ArrowRight } from 'lucide-react'

async function checkAdmin() {
  try {
    // For server components, we need to check admin status differently
    // This is a simplified check - in production you'd want proper auth
    const supabase = createServerClient()
    
    // Note: In a real implementation, you'd get the user from cookies/headers
    // For now, we'll allow access but you should implement proper auth
    // This is a placeholder that should be replaced with actual auth check
    
    return true // Placeholder - implement proper auth check
  } catch (error) {
    return false
  }
}

async function getPartnersData() {
  const supabase = createServerClient()
  
  // Get all partners with their contribution totals
  const { data: partners, error: partnersError } = await supabase
    .from('partners')
    .select('*')
    .order('created_at', { ascending: false })

  if (partnersError || !partners) {
    return []
  }

  // Get contribution totals for each partner
  const partnersWithStats = await Promise.all(
    partners.map(async (partner) => {
      const { data: contributions, error: contribError } = await supabase
        .from('contributions')
        .select('amount_cents')
        .eq('partner_slug', partner.slug)

      const totalCents = contributions?.reduce((sum, c) => sum + (c.amount_cents || 0), 0) || 0
      const count = contributions?.length || 0

      return {
        ...partner,
        totalContributed: totalCents,
        contributionCount: count,
      }
    })
  )

  return partnersWithStats
}

export default async function AdminPartnersPage() {
  const isAdmin = await checkAdmin()
  
  if (!isAdmin) {
    redirect('/login')
  }

  const partnersData = await getPartnersData()

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Partner Contributions</h1>
          <p className="text-gray-600">View and manage partner contributions to the mobility fleet</p>
        </div>

        {partnersData.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600 mb-4">No partners found.</p>
            <p className="text-sm text-gray-500">
              Partners will appear here once they are added to the database.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {partnersData.map((partner) => (
              <Card key={partner.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold text-gray-900">{partner.name}</h2>
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                        {partner.orgType}
                      </span>
                    </div>
                    
                    {partner.contactName && (
                      <p className="text-sm text-gray-600 mb-1">
                        Contact: {partner.contactName}
                        {partner.contactEmail && ` (${partner.contactEmail})`}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="text-sm text-gray-500">Total Contributed</div>
                          <div className="text-lg font-semibold text-gray-900">
                            ${((partner.totalContributed || 0) / 100).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="text-sm text-gray-500">Contributions</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {partner.contributionCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Link href={`/partners/${partner.slug}`}>
                      <Button variant="outline" size="sm">
                        View Page
                      </Button>
                    </Link>
                    <Link href={`/admin/partners/${partner.id}`}>
                      <Button variant="ghost" size="sm" className="flex items-center gap-1">
                        View Details
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

