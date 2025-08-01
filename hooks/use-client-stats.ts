import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

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

        // Fetch projects for this client
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', userId)
          .order('created_at', { ascending: false });

        if (projectsError) {
          console.error('Error fetching projects:', projectsError);
          setError('Failed to load project data');
          return;
        }

        // Calculate stats from real project data
        const activeProjects = projects?.filter(p => 
          p.status === 'active' || p.status === 'in-progress'
        ).length || 0;

        const completedProjects = projects?.filter(p => 
          p.status === 'completed'
        ).length || 0;

        const totalSpent = projects?.filter(p => 
          p.status === 'completed'
        ).reduce((sum, p) => sum + (p.budget || 0), 0) || 0;

        // Calculate average rating (mock for now, will be replaced with real ratings)
        const averageRating = 4.8;

        // Get recent projects (limit to 3)
        const recentProjects = (projects || []).slice(0, 3).map(project => ({
          id: project.id,
          title: project.title,
          status: project.status,
          progress: project.progress || 0
        }));

        setStats({
          activeProjects,
          completedProjects,
          totalSpent,
          averageRating,
          recentProjects
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