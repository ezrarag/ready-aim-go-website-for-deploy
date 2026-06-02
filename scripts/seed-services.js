#!/usr/bin/env node

const fs = require("node:fs")
const path = require("node:path")
const process = require("node:process")
const { cert, getApps, initializeApp } = require("firebase-admin/app")
const { getFirestore, FieldValue } = require("firebase-admin/firestore")

const SERVICES = [
  {
    slug: "nexus",
    name: "Nexus",
    tagline:
      "A client subscription bundling web/app infrastructure, creative support, and a dedicated device path.",
    price: "$50/month",
    videoUrl: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
    features: [
      "Web / App Hosting: public site, client portal, analytics, and managed deployment layer.",
      "Creative Team: 1.5 hours per quarter for content, creative refreshes, and launch assets.",
      "Hardware Lease: dedicated Apple or Android device reserve attached to each client account.",
      "Client Architect: a named operator translating business needs into recurring delivery.",
    ],
    economics: [
      { item: "Tech & Hosting", cost: "$5.00/mo", note: "Internal platform cost" },
      { item: "Creative Team", cost: "$15.00/mo", note: "1.5 hrs/qtr" },
      { item: "Hardware Lease", cost: "$25.00/mo", note: "Vendor-facing reserve" },
      { item: "Client Architect", cost: "$2.50/mo", note: "5% commission" },
    ],
  },
  {
    slug: "motion",
    name: "Motion Network",
    tagline:
      "Fractional fleet logistics for rides, delivery, scheduling, and route density powered by BEAM drivers.",
    price: "$100/month",
    videoUrl: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
    features: [
      "Fractional fleet access for businesses that need movement without vehicle ownership.",
      "BEAM drivers convert route demand into staffed execution and recurring transport capacity.",
      "Motion Credits define usage clearly so clients can plan rides, delivery, and overflow work.",
      "Four monthly motion credits with a 15-mile radius per credit and a 60-day usage window.",
    ],
    economics: [
      { item: "Fleet Asset Fund", cost: "$45/mo", note: "For vendor" },
      { item: "Labor & Fuel Pool", cost: "$40/mo", note: "Drivers, fuel, dispatch" },
      { item: "Platform Maintenance", cost: "$10/mo", note: "Scheduling and routing" },
      { item: "Logistics Architect", cost: "$5/mo", note: "5% commission" },
    ],
  },
  {
    slug: "cohort",
    name: "Cohort Network",
    tagline:
      "Fractional access to pre-trained BEAM specialist teams through task credits, institutional training, and fellowship pathways.",
    price: "$100/month",
    videoUrl: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
    features: [
      "Tech Track: web development, app builds, data, and AI integration.",
      "Creative Track: photo, video, brand, and content support.",
      "Forge / Architecture Track: property renovation, smart access, and physical builds.",
      "Logistics Track: route coordination, supply chain, and delivery management.",
      "Full-Stack / Cross-Track: combined sprints and mini project teams.",
      "Earn-While-You-Use: sweat equity ledger and BEAM FCU supplement.",
    ],
    economics: [
      { item: "Participant Stipend Pool", cost: "$60/mo", note: "Paid sprint capacity" },
      { item: "Training & R&D Hub", cost: "$25/mo", note: "ABLE-based training" },
      { item: "Workspace Management", cost: "$10/mo", note: "Coordination and access" },
      { item: "Talent Architect", cost: "$5/mo", note: "5% commission" },
    ],
  },
  {
    slug: "space",
    name: "Space Network",
    tagline:
      "Tenants aggregated before signing the lease, with credits that convert flexible space into recurring demand.",
    price: "$100/month",
    videoUrl: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
    features: [
      "Space Network aggregates member demand before committing to leases, blocks, or partner inventory.",
      "Clients receive predictable workspace access while partners see reserved demand before capacity is activated.",
      "Twelve monthly space credits redeemable as two-hour blocks.",
      "Credits can support meeting rooms, storefronts, studios, or co-work desk access.",
    ],
    economics: [
      { item: "Property Reserve Fund", cost: "$50/mo", note: "For partner/vendor" },
      { item: "Operations & Utilities", cost: "$35/mo", note: "Access, setup, basic operations" },
      { item: "Platform Integration", cost: "$10/mo", note: "Booking and client management" },
      { item: "Acquisition Architect", cost: "$5/mo", note: "Partner development" },
    ],
  },
]

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
    commit: false,
  }

  for (const arg of argv) {
    if (arg === "--commit") {
      args.commit = true
      continue
    }
    if (arg === "--dry-run") {
      args.commit = false
      continue
    }
    if (arg === "--help" || arg === "-h") {
      printHelp()
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return args
}

function printHelp() {
  console.log(`Usage:
  node scripts/seed-services.js
  node scripts/seed-services.js --commit

Seeds Firestore services/{slug} documents for:
  nexus, motion, cohort, space

Defaults to dry-run. Pass --commit to write.`)
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env var: ${name}`)
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

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || getRequiredEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL?.trim() ||
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() ||
    process.env.FIREBASE_AMIN_CLIENT_EMAIL?.trim()
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY || "")
    .trim()
    .replace(/\\n/g, "\n")

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY, or set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    )
  }

  return cert({ projectId, clientEmail, privateKey })
}

async function main() {
  const root = process.cwd()
  loadDotEnv(path.join(root, ".env.local"))
  loadDotEnv(path.join(root, ".env"))
  const args = parseArgs(process.argv.slice(2))

  if (!getApps().length) {
    initializeApp({ credential: readCredential() })
  }

  const db = getFirestore()
  const now = FieldValue.serverTimestamp()

  for (const service of SERVICES) {
    const payload = {
      ...service,
      updatedAt: now,
    }

    if (!args.commit) {
      console.log(`[dry-run] services/${service.slug}`, JSON.stringify({ ...service, updatedAt: "serverTimestamp()" }, null, 2))
      continue
    }

    await db.collection("services").doc(service.slug).set(payload, { merge: true })
    console.log(`Seeded services/${service.slug}`)
  }

  if (!args.commit) {
    console.log("Dry run only. Re-run with --commit to write Firestore documents.")
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
