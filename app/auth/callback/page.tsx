"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = async () => {
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        router.replace("/login");
        return;
      }
      const user = session.user;
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, contract_accepted_at, is_demo_client, role")
        .eq("id", user.id)
        .single();
      if (profileError || !profile) {
        // If no profile or error, send to onboarding
        router.replace("/onboarding");
        return;
      }
      // If onboarding is incomplete, redirect to onboarding
      if (!profile.contract_accepted_at && !profile.is_demo_client) {
        router.replace("/onboarding");
        return;
      }
      // Redirect based on role
      if (profile.role === "operator") {
        router.replace("/dashboard/operator");
      } else {
        router.replace("/dashboard/client");
      }
    };
    handleRedirect();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen text-gray-500">
      Loading...
    </div>
  );
} 