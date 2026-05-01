import type { Firestore } from "firebase-admin/firestore"

import { getFirestoreDb } from "@/lib/firestore"

export function getAdminDb(): Firestore {
  const db = getFirestoreDb()

  if (!db) {
    throw new Error("Firebase Admin is not configured.")
  }

  return db
}
