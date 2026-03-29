import type { ModuleKey } from "./client-directory"
import { getFirestoreDb } from "./firestore"
import { collectClientDeployHosts, collectClientGithubRepos, normalizeHost } from "./pulse-selectors"

type RawClientDoc = Record<string, unknown>
type RawUpdateDoc = Record<string, unknown>

const MODULE_KEYS: ModuleKey[] = ["web", "app", "rd", "housing", "transportation", "insurance"]

const MODULE_URL_FIELDS: Record<ModuleKey, string[]> = {
  web: ["websiteUrl"],
  app: ["appUrl", "appStoreUrl"],
  rd: ["rdUrl"],
  housing: ["housingUrl"],
  transportation: ["transportationUrl"],
  insurance: ["insuranceUrl"],
}

export const BEAM_CANONICAL_ORGANIZATION_FIELDS = [
  "source.documentId",
  "source.storyId",
  "source.externalKey",
  "organization.displayName",
  "organization.aliases",
  "organization.websiteUrl",
  "organization.primaryDomain",
  "organization.status",
  "organization.timeZone",
  "organization.contacts.ownerEmail",
  "organization.contacts.supportEmail",
  "organization.contacts.supportPhone",
  "organization.contacts.whatsAppNumber",
] as const

export const READYAIMGO_SITE_METADATA_FIELDS = [
  "siteMetadata.storyVideoUrl",
  "siteMetadata.showOnFrontend",
  "siteMetadata.isNewStory",
  "siteMetadata.storyPath",
  "siteMetadata.storyModules",
  "siteMetadata.deployUrl",
  "siteMetadata.deployHosts",
  "siteMetadata.githubRepos",
  "siteMetadata.vercelProjectId",
  "siteMetadata.vercelProjectName",
  "siteMetadata.vercelProjectDomains",
] as const

export interface BeamOrganizationCandidate {
  source: {
    system: "readyaimgo"
    collection: "clients"
    documentId: string
    storyId: string
    externalKey: string
    documentPath: string
  }
  organization: {
    displayName: string
    aliases: string[]
    websiteUrl?: string
    primaryDomain?: string
    status?: string
    timeZone?: string
    contacts: {
      ownerEmail?: string
      supportEmail?: string
      supportPhone?: string
      whatsAppNumber?: string
    }
  }
  siteMetadata: {
    storyPath: string
    storyVideoUrl?: string
    showOnFrontend: boolean
    isNewStory: boolean
    storyModules: ModuleKey[]
    websiteUrl?: string
    deployUrl?: string
    deployHosts: string[]
    githubRepos: string[]
    vercelProjectId?: string
    vercelProjectName?: string
    vercelProjectDomains: string[]
  }
  enrichmentReadiness: {
    organizationCandidate: {
      eligible: boolean
      blockers: string[]
    }
    updates: {
      eligible: boolean
      blockers: string[]
      totalDocuments: number
      publishedDocuments: number
      exportablePublishedDocuments: number
      malformedDocuments: number
    }
    rawFieldIssues: string[]
  }
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const normalized = value.trim()
  return normalized ? normalized : undefined
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
}

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

function getStoryModules(raw: RawClientDoc): ModuleKey[] {
  return MODULE_KEYS.filter((key) =>
    MODULE_URL_FIELDS[key].some((field) => Boolean(asTrimmedString(raw[field])))
  )
}

function derivePrimaryDomain(raw: RawClientDoc, websiteUrl?: string, deployHosts: string[] = []): string | undefined {
  const primaryDomain = normalizeHost(asTrimmedString(raw.primaryDomain) ?? "")
  if (primaryDomain) return primaryDomain

  const websiteDomain = normalizeHost(websiteUrl ?? "")
  if (websiteDomain) return websiteDomain

  return deployHosts[0]
}

function getWhatsAppNumber(raw: RawClientDoc): string | undefined {
  return asTrimmedString(raw.whatsAppNumber) ?? asTrimmedString(raw.whatsAppNumner)
}

function normalizeUpdateStatus(raw: RawUpdateDoc): "draft" | "published" {
  return raw.status === "published" || raw.published === true ? "published" : "draft"
}

function auditUpdates(rawUpdates: RawUpdateDoc[]): BeamOrganizationCandidate["enrichmentReadiness"]["updates"] {
  let publishedDocuments = 0
  let exportablePublishedDocuments = 0
  let malformedDocuments = 0

  for (const raw of rawUpdates) {
    const type = asTrimmedString(raw.type)
    const title = asTrimmedString(raw.title)
    const body = asTrimmedString(raw.body) ?? asTrimmedString(raw.details) ?? asTrimmedString(raw.summary)
    const status = normalizeUpdateStatus(raw)
    const validType = Boolean(type && MODULE_KEYS.includes(type as ModuleKey))
    const valid = validType && Boolean(title) && Boolean(body)

    if (status === "published") {
      publishedDocuments += 1
      if (valid) {
        exportablePublishedDocuments += 1
      } else {
        malformedDocuments += 1
      }
      continue
    }

    if (
      Object.keys(raw).length > 0 &&
      (!validType || !title || !body || raw.status === "" || raw.type === "" || raw.title === "")
    ) {
      malformedDocuments += 1
    }
  }

  const blockers: string[] = []
  if (publishedDocuments === 0) blockers.push("no_published_updates")
  if (malformedDocuments > 0) blockers.push("malformed_update_documents")

  return {
    eligible: exportablePublishedDocuments > 0,
    blockers,
    totalDocuments: rawUpdates.length,
    publishedDocuments,
    exportablePublishedDocuments,
    malformedDocuments,
  }
}

