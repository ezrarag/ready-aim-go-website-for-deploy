#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { createHash } from "node:crypto"
import { fileURLToPath } from "node:url"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore"
import { GoogleGenAI, Type } from "@google/genai"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DEFAULT_ADMIN_ROOT = path.resolve(__dirname, "..")
const DEFAULT_CLIENTS_ROOT = path.resolve(DEFAULT_ADMIN_ROOT, "..", "clients.readyaimgo.biz")
const DEFAULT_MODEL = "models/gemini-2.5-flash";
const DEFAULT_MAX_FILE_CHARS = 24_000
const SKIP_DIRS = new Set([".git", ".next", "node_modules", ".claude"])

function buildIdentityPrompt(files) {
  return `You are the ReadyAimGo Strategic Auditor. Your goal is to ensure the Identity Contract is perfectly synchronized between the Admin Dashboard and the Client Portal.

Primary verification goals:
1. Identity Sync: Verify that clients.readyaimgo.biz is using users/{uid}.clientIds and NOT clients/{email}.
2. NGO Visibility: Confirm that the contracts/ collection is using the canonical $clientId$ so that the Law and Finance NGO apps can successfully query them.
3. Infrastructure Injection: Check that the projectTasks collection is standardized so that Admin-injected costs (like Namecheap renewals) are visible to the specific client.
4. Security: Flag any instance of NEXT_PUBLIC_FIREBASE_PRIVATE_KEY or client-side Admin SDK initialization.

When analyzing the code below, prioritize 'Launch Readiness' and report any 'Split-Brain' logic where the Admin repo is still holding onto Portal-specific code.

Evidence follows.

${files.map(fileBlock).join("\n\n")}`
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {}

  const parsed = {}
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    let value = rawValue.trim()
    const quote = value[0]
    if ((quote === `"` || quote === `'`) && value[value.length - 1] === quote) {
      value = value.slice(1, -1)
    }
    parsed[key] = value
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
  return parsed
}

