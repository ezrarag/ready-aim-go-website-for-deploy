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

        const { data, error: queryError } = await supabase
          .from('operators')
          .select(`
            id,
            name,
            email,
            avatar_url,
            status,
            efficiency_rating,
            capacity_override,
            type_id,
            operator_types!inner (
              id,
              type_name,
              icon,
              color,
              hourly_capacity
            )
          `)
          .order('name');

        if (queryError) {
          console.error('Error fetching operators:', queryError);
          setError('Failed to load operators');
          return;
        }

        // Transform the data to match our interface
        const transformedOperators = (data || []).map((op: any) => ({
          id: op.id,
          name: op.name,
          email: op.email,
          avatar_url: op.avatar_url,
          status: op.status,
          efficiency_rating: op.efficiency_rating,
          capacity_override: op.capacity_override,
          type_id: op.type_id,
          type_name: op.operator_types?.type_name || 'Unknown',
          icon: op.operator_types?.icon || 'User',
          color: op.operator_types?.color || '#6B7280',
          hourly_capacity: op.operator_types?.hourly_capacity || 40,
          current_allocation_percentage: 0 // This would be calculated from project_operators table
        }));

        setOperators(transformedOperators);
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