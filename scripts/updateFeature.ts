#!/usr/bin/env npx ts-node
/**
 * scripts/updateFeature.ts
 *
 * CLI script for updating build tracker task status from Codex or terminal.
 * Run at the end of any Codex build session to mark work as done.
 *
 * Usage:
 *   npx ts-node scripts/updateFeature.ts --project readyaimgo-biz --id "task-id" --status done
 *   npx ts-node scripts/updateFeature.ts --client mkeblack --id marketplace-filter --status done
 *
 * Flags:
 *   --project <projectId>   RAG internal project (buildProjects collection)
 *   --client <clientId>     Client project (clientProjects collection)
 *   --id <taskId|featureId> The task or feature ID to update
 *   --status <status>       pending | in-progress | blocked | done
 *   --note <text>           Optional note to attach
 *   --list                  List all tasks/features for a project or client
 *
 * Examples:
 *   # Mark a RAG internal task as done
 *   npx ts-node scripts/updateFeature.ts --project clients-readyaimgo-biz --id "abc123" --status done
 *
 *   # Mark a client feature as done
 *   npx ts-node scripts/updateFeature.ts --client mkeblack --id marketplace-filter --status done
 *
 *   # List all tasks for a project
 *   npx ts-node scripts/updateFeature.ts --project readyaimgo-biz --list
 *
 *   # List all features for a client
 *   npx ts-node scripts/updateFeature.ts --client hroshi --list
 */

import * as admin from "firebase-admin"
import * as fs from "fs"
import * as path from "path"

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const equalsIndex = trimmed.indexOf("=")
    if (equalsIndex === -1) continue

    const key = trimmed.slice(0, equalsIndex).trim()
    let value = trimmed.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"))

// Init Firebase Admin
if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error("❌ FIREBASE_SERVICE_ACCOUNT_KEY is not set in .env.local")
    process.exit(1)
  }
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
  })
}

const db = admin.firestore()

// ── Parse args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const get = (flag: string): string | null => {
  const idx = args.indexOf(flag)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null
}
const has = (flag: string) => args.includes(flag)

const projectId = get("--project")
const clientId  = get("--client")
const featureId = get("--id")
const status    = get("--status")
const note      = get("--note")
const listMode  = has("--list")

const VALID_STATUSES = ["pending", "in-progress", "blocked", "done"]

// ── List mode ──────────────────────────────────────────────────────────────────

async function listTasks() {
  if (projectId) {
    const projectDoc = await db.collection("buildProjects").doc(projectId).get()
    if (!projectDoc.exists) {
      console.error(`❌ Project not found: ${projectId}`)
      process.exit(1)
    }
    const tasksSnap = await db
      .collection("buildProjects").doc(projectId)
      .collection("tasks").orderBy("createdAt").get()

    console.log(`\n📦 ${projectDoc.data()?.name} — ${tasksSnap.size} tasks\n`)
    tasksSnap.docs.forEach((doc) => {
      const t = doc.data()
      const icon = t.status === "done" ? "✅" : t.status === "blocked" ? "🔴" : t.status === "in-progress" ? "🔵" : "⬜"
      console.log(`  ${icon} [${doc.id}] ${t.title} (${t.status})`)
    })
    console.log()
  } else if (clientId) {
    const featuresSnap = await db
      .collection("clientProjects").doc(clientId)
      .collection("features").orderBy("category").get()

    console.log(`\n👤 Client: ${clientId} — ${featuresSnap.size} features\n`)
    featuresSnap.docs.forEach((doc) => {
      const f = doc.data()
      const icon = f.status === "done" ? "✅" : f.status === "blocked" ? "🔴" : f.status === "in-progress" ? "🔵" : "⬜"
      console.log(`  ${icon} [${doc.id}] ${f.name} — ${f.category} (${f.status})`)
    })
    console.log()
  } else {
    // List all projects
    const projectsSnap = await db.collection("buildProjects").orderBy("createdAt").get()
    console.log(`\n📋 RAG Build Projects (${projectsSnap.size})\n`)
    for (const doc of projectsSnap.docs) {
      const tasksSnap = await doc.ref.collection("tasks").get()
      const done = tasksSnap.docs.filter((t) => t.data().status === "done").length
      console.log(`  ${doc.data().name} — ${done}/${tasksSnap.size} done [id: ${doc.id}]`)
    }
    console.log()
  }
}

// ── Update mode ────────────────────────────────────────────────────────────────

async function updateFeature() {
  if (!featureId) {
    console.error("❌ --id is required")
    process.exit(1)
  }
  if (!status || !VALID_STATUSES.includes(status)) {
    console.error(`❌ --status must be one of: ${VALID_STATUSES.join(", ")}`)
    process.exit(1)
  }

  const updatedAt = new Date().toISOString()
  const updateData: Record<string, string> = { status, updatedAt }
  if (note) updateData.note = note

  if (clientId) {
    // Update client feature
    const ref = db
      .collection("clientProjects").doc(clientId)
      .collection("features").doc(featureId)

    const doc = await ref.get()
    if (!doc.exists) {
      console.error(`❌ Feature not found: clientProjects/${clientId}/features/${featureId}`)
      process.exit(1)
    }

    await ref.update(updateData)
    const feature = doc.data()!
    const icon = status === "done" ? "✅" : status === "blocked" ? "🔴" : status === "in-progress" ? "🔵" : "⬜"
    console.log(`\n${icon} Updated: ${feature.name}`)
    console.log(`   Client: ${clientId}`)
    console.log(`   Status: ${status}`)
    if (note) console.log(`   Note: ${note}`)
    console.log()

  } else if (projectId) {
    // Update RAG internal task by document ID
    const ref = db
      .collection("buildProjects").doc(projectId)
      .collection("tasks").doc(featureId)

    const doc = await ref.get()
    if (!doc.exists) {
      console.error(`❌ Task not found: buildProjects/${projectId}/tasks/${featureId}`)
      console.log("   Run with --list to see available task IDs")
      process.exit(1)
    }

    await ref.update(updateData)
    const task = doc.data()!
    const icon = status === "done" ? "✅" : status === "blocked" ? "🔴" : status === "in-progress" ? "🔵" : "⬜"
    console.log(`\n${icon} Updated: ${task.title}`)
    console.log(`   Project: ${projectId}`)
    console.log(`   Status: ${status}`)
    if (note) console.log(`   Note: ${note}`)
    console.log()

  } else {
    console.error("❌ Must specify either --project or --client")
    process.exit(1)
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  try {
    if (listMode) {
      await listTasks()
    } else {
      await updateFeature()
    }
    process.exit(0)
  } catch (err) {
    console.error("❌ Error:", err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
