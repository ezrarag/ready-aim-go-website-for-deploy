import { useState, useEffect, useCallback } from "react"
import { portalGet, PortalAuthError } from "@/lib/portal-client"
import { useRouter } from "next/navigation"
import type { ClientProject } from "./use-client-projects"

export interface ClientStats {
  activeProjects: number
  completedProjects: number
  totalSpent: number
  averageRating: number
  recentProjects: Array<{
    id: string
    title: string
    status: string
    progress: number
  }>
}

function deriveStats(projects: ClientProject[]): ClientStats {
  const activeProjects = projects.filter(
    (p) => p.status === "active" || p.status === "in_progress"
  ).length
  const completedProjects = projects.filter((p) => p.status === "completed").length
  const recentProjects = projects.slice(0, 5).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    progress: p.progress ?? 0,
  }))
  return {
    activeProjects,
    completedProjects,
    totalSpent: 0, // billing data lives in a separate collection
    averageRating: 0,
    recentProjects,
  }
}

/**
 * Derive project stats for the client dashboard from the portal projects API.
 *
 * @param clientId  Pass `session.activeClientId` (canonical Firestore clientId).
 */
export function useClientStats(clientId: string | null | undefined) {
  const router = useRouter()
  const [stats, setStats] = useState<ClientStats>({
    activeProjects: 0,
    completedProjects: 0,
    totalSpent: 0,
    averageRating: 0,
    recentProjects: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!clientId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const projects = await portalGet<ClientProject[]>("/api/portal/projects")
      setStats(deriveStats(projects ?? []))
    } catch (err) {
      if (err instanceof PortalAuthError) {
        document.cookie = "portal_revoked=1; path=/"
        router.push("/no-access")
        return
      }
      setError(err instanceof Error ? err.message : "Failed to load client statistics")
    } finally {
      setLoading(false)
    }
  }, [clientId, router])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { stats, loading, error }
}