function parseArgs(argv) {
  const args = {
    command: "",
    adminRoot: DEFAULT_ADMIN_ROOT,
    clientsRoot: DEFAULT_CLIENTS_ROOT,
    model: DEFAULT_MODEL,
    maxFileChars: DEFAULT_MAX_FILE_CHARS,
    output: "",
    file: "",
    rawText: "",
    stdin: false,
    write: false,
    dryRun: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]

    if (arg === "--help" || arg === "-h") {
      args.help = true
      continue
    }
    if (arg === "--dry-run") {
      args.dryRun = true
      continue
    }
    if (arg === "--write") {
      args.write = true
      continue
    }
    if (arg === "--stdin") {
      args.stdin = true
      continue
    }
    if (arg === "--file") {
      args.file = path.resolve(argv[++i] || "")
      continue
    }
    if (arg === "--raw-text") {
      args.rawText = argv[++i] || ""
      continue
    }
    if (arg === "--admin-root") {
      args.adminRoot = path.resolve(argv[++i] || "")
      continue
    }
    if (arg === "--clients-root") {
      args.clientsRoot = path.resolve(argv[++i] || "")
      continue
    }
    if (arg === "--model") {
      args.model = (argv[++i] || "").trim()
      continue
    }
    if (arg === "--max-file-chars") {
      const value = Number.parseInt(argv[++i] || "", 10)
      if (!Number.isFinite(value) || value < 1000) {
        throw new Error("--max-file-chars must be an integer >= 1000")
      }
      args.maxFileChars = value
      continue
    }
    if (arg === "--output") {
      args.output = path.resolve(argv[++i] || "")
      continue
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`)
    }
    if (!args.command) {
      args.command = arg.trim().toLowerCase()
      continue
    }

    throw new Error(`Unexpected positional argument: ${arg}`)
  }

  if (args.command === "audit_identity") args.command = "audit-identity"
  if (args.command === "admin_cleanup") args.command = "admin-cleanup"
  if (args.command === "list_models") args.command = "list-models"
  if (args.command === "ingest_zoho_email") args.command = "ingest-zoho-email"
  return args
}

function printHelp() {
  console.log(`Usage:
  npm run ra:audit-identity
  npm run ra:admin-cleanup
  node scripts/ra-command.mjs list-models
  node scripts/ra-command.mjs audit-identity --dry-run
  node scripts/ra-command.mjs admin-cleanup --model gemini-2.5-flash
  node scripts/ra-command.mjs audit-identity --output ./identity-audit.md
  node scripts/ra-command.mjs ingest-zoho-email --file ./fixtures/zoho-domain-renewal.json --dry-run
  node scripts/ra-command.mjs ingest-zoho-email --stdin --write

Commands:
  audit-identity  Audit cross-repo identity sync between readyaimgo.biz and clients.readyaimgo.biz.
  admin-cleanup   Find portal-only logic living in the Admin repo and ask Gemini for a safe refactor plan.
  ingest-zoho-email
                  Parse a local/mock Zoho Mail webhook payload, match it to a workspace domain,
                  and optionally write client-visible infrastructure activity to Firestore.
  list-models     List all Gemini models available to your API key.

Options:
  --admin-root <path>       Admin/main-site repo. Defaults to this repo.
  --clients-root <path>     Client portal repo. Defaults to ../clients.readyaimgo.biz.
  --model <model>           Gemini model. Defaults to ${DEFAULT_MODEL}.
  --max-file-chars <n>      Per-file character cap. Defaults to ${DEFAULT_MAX_FILE_CHARS}.
  --output <path>           Write the generated report to a file.
  --file <path>             Read a mock Zoho webhook JSON payload from a file.
  --stdin                   Read a mock Zoho webhook JSON payload from stdin.
  --raw-text <text>         Analyze raw email text directly.
  --write                   Commit Firestore writes. Without this, ingest-zoho-email is dry-run only.
  --dry-run                 For report commands, print the Gemini prompt. For ingestion, analyze and match without writing.
  --help, -h                Show this help.

Gemini API key:
  Put GEMINI_API_KEY=... or GOOGLE_API_KEY=... in the Admin repo's local .env file.
  NEXT_PUBLIC_* keys are intentionally ignored.

Firebase Admin credentials for ingest-zoho-email:
  Put FIREBASE_SERVICE_ACCOUNT_KEY=... in .env.local/.env, or provide project/client/private key envs.
  Set AGENCY_MONITORING_MARGIN_PERCENT for billing payloads.`)
}

function ensureDirectory(root, label) {
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`${label} repo root does not exist: ${root}`)
  }
}

function isSensitiveEnvKey(key) {
  return /(SECRET|TOKEN|PASSWORD|PRIVATE|CREDENTIAL|CLIENT_SECRET|REFRESH|WEBHOOK|COOKIE|SESSION|API_KEY|FIREBASE_PRIVATE|STRIPE|SLACK|OPENAI|ANTHROPIC|GEMINI|GOOGLE_CLIENT_SECRET)/i.test(key)
}

function isSafeEnvValue(key, value) {
  if (!value) return true
  if (/^(true|false|null|undefined)$/i.test(value)) return true
  if (/^-?\d+(\.\d+)?$/.test(value)) return true
  if (/(URL|URI|HOST|DOMAIN|ORIGIN|APP_URL|SITE_URL)$/i.test(key)) return true
  if (/^https?:\/\//i.test(value) && !isSensitiveEnvKey(key)) return true
  return false
}

function redactEnvContents(contents) {
  return contents
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) return line

      const match = line.match(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/)
      if (!match) return "[UNPARSED_ENV_LINE_REDACTED]"

      const [, leading, key, equals, rawValue] = match
      let value = rawValue.trim()
      const quote = value[0]
      if ((quote === `"` || quote === `'`) && value[value.length - 1] === quote) {
        value = value.slice(1, -1)
      }

      if (isSensitiveEnvKey(key) || !isSafeEnvValue(key, value)) {
        return `${leading}${key}${equals}[REDACTED length=${value.length}]`
      }

      const displayValue = value.length > 240 ? `${value.slice(0, 240)}...[TRUNCATED]` : value
      return `${leading}${key}${equals}${displayValue}`
    })
    .join("\n")
}

function truncateContent(content, maxChars) {
  if (content.length <= maxChars) return content
  return `${content.slice(0, maxChars)}\n\n[TRUNCATED ${content.length - maxChars} chars]`
}

function readRepoFile({ root, repoName, relativePath, maxFileChars, envFile = false }) {
  const absolutePath = path.resolve(root, relativePath)
  const normalizedRoot = path.resolve(root)
  if (!absolutePath.startsWith(normalizedRoot + path.sep) && absolutePath !== normalizedRoot) {
    throw new Error(`Refusing to read outside ${repoName}: ${relativePath}`)
  }

  if (!fs.existsSync(absolutePath)) {
    return {
      repoName,
      relativePath,
      absolutePath,
      exists: false,
      content: `[MISSING] ${relativePath} was not found in ${repoName}.`,
    }
  }

  const raw = fs.readFileSync(absolutePath, "utf8")
  const content = envFile ? redactEnvContents(raw) : raw
  return {
    repoName,
    relativePath,
    absolutePath,
    exists: true,
    content: truncateContent(content, maxFileChars),
  }
}

