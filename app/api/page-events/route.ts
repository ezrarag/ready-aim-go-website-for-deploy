/**
 * POST /api/page-events
 *
 * Tracks clicks and visits on any public RAG-built page (benefit pages,
 * story pages, partner pages). Writes to Firestore so the client portal
 * can surface conversions per client.
 *
 * Body:
 *   {
 *     pageType: "benefit" | "story" | "partner" | "fleet",
 *     slug: string,           // e.g. "hroshi"
 *     clientId: string,       // Firestore client doc ID
 *     event: "view" | "cta_click" | "contact_click",
 *     metadata?: Record<string, string>  // optional: referrer, utm, etc.
 *   }
 *
 * Writes to:
 *   pageEvents/{autoId}  — individual event log
 *   clientPages/{clientId}/pages/{slug} — aggregated counts per page
 */

import { NextRequest, NextResponse } from "next/server"
import { getFirestoreDb } from "@/lib/firestore"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pageType, slug, clientId, event, metadata = {} } = body

    if (!pageType || !slug || !clientId || !event) {
      return NextResponse.json(
        { error: "Missing required fields: pageType, slug, clientId, event" },
        { status: 400 }
      )
    }

    const db = getFirestoreDb()
    if (!db) {
      return NextResponse.json(
        { error: "Firebase Admin is not configured for page event writes." },
        { status: 500 }
      )
    }
    const now = new Date()

    // 1. Write individual event to pageEvents collection
    await db.collection("pageEvents").add({
      pageType,
      slug,
      clientId,
      event,
      metadata,
      createdAt: now.toISOString(),
      url: `/${pageType}/${slug}`,
    })

    // 2. Upsert aggregated counts on the clientPages subcollection
    const pageRef = db
      .collection("clientPages")
      .doc(clientId)
      .collection("pages")
      .doc(`${pageType}__${slug}`)

    await pageRef.set(
      {
        pageType,
        slug,
        url: `/${pageType}/${slug}`,
        label: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " "),
        lastEventAt: now.toISOString(),
        [`counts.${event}`]: FieldValue.increment(1),
        counts: { [event]: FieldValue.increment(1) },
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[page-events] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
