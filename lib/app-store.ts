import { createPrivateKey, sign as signWithPrivateKey } from "crypto"
import type { ClientDirectoryEntry } from "@/lib/client-directory"
import { getAllClientDirectoryEntries, getFirestoreDb } from "@/lib/firestore"
import { slugifyProjectName } from "@/lib/vercel"

type AppStoreConnectResource = {
  id?: string
  type?: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, { data?: { id?: string; type?: string } | Array<{ id?: string; type?: string }> }>
}

type AppStoreConnectListResponse = {
  data?: AppStoreConnectResource[]
  included?: AppStoreConnectResource[]
  links?: {
    next?: string
  }
}

export interface AppStoreAppSummary {
  id: string
  name: string
  bundleId: string
  sku?: string
  primaryLocale?: string
  platform?: string
  latestVersionString?: string
  latestBuildNumber?: string
  buildState?: string
  uploadedDate?: string
  betaGroups: string[]
}

export interface DiscoveredAppStoreApp extends AppStoreAppSummary {
  linkedClientId?: string
  linkedClientName?: string
}

function getTrimmedEnv(name: string): string | null {
  const value = process.env[name]?.trim()
  return value || null
}

function getAppStoreConnectConfig(): { issuerId: string; keyId: string; privateKey: string } {
  const issuerId = getTrimmedEnv("APP_STORE_CONNECT_ISSUER_ID")
  const keyId = getTrimmedEnv("APP_STORE_CONNECT_KEY_ID")
  const privateKey = process.env.APP_STORE_CONNECT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim()

  if (!issuerId || !keyId || !privateKey) {
    throw new Error("App Store Connect not configured. Set APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_KEY_ID, and APP_STORE_CONNECT_PRIVATE_KEY.")
  }

  return { issuerId, keyId, privateKey }
}

function toBase64Url(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function createAppStoreConnectJwt(): string {
  const { issuerId, keyId, privateKey } = getAppStoreConnectConfig()
  const now = Math.floor(Date.now() / 1000)
  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  }
  const payload = {
    iss: issuerId,
    aud: "appstoreconnect-v1",
    exp: now + 15 * 60,
  }

  const encodedHeader = toBase64Url(JSON.stringify(header))
  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const signature = signWithPrivateKey("sha256", Buffer.from(unsignedToken), {
    key: createPrivateKey(privateKey),
    dsaEncoding: "ieee-p1363",
  })

  return `${unsignedToken}.${toBase64Url(signature)}`
}

async function appStoreConnectFetch<T>(url: string): Promise<T> {
  const token = createAppStoreConnectJwt()
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`App Store Connect API ${response.status}: ${text}`)
  }

  return (await response.json()) as T
}

function buildEndpoint(path: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString()
  return `https://api.appstoreconnect.apple.com${path}${query ? `?${query}` : ""}`
}

