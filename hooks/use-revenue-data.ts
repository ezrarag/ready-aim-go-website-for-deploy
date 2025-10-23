import { useState, useEffect, useCallback } from 'react';

interface RevenueEvent {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  status: string;
}

interface RevenueData {
  total_revenue: number;
  monthly_revenue: number;
  quarterly_revenue: number;
  last_payment_date: string | null;
  recent_events: RevenueEvent[];
  threshold_progress: number;
  has_revenue: boolean;
}

export function useRevenueData(clientId: string | undefined) {
  const [revenueData, setRevenueData] = useState<RevenueData>({
    total_revenue: 0,
    monthly_revenue: 0,
    quarterly_revenue: 0,
    last_payment_date: null,
    recent_events: [],
    threshold_progress: 0,
    has_revenue: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenueData = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to use the Supabase Edge Function
      try {
        const { data, error: functionError } = await supabase.functions.invoke('revenue-metrics', {
          body: { client_id: clientId }
        });

        if (functionError) {
          console.warn('Edge Function failed, using fallback data:', functionError);
          // Use fallback data when Edge Function fails
          setRevenueData({
            total_revenue: 0,
            monthly_revenue: 0,
            quarterly_revenue: 0,
            last_payment_date: null,
            recent_events: [],
            threshold_progress: 0,
            has_revenue: false
          });
        } else if (data) {
          setRevenueData({
            total_revenue: data.total_revenue || 0,
            monthly_revenue: data.monthly_revenue || 0,
            quarterly_revenue: data.quarterly_revenue || 0,
            last_payment_date: data.last_payment_date,
            recent_events: data.recent_events || [],
            threshold_progress: data.threshold_progress || 0,
            has_revenue: data.has_revenue || false
          });
        }
      } catch (edgeFunctionError) {
        console.warn('Edge Function not available, using fallback data:', edgeFunctionError);
        // Use fallback data when Edge Function is not available
        setRevenueData({
          total_revenue: 0,
          monthly_revenue: 0,
          quarterly_revenue: 0,
          last_payment_date: null,
          recent_events: [],
          threshold_progress: 0,
          has_revenue: false
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching revenue data:', err);
      
      // Use default data on error
      setRevenueData({
        total_revenue: 0,
        monthly_revenue: 0,
        quarterly_revenue: 0,
        last_payment_date: null,
        recent_events: [],
        threshold_progress: 0,
        has_revenue: false
      });
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Set up polling for revenue updates (since Edge Functions don't support real-time subscriptions)
  useEffect(() => {
    if (!clientId) return;

    fetchRevenueData();

    // Poll every 30 seconds for updates
    const interval = setInterval(fetchRevenueData, 30000);

    return () => clearInterval(interval);
  }, [clientId, fetchRevenueData]);

  return { revenueData, loading, error };
} 