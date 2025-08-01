import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

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

      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('commission_rate')
        .eq('id', clientId)
        .single();

      // If column doesn't exist yet, use default rate
      if (queryError && queryError.code === '42703') {
        console.log('Commission rate column not found, using default');
        setCommissionRate(10.0);
        return;
      }

      if (queryError) {
        console.error('Error fetching commission rate:', queryError);
        setError(queryError.message);
        // Use default rate on error
        setCommissionRate(10.0);
      } else if (data) {
        setCommissionRate(data.commission_rate || 10.0);
      } else {
        // No data found, use default
        setCommissionRate(10.0);
      }
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

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ commission_rate: newRate })
        .eq('id', clientId);

      if (updateError) {
        console.error('Error updating commission rate:', updateError);
        setError(updateError.message);
        throw updateError;
      }

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