async function listResources(path: string, searchParams: URLSearchParams): Promise<AppStoreConnectListResponse> {
  const firstUrl = buildEndpoint(path, searchParams)
  const data: AppStoreConnectResource[] = []
  const included: AppStoreConnectResource[] = []
  let nextUrl: string | null = firstUrl

  while (nextUrl) {
    const payload = await appStoreConnectFetch<AppStoreConnectListResponse>(nextUrl)
    if (Array.isArray(payload.data)) {
      data.push(...payload.data)
    }
    if (Array.isArray(payload.included)) {
      included.push(...payload.included)
    }
    nextUrl = payload.links?.next ?? null
  }

  return { data, included }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function getRelationshipIds(
  relationships: AppStoreConnectResource["relationships"],
  key: string
): string[] {
  const data = relationships?.[key]?.data
  if (Array.isArray(data)) {
    return data.map((item) => item.id).filter((value): value is string => Boolean(value))
  }

  if (data && typeof data === "object" && typeof data.id === "string") {
    return [data.id]
  }

  return []
}

function buildIncludedMap(resources: AppStoreConnectResource[]): Map<string, AppStoreConnectResource> {
  return new Map(
    resources
      .filter((resource) => typeof resource.id === "string" && typeof resource.type === "string")
      .map((resource) => [`${resource.type}:${resource.id}`, resource])
  )
}

export async function listAppStoreApps(): Promise<AppStoreAppSummary[]> {
  const appQuery = new URLSearchParams({
    limit: "200",
    "fields[apps]": "name,bundleId,sku,primaryLocale",
  })

  const buildQuery = new URLSearchParams({
    limit: "200",
    sort: "-uploadedDate",
    include: "app,betaGroups,preReleaseVersion",
    "fields[builds]": "version,uploadedDate,processingState",
    "fields[betaGroups]": "name",
    "fields[preReleaseVersions]": "version,platform",
  })

  const [appsPayload, buildsPayload] = await Promise.all([
    listResources("/v1/apps", appQuery),
    listResources("/v1/builds", buildQuery),
  ])

  const includedMap = buildIncludedMap(buildsPayload.included ?? [])
  const latestBuildByAppId = new Map<
    string,
    {
      versionString?: string
      buildNumber?: string
      buildState?: string
      uploadedDate?: string
      platform?: string
      betaGroups: string[]
    }
  >()

  for (const build of buildsPayload.data ?? []) {
    const appId = getRelationshipIds(build.relationships, "app")[0]
    if (!appId || latestBuildByAppId.has(appId)) {
      continue
    }

    const betaGroups = getRelationshipIds(build.relationships, "betaGroups")
      .map((groupId) => includedMap.get(`betaGroups:${groupId}`))
      .map((resource) => asString(resource?.attributes?.name))
      .filter((value): value is string => Boolean(value))

    const preReleaseVersionId = getRelationshipIds(build.relationships, "preReleaseVersion")[0]
    const preReleaseVersion = preReleaseVersionId
      ? includedMap.get(`preReleaseVersions:${preReleaseVersionId}`)
      : undefined

    latestBuildByAppId.set(appId, {
      versionString: asString(preReleaseVersion?.attributes?.version),
      buildNumber: asString(build.attributes?.version),
      buildState: asString(build.attributes?.processingState),
      uploadedDate: asString(build.attributes?.uploadedDate),
      platform: asString(preReleaseVersion?.attributes?.platform),
      betaGroups,
    })
  }

  return (appsPayload.data ?? [])
    .map((app) => {
      const id = asString(app.id)
      const name = asString(app.attributes?.name)
      const bundleId = asString(app.attributes?.bundleId)
      if (!id || !name || !bundleId) {
        return null
      }

      const latestBuild = latestBuildByAppId.get(id)

      return {
        id,
        name,
        bundleId,
        sku: asString(app.attributes?.sku),
        primaryLocale: asString(app.attributes?.primaryLocale),
        platform: latestBuild?.platform,
        latestVersionString: latestBuild?.versionString,
        latestBuildNumber: latestBuild?.buildNumber,
        buildState: latestBuild?.buildState,
        uploadedDate: latestBuild?.uploadedDate,
        betaGroups: latestBuild?.betaGroups ?? [],
      } satisfies AppStoreAppSummary
    })
    .filter((app): app is AppStoreAppSummary => Boolean(app))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

export function matchAppStoreAppToClient(
  client: ClientDirectoryEntry,
  apps: AppStoreAppSummary[]
): AppStoreAppSummary | null {
  const explicitAppId = normalizeText(client.appStoreConnectAppId)
  const explicitBundleId = normalizeText(client.appStoreConnectBundleId)
  const explicitName = normalizeText(client.appStoreConnectName)

  if (!explicitAppId && !explicitBundleId && !explicitName) {
    return null
  }

  for (const app of apps) {
    if (explicitAppId && normalizeText(app.id) === explicitAppId) {
      return app
    }
    if (explicitBundleId && normalizeText(app.bundleId) === explicitBundleId) {
      return app
    }
    if (explicitName && normalizeText(app.name) === explicitName) {
      return app
    }
  }

  return null
}

export function findAppStoreAppsWithLinkedClients(
  clients: ClientDirectoryEntry[],
  apps: AppStoreAppSummary[]
): DiscoveredAppStoreApp[] {
  const linkedByAppId = new Map<string, { id: string; name: string }>()

  for (const client of clients) {
    const match = matchAppStoreAppToClient(client, apps)
    if (match) {
      linkedByAppId.set(match.id, { id: client.id, name: client.name })
    }
  }

  return apps.map((app) => ({
    ...app,
    linkedClientId: linkedByAppId.get(app.id)?.id,
    linkedClientName: linkedByAppId.get(app.id)?.name,
  }))
}

export function buildClientUpdatesFromAppStoreApp(
  client: Pick<ClientDirectoryEntry, "appStoreUrl" | "appUrl">,
  app: AppStoreAppSummary
): Record<string, unknown> {
  return {
    appUrl: client.appUrl ?? null,
    appStoreUrl: client.appStoreUrl ?? null,
    appStoreConnectAppId: app.id,
    appStoreConnectName: app.name,
    appStoreConnectBundleId: app.bundleId,
    appStoreConnectPlatform: app.platform ?? null,
    appStoreConnectSku: app.sku ?? null,
    appStoreConnectVersionString: app.latestVersionString ?? null,
    appStoreConnectBuildNumber: app.latestBuildNumber ?? null,
    appStoreConnectBuildState: app.buildState ?? null,
    appStoreConnectBetaGroups: app.betaGroups,
    appStoreConnectUpdatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function slugifyAppStoreName(value: string): string {
  return slugifyProjectName(value)
}

export async function syncLinkedClientsFromAppStore(targetAppId?: string): Promise<{
  syncedClientIds: string[]
  syncedAppIds: string[]
}> {
  const db = getFirestoreDb()
  if (!db) {
    throw new Error("Firebase not initialized")
  }

  const [clients, apps] = await Promise.all([getAllClientDirectoryEntries(), listAppStoreApps()])
  const syncedClientIds: string[] = []
  const syncedAppIds = new Set<string>()

  for (const client of clients) {
    const match = matchAppStoreAppToClient(client, apps)
    if (!match) continue
    if (targetAppId && match.id !== targetAppId) continue

    await db.collection("clients").doc(client.id).update(buildClientUpdatesFromAppStoreApp(client, match))
    syncedClientIds.push(client.id)
    syncedAppIds.add(match.id)
  }

  return {
    syncedClientIds,
    syncedAppIds: [...syncedAppIds],
  }
}
