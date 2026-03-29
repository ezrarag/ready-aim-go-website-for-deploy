import { useState, useEffect } from 'react';

interface ClientProject {
  id: string;
  title: string;
  description: string;
  live_url: string;
  image_url: string;
  status: string;
  created_at: string;
  updated_at: string;
  client_id: string;
  revenue?: number;
  foot_traffic?: number;
  revenue_health?: number;
}

export function useClientProjects(clientId: string | undefined) {
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const fetchClientProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: projects from Firestore / API
        setProjects([]);
      } catch (err) {
        console.error('Error fetching client projects:', err);
        setError('Failed to fetch projects');
      } finally {
        setLoading(false);
      }
    };

    fetchClientProjects();
  }, [clientId]);

  return { projects, loading, error };
} 