function findFileByName(root, fileName) {
  const stack = [root]
  while (stack.length) {
    const current = stack.pop()
    let entries = []
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
      } else if (entry.isFile() && entry.name === fileName) {
        return path.relative(root, fullPath)
      }
    }
  }
  return null
}

function findFilesUnder(root, relativeDirectory) {
  const base = path.resolve(root, relativeDirectory)
  if (!fs.existsSync(base)) return []

  const results = []
  const stack = [base]
  while (stack.length) {
    const current = stack.pop()
    let entries = []
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
      } else if (entry.isFile()) {
        results.push(path.relative(root, fullPath))
      }
    }
  }
  return results.sort()
}

function readOptionalFoundFile(root, repoName, fileName, maxFileChars) {
  const found = findFileByName(root, fileName)
  if (!found) {
    return {
      repoName,
      relativePath: fileName,
      absolutePath: path.join(root, fileName),
      exists: false,
      content: `[MISSING] No ${fileName} found under ${repoName}.`,
    }
  }
  return readRepoFile({ root, repoName, relativePath: found, maxFileChars })
}

function fileBlock(file) {
  return `### ${file.repoName}: ${file.relativePath}
Absolute path: ${file.absolutePath}
Status: ${file.exists ? "present" : "missing"}

~~~${file.relativePath.endsWith(".json") ? "json" : file.relativePath.endsWith(".tsx") || file.relativePath.endsWith(".ts") ? "ts" : ""}
${file.content}
~~~`
}


function listAdminCleanupCandidates(adminRoot) {
  const portalApiFiles = findFilesUnder(adminRoot, "app/api/portal")
  const candidateFiles = new Set(portalApiFiles)

  for (const relativePath of [
    "lib/portal-auth.ts",
    "hooks/use-client-projects.ts",
    "hooks/use-client-stats.ts",
    "hooks/use-missions.ts",
    "app/dashboard/client/page.tsx",
  ]) {
    if (fs.existsSync(path.join(adminRoot, relativePath))) {
      candidateFiles.add(relativePath)
    }
  }

  return [...candidateFiles].sort()
}

function buildAdminCleanupPrompt(files, candidates) {
  return `You are auditing the Admin/main-site repo for Portal-only logic that may have been copied into the wrong repo.

Context:
- Admin repo deploys readyaimgo.biz and should own admin dashboards, provisioning, client records, public marketing, and backend handoff APIs.
- Client portal repo deploys clients.readyaimgo.biz and should own client-facing portal routes, client-only hooks, and portal session behavior.
- Some portal-compatible surfaces may intentionally remain in Admin if they support admin previews or migration, so do not recommend blind deletion.

Task:
1. Review the candidate Admin files below.
2. Identify which files look Portal-only or duplicated from clients.readyaimgo.biz.
3. Suggest a safe refactor/removal plan that preserves existing Admin UI.
4. Call out import dependencies that must be changed first.
5. Prefer redirect/proxy/deprecation steps over immediate destructive removal.

Candidate files detected:
${candidates.map((candidate) => `- ${candidate}`).join("\n")}

Return a Markdown report with:
- Keep / Move to portal / Delete after migration / Needs investigation sections.
- Safe sequence of commits.
- Specific routes/hooks/components that appear risky.
- Smoke tests for Admin UI and Portal UI after cleanup.

Evidence follows.

${files.map(fileBlock).join("\n\n")}`
}

function getGeminiApiKey(adminRoot) {
  const localEnvPath = path.join(adminRoot, ".env")
  const localEnv = loadDotEnv(localEnvPath)

  const keyFromLocalEnv = localEnv.GEMINI_API_KEY || localEnv.GOOGLE_API_KEY
  const publicKeyFromLocalEnv =
    localEnv.NEXT_PUBLIC_GEMINI_API_KEY || localEnv.NEXT_PUBLIC_GOOGLE_API_KEY

  if (!keyFromLocalEnv && publicKeyFromLocalEnv) {
    throw new Error(
      "Gemini key is only present as NEXT_PUBLIC_* in .env. Move it to GEMINI_API_KEY or GOOGLE_API_KEY."
    )
  }

  if (!keyFromLocalEnv) {
    throw new Error(
      `Missing Gemini API key. Add GEMINI_API_KEY=... or GOOGLE_API_KEY=... to ${localEnvPath}.`
    )
  }

  return keyFromLocalEnv
}

