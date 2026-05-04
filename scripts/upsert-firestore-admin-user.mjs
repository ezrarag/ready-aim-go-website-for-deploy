#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

const DEFAULT_EMAIL = "ezra@readyaimgo.biz"

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key] !== undefined) continue

    let value = rawValue.trim()
    const quote = value[0]
    if ((quote === `"` || quote === `'`) && value[value.length - 1] === quote) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

function parseArgs(argv) {
  const args = {
    email: DEFAULT_EMAIL,
    uid: "",
    dryRun: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--dry-run") {
      args.dryRun = true
      continue
    }
    if (arg === "--email") {
      args.email = argv[++i] || ""
      continue
    }
    if (arg === "--uid") {
      args.uid = argv[++i] || ""
      continue
    }
    if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  args.email = args.email.trim().toLowerCase()
  args.uid = args.uid.trim()
  return args
}

function printHelp() {
  console.log(`Usage:
  npm run firebase:seed-admin
  npm run firebase:seed-admin -- --email ezra@readyaimgo.biz
  npm run firebase:seed-admin -- --uid FIREBASE_AUTH_UID --email ezra@readyaimgo.biz
  npm run firebase:seed-admin -- --dry-run

Creates or updates Firestore users/{uid} with:
  role: "admin"
  email: <email>

If --uid is omitted, the script looks up the Firebase Authentication user by email.`)
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function readCredential() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()
  if (serviceAccountKey?.startsWith("{")) {
    const parsed = JSON.parse(serviceAccountKey)
    if (typeof parsed.private_key === "string" && typeof parsed.client_email === "string") {
      return cert(parsed)
    }
  }

  const projectId = getRequiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL?.trim() ||
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() ||
    process.env.FIREBASE_AMIN_CLIENT_EMAIL?.trim()
  const privateKey = (
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    ""
  )
    .trim()
    .replace(/\\n/g, "\n")

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY, or set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY."
    )
  }

  return cert({ projectId, clientEmail, privateKey })
}

async function resolveUid(auth, { uid, email }) {
  if (uid) return uid

  try {
    const user = await auth.getUserByEmail(email)
    return user.uid
  } catch (error) {
    if (error?.code === "auth/user-not-found") {
      throw new Error(
        `No Firebase Authentication user exists for ${email}. Sign in with Google once, then rerun this script, or pass --uid from the Authentication users tab.`
      )
    }
    throw error
  }
}

async function main() {
  loadDotEnv(path.resolve(process.cwd(), ".env.local"))

  const args = parseArgs(process.argv.slice(2))
  if (!args.email) {
    throw new Error("Email is required. Pass --email name@example.com.")
  }

  if (getApps().length === 0) {
    initializeApp({ credential: readCredential() })
  }

  const auth = getAuth()
  const db = getFirestore()
  const uid = await resolveUid(auth, args)
  const userRef = db.collection("users").doc(uid)
  const payload = {
    role: "admin",
    email: args.email,
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (args.dryRun) {
    const existing = await userRef.get()
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          authUid: uid,
          firestorePath: `users/${uid}`,
          existing: existing.exists,
          write: { role: payload.role, email: payload.email },
        },
        null,
        2
      )
    )
    return
  }

  await userRef.set(
    {
      ...payload,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  console.log(`Admin user document is ready: users/${uid} (${args.email})`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
