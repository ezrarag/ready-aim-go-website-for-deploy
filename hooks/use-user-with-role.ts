import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

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
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setError(error.message);
          setLoading(false);
          return;
        }

        if (currentSession?.user) {
          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error getting profile:', profileError);
          }

          setSession({
            user: currentSession.user,
            profile: profile || null,
            avatar_url: currentSession.user.user_metadata?.avatar_url || profile?.avatar_url,
            full_name: currentSession.user.user_metadata?.full_name || profile?.full_name,
            email: currentSession.user.email || profile?.email,
          });
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error('Error in getSession:', err);
        setError('Failed to get user session');
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
          // Get user profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error getting profile:', profileError);
          }

          setSession({
            user: session.user,
            profile: profile || null,
            avatar_url: session.user.user_metadata?.avatar_url || profile?.avatar_url,
            full_name: session.user.user_metadata?.full_name || profile?.full_name,
            email: session.user.email || profile?.email,
          });
        } else {
          setSession(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading, error };
} 