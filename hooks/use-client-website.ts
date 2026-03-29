import { useEffect, useState, useCallback } from 'react';

interface WebsiteInfo {
  name: string;
  url: string;
  status: string;
}

const FALLBACK: WebsiteInfo = {
  name: "ezrahaugabrooks.com",
  url: "#",
  status: "active"
};

/** TODO: Load from Firestore (`business_assets` / `projects` equivalent). */
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
      setWebsiteInfo(FALLBACK);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching website info:', err);
      setWebsiteInfo(FALLBACK);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    fetchWebsiteInfo();
  }, [clientId, fetchWebsiteInfo]);

  return { websiteInfo, loading, error };
}