async function callGemini({ adminRoot, model, prompt }) {
  const apiKey = getGeminiApiKey(adminRoot)
  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.2,
    },
  })
  return response.text || "[Gemini returned an empty response.]"
}

async function listModels(adminRoot) {
  const apiKey = getGeminiApiKey(adminRoot)
  const ai = new GoogleGenAI({ apiKey })
     
  try {
    const response = await ai.models.list();
         
    // Log the raw names to be 100% sure
    console.log("Checking all available models...");
         
    // Newer SDKs often return an array directly or inside a models property
    const models = Array.isArray(response) ? response : (response.models || []);
         
    if (models.length === 0) {
      console.log("No models found in the standard list. Raw response keys:", Object.keys(response));
      return;
    }

    for (const m of models) {
      // Look for any model that starts with 'models/gemini'
      if (m.name.includes("gemini")) {
        console.log(`- ${m.name}`);
      }
    }
  } catch (error) {
    console.error("Error listing models:", error.message);
  }
}

function loadRuntimeEnv(adminRoot) {
  loadDotEnv(path.join(adminRoot, ".env.local"))
  loadDotEnv(path.join(adminRoot, ".env"))
}

function readFirebaseCredential() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()
  if (serviceAccountKey?.startsWith("{")) {
    const parsed = JSON.parse(serviceAccountKey)
    if (typeof parsed.private_key === "string" && typeof parsed.client_email === "string") {
      return cert(parsed)
    }
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT?.trim()
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

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_KEY, or set FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
    )
  }

  return cert({ projectId, clientEmail, privateKey })
}

function getAdminFirestore(adminRoot) {
  loadRuntimeEnv(adminRoot)
  if (getApps().length === 0) {
    initializeApp({ credential: readFirebaseCredential() })
  }
  return getFirestore()
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = ""
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", (chunk) => {
      data += chunk
    })
    process.stdin.on("end", () => resolve(data))
    process.stdin.on("error", reject)
  })
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function compactWhitespace(value, maxLength = 6_000) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : ""
}

function collectStringValues(value, results = []) {
  if (typeof value === "string") {
    results.push(value)
    return results
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, results)
    return results
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) collectStringValues(nested, results)
  }
  return results
}

function extractRawEmailText(input) {
  const parsed = safeJsonParse(input)
  if (!parsed || typeof parsed !== "object") {
    return compactWhitespace(input, 20_000)
  }

  const candidateKeys = [
    "subject",
    "from",
    "sender",
    "to",
    "recipient",
    "date",
    "body",
    "text",
    "plainText",
    "html",
    "content",
    "snippet",
    "summary",
    "message",
  ]
  const blocks = []
  for (const key of candidateKeys) {
    if (key in parsed) {
      const value = parsed[key]
      if (Array.isArray(value)) {
        blocks.push(`${key}: ${value.filter((item) => typeof item === "string").join(", ")}`)
      } else if (typeof value === "string") {
        blocks.push(`${key}: ${value}`)
      }
    }
  }

  if (blocks.length === 0) {
    blocks.push(...collectStringValues(parsed).slice(0, 30))
  }

  return compactWhitespace(blocks.join("\n"), 20_000)
}

async function loadZohoPayloadInput(args) {
  const inputSources = [Boolean(args.file), Boolean(args.stdin), Boolean(args.rawText)]
    .filter(Boolean)
    .length
  if (inputSources !== 1) {
    throw new Error("Pass exactly one of --file, --stdin, or --raw-text.")
  }

  if (args.file) {
    if (!fs.existsSync(args.file)) throw new Error(`Input file not found: ${args.file}`)
    return fs.readFileSync(args.file, "utf8")
  }

  if (args.stdin) {
    const input = await readStdin()
    if (!input.trim()) throw new Error("No stdin payload was provided.")
    return input
  }

  return args.rawText
}

