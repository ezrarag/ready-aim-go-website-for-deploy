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

/** `externalRestUrl` optional: full URL to PostgREST RPC for cross-stack calls; else uses this app's API. */
export function useContributorProjects(
  contributorEmail: string,
  externalRestUrl?: string,
  serviceApiKey?: string
) {
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

        const apiUrl = externalRestUrl
          ? `${externalRestUrl}/rest/v1/rpc/get_projects_by_contributor`
          : `/api/contributors/${encodeURIComponent(contributorEmail)}/projects`;

        const response = externalRestUrl
          ? await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(serviceApiKey && {
                  apikey: serviceApiKey,
                  Authorization: `Bearer ${serviceApiKey}`,
                }),
              },
              body: JSON.stringify({ contributor_email: contributorEmail }),
            })
          : await fetch(apiUrl, { method: 'GET' });

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
  }, [contributorEmail, externalRestUrl, serviceApiKey]);

  return { projects, loading, error };
}
