#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const DEFAULT_VISIBILITY = {
  story: true,
  roster: true,
  projects: true,
  files: true,
  services: true,
  products: true,
  pricing: true,
  people: true,
  fleet: true,
  properties: true,
  benefits: true,
  partners: true,
}

const DEFAULT_PUBLIC_PROFILE = {
  visibility: DEFAULT_VISIBILITY,
  growth: {
    platformTenureStart: "",
    projectsCompleted: 0,
    activeFleetSize: 0,
  },
  discoveryFlow: {
    introVideoUrl: "",
    demoVideoUrl: "",
    caseStudyVideoUrl: "",
    primaryCtaLabel: "",
    primaryCtaUrl: "",
    secondaryCtaLabel: "",
    secondaryCtaUrl: "",
  },
}

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
    all: false,
    clientId: "",
    commit: false,
    dryRun: true,
    limit: 0,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--all") {
      args.all = true
      continue
    }
    if (arg === "--client-id") {
      args.clientId = argv[++i] || ""
      continue
    }
    if (arg === "--commit") {
      args.commit = true
      args.dryRun = false
      continue
    }
    if (arg === "--dry-run") {
      args.dryRun = true
      args.commit = false
      continue
    }
    if (arg === "--limit") {
      const rawLimit = argv[++i] || ""
      const limit = Number.parseInt(rawLimit, 10)
      if (!Number.isFinite(limit) || limit < 1) {
        throw new Error("--limit must be a positive integer.")
      }
      args.limit = limit
      continue
    }
    if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  args.clientId = args.clientId.trim()
  if (args.all && args.clientId) {
    throw new Error("Use either --all or --client-id, not both.")
  }
  if (!args.all && !args.clientId) {
    throw new Error("Pass --client-id CLIENT_ID for one client or --all for every client.")
  }
  return args
}

function printHelp() {
  console.log(`Usage:
  node scripts/extend-public-profile.mjs --client-id CLIENT_ID --dry-run
  node scripts/extend-public-profile.mjs --client-id CLIENT_ID --commit
  node scripts/extend-public-profile.mjs --all --dry-run
  node scripts/extend-public-profile.mjs --all --commit
  node scripts/extend-public-profile.mjs --all --limit 25 --dry-run

Backfills clients/{clientId}.publicProfile with missing:
  visibility.story, roster, projects, files, services, products, pricing, people, fleet, properties, benefits, partners
  growth.platformTenureStart, projectsCompleted, activeFleetSize
  discoveryFlow intro/demo/case-study video URLs and CTA labels/URLs

The script defaults to --dry-run. Use --commit to write to Firestore.
Existing nested publicProfile values are preserved.`)
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function readCredential() {
  if (process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_PRIVATE_KEY is set. Move Firebase Admin private keys to FIREBASE_PRIVATE_KEY or FIREBASE_ADMIN_PRIVATE_KEY before running this script."
    )
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()
  if (serviceAccountKey?.startsWith("{")) {
    const parsed = JSON.parse(serviceAccountKey)
    if (typeof parsed.private_key === "string" && typeof parsed.client_email === "string") {
      return cert(parsed)
    }
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    getRequiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
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
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY, or set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    )
  }

  return cert({ projectId, clientEmail, privateKey })
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function mergeMissing(defaults, existing) {
  if (!isPlainObject(defaults)) return existing === undefined ? defaults : existing
  const source = isPlainObject(existing) ? existing : {}
  const out = { ...source }
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const currentValue = source[key]
    out[key] = isPlainObject(defaultValue)
      ? mergeMissing(defaultValue, currentValue)
      : currentValue === undefined
        ? defaultValue
        : currentValue
  }
  return out
}

function collectMissingPaths(defaults, existing, prefix = "") {
  const source = isPlainObject(existing) ? existing : {}
  const paths = []
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const pathName = prefix ? `${prefix}.${key}` : key
    const currentValue = source[key]
    if (currentValue === undefined) {
      paths.push(pathName)
      continue
    }
    if (isPlainObject(defaultValue)) {
      paths.push(...collectMissingPaths(defaultValue, currentValue, pathName))
    }
  }
  return paths
}

function normalizeExistingPublicProfile(value) {
  return isPlainObject(value) ? value : {}
}

async function loadClientDocs(db, args) {
  if (args.clientId) {
    const ref = db.collection("clients").doc(args.clientId)
    const doc = await ref.get()
    if (!doc.exists) {
      throw new Error(`Client not found: clients/${args.clientId}`)
    }
    return [doc]
  }

  let query = db.collection("clients").orderBy("__name__")
  if (args.limit > 0) {
    query = query.limit(args.limit)
  }
  const snapshot = await query.get()
  return snapshot.docs
}

async function main() {
  loadDotEnv(path.resolve(process.cwd(), ".env.local"))

  const args = parseArgs(process.argv.slice(2))

  if (getApps().length === 0) {
    initializeApp({ credential: readCredential() })
  }

  const db = getFirestore()
  const docs = await loadClientDocs(db, args)
  const results = []

  for (const doc of docs) {
    const data = doc.data()
    const existing = normalizeExistingPublicProfile(data.publicProfile)
    const missingPaths = collectMissingPaths(DEFAULT_PUBLIC_PROFILE, existing, "publicProfile")
    const nextPublicProfile = mergeMissing(DEFAULT_PUBLIC_PROFILE, existing)

    results.push({
      path: `clients/${doc.id}`,
      existingPublicProfile: Object.keys(existing).length > 0,
      missingPaths,
      willWrite: missingPaths.length > 0 && !args.dryRun,
    })

    if (!args.dryRun && missingPaths.length > 0) {
      await doc.ref.set(
        {
          publicProfile: nextPublicProfile,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      )
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: args.dryRun,
        mode: args.clientId ? "single-client" : "all-clients",
        requestedClientId: args.clientId || null,
        matchedClients: docs.length,
        changedClients: results.filter((result) => result.missingPaths.length > 0).length,
        results,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
