import { useState, useEffect } from 'react';

interface Operator {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  status: 'available' | 'busy' | 'offline' | 'on_leave';
  efficiency_rating: number;
  capacity_override: number | null;
  type_id: string;
  type_name: string;
  icon: string;
  color: string;
  hourly_capacity: number;
  current_allocation_percentage: number;
}

export function useOperators() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Load operators from Firestore / API
        setOperators([]);
      } catch (err) {
        console.error('Error in fetchOperators:', err);
        setError('Failed to load operators');
      } finally {
        setLoading(false);
      }
    };

    fetchOperators();
  }, []);

  return { operators, loading, error };
} 