import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_KEY ?? "",
  })
}
