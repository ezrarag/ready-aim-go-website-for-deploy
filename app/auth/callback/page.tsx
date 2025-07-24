"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Supabase will parse the URL fragment and store the session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Redirect directly to the client dashboard for testing
        router.replace("/dashboard/client");
      } else {
        // Redirect to login if session is not found
        router.replace("/login");
      }
    });
  }, [router]);

  return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>;
} 