import { type NextRequest, NextResponse } from "next/server"

import { normalizeClientServiceInterests } from "@/lib/client-onboarding"
import { getFirebaseAdminAuth, getFirestoreDb } from "@/lib/firestore"

function readTrimmedString(value: unknown, maxLength = 280) {
  if (typeof value !== "string") {
    return ""
  }

  return value.trim().slice(0, maxLength)
}

function readOptionalTrimmedString(value: unknown, maxLength = 280) {
  const normalized = readTrimmedString(value, maxLength)
  return normalized || null
}

function readBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) {
    return null
  }

  const token = header.slice("Bearer ".length).trim()
  return token || null
}

export async function POST(request: NextRequest) {
  const db = getFirestoreDb()
  const adminAuth = getFirebaseAdminAuth()

  if (!db || !adminAuth) {
    return NextResponse.json(
      {
        success: false,
        error: "Firebase is not configured for client account setup.",
      },
      { status: 503 }
    )
  }

  try {
    const token = readBearerToken(request)
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication is required to complete account setup.",
        },
        { status: 401 }
      )
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    const body = await request.json()

    const fullName = readTrimmedString(body?.fullName, 160)
    const emailInput = readTrimmedString(body?.email, 200).toLowerCase()
    const phone = readOptionalTrimmedString(body?.phone, 40)
    const companyNameInput = readTrimmedString(body?.companyName, 160)
    const organizationTypeInput = readTrimmedString(body?.organizationType, 120)
    const notesInput = readTrimmedString(body?.notes, 2000)
    const handoffId = readTrimmedString(body?.handoffId, 120)
    const serviceInterestsInput = normalizeClientServiceInterests(body?.serviceInterests)

    const authEmail =
      typeof decodedToken.email === "string" ? decodedToken.email.trim().toLowerCase() : ""
    const email = authEmail || emailInput

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid email is required to complete account setup.",
        },
        { status: 400 }
      )
    }

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          error: "Full name is required to complete account setup.",
        },
        { status: 400 }
      )
    }

    let handoffData: Record<string, unknown> | null = null
    let handoffRef: FirebaseFirestore.DocumentReference | null = null

    if (handoffId) {
      handoffRef = db.collection("clientPortalHandoffs").doc(handoffId)
      const handoffSnapshot = await handoffRef.get()

      if (!handoffSnapshot.exists) {
        return NextResponse.json(
          {
            success: false,
            error: "The client handoff could not be found.",
          },
          { status: 404 }
        )
      }

      handoffData = handoffSnapshot.data() ?? null
      const expiresAt =
        typeof handoffData?.expiresAt === "string" ? handoffData.expiresAt : null

      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        return NextResponse.json(
          {
            success: false,
            error: "This client handoff has expired.",
          },
          { status: 410 }
        )
      }
    }

    const companyName =
      companyNameInput ||
      (typeof handoffData?.companyName === "string" ? handoffData.companyName : "")

    if (!companyName) {
      return NextResponse.json(
        {
          success: false,
          error: "Company name is required to complete account setup.",
        },
        { status: 400 }
      )
    }

    const organizationType =
      organizationTypeInput ||
      (typeof handoffData?.organizationType === "string" ? handoffData.organizationType : "")

    const notes =
      notesInput ||
      (typeof handoffData?.notes === "string" ? handoffData.notes : "")

    const serviceInterests =
      serviceInterestsInput.length > 0
        ? serviceInterestsInput
        : normalizeClientServiceInterests(handoffData?.serviceInterests)

    const now = new Date().toISOString()
    const claimedClientId =
      typeof handoffData?.claimedClientId === "string" ? handoffData.claimedClientId : null
    const claimedStoryId =
      typeof handoffData?.claimedStoryId === "string" ? handoffData.claimedStoryId : null
    const claimedClientName =
      typeof handoffData?.claimedClientName === "string" ? handoffData.claimedClientName : null
    const mode = handoffData?.mode === "claim" ? "claim" : "new"

    const userRef = db.collection("users").doc(decodedToken.uid)
    const existingUserSnapshot = await userRef.get()
    const existingUserData = existingUserSnapshot.data() ?? {}
    const createdAt =
      typeof existingUserData.created_at === "string" ? existingUserData.created_at : now

    await userRef.set(
      {
        role: "client",
        full_name: fullName,
        email,
        phone,
        company_name: companyName,
        organization_type: organizationType || null,
        client_id: claimedClientId,
        client_portal: {
          mode,
          handoff_id: handoffId || null,
          claimed_client_id: claimedClientId,
          claimed_story_id: claimedStoryId,
          claimed_client_name: claimedClientName,
          company_name: companyName,
          service_interests: serviceInterests,
          notes: notes || null,
          completed_at: now,
        },
        updated_at: now,
        created_at: createdAt,
      },
      { merge: true }
    )

    if (handoffRef) {
      await handoffRef.set(
        {
          completedAt: now,
          completedByUid: decodedToken.uid,
          completedEmail: email,
          fullName,
          companyName,
          organizationType: organizationType || null,
          notes: notes || null,
          phone,
          serviceInterests,
        },
        { merge: true }
      )
    }

    return NextResponse.json({
      success: true,
      redirectUrl: "/dashboard/client",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to complete client account setup.",
      },
      { status: 500 }
    )
  }
}
