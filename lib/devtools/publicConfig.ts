const readPublicValue = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed && trimmed !== "undefined" ? trimmed : ""
}

const readPreferredPublicValue = (...values: Array<string | undefined>) => {
  for (const value of values) {
    const normalized = readPublicValue(value)
    if (normalized) {
      return normalized
    }
  }
  return ""
}

const firebasePublicEnvSpecs = [
  {
    configKey: "NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY",
    envKeys: ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY"],
    validate: (value: string) =>
      value.startsWith("AIza") ? null : "must look like a Firebase web API key (starts with `AIza`).",
  },
  {
    configKey: "NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN",
    envKeys: ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN"],
    validate: (value: string) =>
      value.includes("://") || value.includes("/")
        ? "must be a hostname like `your-project.firebaseapp.com`, not a full URL."
        : null,
  },
  {
    configKey: "NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID",
    envKeys: ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID"],
    validate: (value: string) =>
      value.includes("://") || value.includes("/") || value.endsWith(".firebaseapp.com")
        ? "must be the Firebase project id, not the auth domain or a URL."
        : null,
  },
  {
    configKey: "NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID",
    envKeys: ["NEXT_PUBLIC_FIREBASE_APP_ID", "NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID"],
    validate: (value: string) =>
      /^(\d+):(\d+):web:/.test(value)
        ? null
        : "must look like a Firebase web app id (`123456:web:...`).",
  },
] as const

type RagFirebaseRequiredConfigKey = (typeof firebasePublicEnvSpecs)[number]["configKey"]
type RagFirebaseConfig = Record<
  | RagFirebaseRequiredConfigKey
  | "NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_STORAGE_BUCKET"
  | "NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_MESSAGING_SENDER_ID",
  string
>

/** Public Firebase fields injected at build time from `.env.local` / env — same shape as the devtools extension expects. */
export const ragDevtoolsFirebaseConfig: RagFirebaseConfig = {
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY: readPreferredPublicValue(
    process.env.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY,
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN: readPreferredPublicValue(
    process.env.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN,
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID: readPreferredPublicValue(
    process.env.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_STORAGE_BUCKET: readPreferredPublicValue(
    process.env.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_STORAGE_BUCKET,
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_MESSAGING_SENDER_ID: readPreferredPublicValue(
    process.env.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_MESSAGING_SENDER_ID,
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  ),
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID: readPreferredPublicValue(
    process.env.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID,
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  ),
}

type RagFirebaseValidationIssue = {
  envKeys: readonly string[]
  reason: string
}

type RagFirebaseValidationKeyStatus = {
  configKey: RagFirebaseRequiredConfigKey
  envKeys: readonly string[]
  status: "present" | "missing" | "invalid"
}

const describeEnvKeys = (envKeys: readonly string[]) => envKeys.join(" or ")

export function getRagDevtoolsFirebaseConfigValidation(
  config: Record<string, string> = ragDevtoolsFirebaseConfig
) {
  const missing: RagFirebaseValidationIssue[] = []
  const invalid: RagFirebaseValidationIssue[] = []
  const keyStatus: RagFirebaseValidationKeyStatus[] = []

  for (const spec of firebasePublicEnvSpecs) {
    const value = readPublicValue(config[spec.configKey])

    if (!value) {
      missing.push({
        envKeys: spec.envKeys,
        reason: "is required",
      })
      keyStatus.push({
        configKey: spec.configKey,
        envKeys: spec.envKeys,
        status: "missing",
      })
      continue
    }

    const validationError = spec.validate(value)
    if (validationError) {
      invalid.push({
        envKeys: spec.envKeys,
        reason: validationError,
      })
      keyStatus.push({
        configKey: spec.configKey,
        envKeys: spec.envKeys,
        status: "invalid",
      })
      continue
    }

    keyStatus.push({
      configKey: spec.configKey,
      envKeys: spec.envKeys,
      status: "present",
    })
  }

  return {
    missing,
    invalid,
    keyStatus,
    hasRequiredValues: missing.length === 0,
    isValid: missing.length === 0 && invalid.length === 0,
  }
}

export function formatRagDevtoolsFirebaseConfigValidation(
  validation = getRagDevtoolsFirebaseConfigValidation()
) {
  if (validation.isValid) {
    return "Firebase web env looks complete."
  }

  const issues: string[] = []

  if (validation.missing.length > 0) {
    issues.push(`Missing ${validation.missing.map(({ envKeys }) => describeEnvKeys(envKeys)).join(", ")}.`)
  }

  if (validation.invalid.length > 0) {
    issues.push(
      `Malformed ${validation.invalid
        .map(({ envKeys, reason }) => `${describeEnvKeys(envKeys)} ${reason}`)
        .join("; ")}.`
    )
  }

  const statusSummary = validation.keyStatus
    .map(({ envKeys, status }) => `${envKeys[0]}=${status}`)
    .join(", ")

  return `${issues.join(" ")} Restart \`npm run dev\` after editing \`.env.local\`. Detected status: ${statusSummary}.`
}

type RagFirebaseValidationRuntime = "server" | "client"

type RagFirebaseValidationGlobal = typeof globalThis & {
  __RAG_FIREBASE_ENV_LOGGED_SERVER__?: boolean
  __RAG_FIREBASE_ENV_LOGGED_CLIENT__?: boolean
}

export function logRagDevtoolsFirebaseConfigValidation(runtime: RagFirebaseValidationRuntime) {
  if (process.env.NODE_ENV !== "development") {
    return
  }

  const validation = getRagDevtoolsFirebaseConfigValidation()
  if (validation.isValid) {
    return
  }

  const globalState = globalThis as RagFirebaseValidationGlobal
  const flag =
    runtime === "server" ? "__RAG_FIREBASE_ENV_LOGGED_SERVER__" : "__RAG_FIREBASE_ENV_LOGGED_CLIENT__"

  if (globalState[flag]) {
    return
  }

  globalState[flag] = true
  console.error(`[RAG Firebase Env][${runtime}] ${formatRagDevtoolsFirebaseConfigValidation(validation)}`)
}

export function hasRagDevtoolsFirebaseConfig(
  config: Record<string, string> = ragDevtoolsFirebaseConfig
) {
  return getRagDevtoolsFirebaseConfigValidation(config).hasRequiredValues
}
