import { NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"

type DesktopClientPayload = {
  id: string
  name: string
  storyId: string | null
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getAdminDb()
    const snapshot = await db.collection("clients").orderBy("name", "asc").limit(250).get()

    const clients: DesktopClientPayload[] = snapshot.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>
        const recordType = readString(data.recordType)
        const name = readString(data.name)
        const storyId = readString(data.storyId)

        if (recordType == "portal_person") return null
        if (!name && !storyId) return null

        return {
          id: doc.id,
          name: name || storyId || doc.id,
          storyId: storyId || null,
        }
      })
      .filter((client): client is DesktopClientPayload => Boolean(client))

    return NextResponse.json({ success: true, clients })
  } catch (error) {
    console.error("GET /api/desktop/clients:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch desktop clients",
      },
      { status: 500 }
    )
  }
}