function normalizeDomain(value) {
  if (typeof value !== "string") return ""
  let domain = value.trim().toLowerCase()
  if (!domain) return ""

  domain = domain.replace(/^mailto:/, "")
  domain = domain.replace(/^[^@\s]+@/, "")
  domain = domain.replace(/^https?:\/\//, "")
  domain = domain.replace(/^www\./, "")
  domain = domain.split(/[/?#:\s]/)[0] || ""
  domain = domain.replace(/^\.+|\.+$/g, "")

  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain) ? domain : ""
}

function addDomainCandidate(candidates, value, source) {
  const domain = normalizeDomain(value)
  if (domain) candidates.set(domain, source)
}

function collectWorkspaceDomainCandidates(workspace) {
  const candidates = new Map()
  addDomainCandidate(candidates, workspace.primaryDomain, "primaryDomain")
  addDomainCandidate(candidates, workspace.targetDomain, "targetDomain")

  for (const domain of Array.isArray(workspace.domains) ? workspace.domains : []) {
    addDomainCandidate(candidates, domain, "domains[]")
  }

  const hosting =
    workspace.hosting && typeof workspace.hosting === "object" ? workspace.hosting : {}
  for (const registrar of Array.isArray(hosting.domainRegistrars) ? hosting.domainRegistrars : []) {
    if (registrar && typeof registrar === "object") {
      addDomainCandidate(candidates, registrar.domain, "hosting.domainRegistrars[].domain")
    }
  }

  for (const project of Array.isArray(workspace.vercelProjects) ? workspace.vercelProjects : []) {
    if (!project || typeof project !== "object") continue
    for (const domain of Array.isArray(project.domains) ? project.domains : []) {
      addDomainCandidate(candidates, domain, "vercelProjects[].domains[]")
    }
  }

  return candidates
}

function stableHash(input) {
  return createHash("sha256").update(input).digest("hex").slice(0, 32)
}

function readNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,]/g, ""))
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function getMarginPercent() {
  const raw = process.env.AGENCY_MONITORING_MARGIN_PERCENT?.trim()
  if (!raw) {
    throw new Error("AGENCY_MONITORING_MARGIN_PERCENT is required when billing data is present.")
  }
  const parsed = Number(raw.replace(/%$/, ""))
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("AGENCY_MONITORING_MARGIN_PERCENT must be a non-negative number.")
  }
  return parsed
}

function calculateInvoiceLineItem(extraction) {
  const baseCost = readNumber(extraction.baseCost)
  if (!extraction.billingDataPresent || !baseCost || baseCost <= 0) return null

  const marginPercent = getMarginPercent()
  const marginAmount = Number((baseCost * (marginPercent / 100)).toFixed(2))
  const totalCost = Number((baseCost + marginAmount).toFixed(2))
  const currency = typeof extraction.currency === "string" && extraction.currency.trim()
    ? extraction.currency.trim().toUpperCase()
    : "USD"

  return {
    description: `${extraction.billingProvider || "Infrastructure"} monitoring premium for ${extraction.domainName}`,
    baseCost,
    marginPercent,
    marginAmount,
    totalCost,
    currency,
  }
}

function normalizeGeminiExtraction(value) {
  const domainName = normalizeDomain(value?.domainName)
  const confidence = Math.max(0, Math.min(1, readNumber(value?.confidence) ?? 0))
  return {
    domainName,
    renewalDate: typeof value?.renewalDate === "string" && value.renewalDate.trim()
      ? value.renewalDate.trim()
      : null,
    billingProvider:
      typeof value?.billingProvider === "string" && value.billingProvider.trim()
        ? value.billingProvider.trim()
        : null,
    baseCost: readNumber(value?.baseCost),
    currency: typeof value?.currency === "string" && value.currency.trim()
      ? value.currency.trim().toUpperCase()
      : "USD",
    billingDataPresent: Boolean(value?.billingDataPresent),
    evidenceSnippet:
      typeof value?.evidenceSnippet === "string" && value.evidenceSnippet.trim()
        ? value.evidenceSnippet.trim().slice(0, 500)
        : null,
    confidence,
  }
}

function toFirestoreTimestamp(value) {
  if (typeof value !== "string" || !value.trim()) return null
  const trimmed = value.trim()
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  let date
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1])
    const month = Number(dateOnlyMatch[2])
    const day = Number(dateOnlyMatch[3])
    date = new Date(year, month - 1, day)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null
    }
  } else {
    date = new Date(trimmed)
  }

  return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date)
}

