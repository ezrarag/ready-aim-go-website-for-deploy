
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/client"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export default function OnboardingPage() {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      try {
        // Get current session and user
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log("[Onboarding] Session:", session, sessionError)
        
        if (sessionError || !session?.user) {
          console.log("[Onboarding] No valid session, redirecting to /login")
          router.replace("/login")
          return
        }

        const user = session.user
        setUser(user)
        console.log("[Onboarding] User:", user)

        // Fetch profile separately (no joins to avoid recursion)
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, contract_accepted_at, is_demo_client, full_name, role")
          .eq("id", user.id)
          .single()

        // Improved error logging for debugging
        if (profileError) {
          // Log all possible details about the error
          console.error("[Onboarding] Profile query error:", profileError, JSON.stringify(profileError), Object.keys(profileError || {}));
          // Suggestion: If you see an empty error object, check that the 'profiles' table exists, has the correct columns, and RLS policies allow access for this user.
          if (profileError.code === 'PGRST116') {
            // No profile exists, create one
            console.log("[Onboarding] No profile found, creating new profile")
            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                role: 'client'
              })
              .select("id, contract_accepted_at, is_demo_client, full_name, role")
              .single()

            // Improved error logging for profile creation
            if (createError) {
              console.error("[Onboarding] Failed to create profile:", createError, JSON.stringify(createError), Object.keys(createError || {}));
              // Suggestion: If you see an empty error object, check that the 'profiles' table exists, has the correct columns, and RLS policies allow access for this user.
              setError("Failed to create user profile.")
              setChecking(false)
              return
            }
            setProfile(newProfile)
          } else {
            setError("Failed to load profile.")
            setChecking(false)
            return
          }
        } else {
          setProfile(profileData)
        }

        // Check if onboarding is complete
        const currentProfile = profileData || profile
        if (currentProfile && (currentProfile.contract_accepted_at || currentProfile.is_demo_client)) {
          const redirectPath = currentProfile.role === "operator" ? "/dashboard/operator" : "/dashboard/client"
          console.log("[Onboarding] User already onboarded, redirecting to:", redirectPath)
          router.replace(redirectPath)
          return
        }

        setChecking(false)
      } catch (error) {
        console.error("[Onboarding] Unexpected error:", error)
        setError("An unexpected error occurred.")
        setChecking(false)
      }
    }

    checkAuthAndOnboarding()
  }, [router])

  // Placeholder contract text
  const contractHtml = `
    <h2>Service Agreement</h2>
    <p>This is a placeholder for your service contract. Please review and accept to continue.</p>
    <ul>
      <li>Access to the ReadyAimGo platform</li>
      <li>Subscription or demo access as selected</li>
      <li>Standard terms and conditions apply</li>
    </ul>
  `

  const handleDemo = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("Not authenticated")
        setLoading(false)
        return
      }

      // Update profile with demo status and contract acceptance
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_demo_client: true,
          contract_accepted_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      // Improved error logging for update
      if (updateError) {
        console.error("Failed to update profile for demo:", updateError, JSON.stringify(updateError), Object.keys(updateError || {}));
        // Suggestion: If you see an empty error object, check that the 'profiles' table exists, has the correct columns, and RLS policies allow access for this user.
        setError(updateError.message || "Failed to update profile.")
        setLoading(false)
        return
      }

      console.log("[Onboarding] Demo profile updated, redirecting to client dashboard")
      router.push("/dashboard/client")
    } catch (error: any) {
      console.error("Demo setup error:", error)
      setError(error.message || "Failed to set up demo access")
      setLoading(false)
    }
  }

  const handlePaidPlan = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Call API to create Stripe Checkout session
      const res = await fetch("/api/stripe/create-checkout-session", { method: "POST" })
      const data = await res.json()
      
      if (!res.ok || data.error) {
        setError(data.error || "Failed to create checkout session")
        setLoading(false)
        return
      }

      window.location.href = data.url
    } catch (error: any) {
      console.error("Stripe checkout error:", error)
      setError(error.message || "Failed to start checkout")
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <Dialog open={true}>
        <DialogContent>
          <DialogTitle><VisuallyHidden>Loading</VisuallyHidden></DialogTitle>
          <DialogDescription>Checking your onboarding status...</DialogDescription>
          <div className="flex items-center justify-center min-h-[120px] text-gray-500">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept Service Contract</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Please review and accept the service contract to continue onboarding.
        </DialogDescription>
        <div dangerouslySetInnerHTML={{ __html: contractHtml }} className="prose mb-4" />
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <div className="flex flex-col gap-4 mt-4">
          <Button onClick={handleDemo} disabled={loading} className="w-full">
            {loading ? "Processing..." : "Start Demo"}
          </Button>
          <Button onClick={handlePaidPlan} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
            {loading ? "Processing..." : "Start Paid Plan"}
          </Button>
          {/* Temporary logout button for debugging */}
          <Button asChild variant="outline" className="w-full mt-2">
            <a href="/api/logout">Logout</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
