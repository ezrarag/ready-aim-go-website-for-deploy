import { NextResponse } from "next/server"

import { getClientDirectoryEntryById, getFirestoreDb } from "@/lib/firestore"

function readIsoString(value: unknown) {
  return typeof value === "string" ? value : null
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const db = getFirestoreDb()
  if (!db) {
    return NextResponse.json(
      {
        success: false,
        error: "Firebase is not configured for client handoff lookup.",
      },
      { status: 503 }
    )
  }

  try {
    const { id } = await context.params
    const snapshot = await db.collection("clientPortalHandoffs").doc(id).get()

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Client handoff not found.",
        },
        { status: 404 }
      )
    }

    const data = snapshot.data() ?? {}
    const expiresAt = readIsoString(data.expiresAt)
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        {
          success: false,
          error: "Client handoff has expired.",
        },
        { status: 410 }
      )
    }

    const claimedClientId =
      typeof data.claimedClientId === "string" ? data.claimedClientId : null
    const claimPreview = claimedClientId
      ? await getClientDirectoryEntryById(claimedClientId)
      : null

    return NextResponse.json({
      success: true,
      handoff: {
        id: snapshot.id,
        mode: data.mode === "claim" ? "claim" : "new",
        destination: data.destination === "/login" ? "/login" : "/signup",
        companyName: typeof data.companyName === "string" ? data.companyName : "",
        contactName: typeof data.contactName === "string" ? data.contactName : "",
        workEmail: typeof data.workEmail === "string" ? data.workEmail : "",
        phoneOnly: data.phoneOnly === true,
        phone: typeof data.phone === "string" ? data.phone : "",
        role: typeof data.role === "string" ? data.role : "",
        organizationType:
          typeof data.organizationType === "string" ? data.organizationType : "",
        serviceInterests: Array.isArray(data.serviceInterests)
          ? data.serviceInterests.filter((value): value is string => typeof value === "string")
          : [],
        notes: typeof data.notes === "string" ? data.notes : "",
        claimedClientId,
        claimedStoryId: typeof data.claimedStoryId === "string" ? data.claimedStoryId : "",
        claimedClientName:
          typeof data.claimedClientName === "string" ? data.claimedClientName : "",
        sourceSite: typeof data.sourceSite === "string" ? data.sourceSite : "",
        createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
        expiresAt: expiresAt ?? "",
      },
      claimPreview,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch client handoff.",
      },
      { status: 500 }
    )
  }
}
