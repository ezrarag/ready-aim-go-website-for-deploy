import { type NextRequest, NextResponse } from 'next/server'
import { getRoleById, updateRole } from '@/lib/roles'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const role = await getRoleById(params.id)
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }
    return NextResponse.json({ role })
  } catch (error) {
    console.error('GET /api/roles/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    await updateRole(params.id, body)
    const updated = await getRoleById(params.id)
    return NextResponse.json({ success: true, role: updated })
  } catch (error) {
    console.error('PATCH /api/roles/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
  }
}
