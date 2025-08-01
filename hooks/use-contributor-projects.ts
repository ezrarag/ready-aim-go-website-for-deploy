import { useState, useEffect } from 'react';

interface ContributorProject {
  project_id: string;
  project_title: string;
  project_description: string;
  live_url: string;
  image_url: string;
  project_status: string;
  project_created_at: string;
  role: string;
  contribution_percentage: number;
  attribution_order: number;
}

interface ContributorProjectsResponse {
  contributor_email: string;
  projects: ContributorProject[];
  total: number;
}

export function useContributorProjects(contributorEmail: string, supabaseUrl?: string, supabaseKey?: string) {
  const [projects, setProjects] = useState<ContributorProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contributorEmail) {
      setLoading(false);
      return;
    }

    const fetchContributorProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        // If supabaseUrl and supabaseKey are provided, use them (for cross-project fetching)
        // Otherwise, use the default client (for same-project fetching)
        const apiUrl = supabaseUrl 
          ? `${supabaseUrl}/rest/v1/rpc/get_projects_by_contributor`
          : `/api/contributors/${encodeURIComponent(contributorEmail)}/projects`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(supabaseKey && {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            })
          },
          ...(supabaseUrl && {
            body: JSON.stringify({
              contributor_email: contributorEmail
            })
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ContributorProjectsResponse = await response.json();
        setProjects(data.projects || []);

      } catch (err) {
        console.error('Error fetching contributor projects:', err);
        setError('Failed to load contributor projects');
      } finally {
        setLoading(false);
      }
    };

    fetchContributorProjects();
  }, [contributorEmail, supabaseUrl, supabaseKey]);

  return { projects, loading, error };
} 