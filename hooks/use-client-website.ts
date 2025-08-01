import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

interface WebsiteInfo {
  name: string;
  url: string;
  status: string;
}

export function useClientWebsite(clientId: string | undefined) {
  const [websiteInfo, setWebsiteInfo] = useState<WebsiteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWebsiteInfo = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First try to get from business_assets
      let { data: assetData, error: assetError } = await supabase
        .from('business_assets')
        .select('name, url, status')
        .eq('client_id', clientId)
        .eq('type', 'website')
        .order('created_at', { ascending: false })
        .limit(1);

      if (assetError) {
        console.error('Error fetching business assets:', assetError);
      }

      // If no business asset, try to get from projects
      if (!assetData || assetData.length === 0) {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('title, live_url, status')
          .eq('client_id', clientId)
          .eq('type', 'website')
          .not('live_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (projectError) {
          console.error('Error fetching projects:', projectError);
        }

        if (projectData && projectData.length > 0) {
          setWebsiteInfo({
            name: projectData[0].title,
            url: projectData[0].live_url,
            status: projectData[0].status
          });
        } else {
          // Fallback to default
          setWebsiteInfo({
            name: "ezrahaugabrooks.com",
            url: "#",
            status: "active"
          });
        }
      } else {
        setWebsiteInfo({
          name: assetData[0].name,
          url: assetData[0].url,
          status: assetData[0].status
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching website info:', err);
      
      // Fallback to default on error
      setWebsiteInfo({
        name: "ezrahaugabrooks.com",
        url: "#",
        status: "active"
      });
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchWebsiteInfo();

    // Set up real-time subscription for projects
    const projectsSubscription = supabase
      .channel('website-projects-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'projects',
          filter: `client_id=eq.${clientId} AND type=eq.website`
        }, 
        () => fetchWebsiteInfo()
      )
      .subscribe();

    // Set up real-time subscription for business assets
    const assetsSubscription = supabase
      .channel('website-assets-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'business_assets',
          filter: `client_id=eq.${clientId} AND type=eq.website`
        }, 
        () => fetchWebsiteInfo()
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      projectsSubscription.unsubscribe();
      assetsSubscription.unsubscribe();
    };
  }, [clientId, fetchWebsiteInfo]);

  return { websiteInfo, loading, error };
} 