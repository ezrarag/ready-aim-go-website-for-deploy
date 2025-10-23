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

      // Fetch missions
      const { data: missionsData, error: missionsError } = await supabase
        .from('missions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (missionsError) {
        throw missionsError;
      }

      setMissions(missionsData || []);

      // Fetch mission stats
      const { data: statsData, error: statsError } = await supabase
        .from('mission_stats')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.warn('Error fetching mission stats:', statsError);
      }

      setStats(statsData || {
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
      const { data, error } = await supabase
        .from('missions')
        .insert(missionData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Refresh missions list
      await fetchMissions();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create mission';
      setError(errorMessage);
      throw err;
    }
  }, [fetchMissions]);

  const updateMission = useCallback(async (missionId: string, updates: Partial<Mission>) => {
    try {
      const { data, error } = await supabase
        .from('missions')
        .update(updates)
        .eq('id', missionId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Refresh missions list
      await fetchMissions();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update mission';
      setError(errorMessage);
      throw err;
    }
  }, [fetchMissions]);

  const deleteMission = useCallback(async (missionId: string) => {
    try {
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId);

      if (error) {
        throw error;
      }

      // Refresh missions list
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