import { NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getFirestoreDb } from "@/lib/firestore"
import { isInternalMutationAuthorized } from "@/lib/internal-api-auth"
import {
  getRAGServiceSeed,
  normalizeRAGService,
  RAG_SERVICES_COLLECTION,
  readRAGServiceMutationFields,
  sortRAGServices,
} from "@/lib/rag-services"

export const dynamic = "force-dynamic"

function getServicesCollection(db: FirebaseFirestore.Firestore) {
  return db.collection(RAG_SERVICES_COLLECTION)
}

async function seedServicesIfEmpty(db: FirebaseFirestore.Firestore) {
  const collectionRef = getServicesCollection(db)
  const existingSnapshot = await collectionRef.limit(1).get()

  if (!existingSnapshot.empty) {
    return { seeded: false }
  }

  const batch = db.batch()
  const seedServices = getRAGServiceSeed()

  for (const service of seedServices) {
    const documentRef = collectionRef.doc()
    batch.set(documentRef, {
      ...service,
      id: documentRef.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  await batch.commit()

  return { seeded: true }
}

export async function GET() {
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

  const seedResult = await seedServicesIfEmpty(db)
  const snapshot = await getServicesCollection(db).get()
  const services = sortRAGServices(
    snapshot.docs.map((documentSnapshot) =>
      normalizeRAGService(
        documentSnapshot.id,
        (documentSnapshot.data() ?? {}) as Record<string, unknown>
      )
    )
  )

  return NextResponse.json({
    success: true,
    services,
    seeded: seedResult.seeded,
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
  const requiredFields = [patch.name, patch.vendor, patch.category, patch.nextDueDate]

  if (
    requiredFields.some((value) => typeof value !== "string" || value.trim().length === 0) ||
    typeof patch.monthlyCost !== "number"
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Name, vendor, category, monthlyCost, and nextDueDate are required to create a service.",
      },
      { status: 400 }
    )
  }

  const documentRef = getServicesCollection(db).doc()

  await documentRef.set({
    ...patch,
    id: documentRef.id,
    receiptUrl: patch.receiptUrl || "",
    notes: patch.notes || "",
    dependentProjects: Array.isArray(patch.dependentProjects) ? patch.dependentProjects : [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  const createdSnapshot = await documentRef.get()

  return NextResponse.json({
    success: true,
    service: normalizeRAGService(
      createdSnapshot.id,
      (createdSnapshot.data() ?? {}) as Record<string, unknown>
    ),
  })
}
