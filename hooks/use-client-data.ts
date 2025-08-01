import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

interface ClientWebsite {
  name: string;
  url: string;
  status: string;
  techStack: string[];
  githubRepo: string;
}

interface ClientData {
  website: ClientWebsite | null;
  loading: boolean;
  error: string | null;
}

export function useClientData(clientId: string | undefined) {
  const [clientData, setClientData] = useState<ClientData>({
    website: null,
    loading: true,
    error: null
  });

  const fetchClientData = useCallback(async () => {
    if (!clientId) {
      setClientData(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setClientData(prev => ({ ...prev, loading: true, error: null }));

      // Get client profile first
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Get website data from business_assets
      const { data: assetData, error: assetError } = await supabase
        .from('business_assets')
        .select('*')
        .eq('client_id', clientId)
        .eq('type', 'website')
        .order('created_at', { ascending: false })
        .limit(1);

      if (assetError) {
        console.error('Error fetching business assets:', assetError);
      }

      // Get website data from projects as fallback
      let projectData = null;
      if (!assetData || assetData.length === 0) {
        const { data: projData, error: projError } = await supabase
          .from('projects')
          .select('*')
          .eq('client_id', clientId)
          .eq('type', 'website')
          .not('live_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (projError) {
          console.error('Error fetching projects:', projError);
        } else {
          projectData = projData;
        }
      }

      // Determine website info
      let websiteInfo: ClientWebsite | null = null;
      
      if (assetData && assetData.length > 0) {
        const asset = assetData[0];
        websiteInfo = {
          name: asset.name || `${profileData?.full_name || 'Client'}'s Website`,
          url: asset.url || '#',
          status: asset.status || 'active',
          techStack: asset.tech_stack || ['React', 'Next.js', 'TypeScript'],
          githubRepo: asset.github_repo || `https://github.com/${profileData?.full_name?.toLowerCase().replace(' ', '')}/website`
        };
      } else if (projectData && projectData.length > 0) {
        const project = projectData[0];
        websiteInfo = {
          name: project.title || `${profileData?.full_name || 'Client'}'s Website`,
          url: project.live_url || '#',
          status: project.status || 'active',
          techStack: project.tech_stack || ['React', 'Next.js', 'TypeScript'],
          githubRepo: project.github_repo || `https://github.com/${profileData?.full_name?.toLowerCase().replace(' ', '')}/website`
        };
      } else {
        // Create default website info based on client profile
        websiteInfo = {
          name: `${profileData?.full_name || 'Client'}'s Website`,
          url: `https://${profileData?.full_name?.toLowerCase().replace(' ', '')}.com` || '#',
          status: 'active',
          techStack: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Supabase'],
          githubRepo: `https://github.com/${profileData?.full_name?.toLowerCase().replace(' ', '')}/website`
        };
      }

      setClientData({
        website: websiteInfo,
        loading: false,
        error: null
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching client data:', err);
      
      setClientData({
        website: null,
        loading: false,
        error: errorMessage
      });
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  return clientData;
} 