export function normalizeHost(raw: string): string | null {
  const input = raw.trim()
  if (!input) return null

  const direct = normalizeHostFromUrl(input)
  if (direct) return direct

  const withProtocol = normalizeHostFromUrl(`https://${input}`)
  return withProtocol
}

function normalizeHostFromUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    return u.hostname.replace(/^www\./i, "").toLowerCase()
  } catch {
    return null
  }
}

export function parseRepoSlug(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null

  if (/^[^/\s]+\/[^/\s]+$/.test(value)) {
    return value.toLowerCase()
  }

  try {
    const u = new URL(value)
    if (!u.hostname.toLowerCase().includes("github.com")) return null
    const parts = u.pathname.split("/").filter(Boolean)
    if (parts.length < 2) return null
    return `${parts[0]}/${parts[1].replace(/\.git$/i, "")}`.toLowerCase()
  } catch {
    return null
  }
}

function splitCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

export function parseRepoSelectorsFromSearchParams(searchParams: URLSearchParams): string[] {
  const fromRepeated = searchParams.getAll("repo")
  const fromCsv = splitCsv(searchParams.get("repos") ?? "")
  const normalized = [...fromRepeated, ...fromCsv]
    .map((v) => parseRepoSlug(v))
    .filter((v): v is string => Boolean(v))
  return unique(normalized)
}

export function parseHostSelectorsFromSearchParams(searchParams: URLSearchParams): string[] {
  const fromRepeated = searchParams.getAll("host")
  const fromCsv = splitCsv(searchParams.get("hosts") ?? "")
  const normalized = [...fromRepeated, ...fromCsv]
    .map((v) => normalizeHost(v))
    .filter((v): v is string => Boolean(v))
  return unique(normalized)
}

export function parseProjectSelectorsFromSearchParams(searchParams: URLSearchParams): string[] {
  const fromRepeated = searchParams.getAll("project")
  const fromCsv = splitCsv(searchParams.get("projects") ?? "")
  return unique([...fromRepeated, ...fromCsv].map((v) => v.trim().toLowerCase()).filter(Boolean))
}

export function collectClientGithubRepos(client: {
  githubRepo?: string
  githubRepos?: string[]
}): string[] {
  const repoValues = [
    ...(Array.isArray(client.githubRepos) ? client.githubRepos : []),
    typeof client.githubRepo === "string" ? client.githubRepo : "",
  ]
  const normalized = repoValues
    .map((v) => parseRepoSlug(v))
    .filter((v): v is string => Boolean(v))
  return unique(normalized)
}

export function collectClientDeployHosts(client: {
  deployUrl?: string
  deployHosts?: string[]
}): string[] {
  const hostValues = [
    ...(Array.isArray(client.deployHosts) ? client.deployHosts : []),
    typeof client.deployUrl === "string" ? client.deployUrl : "",
  ]
  const normalized = hostValues
    .map((v) => normalizeHost(v))
    .filter((v): v is string => Boolean(v))
  return unique(normalized)
}
