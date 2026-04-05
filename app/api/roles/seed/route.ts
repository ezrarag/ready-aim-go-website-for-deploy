import { NextResponse } from 'next/server'
import { seedTransportationRoles } from '@/lib/roles'

/**
 * POST /api/roles/seed
 * One-time seed of the three transportation roles for demo/investor use.
 * Call once from admin: fetch('/api/roles/seed', { method: 'POST' })
 * Safe to call multiple times — skips if roles already exist.
 */
export async function POST() {
  try {
    await seedTransportationRoles()
    return NextResponse.json({ success: true, message: 'Transportation roles seeded' })
  } catch (error) {
    console.error('POST /api/roles/seed error:', error)
    return NextResponse.json({ error: 'Failed to seed roles' }, { status: 500 })
  }
}
