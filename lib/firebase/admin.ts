import type { Firestore } from "firebase-admin/firestore"

import { getFirestoreDb, getStorageBucket } from "@/lib/firestore"

export function getAdminDb(): Firestore {
  const db = getFirestoreDb()

  if (!db) {
    throw new Error("Firebase Admin is not configured.")
  }

  return db
}

export function getAdminStorage() {
  const bucket = getStorageBucket()

  if (!bucket) {
    throw new Error("Firebase Admin Storage is not configured.")
  }

  return bucket
}
