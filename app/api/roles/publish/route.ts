import { type NextRequest, NextResponse } from 'next/server'
import { publishRole, unpublishRole } from '@/lib/roles'

/**
 * POST /api/roles/publish
 * Toggle beamVisible on a role. Body: { roleId, publish: boolean }
 * In production: add Firebase Auth admin check before allowing this.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roleId, publish } = body as { roleId: string; publish: boolean }

    if (!roleId || typeof publish !== 'boolean') {
      return NextResponse.json(
        { error: 'roleId (string) and publish (boolean) are required' },
        { status: 400 }
      )
    }

    if (publish) {
      await publishRole(roleId)
    } else {
      await unpublishRole(roleId)
    }

    return NextResponse.json({
      success: true,
      roleId,
      beamVisible: publish,
      message: publish
        ? 'Role is now visible on BEAM Transportation /cohort'
        : 'Role hidden from BEAM Transportation',
    })
  } catch (error) {
    console.error('POST /api/roles/publish error:', error)
    return NextResponse.json({ error: 'Failed to update role visibility' }, { status: 500 })
  }
}