function getRawFieldIssues(id: string, storyId: string, raw: RawClientDoc, githubRepos: string[], deployHosts: string[]): string[] {
  const issues: string[] = []

  if (id !== storyId) issues.push("document_id_differs_from_story_id")
  if (!("modules" in raw)) issues.push("missing_modules")
  if (!("updatedAt" in raw)) issues.push("missing_updatedAt")
  if (!("showOnFrontend" in raw)) issues.push("missing_showOnFrontend")
  if (asTrimmedString(raw.githubRepo) && githubRepos.length === 0) issues.push("github_repo_not_normalized")
  if (asTrimmedString(raw.deployUrl) && deployHosts.length === 0) issues.push("deploy_url_not_normalized")
  if ("repo" in raw && asTrimmedString(raw.repo)) issues.push("legacy_repo_field_present")
  if ("whatsAppNumner" in raw) issues.push("whatsapp_field_typo")
  if ("primaryDomain" in raw && !derivePrimaryDomain(raw, asTrimmedString(raw.websiteUrl), deployHosts)) {
    issues.push("invalid_primaryDomain")
  }

  return issues
}

function buildOrganizationBlockers(
  displayName: string | undefined,
  storyId: string | undefined,
  websiteUrl: string | undefined,
  primaryDomain: string | undefined
): string[] {
  const blockers: string[] = []
  if (!displayName) blockers.push("missing_name")
  if (!storyId) blockers.push("missing_story_id")
  if (!websiteUrl && !primaryDomain) blockers.push("missing_primary_web_identity")
  return blockers
}

export async function listBeamOrganizationCandidates(): Promise<BeamOrganizationCandidate[]> {
  const db = getFirestoreDb()
  if (!db) return []

  const snapshot = await db.collection("clients").get()
  const candidates = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const raw = doc.data() as RawClientDoc
      const displayName = asTrimmedString(raw.name)
      const storyId = asTrimmedString(raw.storyId) ?? doc.id
      const websiteUrl = asTrimmedString(raw.websiteUrl)
      const githubRepos = collectClientGithubRepos({
        githubRepo: asTrimmedString(raw.githubRepo),
        githubRepos: asStringArray(raw.githubRepos),
      })
      const deployHosts = collectClientDeployHosts({
        deployUrl: asTrimmedString(raw.deployUrl),
        deployHosts: asStringArray(raw.deployHosts),
      })
      const primaryDomain = derivePrimaryDomain(raw, websiteUrl, deployHosts)
      const aliases = unique(
        [storyId, asTrimmedString(raw.appSlug), displayName]
          .filter((value): value is string => Boolean(value))
      ).filter((value) => value !== displayName)
      const rawUpdates = (await doc.ref.collection("updates").get()).docs.map((updateDoc) => updateDoc.data() as RawUpdateDoc)
      const organizationBlockers = buildOrganizationBlockers(displayName, storyId, websiteUrl, primaryDomain)
      const updates = auditUpdates(rawUpdates)

      return {
        source: {
          system: "readyaimgo",
          collection: "clients",
          documentId: doc.id,
          storyId,
          externalKey: `readyaimgo:clients:${doc.id}`,
          documentPath: `clients/${doc.id}`,
        },
        organization: {
          displayName: displayName ?? storyId,
          aliases,
          websiteUrl,
          primaryDomain,
          status: asTrimmedString(raw.status),
          timeZone: asTrimmedString(raw.timeZone),
          contacts: {
            ownerEmail: asTrimmedString(raw.ownerEmail),
            supportEmail: asTrimmedString(raw.supportEmail),
            supportPhone: asTrimmedString(raw.supportPhone),
            whatsAppNumber: getWhatsAppNumber(raw),
          },
        },
        siteMetadata: {
          storyPath: `/story/${encodeURIComponent(storyId)}`,
          storyVideoUrl: asTrimmedString(raw.storyVideoUrl),
          showOnFrontend: raw.showOnFrontend !== false,
          isNewStory: raw.isNewStory === true,
          storyModules: getStoryModules(raw),
          websiteUrl,
          deployUrl: asTrimmedString(raw.deployUrl),
          deployHosts,
          githubRepos,
          vercelProjectId: asTrimmedString(raw.vercelProjectId),
          vercelProjectName: asTrimmedString(raw.vercelProjectName),
          vercelProjectDomains: asStringArray(raw.vercelProjectDomains),
        },
        enrichmentReadiness: {
          organizationCandidate: {
            eligible: organizationBlockers.length === 0,
            blockers: organizationBlockers,
          },
          updates,
          rawFieldIssues: getRawFieldIssues(doc.id, storyId, raw, githubRepos, deployHosts),
        },
      } satisfies BeamOrganizationCandidate
    })
  )

  return candidates.sort((a, b) => a.organization.displayName.localeCompare(b.organization.displayName))
}
