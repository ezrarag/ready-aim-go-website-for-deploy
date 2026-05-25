import { type NextRequest, NextResponse } from "next/server"

import { normalizeClientServiceInterests } from "@/lib/client-onboarding"
import { getFirebaseAdminAuth, getFirestoreDb } from "@/lib/firestore"
import { buildOwnerMembership } from "@/lib/types/client-membership"
import { generateSlug } from "@/lib/beam-access-shared"

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

function fallbackCompanyName(email: string) {
  const domain = email.split("@")[1]?.split(".")[0] ?? ""
  return domain.replace(/[-_]+/g, " ").trim() || "New Client"
}

async function ensureUniqueStoryId(db: FirebaseFirestore.Firestore, baseName: string) {
  const base = generateSlug(baseName) || "client"
  let candidate = base
  let suffix = 2

  while (true) {
    const snapshot = await db
      .collection("clients")
      .where("storyId", "==", candidate)
      .limit(1)
      .get()

    if (snapshot.empty) return candidate

    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

async function findExistingSignupClientId(
  db: FirebaseFirestore.Firestore,
  uid: string,
  email: string
) {
  const byUid = await db
    .collection("clients")
    .where("portalSignup.uid", "==", uid)
    .limit(1)
    .get()

  if (!byUid.empty) return byUid.docs[0].id

  const byEmail = await db
    .collection("clients")
    .where("clientPortalEmail", "==", email)
    .limit(1)
    .get()

  return byEmail.empty ? null : byEmail.docs[0].id
}

async function createClientSignupRecord(input: {
  db: FirebaseFirestore.Firestore
  uid: string
  email: string
  fullName: string
  companyName: string
  organizationType: string
  phone: string | null
  role: string
  handoffId: string
  mode: "claim" | "new"
  notes: string
  serviceInterests: string[]
}) {
  const existingClientId = await findExistingSignupClientId(input.db, input.uid, input.email)
  const now = new Date().toISOString()
  const portalSignup = {
    uid: input.uid,
    email: input.email,
    fullName: input.fullName,
    role: input.role || null,
    handoffId: input.handoffId || null,
    mode: input.mode,
    serviceInterests: input.serviceInterests,
    notes: input.notes || null,
    accessStatus: "pending_manual_provision",
    updatedAt: now,
  }

  if (existingClientId) {
    await input.db.collection("clients").doc(existingClientId).set(
      {
        name: input.companyName,
        clientPortalEmail: input.email,
        contactEmail: input.email,
        contactName: input.fullName,
        contactPhone: input.phone,
        organizationType: input.organizationType || null,
        portalAccessStatus: "pending_manual_provision",
        adminApprovalPending: true,
        status: "onboarding",
        lastActivity: "Client signed up; portal access pending",
        updatedAt: now,
        portalSignup,
      },
      { merge: true }
    )
    return existingClientId
  }

  const storyId = await ensureUniqueStoryId(input.db, input.companyName)
  const ref = input.db.collection("clients").doc()

  await ref.set({
    storyId,
    name: input.companyName,
    brands: [],
    status: "onboarding",
    lastActivity: "Client signed up; portal access pending",
    updatedAt: now,
    pulseSummary: "Client signup record created automatically. Portal access has not been provisioned yet.",
    deployStatus: "building",
    deployUrl: null,
    githubRepo: null,
    githubRepos: [],
    deployHosts: [],
    stripeStatus: "pending",
    revenue: 0,
    meetings: 0,
    emails: 0,
    commits: 0,
    lastDeploy: null,
    storyVideoUrl: null,
    showOnFrontend: false,
    isNewStory: true,
    websiteUrl: null,
    appUrl: null,
    appStoreUrl: null,
    rdUrl: null,
    housingUrl: null,
    transportationUrl: null,
    insuranceUrl: null,
    clientPortalEmail: input.email,
    contactEmail: input.email,
    contactName: input.fullName,
    contactPhone: input.phone,
    organizationType: input.organizationType || null,
    portalAccessStatus: "pending_manual_provision",
    adminApprovalPending: true,
    portalSignup: {
      ...portalSignup,
      createdAt: now,
    },
  })

  return ref.id
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

    const tokenName =
      typeof decodedToken.name === "string" ? decodedToken.name.trim() : ""
    const fullName = readTrimmedString(body?.fullName, 160) || tokenName
    const emailInput = readTrimmedString(body?.email, 200).toLowerCase()
    const phone = readOptionalTrimmedString(body?.phone, 40)
    const companyNameInput = readTrimmedString(body?.companyName, 160)
    const organizationTypeInput = readTrimmedString(body?.organizationType, 120)
    const notesInput = readTrimmedString(body?.notes, 2000)
    const roleInput = readTrimmedString(body?.role, 120)
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
      (typeof handoffData?.companyName === "string" ? handoffData.companyName : "") ||
      fallbackCompanyName(email)

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
    const role =
      roleInput ||
      (typeof handoffData?.role === "string" ? handoffData.role : "")

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
    const existingLinkedClientId =
      typeof existingUserData.client_id === "string" ? existingUserData.client_id : ""

    const signupClientId =
      claimedClientId || existingLinkedClientId
        ? null
        : await createClientSignupRecord({
            db,
            uid: decodedToken.uid,
            email,
            fullName,
            companyName,
            organizationType,
            phone,
            role,
            handoffId,
            mode,
            notes,
            serviceInterests,
          })

    await userRef.set(
      {
        role: "client",
        full_name: fullName,
        email,
        phone,
        company_name: companyName,
        organization_type: organizationType || null,
        client_id:
          claimedClientId ||
          existingLinkedClientId ||
          null,
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
        pending_client_id: signupClientId,
        portal_access_status:
          claimedClientId || existingLinkedClientId
            ? "active"
            : "pending_manual_provision",
        updated_at: now,
        created_at: createdAt,
      },
      { merge: true }
    )

    // ── Write membership contract if a claimedClientId is available ──────────
    // This ensures portal-auth can resolve the full multi-client contract from
    // users/{uid} immediately after account setup completes.
    if (claimedClientId) {
      await userRef.set(
        {
          clientIds: [claimedClientId],
          userRole: "owner",
          memberships: buildOwnerMembership(claimedClientId),
        },
        { merge: true }
      )
    }

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
      clientRecordId: claimedClientId || existingLinkedClientId || signupClientId,
      portalAccessStatus:
        claimedClientId || existingLinkedClientId ? "active" : "pending_manual_provision",
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