async function analyzeIncomingEmail(rawEmailText, { adminRoot, model }) {
  const apiKey = getGeminiApiKey(adminRoot)
  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model,
    contents: `Extract domain renewal and billing metadata from this Zoho Mail webhook/email text.

Return only source-backed facts. Use null for absent values. Do not infer a customer/workspace.

Email text:
${rawEmailText}`,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          domainName: { type: Type.STRING },
          renewalDate: { type: Type.STRING, nullable: true },
          billingProvider: { type: Type.STRING, nullable: true },
          baseCost: { type: Type.NUMBER, nullable: true },
          currency: { type: Type.STRING, nullable: true },
          billingDataPresent: { type: Type.BOOLEAN },
          evidenceSnippet: { type: Type.STRING, nullable: true },
          confidence: { type: Type.NUMBER },
        },
        required: ["domainName", "billingDataPresent", "confidence"],
      },
    },
  })

  const text = response.text || ""
  const parsed = safeJsonParse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, ""))
  if (!parsed) {
    throw new Error("Gemini did not return valid JSON for incoming email analysis.")
  }
  return normalizeGeminiExtraction(parsed)
}

async function findWorkspaceByDomain(db, domainName) {
  const normalizedDomain = normalizeDomain(domainName)
  if (!normalizedDomain) throw new Error("Gemini did not extract a valid domainName.")

  const snap = await db.collection("workspaces").limit(1_000).get()
  const matches = []
  for (const doc of snap.docs) {
    const workspace = doc.data()
    const candidates = collectWorkspaceDomainCandidates(workspace)
    if (candidates.has(normalizedDomain)) {
      matches.push({
        workspaceId: doc.id,
        workspace,
        matchedField: candidates.get(normalizedDomain),
      })
    }
  }

  if (matches.length > 1) {
    throw new Error(
      `Domain ${normalizedDomain} matched multiple workspaces: ${matches.map((match) => match.workspaceId).join(", ")}. Refusing to write.`
    )
  }

  return matches[0] || null
}

function buildZohoFirestorePayloads({ extraction, match, rawEmailText, payloadHash }) {
  const clientId = typeof match.workspace.clientId === "string" && match.workspace.clientId.trim()
    ? match.workspace.clientId.trim()
    : ""
  if (!clientId) {
    throw new Error(`Matched workspace ${match.workspaceId} has no clientId; cannot write clientActivity.`)
  }

  const invoiceLineItem = calculateInvoiceLineItem(extraction)
  const renewalTimestamp = toFirestoreTimestamp(extraction.renewalDate)
  const sourceRef = `zoho_${payloadHash}`
  const activityId = sourceRef
  const text = [
    `Zoho infrastructure email matched ${extraction.domainName}.`,
    extraction.billingProvider ? `Provider: ${extraction.billingProvider}.` : "",
    extraction.renewalDate ? `Renewal date: ${extraction.renewalDate}.` : "",
    invoiceLineItem ? `Billing total with monitoring premium: ${invoiceLineItem.currency} ${invoiceLineItem.totalCost}.` : "",
  ]
    .filter(Boolean)
    .join(" ")

  const activityItem = {
    category: "infrastructure",
    visibility: "client",
    sourceSystem: "zoho-mail-webhook",
    sourceRef,
    workspaceId: match.workspaceId,
    clientId,
    domainName: extraction.domainName,
    billingProvider: extraction.billingProvider,
    renewalDate: renewalTimestamp,
    billingDataPresent: extraction.billingDataPresent,
    invoiceLineItem,
    text,
    summary: text,
    description: extraction.evidenceSnippet,
    evidenceSnippet: extraction.evidenceSnippet,
    confidence: extraction.confidence,
    rawEmailText: rawEmailText.slice(0, 4_000),
  }

  const infrastructureLink = {
    provider: extraction.billingProvider?.toLowerCase().includes("zoho") ? "Zoho" : "Other",
    type: invoiceLineItem ? "invoice" : "mail",
    domain: extraction.domainName,
    status: invoiceLineItem ? "unpaid" : "unknown",
    amount: invoiceLineItem?.totalCost ?? null,
    dueDate: renewalTimestamp,
    sourceSystem: "zoho-mail-webhook",
    sourceRef,
    evidenceSnippet: extraction.evidenceSnippet,
    confidence: extraction.confidence,
    clientVisible: true,
    verified: null,
    registrar: extraction.billingProvider,
    expirationSource: extraction.renewalDate ? "zoho-mail-webhook" : null,
    vercelProjectId: null,
    vercelProjectName: null,
    invoiceLineItem,
  }

  const expense = invoiceLineItem
    ? {
        source: "Zoho Mail System",
        description: invoiceLineItem.description,
        amount: invoiceLineItem.totalCost,
        baseCost: invoiceLineItem.baseCost,
        marginPercent: invoiceLineItem.marginPercent,
        marginAmount: invoiceLineItem.marginAmount,
        currency: invoiceLineItem.currency,
        status: "unpaid",
        serviceProvider: "Zoho",
        billingCycleType: "Business Email Tier",
        dueDate: renewalTimestamp,
        vendor: extraction.billingProvider || "Zoho",
        category: "business-email",
        domain: extraction.domainName,
        sourceEmailId: sourceRef,
        sourceThreadId: null,
        evidenceSnippet: extraction.evidenceSnippet,
        confidence: extraction.confidence,
        contractAppendageReady: true,
      }
    : null

  return {
    clientId,
    activityId,
    linkId: sourceRef,
    expenseId: sourceRef,
    activityItem,
    infrastructureLink,
    expense,
  }
}

