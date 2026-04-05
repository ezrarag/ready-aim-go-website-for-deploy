import { type NextRequest, NextResponse } from 'next/server'
import { getAllRoles, getPublishedRoles, createRole } from '@/lib/roles'

/**
 * GET /api/roles
 * Returns all roles (admin) or only beamVisible=true roles.
 * Query params:
 *   ?beamVisible=true   — only published roles (used by BEAM Transportation /cohort page)
 *   ?status=open        — filter by status
 *   ?city=Milwaukee     — filter by city
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const beamVisible = searchParams.get('beamVisible')
    const statusFilter = searchParams.get('status')
    const cityFilter = searchParams.get('city')

    let roles = beamVisible === 'true'
      ? await getPublishedRoles()
      : await getAllRoles()

    if (statusFilter) {
      roles = roles.filter(r => r.status === statusFilter)
    }
    if (cityFilter) {
      roles = roles.filter(r => r.city === cityFilter)
    }

    return NextResponse.json(
      { roles, count: roles.length },
      {
        headers: {
          // Allow BEAM Transportation site to fetch cross-origin
          'Access-Control-Allow-Origin': 'https://transportation.beamthinktank.space',
          'Access-Control-Allow-Methods': 'GET',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('GET /api/roles error:', error)
    return NextResponse.json({ error: 'Failed to fetch roles', roles: [] }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://transportation.beamthinktank.space',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

/**
 * POST /api/roles
 * Create a new role (admin only — add your auth check here).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = await createRole({
      title: body.title,
      description: body.description,
      responsibilities: body.responsibilities ?? [],
      skillsRequired: body.skillsRequired ?? [],
      skillsPreferred: body.skillsPreferred ?? [],
      track: body.track ?? 'apprentice',
      city: body.city ?? 'Milwaukee',
      hoursPerWeek: body.hoursPerWeek ?? 10,
      durationWeeks: body.durationWeeks ?? 16,
      status: 'draft',
      beamVisible: false,
      openSlots: body.openSlots ?? 1,
      filledSlots: 0,
      compensation: body.compensation ?? {
        model: 'hourly',
        amountCents: 1400,
        currency: 'USD',
      },
      clientId: body.clientId,
      vehicleTypes: body.vehicleTypes,
      supervisorId: body.supervisorId,
    })
    return NextResponse.json({ success: true, id }, { status: 201 })
  } catch (error) {
    console.error('POST /api/roles error:', error)
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
  }
}
