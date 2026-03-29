import { useState, useEffect, useCallback } from 'react';

export function useCommissionRate(clientId: string | undefined) {
  const [commissionRate, setCommissionRate] = useState<number>(10.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommissionRate = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // TODO: commission_rate from Firestore / client profile
      setCommissionRate(10.0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching commission rate:', err);
      // Use default rate on error
      setCommissionRate(10.0);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const updateCommissionRate = useCallback(async (newRate: number) => {
    if (!clientId) return;

    try {
      setError(null);

      console.warn('updateCommissionRate: persist via Firestore (not implemented)', newRate);
      setCommissionRate(newRate);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error updating commission rate:', err);
      throw err;
    }
  }, [clientId]);

  useEffect(() => {
    fetchCommissionRate();
  }, [fetchCommissionRate]);

  return { 
    commissionRate, 
    loading, 
    error, 
    updateCommissionRate,
    refetch: fetchCommissionRate 
  };
} 