async function writeZohoIngestion(db, payloads, workspaceId) {
  const batch = db.batch()
  const now = FieldValue.serverTimestamp()
  const workspaceRef = db.collection("workspaces").doc(workspaceId)
  const activityRef = db
    .collection("clientActivity")
    .doc(payloads.clientId)
    .collection("items")
    .doc(payloads.activityId)
  const linkRef = workspaceRef.collection("infrastructureLinks").doc(payloads.linkId)

  batch.set(activityRef, { ...payloads.activityItem, createdAt: now, updatedAt: now }, { merge: true })
  batch.set(linkRef, { ...payloads.infrastructureLink, createdAt: now, updatedAt: now }, { merge: true })

  if (payloads.expense) {
    const expenseRef = workspaceRef.collection("expenses").doc(payloads.expenseId)
    batch.set(expenseRef, { ...payloads.expense, createdAt: now, updatedAt: now }, { merge: true })
  }

  batch.set(workspaceRef, { updatedAt: now }, { merge: true })
  await batch.commit()
}

async function ingestZohoEmail(args) {
  if (args.dryRun && args.write) {
    throw new Error("Pass either --dry-run or --write, not both.")
  }
  const shouldWrite = args.write && !args.dryRun
  const input = await loadZohoPayloadInput(args)
  const rawEmailText = extractRawEmailText(input)
  if (!rawEmailText) throw new Error("No analyzable email text was found in the payload.")

  const extraction = await analyzeIncomingEmail(rawEmailText, {
    adminRoot: args.adminRoot,
    model: args.model,
  })
  if (extraction.confidence < 0.45) {
    throw new Error(`Gemini extraction confidence ${extraction.confidence} is below the 0.45 write threshold.`)
  }

  const db = getAdminFirestore(args.adminRoot)
  const match = await findWorkspaceByDomain(db, extraction.domainName)
  if (!match) {
    console.log(JSON.stringify({ success: true, matched: false, extraction }, null, 2))
    return
  }

  const payloadHash = stableHash([match.workspaceId, extraction.domainName, rawEmailText].join("|"))
  const payloads = buildZohoFirestorePayloads({
    extraction,
    match,
    rawEmailText,
    payloadHash,
  })

  const result = {
    success: true,
    dryRun: !shouldWrite,
    matched: true,
    workspacePath: `workspaces/${match.workspaceId}`,
    clientActivityPath: `clientActivity/${payloads.clientId}/items/${payloads.activityId}`,
    infrastructureLinkPath: `workspaces/${match.workspaceId}/infrastructureLinks/${payloads.linkId}`,
    expensePath: payloads.expense
      ? `workspaces/${match.workspaceId}/expenses/${payloads.expenseId}`
      : null,
    matchedField: match.matchedField,
    extraction,
    proposedWrites: {
      activityItem: payloads.activityItem,
      infrastructureLink: payloads.infrastructureLink,
      expense: payloads.expense,
    },
  }

  if (shouldWrite) {
    await writeZohoIngestion(db, payloads, match.workspaceId)
    result.dryRun = false
    result.written = true
  } else {
    result.written = false
  }

  console.log(JSON.stringify(result, null, 2))
}

async function emitReport(args, prompt) {
  const report = args.dryRun
    ? `# ra-command dry run\n\nThe Gemini API was not called.\n\n## Prompt\n\n${prompt}`
    : await callGemini({ adminRoot: args.adminRoot, model: args.model, prompt })

  if (args.output) {
    fs.mkdirSync(path.dirname(args.output), { recursive: true })
    fs.writeFileSync(args.output, report, "utf8")
    console.log(`Wrote report: ${args.output}`)
    return
  }

  console.log(report)
}

