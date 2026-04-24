import { type NextRequest, NextResponse } from "next/server"

import { normalizeClientServiceInterests } from "@/lib/client-onboarding"
import { getClientDirectoryEntryById, getFirestoreDb } from "@/lib/firestore"

type PortalDestination = "/signup" | "/login"

const DEFAULT_CLIENT_PORTAL_URL = "https://clients.readyaimgo.biz"

function readTrimmedString(value: unknown, maxLength = 280) {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim().slice(0, maxLength)
}

function readPortalDestination(value: unknown): PortalDestination {
  return value === "/login" ? "/login" : "/signup"
}

function buildPortalUrl(path: PortalDestination, handoffId: string) {
  const portalBase = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || DEFAULT_CLIENT_PORTAL_URL
  const url = new URL(path, portalBase)
  url.searchParams.set("handoff", handoffId)
  url.searchParams.set("portal", "client")
  return url.toString()
}

export async function POST(request: NextRequest) {
  const db = getFirestoreDb()
  if (!db) {
    return NextResponse.json(
      {
        success: false,
        error: "Firebase is not configured for client handoff creation.",
      },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const mode = body?.mode === "claim" ? "claim" : "new"
    const destination = readPortalDestination(body?.destination)
    const claimedClientRef = readTrimmedString(body?.claimedClientId)
    const contactName = readTrimmedString(body?.contactName)
    const workEmail = readTrimmedString(body?.workEmail)
    const phone = readTrimmedString(body?.phone, 40)
    const role = readTrimmedString(body?.role, 120)
    const companyNameInput = readTrimmedString(body?.companyName, 160)
    const organizationType = readTrimmedString(body?.organizationType, 120)
    const notes = readTrimmedString(body?.notes, 2000)
    const serviceInterests = normalizeClientServiceInterests(body?.serviceInterests)

    let claimedClient = null
    if (mode === "claim") {
      if (!claimedClientRef) {
        return NextResponse.json(
          {
            success: false,
            error: "Select an existing business before continuing.",
          },
          { status: 400 }
        )
      }

      claimedClient = await getClientDirectoryEntryById(claimedClientRef)
      if (!claimedClient) {
        return NextResponse.json(
          {
            success: false,
            error: "The selected client could not be found.",
          },
          { status: 404 }
        )
      }
    }

    const companyName = companyNameInput || claimedClient?.name || ""
    if (!companyName) {
      return NextResponse.json(
        {
          success: false,
          error: "Company name is required.",
        },
        { status: 400 }
      )
    }

    if (!contactName) {
      return NextResponse.json(
        {
          success: false,
          error: "Contact name is required.",
        },
        { status: 400 }
      )
    }

    // Email is optional when a phone number is provided.
    // If phone-only, we synthesise a placeholder internal address so the
    // portal handoff record and signup flow still have a stable key.
    // The client replaces it with their real email during signup.
    const hasValidEmail = workEmail && workEmail.includes("@")
    const hasValidPhone = phone && phone.replace(/\D/g, "").length >= 7

    if (!hasValidEmail && !hasValidPhone) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide either a work email or a phone number to continue.",
        },
        { status: 400 }
      )
    }

    // Build the canonical email for this record.
    // Phone-only records use a structured placeholder the portal can detect.
    const canonicalEmail = hasValidEmail
      ? workEmail
      : `phone-${phone.replace(/\D/g, "")}@phone.readyaimgo.internal`

    const createdAt = new Date()
    const expiresAt = new Date(createdAt.getTime() + 1000 * 60 * 60 * 24 * 7)
    const ref = db.collection("clientPortalHandoffs").doc()

    await ref.set({
      mode,
      destination,
      companyName,
      contactName,
      workEmail: canonicalEmail,
      phoneOnly: !hasValidEmail,
      phone: phone || null,
      role: role || null,
      organizationType: organizationType || null,
      serviceInterests,
      notes: notes || null,
      claimedClientId: claimedClient?.id ?? null,
      claimedStoryId: claimedClient?.storyId ?? null,
      claimedClientName: claimedClient?.name ?? null,
      sourceSite: request.nextUrl.origin,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    })

    return NextResponse.json({
      success: true,
      handoffId: ref.id,
      portalUrl: buildPortalUrl(destination, ref.id),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create client handoff.",
      },
      { status: 500 }
    )
  }
}
