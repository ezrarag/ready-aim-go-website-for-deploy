import { useState, useEffect, useCallback } from "react"
import { portalGet, PortalAuthError } from "@/lib/portal-client"
import { useRouter } from "next/navigation"
import type { ClientProject } from "./use-client-projects"

/**
 * "Missions" in the portal UI map to the canonical `projects` Firestore
 * collection (same collection used by the admin app). This hook fetches
 * projects via the portal API and adapts them to the Mission shape expected
 * by the existing dashboard UI.
 */
export interface Mission {
  id: string
  client_id: string
  title: string
  description: string
  category: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "critical"
  budget?: number
  start_date?: string
  due_date?: string
  completed_date?: string
  assigned_operator_id?: string
  progress_percentage: number
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MissionStats {
  total_missions: number
  completed_missions: number
  active_missions: number
  pending_missions: number
  average_progress: number
  total_budget: number
  website_missions: number
  app_missions: number
  business_plan_missions: number
  real_estate_missions: number
  transportation_missions: number
  legal_filing_missions: number
}

function projectToMission(p: ClientProject): Mission {
  const status =
    p.status === "completed"
      ? "completed"
      : p.status === "cancelled"
        ? "cancelled"
        : p.status === "in_progress" || p.status === "active"
          ? "in_progress"
          : "pending"

  return {
    id: p.id,
    client_id: p.clientId ?? p.client_id ?? "",
    title: p.title,
    description: p.description ?? "",
    category: "general",
    status,
    priority: "medium",
    progress_percentage: p.progress ?? 0,
    created_at: p.createdAt ?? p.created_at ?? new Date().toISOString(),
    updated_at: p.updatedAt ?? p.updated_at ?? new Date().toISOString(),
  }
}

function deriveMissionStats(missions: Mission[]): MissionStats {
  const completed = missions.filter((m) => m.status === "completed").length
  const active = missions.filter((m) => m.status === "in_progress").length
  const pending = missions.filter((m) => m.status === "pending").length
  const totalProgress = missions.reduce((sum, m) => sum + m.progress_percentage, 0)
  return {
    total_missions: missions.length,
    completed_missions: completed,
    active_missions: active,
    pending_missions: pending,
    average_progress: missions.length ? totalProgress / missions.length : 0,
    total_budget: 0,
    website_missions: 0,
    app_missions: 0,
    business_plan_missions: 0,
    real_estate_missions: 0,
    transportation_missions: 0,
    legal_filing_missions: 0,
  }
}

/**
 * @param clientId  Must be `session.activeClientId` (canonical Firestore
 *                  clientId), NOT `session.user.id` (Firebase UID).
 */
export function useMissions(clientId: string | null | undefined) {
  const router = useRouter()
  const [missions, setMissions] = useState<Mission[]>([])
  const [stats, setStats] = useState<MissionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMissions = useCallback(async () => {
    if (!clientId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const projects = await portalGet<ClientProject[]>("/api/portal/projects")
      const mapped = (projects ?? []).map(projectToMission)
      setMissions(mapped)
      setStats(deriveMissionStats(mapped))
    } catch (err) {
      if (err instanceof PortalAuthError) {
        document.cookie = "portal_revoked=1; path=/"
        router.push("/no-access")
        return
      }
      setError(err instanceof Error ? err.message : "Failed to fetch missions")
    } finally {
      setLoading(false)
    }
  }, [clientId, router])

  const createMission = useCallback(
    async (missionData: Partial<Mission>) => {
      console.warn("createMission: persist via portal API (not yet implemented)", missionData)
      await fetchMissions()
      return null
    },
    [fetchMissions]
  )

  const updateMission = useCallback(
    async (missionId: string, updates: Partial<Mission>) => {
      console.warn("updateMission: persist via portal API (not yet implemented)", missionId, updates)
      await fetchMissions()
      return null
    },
    [fetchMissions]
  )

  const deleteMission = useCallback(
    async (missionId: string) => {
      console.warn("deleteMission: persist via portal API (not yet implemented)", missionId)
      await fetchMissions()
    },
    [fetchMissions]
  )

  useEffect(() => {
    fetchMissions()
  }, [fetchMissions])

  return {
    missions,
    stats,
    loading,
    error,
    createMission,
    updateMission,
    deleteMission,
    refetch: fetchMissions,
  }
}
