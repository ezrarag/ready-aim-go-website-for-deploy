import { useState, useEffect, useCallback } from "react"
import { portalGet, PortalAuthError } from "@/lib/portal-client"
import { useRouter } from "next/navigation"

/**
 * Shape returned by GET /api/portal/projects.
 * Mirrors the `projects` Firestore document fields used by the admin app.
 */
export interface ClientProject {
  id: string
  title: string
  description?: string
  status: string
  clientId: string
  liveUrl?: string
  /** Legacy snake_case fields kept for backward compat with dashboard UI */
  live_url?: string
  image_url?: string
  client_id?: string
  progress?: number
  createdAt?: string
  updatedAt?: string
  created_at?: string
  updated_at?: string
}

/**
 * Fetch projects from the portal API, scoped to the authenticated client.
 *
 * @param clientId  Pass `session.activeClientId` — used as a guard so the
 *                  hook is a no-op until the session is resolved.
 */
export function useClientProjects(clientId: string | null | undefined) {
  const router = useRouter()
  const [projects, setProjects] = useState<ClientProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    if (!clientId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await portalGet<ClientProject[]>("/api/portal/projects")
      // Normalize: back-fill legacy snake_case fields so existing dashboard UI
      // doesn't break while we migrate it.
      const normalized = (data ?? []).map((p) => ({
        ...p,
        live_url: p.live_url ?? p.liveUrl,
        client_id: p.client_id ?? p.clientId,
        created_at: p.created_at ?? p.createdAt,
        updated_at: p.updated_at ?? p.updatedAt,
      }))
      setProjects(normalized)
    } catch (err) {
      if (err instanceof PortalAuthError) {
        // Session revoked or expired — redirect to no-access page.
        document.cookie = "portal_revoked=1; path=/"
        router.push("/no-access")
        return
      }
      setError(err instanceof Error ? err.message : "Failed to fetch projects")
    } finally {
      setLoading(false)
    }
  }, [clientId, router])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return { projects, loading, error, refetch: fetchProjects }
}
