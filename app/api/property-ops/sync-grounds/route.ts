import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import {
  RAG_PROPERTIES_COLLECTION,
  normalizeRAGProperty,
  propertyHasGroundsLink,
} from "@/lib/rag-properties"
import { syncRAGPropertyToGrounds } from "@/lib/syncPropertyToGrounds"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = getFirestoreDb()

  if (!db) {
    return NextResponse.json(
      {
        success: false,
        error: "Firebase Admin is not configured for property sync.",
      },
      { status: 500 }
    )
  }

  const snapshot = await db.collection(RAG_PROPERTIES_COLLECTION).get()
  const properties = snapshot.docs.map((documentSnapshot) =>
    normalizeRAGProperty(
      documentSnapshot.id,
      documentSnapshot.data() as Record<string, unknown>
    )
  )
  const groundsLinkedProperties = properties.filter((property) => propertyHasGroundsLink(property))
  const synced: Array<{ ragPropertyId: string; groundsPropertyId: string }> = []

  for (const property of groundsLinkedProperties) {
    const groundsPropertyId = await syncRAGPropertyToGrounds(property, db)
    await db.collection(RAG_PROPERTIES_COLLECTION).doc(property.id).set(
      {
        beamGroundsPropertyId: groundsPropertyId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    synced.push({
      ragPropertyId: property.id,
      groundsPropertyId,
    })
  }

  return NextResponse.json({
    success: true,
    syncedCount: synced.length,
    synced,
  })
}
