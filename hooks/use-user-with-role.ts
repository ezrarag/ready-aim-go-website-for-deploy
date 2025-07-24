import { useEffect, useState } from 'react';
import { supabase, getUserProfile } from '@/lib/supabase/client';

export function useUserWithRole() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getUserProfile(supabase).then(({ user, profile, error }) => {
      if (!isMounted) return;
      setUser(user);
      setProfile(profile);
      setError(error);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return { user, profile, loading, error };
} 