import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import {
  RAG_PROPERTIES_COLLECTION,
  normalizeRAGProperty,
  readRAGPropertyMutationFields,
} from "@/lib/rag-properties"

export const dynamic = "force-dynamic"

function getPropertyDocument(db: FirebaseFirestore.Firestore, id: string) {
  return db.collection(RAG_PROPERTIES_COLLECTION).doc(id)
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const db = getFirestoreDb()

  if (!db) {
    return NextResponse.json(
      {
        success: false,
        error: "Firebase Admin is not configured for property reads.",
      },
      { status: 500 }
    )
  }

  const params = await context.params
  const includePrivate =
    request.nextUrl.searchParams.get("includePrivate") === "true" ||
    request.nextUrl.searchParams.get("includePrivate") === "1"
  const snapshot = await getPropertyDocument(db, params.id).get()

  if (!snapshot.exists) {
    return NextResponse.json({ success: false, error: "Property not found." }, { status: 404 })
  }

  const property = normalizeRAGProperty(
    snapshot.id,
    (snapshot.data() ?? {}) as Record<string, unknown>
  )

  if (!includePrivate && !property.isPublic) {
    return NextResponse.json({ success: false, error: "Property not found." }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    property,
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
        error: "Firebase Admin is not configured for property writes.",
      },
      { status: 500 }
    )
  }

  const rawBody: unknown = await request.json()
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid property payload.",
      },
      { status: 400 }
    )
  }

  const body = rawBody as Record<string, unknown>
  const patch = readRAGPropertyMutationFields(body)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No valid property fields were provided.",
      },
      { status: 400 }
    )
  }

  const params = await context.params
  const documentRef = getPropertyDocument(db, params.id)

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
    property: normalizeRAGProperty(
      updatedSnapshot.id,
      (updatedSnapshot.data() ?? {}) as Record<string, unknown>
    ),
  })
}
