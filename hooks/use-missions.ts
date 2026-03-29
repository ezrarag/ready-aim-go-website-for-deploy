import { useState, useEffect, useCallback } from 'react';

export interface Mission {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget?: number;
  start_date?: string;
  due_date?: string;
  completed_date?: string;
  assigned_operator_id?: string;
  progress_percentage: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MissionStats {
  total_missions: number;
  completed_missions: number;
  active_missions: number;
  pending_missions: number;
  average_progress: number;
  total_budget: number;
  website_missions: number;
  app_missions: number;
  business_plan_missions: number;
  real_estate_missions: number;
  transportation_missions: number;
  legal_filing_missions: number;
}

export function useMissions(clientId?: string) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [stats, setStats] = useState<MissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // TODO: missions from Firestore / API
      setMissions([]);

      setStats({
        total_missions: 0,
        completed_missions: 0,
        active_missions: 0,
        pending_missions: 0,
        average_progress: 0,
        total_budget: 0,
        website_missions: 0,
        app_missions: 0,
        business_plan_missions: 0,
        real_estate_missions: 0,
        transportation_missions: 0,
        legal_filing_missions: 0
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch missions';
      setError(errorMessage);
      console.error('Error fetching missions:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const createMission = useCallback(async (missionData: Partial<Mission>) => {
    try {
      console.warn("createMission: persist via Firestore (not implemented)", missionData);
      await fetchMissions();
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create mission';
      setError(errorMessage);
      throw err;
    }
  }, [fetchMissions]);

  const updateMission = useCallback(async (missionId: string, updates: Partial<Mission>) => {
    try {
      console.warn("updateMission: persist via Firestore (not implemented)", missionId, updates);
      await fetchMissions();
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update mission';
      setError(errorMessage);
      throw err;
    }
  }, [fetchMissions]);

  const deleteMission = useCallback(async (missionId: string) => {
    try {
      console.warn("deleteMission: persist via Firestore (not implemented)", missionId);
      await fetchMissions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete mission';
      setError(errorMessage);
      throw err;
    }
  }, [fetchMissions]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  return {
    missions,
    stats,
    loading,
    error,
    createMission,
    updateMission,
    deleteMission,
    refetch: fetchMissions
  };
} 