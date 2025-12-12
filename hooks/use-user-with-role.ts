import { useState, useEffect } from 'react';

interface UserSession {
  user: any;
  profile: any;
  avatar_url?: string;
  full_name?: string;
  email?: string;
}

export function useUserWithRole() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Implement Firebase authentication
    setSession(null);
    setLoading(false);
    // Silently handle missing auth - don't set error for now
  }, []);

  return { session, loading, error };
} 