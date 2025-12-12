import { NextResponse } from 'next/server'
import { ensureCarlotPartner } from '@/lib/firestore'

// Simple route to seed the Carlot partner if it doesn't exist
// Can be called manually or on app startup
export async function POST() {
  try {
    await ensureCarlotPartner()
    return NextResponse.json({ success: true, message: 'Carlot partner seeded' })
  } catch (error) {
    console.error('Error seeding partner:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


