"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [showManualRedirect, setShowManualRedirect] = useState(false);

  const performRedirect = (url: string) => {
    console.log("🔄 Performing redirect to:", url);
    setRedirectUrl(url);
    
    // Use window.location.href directly for more reliable navigation
    window.location.href = url;
  };

  const handleManualRedirect = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        console.log("🔍 Auth callback started");
        
        // Wait a bit for the session to be established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log("Session data:", session);
        console.log("Session error:", sessionError);
        
        if (sessionError) {
          console.error("❌ Session error:", sessionError);
          toast.error("Authentication failed", {
            description: "Please try signing in again.",
          });
          performRedirect("/login");
          return;
        }

        if (!session?.user) {
          console.log("⚠️ No session found, checking if we're in the middle of OAuth flow");
          
          // Check if we have access_token in URL params (OAuth callback)
          const urlParams = new URLSearchParams(window.location.search);
          const accessToken = urlParams.get('access_token');
          const refreshToken = urlParams.get('refresh_token');
          
          if (accessToken) {
            console.log("🔑 Found access token in URL, setting session");
            
            // Set the session manually
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (error) {
              console.error("❌ Error setting session:", error);
              performRedirect("/login");
              return;
            }
            
            console.log("✅ Session set successfully:", data);
            
            // Now get the user from the session
            const user = data.user;
            if (!user) {
              console.error("❌ No user in session after setting");
              performRedirect("/login");
              return;
            }
            
            // Continue with the normal flow
            await handleUserRedirect(user);
            return;
          } else {
            console.error("❌ No session and no access token");
            performRedirect("/login");
            return;
          }
        }

        const user = session.user;
        console.log("👤 User:", user);
        
        await handleUserRedirect(user);
        
      } catch (error) {
        console.error("❌ Auth callback error:", error);
        setError("An error occurred during authentication");
        toast.error("Authentication Error", {
          description: "There was an error processing your sign-in.",
        });
        performRedirect("/login");
      }
    };

    const handleUserRedirect = async (user: any) => {
      const redirectTo = searchParams.get('redirect');
      console.log("🎯 Redirect to:", redirectTo);
      
      // Try to fetch profile using the authenticated client
      console.log("🔍 Fetching profile for user:", user.id);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, contract_accepted_at, is_demo_client, role")
        .eq("id", user.id)
        .single();

      console.log("📋 Profile data:", profile);
      console.log("📋 Profile error:", profileError);

      if (profileError) {
        console.error("❌ Profile fetch error:", profileError);
        
        // If profile doesn't exist, create one
        if (profileError.code === 'PGRST116') {
          console.log("➕ Creating new admin profile");
          try {
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email,
                role: 'admin',
                contract_accepted_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            console.log("📝 Insert result:", insertError);

            if (insertError) {
              console.error("❌ Error creating profile:", insertError);
              
              // If it's a duplicate key error, the profile already exists
              if (insertError.code === '23505') {
                console.log("✅ Profile already exists, proceeding with redirect");
                // Continue with redirect to admin dashboard
                if (redirectTo) {
                  console.log("🔄 Redirecting to:", redirectTo);
                  performRedirect(redirectTo);
                } else {
                  console.log("🔄 Redirecting to admin dashboard");
                  toast.success("Welcome to Admin Dashboard", {
                    description: "You have successfully signed in.",
                  });
                  performRedirect("/dashboard/admin");
                }
                return;
              }
              
              toast.error("Profile creation failed", {
                description: "Please contact support.",
              });
              performRedirect("/login");
              return;
            }

            // Successfully created profile
            console.log("✅ Profile created successfully");
            if (redirectTo) {
              console.log("🔄 Redirecting to:", redirectTo);
              performRedirect(redirectTo);
            } else {
              console.log("🔄 Redirecting to admin dashboard");
              toast.success("Welcome to Admin Dashboard", {
                description: "Your admin account has been created successfully.",
              });
              performRedirect("/dashboard/admin");
            }
            return;
          } catch (createError) {
            console.error("❌ Profile creation failed:", createError);
            toast.error("Account setup failed", {
              description: "Please contact support.",
            });
            performRedirect("/login");
            return;
          }
        } else {
          // Other profile errors - try to proceed anyway
          console.error("⚠️ Profile access failed, but proceeding with redirect");
          if (redirectTo) {
            console.log("🔄 Redirecting to:", redirectTo);
            performRedirect(redirectTo);
          } else {
            console.log("🔄 Redirecting to admin dashboard");
            toast.success("Welcome to Admin Dashboard", {
              description: "You have successfully signed in.",
            });
            performRedirect("/dashboard/admin");
          }
          return;
        }
      }

      // Profile exists, handle based on role
      if (profile) {
        console.log("📋 Profile found:", profile);
        console.log("👑 User role:", profile.role);
        
        if (redirectTo) {
          console.log("🔄 Redirecting to:", redirectTo);
          performRedirect(redirectTo);
          return;
        }

        if (profile.role === "admin") {
          // For admin users, skip onboarding checks and go directly to admin dashboard
          console.log("🔄 Redirecting admin to admin dashboard");
          toast.success("Welcome to Admin Dashboard", {
            description: "You have successfully signed in.",
          });
          performRedirect("/dashboard/admin");
        } else if (profile.role === "operator") {
          // For operators, check if onboarding is complete
          if (!profile.contract_accepted_at && !profile.is_demo_client) {
            console.log("🔄 Redirecting operator to onboarding");
            toast.info("Complete your setup", {
              description: "Please accept the terms and complete your profile.",
            });
            performRedirect("/onboarding");
          } else {
            console.log("🔄 Redirecting operator to operator dashboard");
            toast.success("Welcome to Operator Dashboard", {
              description: "You have successfully signed in.",
            });
            performRedirect("/dashboard/operator");
          }
        } else {
          // For regular clients, check if onboarding is complete
          if (!profile.contract_accepted_at && !profile.is_demo_client) {
            console.log("🔄 Redirecting client to onboarding");
            toast.info("Complete your setup", {
              description: "Please accept the terms and complete your profile.",
            });
            performRedirect("/onboarding");
          } else {
            console.log("🔄 Redirecting client to client dashboard");
            toast.success("Welcome to Client Dashboard", {
              description: "You have successfully signed in.",
            });
            performRedirect("/dashboard/client");
          }
        }
      }
    };

    handleRedirect();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">Authentication Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-600">Completing sign-in...</p>
        
        {showManualRedirect && redirectUrl && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 mb-2">
              Automatic redirect didn't work. Click below to continue:
            </p>
            <Button onClick={handleManualRedirect} className="flex items-center gap-2">
              Continue to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 