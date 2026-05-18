import { type NextRequest, NextResponse } from "next/server"

import { getAdminDb } from "@/lib/firebase/admin"
import { isBeamRequestAuthorized } from "@/lib/beam-api"

export const dynamic = "force-dynamic"

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (typeof value === "string") return value
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return new Date().toISOString()
}

export async function GET(request: NextRequest) {
  const authorized = await isBeamRequestAuthorized(request)
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const db = getAdminDb()
    const snapshot = await db
      .collection("workspaces")
      .orderBy("updatedAt", "desc")
      .limit(200)
      .get()

    const workspaces = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data() as Record<string, unknown>

        const repos = Array.isArray(data.repos)
          ? (data.repos as Array<Record<string, unknown>>).map((r) => ({
              id: typeof r.id === "number" ? r.id : 0,
              fullName: typeof r.fullName === "string" ? r.fullName : "",
              url: typeof r.url === "string" ? r.url : "",
              language: typeof r.language === "string" ? r.language : null,
            }))
          : []

        const vercelProjects = Array.isArray(data.vercelProjects)
          ? (data.vercelProjects as Array<Record<string, unknown>>).map((p) => ({
              id: typeof p.id === "string" ? p.id : "",
              name: typeof p.name === "string" ? p.name : "",
              url: typeof p.url === "string" ? p.url : null,
            }))
          : []

        return {
          id: doc.id,
          name: typeof data.name === "string" ? data.name : "",
          ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
          repoCount: repos.length,
          vercelCount: vercelProjects.length,
          memberCount: typeof data.memberCount === "number" ? data.memberCount : 0,
          repos,
          vercelProjects,
          updatedAt: toIso(data.updatedAt),
        }
      })
    )

    return NextResponse.json({ success: true, workspaces })
  } catch (error) {
    console.error("GET /api/admin/workspaces error:", error)
    return NextResponse.json({ error: "Unable to load workspaces." }, { status: 500 })
  }
}
