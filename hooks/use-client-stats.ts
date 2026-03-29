import { useState, useEffect } from 'react';

interface ClientStats {
  activeProjects: number;
  completedProjects: number;
  totalSpent: number;
  averageRating: number;
  recentProjects: Array<{
    id: string;
    title: string;
    status: string;
    progress: number;
  }>;
}

export function useClientStats(userId: string | undefined) {
  const [stats, setStats] = useState<ClientStats>({
    activeProjects: 0,
    completedProjects: 0,
    totalSpent: 0,
    averageRating: 0,
    recentProjects: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchClientStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: project stats from Firestore / API
        setStats({
          activeProjects: 0,
          completedProjects: 0,
          totalSpent: 0,
          averageRating: 0,
          recentProjects: []
        });

      } catch (err) {
        console.error('Error in fetchClientStats:', err);
        setError('Failed to load client statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchClientStats();
  }, [userId]);

  return { stats, loading, error };
} 