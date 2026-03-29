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

      // TODO: revenue metrics from Firestore / `/api/...`
      setRevenueData({
        total_revenue: 0,
        monthly_revenue: 0,
        quarterly_revenue: 0,
        last_payment_date: null,
        recent_events: [],
        threshold_progress: 0,
        has_revenue: false
      });
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

  // Poll for revenue updates until realtime (e.g. Firestore listeners) is wired
  useEffect(() => {
    if (!clientId) return;

    fetchRevenueData();

    // Poll every 30 seconds for updates
    const interval = setInterval(fetchRevenueData, 30000);

    return () => clearInterval(interval);
  }, [clientId, fetchRevenueData]);

  return { revenueData, loading, error };
} 