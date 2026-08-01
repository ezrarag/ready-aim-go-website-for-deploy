import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import { analyzeGitCommits } from "@/lib/updates/git-analyzer"

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ workspaceId: string }> }
) {
  const params = await props.params;
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getAdminDb()
    const workspaceId = decodeURIComponent(params.workspaceId)

    // Load workspace data to obtain local path
    const workspaceSnap = await db.collection("workspaces").doc(workspaceId).get()
    if (!workspaceSnap.exists) {
      return NextResponse.json({ success: false, error: "Workspace not found" }, { status: 404 })
    }

    const workspaceData = workspaceSnap.data() || {}
    // Target path in local filesystem
    const repoPath = workspaceData.localPath || `/Users/ehauga/Desktop/local dev/${workspaceData.githubSlug || workspaceId}`

    // Parse commit range from request body if provided, else default to last 5 commits
    const body = await request.json().catch(() => ({}))
    const commitRange = typeof body.commitRange === "string" ? body.commitRange : "HEAD~5..HEAD"

    // Run AI analysis
    const analysis = await analyzeGitCommits(repoPath, commitRange)

    // Write to Firestore updates collection
    const updatesRef = db.collection("workspaces").doc(workspaceId).collection("updates").doc()
    const updatePayload = {
      id: updatesRef.id,
      type: "release_notes",
      title: analysis.title,
      description: analysis.description,
      audioUrl: analysis.audioUrl || "web-speech-fallback",
      podcastScript: analysis.podcastScript,
      interactiveFeatureMap: analysis.interactiveFeatureMap,
      postedByUid: "admin-system",
      postedAt: new Date().toISOString(),
      pinned: false,
      seenBy: [],
      workspaceId,
    }

    await updatesRef.set(updatePayload)

    // Link update also under the client collection if client exists
    if (workspaceData.clientId) {
      await db
        .collection("clients")
        .doc(workspaceData.clientId)
        .collection("statusVideos")
        .doc(updatesRef.id)
        .set({
          id: updatesRef.id,
          title: analysis.title,
          aiSummary: [analysis.title, "Review details under Notes & Updates."],
          createdAt: updatePayload.postedAt,
          workspaceId,
        })
    }

    return NextResponse.json({ success: true, update: updatePayload })
  } catch (error) {
    console.error("POST /api/admin/workspaces/[workspaceId]/release-notes/generate:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate release notes" },
      { status: 500 }
    )
  }
}
