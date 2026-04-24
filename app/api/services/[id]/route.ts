import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import {
  normalizeRAGService,
  RAG_SERVICES_COLLECTION,
  readRAGServiceMutationFields,
} from "@/lib/rag-services"

export const dynamic = "force-dynamic"

function getServiceDocument(db: FirebaseFirestore.Firestore, id: string) {
  return db.collection(RAG_SERVICES_COLLECTION).doc(id)
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const db = getFirestoreDb()

  if (!db) {
    return NextResponse.json(
      {
        success: false,
        error: "Firebase Admin is not configured for service reads.",
      },
      { status: 500 }
    )
  }

  const params = await context.params
  const snapshot = await getServiceDocument(db, params.id).get()

  if (!snapshot.exists) {
    return NextResponse.json({ success: false, error: "Service not found." }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    service: normalizeRAGService(
      snapshot.id,
      (snapshot.data() ?? {}) as Record<string, unknown>
    ),
  })
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isInternalMutationAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = getFirestoreDb()

  if (!db) {
    return NextResponse.json(
      {
        success: false,
        error: "Firebase Admin is not configured for service writes.",
      },
      { status: 500 }
    )
  }

  const rawBody: unknown = await request.json()
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid service payload.",
      },
      { status: 400 }
    )
  }

  const patch = readRAGServiceMutationFields(rawBody as Record<string, unknown>)
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No valid service fields were provided.",
      },
      { status: 400 }
    )
  }

  const params = await context.params
  const documentRef = getServiceDocument(db, params.id)

  await documentRef.set(
    {
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  const updatedSnapshot = await documentRef.get()

  return NextResponse.json({
    success: true,
    service: normalizeRAGService(
      updatedSnapshot.id,
      (updatedSnapshot.data() ?? {}) as Record<string, unknown>
    ),
  })
}
