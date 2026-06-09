import { type NextRequest, NextResponse } from "next/server"

import { getFirestoreDb } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"
import { isInternalReadAuthorized } from "@/lib/internal-api-auth"
import {
  buildAdminHubWarnings,
  normalizeAdminHubClient,
  normalizeAdminHubProject,
  normalizeAdminHubTask,
  normalizeAdminHubWorkspace,
  normalizePendingClientPerson,
  normalizeUserPerson,
  sortAdminHubByUpdated,
  type AdminHubPayload,
  type AdminHubPerson,
} from "@/lib/admin/ops-hub"

export const dynamic = "force-dynamic"

function dedupePeople(people: AdminHubPerson[]): AdminHubPerson[] {
  const seen = new Set<string>()
  const output: AdminHubPerson[] = []

  for (const person of people) {
    const key = person.uid || person.email || person.id
    if (key && seen.has(key)) continue
    if (key) seen.add(key)
    output.push(person)
  }

  return output
}

export async function GET(request: NextRequest) {
  if (!isInternalReadAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const db = getFirestoreDb()
    if (!db) {
      return NextResponse.json({ success: false, error: "DB unavailable" }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10) || 200, 500)

    const [clientsSnap, usersSnap, workspacesSnap, projectsSnap, tasksSnap] = await Promise.all([
      db.collection("clients").limit(limit).get(),
      db.collection("users").limit(limit).get(),
      db.collection("workspaces").limit(limit).get(),
      db.collection("projects").limit(limit).get(),
      db.collection("projectTasks").limit(limit).get(),
    ])

    const rawClientDocs = clientsSnap.docs.map((doc) => serializeFirestoreDocument(doc.id, doc.data()))
    const clients = sortAdminHubByUpdated(
      rawClientDocs
        .map((doc) => normalizeAdminHubClient(String(doc.id), doc))
        .filter((client): client is NonNullable<typeof client> => Boolean(client))
    )

    const pendingPeople = rawClientDocs
      .map((doc) => normalizePendingClientPerson(String(doc.id), doc))
      .filter((person): person is NonNullable<typeof person> => Boolean(person))
    const userPeople = usersSnap.docs
      .map((doc) => normalizeUserPerson(doc.id, serializeFirestoreDocument(doc.id, doc.data())))
      .filter((person): person is NonNullable<typeof person> => Boolean(person))
    const people = sortAdminHubByUpdated(dedupePeople([...userPeople, ...pendingPeople]))

    const workspaces = sortAdminHubByUpdated(
      workspacesSnap.docs.map((doc) => normalizeAdminHubWorkspace(doc.id, serializeFirestoreDocument(doc.id, doc.data())))
    )
    const projects = sortAdminHubByUpdated(
      projectsSnap.docs.map((doc) => normalizeAdminHubProject(doc.id, serializeFirestoreDocument(doc.id, doc.data())))
    )
    const tasks = sortAdminHubByUpdated(
      tasksSnap.docs.map((doc) => normalizeAdminHubTask(doc.id, serializeFirestoreDocument(doc.id, doc.data())))
    )
    const warnings = buildAdminHubWarnings({ clients, people, workspaces, projects, tasks })

    const payload: AdminHubPayload = {
      success: true,
      data: {
        clients,
        people,
        workspaces,
        projects,
        tasks,
        warnings,
        loadedAt: new Date().toISOString(),
      },
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error("GET /api/admin/ops:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    )
  }
}
