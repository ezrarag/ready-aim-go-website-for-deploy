/**
 * GET /api/command
 *
 * Aggregates everything into one payload for the Command Center dashboard.
 * Pulls from Firestore in parallel — tasks, messages, calendar events,
 * pending payments, build tracker, and personal calendar.
 *
 * Segments:
 *   rag      — client work, builds, deployments
 *   beam     — nonprofit programs, participants
 *   personal — Ezra's performances, rehearsals, personal appointments
 *
 * All data is tagged by segment at write time. The command API filters
 * and returns all three segments in one response.
 */

import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"

// How far back/forward to look for calendar events
const PAST_HOURS = 2
const FUTURE_DAYS = 7

export async function GET() {
  try {
    const db = getAdminDb()
    const now = new Date()
    const pastCutoff = new Date(now.getTime() - PAST_HOURS * 60 * 60 * 1000).toISOString()
    const futureCutoff = new Date(now.getTime() + FUTURE_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    // ── Parallel Firestore reads ────────────────────────────────────────────
    const [
      tasksSnap,
      messagesSnap,
      eventsSnap,
      pendingActionsSnap,
      buildProjectsSnap,
    ] = await Promise.all([
      // Open tasks across all segments
      db.collection("tasks")
        .where("status", "in", ["pending", "in-progress", "blocked"])
        .orderBy("createdAt", "desc")
        .limit(50)
        .get(),

      // Recent unprocessed messages
      db.collection("clientMessages")
        .where("intentProcessed", "==", false)
        .orderBy("createdAt", "desc")
        .limit(30)
        .get(),

      // Upcoming calendar events (all sources)
      db.collection("calendarEvents")
        .where("start", ">=", pastCutoff)
        .where("start", "<=", futureCutoff)
        .orderBy("start", "asc")
        .limit(50)
        .get(),

      // Payment links waiting to be sent
      db.collection("pendingActions")
        .where("type", "==", "payment_link")
        .where("status", "==", "pending_send")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get(),

      // Build tracker — pending env vars and blocked tasks
      db.collection("buildProjects")
        .limit(20)
        .get(),
    ])

    // ── Process tasks ─────────────────────────────────────────────────────
    const tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const ragTasks = tasks.filter((t: any) => !t.segment || t.segment === "rag")
    const beamTasks = tasks.filter((t: any) => t.segment === "beam")
    const personalTasks = tasks.filter((t: any) => t.segment === "personal")

    // ── Process messages ──────────────────────────────────────────────────
    const messages = messagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // ── Process calendar events ───────────────────────────────────────────
    const events = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const todayEvents = events.filter((e: any) => {
      const start = new Date(e.start)
      return start >= todayStart && start <= todayEnd
    })
    const upcomingEvents = events.filter((e: any) => {
      const start = new Date(e.start)
      return start > todayEnd
    })

    // Segment events by type
    const ragEvents = events.filter((e: any) => !e.segment || e.segment === "rag")
    const beamEvents = events.filter((e: any) => e.segment === "beam")
    const personalEvents = events.filter((e: any) => e.segment === "personal")

    // ── Detect conflicts ──────────────────────────────────────────────────
    // Simple overlap detection — events within 30 min of each other
    const conflicts: Array<{ event1: any; event2: any }> = []
    for (let i = 0; i < todayEvents.length; i++) {
      for (let j = i + 1; j < todayEvents.length; j++) {
        const a = new Date((todayEvents[i] as any).start).getTime()
        const b = new Date((todayEvents[j] as any).start).getTime()
        if (Math.abs(a - b) < 30 * 60 * 1000) {
          conflicts.push({ event1: todayEvents[i], event2: todayEvents[j] })
        }
      }
    }

    // ── Build tracker summary ─────────────────────────────────────────────
    const buildTrackerSummary: Array<{
      projectId: string
      name: string
      pendingEnvVars: number
      blockedTasks: number
    }> = []

    for (const projectDoc of buildProjectsSnap.docs) {
      const tasksSnap2 = await projectDoc.ref
        .collection("tasks")
        .where("status", "in", ["pending", "blocked"])
        .get()

      const projectTasks = tasksSnap2.docs.map((d) => d.data())
      const envVarTasks = projectTasks.filter((t) => t.category === "env")
      const blockedTasks = projectTasks.filter((t) => t.status === "blocked")

      if (envVarTasks.length > 0 || blockedTasks.length > 0) {
        buildTrackerSummary.push({
          projectId: projectDoc.id,
          name: projectDoc.data().name,
          pendingEnvVars: envVarTasks.length,
          blockedTasks: blockedTasks.length,
        })
      }
    }

    // ── Pending payments ──────────────────────────────────────────────────
    const pendingPayments = pendingActionsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))

    // ── Summary counts ────────────────────────────────────────────────────
    const summary = {
      totalUnreadMessages: messages.length,
      totalOpenTasks: tasks.length,
      totalTodayEvents: todayEvents.length,
      totalConflicts: conflicts.length,
      totalPendingPayments: pendingPayments.length,
      totalEnvVarsPending: buildTrackerSummary.reduce((s, p) => s + p.pendingEnvVars, 0),
    }

    return NextResponse.json({
      ok: true,
      fetchedAt: now.toISOString(),
      summary,
      segments: {
        rag: {
          tasks: ragTasks,
          events: ragEvents,
        },
        beam: {
          tasks: beamTasks,
          events: beamEvents,
        },
        personal: {
          tasks: personalTasks,
          events: personalEvents,
        },
      },
      today: {
        events: todayEvents,
        conflicts,
      },
      upcoming: upcomingEvents.slice(0, 10),
      messages: messages.slice(0, 10),
      pendingPayments,
      buildTracker: buildTrackerSummary,
    })
  } catch (err) {
    console.error("[command]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load command center" },
      { status: 500 }
    )
  }
}
