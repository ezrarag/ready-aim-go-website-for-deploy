import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import {
  RAG_PROPERTIES_COLLECTION,
  computeRAGPropertySummary,
  normalizeRAGProperty,
  readRAGPropertyMutationFields,
  sortRAGProperties,
} from "@/lib/rag-properties"

export const dynamic = "force-dynamic"

function getPropertyCollection(db: FirebaseFirestore.Firestore) {
  return db.collection(RAG_PROPERTIES_COLLECTION)
}

export async function GET(request: NextRequest) {
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

  const includePrivate =
    request.nextUrl.searchParams.get("includePrivate") === "true" ||
    request.nextUrl.searchParams.get("includePrivate") === "1"

  const snapshot = await getPropertyCollection(db).get()
  const properties = sortRAGProperties(
    snapshot.docs.map((documentSnapshot) =>
      normalizeRAGProperty(
        documentSnapshot.id,
        documentSnapshot.data() as Record<string, unknown>
      )
    )
  )

  const visibleProperties = includePrivate
    ? properties
    : properties.filter((property) => property.isPublic)

  return NextResponse.json({
    success: true,
    properties: visibleProperties,
    summary: computeRAGPropertySummary(properties),
  })
}

export async function POST(request: NextRequest) {
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
  const payload = readRAGPropertyMutationFields(body)

  const requiredFields = [
    payload.name,
    payload.address,
    payload.city,
    payload.state,
    payload.zip,
    payload.node,
    payload.publicName,
    payload.publicSummary,
    payload.createdBy,
  ]

  if (
    requiredFields.some((value) => typeof value !== "string" || value.trim().length === 0) ||
    typeof payload.lat !== "number" ||
    typeof payload.lng !== "number" ||
    !payload.propertyClass ||
    !payload.status
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Name, address, location, node, public fields, class, status, coordinates, and createdBy are required.",
      },
      { status: 400 }
    )
  }

  const documentRef = getPropertyCollection(db).doc()

  await documentRef.set({
    ...payload,
    id: documentRef.id,
    isPublic: typeof payload.isPublic === "boolean" ? payload.isPublic : false,
    ngoLinks: Array.isArray(payload.ngoLinks) ? payload.ngoLinks : [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  const createdSnapshot = await documentRef.get()

  return NextResponse.json({
    success: true,
    property: normalizeRAGProperty(
      createdSnapshot.id,
      (createdSnapshot.data() ?? {}) as Record<string, unknown>
    ),
  })
}
