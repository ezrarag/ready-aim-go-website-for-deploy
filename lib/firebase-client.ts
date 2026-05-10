"use client"

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app"
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth"
import { doc, getDoc, getFirestore, type Firestore } from "firebase/firestore"
import {
  formatRagDevtoolsFirebaseConfigValidation,
  hasRagDevtoolsFirebaseConfig,
  ragDevtoolsFirebaseConfig,
} from "@/lib/devtools/publicConfig"
import type { ClientMembership, UserRole } from "@/lib/types/client-membership"

export type ClientUserProfile = {
  // ── Legacy fields — preserved; admin gate uses profile.role === "admin" ──
  role?: string
  full_name?: string
  avatar_url?: string
  email?: string
  /** Legacy single-clientId (still written by client-account route). */
  client_id?: string

  // ── Canonical membership contract (additive) ──────────────────────────────
  /** All clientIds this user is allowed to access. */
  clientIds?: string[]
  /** Canonical role for the user's primary/active client. */
  userRole?: UserRole
  /** Per-client membership records keyed by clientId. */
  memberships?: Record<string, ClientMembership>
}

let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let firestoreDb: Firestore | null = null

function readClientFirebaseConfig() {
  return {
    apiKey: ragDevtoolsFirebaseConfig.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY,
    authDomain: ragDevtoolsFirebaseConfig.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN,
    projectId: ragDevtoolsFirebaseConfig.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID,
    storageBucket: ragDevtoolsFirebaseConfig.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId:
      ragDevtoolsFirebaseConfig.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_MESSAGING_SENDER_ID || undefined,
    appId: ragDevtoolsFirebaseConfig.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID,
  }
}

function assertClientFirebaseConfig() {
  if (!hasRagDevtoolsFirebaseConfig()) {
    throw new Error(formatRagDevtoolsFirebaseConfigValidation())
  }
}

export function getClientFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp
  }

  assertClientFirebaseConfig()
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(readClientFirebaseConfig())
  return firebaseApp
}

export function getClientAuth() {
  if (firebaseAuth) {
    return firebaseAuth
  }

  firebaseAuth = getAuth(getClientFirebaseApp())
  return firebaseAuth
}

export function getClientFirestore() {
  if (firestoreDb) {
    return firestoreDb
  }

  firestoreDb = getFirestore(getClientFirebaseApp())
  return firestoreDb
}

export async function ensureAuthPersistence() {
  const auth = getClientAuth()

  try {
    await setPersistence(auth, browserLocalPersistence)
  } catch {
    await setPersistence(auth, browserSessionPersistence)
  }

  return auth
}

export function createGoogleProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: "select_account" })
  return provider
}

export async function getClientUserProfile(uid: string): Promise<ClientUserProfile | null> {
  const snapshot = await getDoc(doc(getClientFirestore(), "users", uid))
  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data()

  // ── Legacy fields ────────────────────────────────────────────────────────
  const profile: ClientUserProfile = {
    role: typeof data.role === "string" ? data.role : undefined,
    full_name: typeof data.full_name === "string" ? data.full_name : undefined,
    avatar_url: typeof data.avatar_url === "string" ? data.avatar_url : undefined,
    email: typeof data.email === "string" ? data.email : undefined,
    client_id: typeof data.client_id === "string" ? data.client_id : undefined,
  }

  // ── Membership contract (new, additive) ──────────────────────────────────
  if (Array.isArray(data.clientIds) && data.clientIds.length > 0) {
    profile.clientIds = (data.clientIds as unknown[]).filter(
      (v): v is string => typeof v === "string"
    )
  } else if (profile.client_id) {
    // Back-fill from legacy field so callers always get a consistent array
    profile.clientIds = [profile.client_id]
  }

  if (data.memberships && typeof data.memberships === "object" && !Array.isArray(data.memberships)) {
    profile.memberships = data.memberships as Record<string, ClientMembership>
  }

  if (typeof data.userRole === "string") {
    profile.userRole = data.userRole as UserRole
  } else if (profile.client_id) {
    // Legacy single-client users are implicitly owners
    profile.userRole = "owner"
  }

  return profile
}
