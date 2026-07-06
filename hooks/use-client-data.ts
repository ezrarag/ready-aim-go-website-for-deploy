import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { portalGet, PortalAuthError } from "@/lib/portal-client"

interface ClientPortalRecord {
  id: string
  name?: string
  storyId?: string
  workspaceId?: string
  websiteUrl?: string
  deployUrl?: string
  deployStatus?: string
  githubRepo?: string
  githubRepos?: string[]
  deployHosts?: string[]
  pulseSummary?: string
  pulseReport?: {
    snapshot?: {
      matchedEventCount?: number
      matchedGithubEventCount?: number
      matchedVercelEventCount?: number
    }
    workItems?: Array<{
      title?: string
      priority?: string
      status?: string
      source?: string
    }>
  }
}

interface ClientWebsite {
  name: string
  url: string
  status: string
  techStack: string[]
  githubRepo: string
  githubRepos: string[]
  deployHosts: string[]
  pulseSummary?: string
  pulseReport?: ClientPortalRecord["pulseReport"]
}

interface ClientData {
  client: ClientPortalRecord | null
  website: ClientWebsite | null
  loading: boolean
  error: string | null
}

function normalizeRepoUrl(repo: string): string {
  if (!repo) return ""
  if (repo.startsWith("http://") || repo.startsWith("https://")) return repo
  return `https://github.com/${repo}`
}

function mapClientWebsite(client: ClientPortalRecord): ClientWebsite | null {
  const githubRepos = Array.isArray(client.githubRepos) ? client.githubRepos.filter(Boolean) : []
  const primaryRepo = client.githubRepo || githubRepos[0] || ""
  const deployHosts = Array.isArray(client.deployHosts) ? client.deployHosts.filter(Boolean) : []
  const url = client.websiteUrl || client.deployUrl || (deployHosts[0] ? `https://${deployHosts[0]}` : "")

  if (!url && !primaryRepo) return null

  return {
    name: client.name || client.storyId || "Client Website",
    url: url || normalizeRepoUrl(primaryRepo),
    status: client.deployStatus || (url ? "active" : "linked"),
    techStack: ["ReadyAimGo Portal", "GitHub", "Vercel"],
    githubRepo: normalizeRepoUrl(primaryRepo),
    githubRepos,
    deployHosts,
    pulseSummary: client.pulseSummary,
    pulseReport: client.pulseReport,
  }
}

export function useClientData(clientId: string | undefined) {
  const router = useRouter()
  const [clientData, setClientData] = useState<ClientData>({
    client: null,
    website: null,
    loading: true,
    error: null,
  })

  const fetchClientData = useCallback(async () => {
    if (!clientId) {
      setClientData((prev) => ({ ...prev, loading: false }))
      return
    }

    try {
      setClientData((prev) => ({ ...prev, loading: true, error: null }))
      const client = await portalGet<ClientPortalRecord>("/api/portal/me")

      setClientData({
        client,
        website: mapClientWebsite(client),
        loading: false,
        error: null,
      })
    } catch (err) {
      if (err instanceof PortalAuthError) {
        document.cookie = "portal_revoked=1; path=/"
        router.push("/no-access")
        return
      }

      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error("Error fetching client data:", err)

      setClientData({
        client: null,
        website: null,
        loading: false,
        error: errorMessage,
      })
    }
  }, [clientId, router])

  useEffect(() => {
    fetchClientData()
  }, [fetchClientData])

  return { ...clientData, refetch: fetchClientData }
}
