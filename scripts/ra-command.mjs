#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import { GoogleGenAI } from "@google/genai"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DEFAULT_ADMIN_ROOT = path.resolve(__dirname, "..")
const DEFAULT_CLIENTS_ROOT = path.resolve(DEFAULT_ADMIN_ROOT, "..", "clients.readyaimgo.biz")
const DEFAULT_MODEL = "models/gemini-1.5-flash";
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
  return args
}

function printHelp() {
  console.log(`Usage:
  npm run ra:audit-identity
  npm run ra:admin-cleanup
  node scripts/ra-command.mjs list-models
  node scripts/ra-command.mjs audit-identity --dry-run
  node scripts/ra-command.mjs admin-cleanup --model gemini-1.5-flash
  node scripts/ra-command.mjs audit-identity --output ./identity-audit.md

Commands:
  audit-identity  Audit cross-repo identity sync between readyaimgo.biz and clients.readyaimgo.biz.
  admin-cleanup   Find portal-only logic living in the Admin repo and ask Gemini for a safe refactor plan.
  list-models     List all Gemini models available to your API key.

Options:
  --admin-root <path>       Admin/main-site repo. Defaults to this repo.
  --clients-root <path>     Client portal repo. Defaults to ../clients.readyaimgo.biz.
  --model <model>           Gemini model. Defaults to ${DEFAULT_MODEL}.
  --max-file-chars <n>      Per-file character cap. Defaults to ${DEFAULT_MAX_FILE_CHARS}.
  --output <path>           Write the generated report to a file.
  --dry-run                 Print the Gemini prompt without calling the API.
  --help, -h                Show this help.

Gemini API key:
  Put GEMINI_API_KEY=... or GOOGLE_API_KEY=... in the Admin repo's local .env file.
  NEXT_PUBLIC_* keys are intentionally ignored.`)
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
