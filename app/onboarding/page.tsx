
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase/client"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { toast } from "sonner"

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

        // Simplified profile check - just check if user exists
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, contract_accepted_at, is_demo_client, full_name, role")
          .eq("id", user.id)
          .single()

        if (profileError && profileError.code === 'PGRST116') {
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

          if (createError) {
            console.error("[Onboarding] Failed to create profile:", createError)
            setError("Failed to create user profile.")
            setChecking(false)
            return
          }
          setProfile(newProfile)
        } else if (profileError) {
          console.error("[Onboarding] Profile query error:", profileError)
          setError("Failed to load profile.")
          setChecking(false)
          return
        } else {
          setProfile(profileData)
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

      // Try to update profile with demo status, but don't fail if it doesn't work
      try {
        await supabase
          .from("profiles")
          .update({
            is_demo_client: true,
            contract_accepted_at: new Date().toISOString(),
          })
          .eq("id", user.id)
      } catch (updateError) {
        console.warn("Failed to update profile for demo, but continuing:", updateError)
      }

      console.log("[Onboarding] Demo setup complete, redirecting to client dashboard")
      // Force redirect to dashboard regardless of profile update success
      router.push("/dashboard/client")
    } catch (error: any) {
      console.error("Demo setup error:", error)
      // Even if there's an error, try to redirect to dashboard
      router.push("/dashboard/client")
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
