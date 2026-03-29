import { NextResponse } from "next/server"

/** TODO: load role + profile from Firestore, then POST to BEAM */
export async function POST(_request: Request, _ctx: { params: Promise<{ id: string }> }) {
  return NextResponse.json(
    { error: "Send role to BEAM not implemented (Firestore migration pending)" },
    { status: 501 }
  )
}
