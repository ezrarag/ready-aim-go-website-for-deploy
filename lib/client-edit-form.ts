import type {
  ClientDirectoryEntry,
  ClientStatus,
  DeployStatus,
  StripeStatus,
} from "./client-directory"
import { collectClientDeployHosts, collectClientGithubRepos } from "./pulse-selectors"

export interface ClientEditForm {
  name: string
  storyId: string
  brands: string[]
  status: ClientStatus
  deployStatus: DeployStatus
  deployUrl: string
  stripeStatus: StripeStatus
  revenue: number
  meetings: number
  emails: number
  commits: number
  lastActivity: string
  pulseSummary: string
  websiteUrl: string
  githubRepo: string
  githubReposCsv: string
  deployHostsCsv: string
  appUrl: string
  appStoreUrl: string
  rdUrl: string
  housingUrl: string
  transportationUrl: string
  insuranceUrl: string
  storyVideoUrl: string
  showOnFrontend: boolean
  isNewStory: boolean
}

export interface ClientEditPayload {
  name: string
  storyId: string
  brands: string[]
  status: ClientStatus
  deployStatus: DeployStatus
  deployUrl: string
  stripeStatus: StripeStatus
  revenue: number
  meetings: number
  emails: number
  commits: number
  lastActivity: string
  pulseSummary: string
  websiteUrl: string
  githubRepo: string
  githubRepos: string[]
  deployHosts: string[]
  appUrl: string
  appStoreUrl: string
  rdUrl: string
  housingUrl: string
  transportationUrl: string
  insuranceUrl: string
  storyVideoUrl: string
  showOnFrontend: boolean
  isNewStory: boolean
}

export const EMPTY_CLIENT_EDIT_FORM: ClientEditForm = {
  name: "",
  storyId: "",
  brands: [],
  status: "onboarding",
  deployStatus: "building",
  deployUrl: "",
  stripeStatus: "pending",
  revenue: 0,
  meetings: 0,
  emails: 0,
  commits: 0,
  lastActivity: "",
  pulseSummary: "",
  websiteUrl: "",
  githubRepo: "",
  githubReposCsv: "",
  deployHostsCsv: "",
  appUrl: "",
  appStoreUrl: "",
  rdUrl: "",
  housingUrl: "",
  transportationUrl: "",
  insuranceUrl: "",
  storyVideoUrl: "",
  showOnFrontend: true,
  isNewStory: false,
}

function splitCsv(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

export function createClientEditForm(client?: Partial<ClientDirectoryEntry> | null): ClientEditForm {
  return {
    name: client?.name ?? "",
    storyId: client?.storyId ?? "",
    brands: client?.brands ?? [],
    status: client?.status ?? "onboarding",
    deployStatus: client?.deployStatus ?? "building",
    deployUrl: client?.deployUrl ?? "",
    stripeStatus: client?.stripeStatus ?? "pending",
    revenue: client?.revenue ?? 0,
    meetings: client?.meetings ?? 0,
    emails: client?.emails ?? 0,
    commits: client?.commits ?? 0,
    lastActivity: client?.lastActivity ?? "",
    pulseSummary: client?.pulseSummary ?? "",
    websiteUrl: client?.websiteUrl ?? "",
    githubRepo: client?.githubRepo ?? "",
    githubReposCsv: Array.isArray(client?.githubRepos) ? client?.githubRepos.join(", ") ?? "" : "",
    deployHostsCsv: Array.isArray(client?.deployHosts) ? client?.deployHosts.join(", ") ?? "" : "",
    appUrl: client?.appUrl ?? "",
    appStoreUrl: client?.appStoreUrl ?? "",
    rdUrl: client?.rdUrl ?? "",
    housingUrl: client?.housingUrl ?? "",
    transportationUrl: client?.transportationUrl ?? "",
    insuranceUrl: client?.insuranceUrl ?? "",
    storyVideoUrl: client?.storyVideoUrl ?? "",
    showOnFrontend: client?.showOnFrontend !== false,
    isNewStory: client?.isNewStory ?? false,
  }
}

export function buildClientEditPayload(form: ClientEditForm): ClientEditPayload {
  const deployUrl = form.deployUrl.trim()
  const githubRepos = collectClientGithubRepos({
    githubRepo: form.githubRepo.trim(),
    githubRepos: splitCsv(form.githubReposCsv),
  })

  return {
    name: form.name.trim(),
    storyId: form.storyId.trim(),
    brands: form.brands,
    status: form.status,
    deployStatus: form.deployStatus,
    deployUrl,
    stripeStatus: form.stripeStatus,
    revenue: form.revenue,
    meetings: form.meetings,
    emails: form.emails,
    commits: form.commits,
    lastActivity: form.lastActivity.trim(),
    pulseSummary: form.pulseSummary.trim(),
    websiteUrl: form.websiteUrl.trim(),
    githubRepo: githubRepos[0] ?? "",
    githubRepos,
    deployHosts: collectClientDeployHosts({
      deployUrl,
      deployHosts: splitCsv(form.deployHostsCsv),
    }),
    appUrl: form.appUrl.trim(),
    appStoreUrl: form.appStoreUrl.trim(),
    rdUrl: form.rdUrl.trim(),
    housingUrl: form.housingUrl.trim(),
    transportationUrl: form.transportationUrl.trim(),
    insuranceUrl: form.insuranceUrl.trim(),
    storyVideoUrl: form.storyVideoUrl.trim(),
    showOnFrontend: form.showOnFrontend,
    isNewStory: form.isNewStory,
  }
}

export function canSaveClientEditForm(form: ClientEditForm): boolean {
  return Boolean(form.name.trim() && form.storyId.trim())
}

export function getClientEditPayloadSignature(payload: ClientEditPayload): string {
  return JSON.stringify(payload)
}

export function applyClientEditPayload(
  client: ClientDirectoryEntry,
  payload: ClientEditPayload
): ClientDirectoryEntry {
  return {
    ...client,
    ...payload,
    githubRepo: payload.githubRepo || undefined,
    pulseSummary: payload.pulseSummary || undefined,
    deployUrl: payload.deployUrl || undefined,
    websiteUrl: payload.websiteUrl || undefined,
    appUrl: payload.appUrl || undefined,
    appStoreUrl: payload.appStoreUrl || undefined,
    rdUrl: payload.rdUrl || undefined,
    housingUrl: payload.housingUrl || undefined,
    transportationUrl: payload.transportationUrl || undefined,
    insuranceUrl: payload.insuranceUrl || undefined,
    storyVideoUrl: payload.storyVideoUrl || undefined,
    updatedAt: new Date().toISOString(),
  }
}