async function auditIdentity(args) {
  const adminAuthProvider = findFileByName(args.adminRoot, "AuthProvider.tsx")
  const clientsAuthProvider =
    fs.existsSync(path.join(args.clientsRoot, "components/auth/AuthProvider.tsx"))
      ? "components/auth/AuthProvider.tsx"
      : findFileByName(args.clientsRoot, "AuthProvider.tsx")

  const files = [
    readRepoFile({
      root: args.adminRoot,
      repoName: "Admin/readyaimgo.biz",
      relativePath: "lib/portal-auth.ts",
      maxFileChars: args.maxFileChars,
    }),
    adminAuthProvider
      ? readRepoFile({
          root: args.adminRoot,
          repoName: "Admin/readyaimgo.biz",
          relativePath: adminAuthProvider,
          maxFileChars: args.maxFileChars,
        })
      : readOptionalFoundFile(args.adminRoot, "Admin/readyaimgo.biz", "AuthProvider.tsx", args.maxFileChars),
    readRepoFile({
      root: args.adminRoot,
      repoName: "Admin/readyaimgo.biz",
      relativePath: ".env.local",
      maxFileChars: args.maxFileChars,
      envFile: true,
    }),
    readRepoFile({
      root: args.adminRoot,
      repoName: "Admin/readyaimgo.biz",
      relativePath: "lib/provision-client-portal.ts",
      maxFileChars: args.maxFileChars,
    }),
    readRepoFile({
      root: args.adminRoot,
      repoName: "Admin/readyaimgo.biz",
      relativePath: "app/api/client-account/route.ts",
      maxFileChars: args.maxFileChars,
    }),
    readRepoFile({
      root: args.adminRoot,
      repoName: "Admin/readyaimgo.biz",
      relativePath: "app/api/admin/clients/route.ts",
      maxFileChars: args.maxFileChars,
    }),
    readRepoFile({
      root: args.adminRoot,
      repoName: "Admin/readyaimgo.biz",
      relativePath: "app/api/admin/clients/[clientId]/route.ts",
      maxFileChars: args.maxFileChars,
    }),
    readRepoFile({
      root: args.clientsRoot,
      repoName: "Portal/clients.readyaimgo.biz",
      relativePath: "lib/portal-auth.ts",
      maxFileChars: args.maxFileChars,
    }),
    clientsAuthProvider
      ? readRepoFile({
          root: args.clientsRoot,
          repoName: "Portal/clients.readyaimgo.biz",
          relativePath: clientsAuthProvider,
          maxFileChars: args.maxFileChars,
        })
      : readOptionalFoundFile(
          args.clientsRoot,
          "Portal/clients.readyaimgo.biz",
          "AuthProvider.tsx",
          args.maxFileChars
        ),
    readRepoFile({
      root: args.clientsRoot,
      repoName: "Portal/clients.readyaimgo.biz",
      relativePath: ".env.local",
      maxFileChars: args.maxFileChars,
      envFile: true,
    }),
    readRepoFile({
      root: args.clientsRoot,
      repoName: "Portal/clients.readyaimgo.biz",
      relativePath: "app/api/client-portal/identity/route.ts",
      maxFileChars: args.maxFileChars,
    }),
    readRepoFile({
      root: args.clientsRoot,
      repoName: "Portal/clients.readyaimgo.biz",
      relativePath: "lib/types/client-membership.ts",
      maxFileChars: args.maxFileChars,
    }),
  ]

  await emitReport(args, buildIdentityPrompt(files))
}

async function adminCleanup(args) {
  const candidates = listAdminCleanupCandidates(args.adminRoot)
  const files = candidates.map((relativePath) =>
    readRepoFile({
      root: args.adminRoot,
      repoName: "Admin/readyaimgo.biz",
      relativePath,
      maxFileChars: args.maxFileChars,
    })
  )

  await emitReport(args, buildAdminCleanupPrompt(files, candidates))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.help || !args.command) {
    printHelp()
    return
  }

  ensureDirectory(args.adminRoot, "Admin")
  ensureDirectory(args.clientsRoot, "Client portal")

  if (args.command === "audit-identity") {
    await auditIdentity(args)
    return
  }

  if (args.command === "admin-cleanup") {
    await adminCleanup(args)
    return
  }

  if (args.command === "ingest-zoho-email") {
    await ingestZohoEmail(args)
    return
  }

  if (args.command === "list-models") {
    await listModels(args.adminRoot)
    return
  }

  throw new Error(`Unknown command: ${args.command}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
