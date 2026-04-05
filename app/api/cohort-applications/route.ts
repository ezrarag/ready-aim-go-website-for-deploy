import { type NextRequest, NextResponse } from 'next/server'
import { createCohortApplication, getCohortApplicationsByRole } from '@/lib/roles'

/**
 * POST /api/cohort-applications
 * Submit a participant application for a BEAM cohort role.
 * Called by transportation.beamthinktank.space/cohort application form.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Basic validation
    const required = ['roleId', 'roleTitle', 'applicantName', 'applicantEmail', 'applicantCity', 'bio', 'experience', 'availability']
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    const id = await createCohortApplication({
      roleId: body.roleId,
      roleTitle: body.roleTitle,
      applicantName: body.applicantName,
      applicantEmail: body.applicantEmail,
      applicantCity: body.applicantCity,
      phone: body.phone,
      bio: body.bio,
      experience: body.experience,
      availability: body.availability,
      currentlyEnrolled: Boolean(body.currentlyEnrolled),
      institution: body.institution,
    })

    return NextResponse.json(
      {
        success: true,
        applicationId: id,
        message: "Application received. The BEAM Transportation team will contact you within 3 business days.",
      },
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': 'https://transportation.beamthinktank.space',
        },
      }
    )
  } catch (error) {
    console.error('POST /api/cohort-applications error:', error)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://transportation.beamthinktank.space',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

/**
 * GET /api/cohort-applications?roleId=xxx
 * Admin only: fetch all applications for a role.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('roleId')
    if (!roleId) {
      return NextResponse.json({ error: 'roleId query param required' }, { status: 400 })
    }
    const applications = await getCohortApplicationsByRole(roleId)
    return NextResponse.json({ applications, count: applications.length })
  } catch (error) {
    console.error('GET /api/cohort-applications error:', error)
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}
