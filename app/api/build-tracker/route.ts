/**
 * /api/build-tracker
 *
 * CRUD for RAG build tracker projects and tasks.
 * Firestore collections:
 *   buildProjects/{projectId}          — project cards
 *   buildProjects/{projectId}/tasks/{taskId}  — tasks per project
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { FieldValue } from "firebase-admin/firestore"

const SEED_PROJECTS = [
  {
    id: "readyaimgo-biz",
    name: "readyaimgo.biz",
    repo: "ready-aim-go-website-for-deploy",
    url: "https://readyaimgo.biz",
    color: "orange",
    description: "Main RAG platform — roles, fleet, client handoff, admin dashboard",
    tasks: [
      { title: "Add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET env vars to Vercel", category: "env", status: "pending" },
      { title: "Add OUTLOOK_CLIENT_ID + OUTLOOK_CLIENT_SECRET + OUTLOOK_TENANT_ID env vars", category: "env", status: "pending" },
      { title: "Add ANTHROPIC_API_KEY env var", category: "env", status: "pending" },
      { title: "Add NEXT_PUBLIC_APP_URL=https://readyaimgo.biz env var", category: "env", status: "pending" },
      { title: "Run one-time Google OAuth flow at /api/auth/google/callback", category: "setup", status: "pending" },
      { title: "Run one-time Outlook OAuth flow at /api/auth/outlook/callback", category: "setup", status: "pending" },
      { title: "Add gmail.readonly + calendar.readonly scopes to Google Cloud OAuth consent screen", category: "setup", status: "pending" },
      { title: "Install googleapis npm package", category: "setup", status: "pending" },
      { title: "Add Vercel cron jobs for Gmail + Outlook sync", category: "setup", status: "pending" },
      { title: "Build /dashboard/admin/services auto-invoice detection from comms sync", category: "feature", status: "pending" },
      { title: "Build /dashboard/clients/[id]/value-profile page (threshold + payment layer)", category: "feature", status: "pending" },
      { title: "Build /dashboard/admin/build-tracker (this page)", category: "feature", status: "done" },
      { title: "Wire ClientPagesPanel into clients.readyaimgo.biz portal", category: "feature", status: "done" },
      { title: "Build page-events API and benefit page click tracking", category: "feature", status: "done" },
      { title: "Push raCommand to GitHub and verify simulator build workflow", category: "ops", status: "pending" },
      { title: "Push readyaimgoOperator to GitHub", category: "ops", status: "pending" },
    ],
  },
  {
    id: "clients-readyaimgo-biz",
    name: "clients.readyaimgo.biz",
    repo: "clients.readyaimgo.biz",
    url: "https://clients.readyaimgo.biz",
    color: "blue",
    description: "Client portal — feedback, deliverables, RAG notes, Your Pages panel",
    tasks: [
      { title: "Confirm ClientPagesPanel renders correctly for Hroshi (Maia)", category: "qa", status: "pending" },
      { title: "Build Investment tab (Stripe payment input, threshold reveals)", category: "feature", status: "pending" },
      { title: "Build Infrastructure tab (live cost breakdown from services collection)", category: "feature", status: "pending" },
      { title: "Build Deliverables tab (locked/unlocked by payment tier)", category: "feature", status: "pending" },
      { title: "Add comms timeline view per client (Gmail + Outlook threads)", category: "feature", status: "pending" },
    ],
  },
  {
    id: "transportation-beamthinktank-space",
    name: "transportation.beamthinktank.space",
    repo: "transportation.beamthinktank.space",
    url: "https://transportation.beamthinktank.space",
    color: "green",
    description: "BEAM Transportation — cohort role browser, live roles from RAG endpoint",
    tasks: [
      { title: "Verify CohortRoleBrowser fetches from live RAG roles endpoint", category: "qa", status: "pending" },
      { title: "Add route registration flow for BEAM participants", category: "feature", status: "pending" },
    ],
  },
  {
    id: "health-beamthinktank-space",
    name: "health.beamthinktank.space",
    repo: "health.beamthinktank.space",
    url: "https://health.beamthinktank.space",
    color: "teal",
    description: "BEAM Health — not started, next BEAM subdomain to build",
    tasks: [
      { title: "Define scope and page structure for BEAM Health", category: "planning", status: "pending" },
      { title: "Create repo and Vercel project", category: "setup", status: "pending" },
      { title: "Build initial landing + cohort registration", category: "feature", status: "pending" },
    ],
  },
  {
    id: "finance-beamthinktank-space",
    name: "finance.beamthinktank.space",
    repo: "finance.beamthinktank.space",
    url: "https://finance.beamthinktank.space",
    color: "purple",
    description: "BEAM Finance — recently built, commit push pending",
    tasks: [
      { title: "Draft and push commit message", category: "ops", status: "pending" },
      { title: "Verify Vercel deployment", category: "qa", status: "pending" },
    ],
  },
  {
    id: "paynepros-com",
    name: "paynepros.com",
    repo: "paynepros.com",
    url: "https://paynepros.com",
    color: "gold",
    description: "PaynePros — admin message triage starting with Gmail, expanding to all channels",
    tasks: [
      { title: "Build unified message triage interface (Gmail first)", category: "feature", status: "pending" },
      { title: "Configure Google Cloud OAuth for paynepros.com", category: "setup", status: "pending" },
      { title: "Expand triage to Outlook, WhatsApp", category: "feature", status: "pending" },
    ],
  },
  {
    id: "racommand",
    name: "raCommand (iOS)",
    repo: "raCommand",
    url: null,
    color: "slate",
    description: "Native iOS/macOS project management — GitHub, client provisioning, AI notes",
    tasks: [
      { title: "Create raCommand repo on GitHub under ezrarag", category: "setup", status: "pending" },
      { title: "Push local raCommand to GitHub", category: "ops", status: "pending" },
      { title: "Verify simulator build workflow runs on push", category: "qa", status: "pending" },
      { title: "Add build-tracker feature: scaffold Fastlane for new app projects", category: "feature", status: "pending" },
    ],
  },
  {
    id: "readyaimgo-operator",
    name: "readyaimgoOperator (iOS)",
    repo: "readyaimgoOperator",
    url: null,
    color: "slate",
    description: "Operator app — iOS, structure mirrors raCommand",
    tasks: [
      { title: "Create readyaimgoOperator repo on GitHub", category: "setup", status: "pending" },
      { title: "Push local readyaimgoOperator to GitHub", category: "ops", status: "pending" },
      { title: "Verify simulator build workflow runs on push", category: "qa", status: "pending" },
    ],
  },
]

// ── GET — fetch all projects with tasks ───────────────────────────────────────

export async function GET() {
  const db = getFirestoreDb()
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured for build tracker reads." },
      { status: 500 }
    )
  }

  // Check if seeding is needed
  const existingSnap = await db.collection("buildProjects").limit(1).get()
  const needsSeed = existingSnap.empty

  if (needsSeed) {
    const batch = db.batch()
    for (const project of SEED_PROJECTS) {
      const { tasks, ...projectData } = project
      const projectRef = db.collection("buildProjects").doc(project.id)
      batch.set(projectRef, { ...projectData, createdAt: new Date().toISOString() })
      for (const task of tasks) {
        const taskRef = projectRef.collection("tasks").doc()
        batch.set(taskRef, { ...task, createdAt: new Date().toISOString() })
      }
    }
    await batch.commit()
  }

  // Fetch all projects
  const projectsSnap = await db.collection("buildProjects").orderBy("createdAt").get()
  const projects = await Promise.all(
    projectsSnap.docs.map(async (doc) => {
      const tasksSnap = await doc.ref.collection("tasks").orderBy("createdAt").get()
      return {
        id: doc.id,
        ...doc.data(),
        tasks: tasksSnap.docs.map((t) => ({ id: t.id, ...t.data() })),
      }
    })
  )

  return NextResponse.json({ projects, seeded: needsSeed })
}

// ── POST — add task or update task status ─────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = getFirestoreDb()
  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin is not configured for build tracker writes." },
      { status: 500 }
    )
  }

  // Update task status
  if (body.action === "updateTaskStatus") {
    const { projectId, taskId, status } = body
    await db
      .collection("buildProjects")
      .doc(projectId)
      .collection("tasks")
      .doc(taskId)
      .update({ status, updatedAt: new Date().toISOString() })
    return NextResponse.json({ ok: true })
  }

  // Add new task
  if (body.action === "addTask") {
    const { projectId, title, category } = body
    const ref = await db
      .collection("buildProjects")
      .doc(projectId)
      .collection("tasks")
      .add({
        title,
        category: category ?? "feature",
        status: "pending",
        createdAt: new Date().toISOString(),
      })
    return NextResponse.json({ ok: true, taskId: ref.id })
  }

  // Add new project
  if (body.action === "addProject") {
    const { id, name, repo, url, color, description } = body
    await db.collection("buildProjects").doc(id).set({
      name, repo, url, color, description,
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true })
  }

  // Generate Claude prompt for a task or project focus
  if (body.action === "generatePrompt") {
    const { projectName, repo, focusArea, context } = body
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a senior engineering assistant for ReadyAimGo (RAG), a web and app development agency.
Your job is to generate a precise, context-rich prompt that Ezra (the founder) can paste directly into Claude Desktop or OpenAI Codex to get code written.

The prompt must:
1. State the repo/project context clearly
2. Name the specific task to complete
3. Reference any existing files or patterns to follow
4. Specify the tech stack (Next.js 14 App Router, Firestore, Tailwind, TypeScript)
5. Be ready to paste — no setup needed, no questions
6. End with the expected output (file path, component name, etc.)

Keep it under 200 words. Be specific. Be tactical.`,
        messages: [
          {
            role: "user",
            content: `Project: ${projectName}\nRepo: ${repo}\nTask/Focus: ${focusArea}\nAdditional context: ${context ?? "none"}`,
          },
        ],
      }),
    })

    const data = await res.json()
    const prompt = data.content?.[0]?.text ?? "Could not generate prompt."
    return NextResponse.json({ ok: true, prompt })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
