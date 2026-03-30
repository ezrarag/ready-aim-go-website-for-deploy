import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getFirestoreDb } from "@/lib/firestore"
import { FLEET_COLLECTION_PATH, FLEET_SEED_VEHICLES } from "@/lib/fleet"

export const dynamic = "force-dynamic"

function getFleetCollection(db: FirebaseFirestore.Firestore) {
  return db
    .collection(FLEET_COLLECTION_PATH[0])
    .doc(FLEET_COLLECTION_PATH[1])
    .collection(FLEET_COLLECTION_PATH[2])
}

export async function POST() {
  const db = getFirestoreDb()

  if (!db) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Firebase Admin is not configured. Set the server-side Firebase service account variables before seeding fleet data.",
      },
      { status: 500 }
    )
  }

  const collectionRef = getFleetCollection(db)
  const existingSnapshot = await collectionRef.limit(1).get()

  if (!existingSnapshot.empty) {
    return NextResponse.json({ success: true, seeded: false, count: existingSnapshot.size })
  }

  const batch = db.batch()

  for (const vehicle of FLEET_SEED_VEHICLES) {
    const documentRef = collectionRef.doc()
    batch.set(documentRef, {
      ...vehicle,
      id: documentRef.id,
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  await batch.commit()

  return NextResponse.json({
    success: true,
    seeded: true,
    count: FLEET_SEED_VEHICLES.length,
  })
}
