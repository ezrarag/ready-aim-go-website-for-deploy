import { type NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { syncLinkedClientsFromAppStore } from "@/lib/app-store"
import {
  extractAppStoreWebhookSummary,
  getAppStoreWebhookSecret,
  verifyAppStoreWebhookSignature,
} from "@/lib/app-store-webhooks"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(request: NextRequest) {
  const secret = getAppStoreWebhookSecret()
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "Server misconfigured: APP_STORE_CONNECT_WEBHOOK_SECRET is missing" },
      { status: 503 }
    )
  }

  const rawBody = await request.text()
  const signatureHeader = request.headers.get("x-apple-signature") || request.headers.get("X-Apple-Signature")

  if (!signatureHeader) {
    return NextResponse.json({ success: false, error: "Missing X-Apple-Signature header" }, { status: 401 })
  }

  if (!verifyAppStoreWebhookSignature(rawBody, signatureHeader, secret)) {
    return NextResponse.json({ success: false, error: "Invalid webhook signature" }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 })
  }

  const summary = extractAppStoreWebhookSummary(payload)
  let syncResult: { syncedClientIds: string[]; syncedAppIds: string[] } = { syncedClientIds: [], syncedAppIds: [] }
  let syncMode: "targeted" | "all-linked" = summary.appId ? "targeted" : "all-linked"
  let syncError: string | null = null

  try {
    syncResult = await syncLinkedClientsFromAppStore(summary.appId)
  } catch (error) {
    syncError = error instanceof Error ? error.message : "Failed to sync linked app records"
  }

  const db = getFirestoreDb()
  if (db) {
    await db.collection("appStoreWebhookEvents").add({
      createdAt: new Date().toISOString(),
      summary,
      syncMode,
      syncError,
      syncedClientIds: syncResult.syncedClientIds,
      syncedAppIds: syncResult.syncedAppIds,
      payload,
      source: "app-store-connect",
    }).catch((error) => {
      console.warn("Failed to persist App Store webhook event:", error)
    })
  }

  return NextResponse.json({
    success: true,
    received: true,
    summary,
    syncMode,
    syncError,
    syncedClientIds: syncResult.syncedClientIds,
    syncedAppIds: syncResult.syncedAppIds,
  })
}
