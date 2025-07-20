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
      const sessionResult = await supabase.auth.getSession()
      console.log("[Onboarding] Supabase session:", sessionResult)
      const { data: { user } } = await supabase.auth.getUser()
      console.log("[Onboarding] Supabase user:", user)
      if (!user) {
        console.log("[Onboarding] No user, redirecting to /login")
        router.replace("/login")
        return
      }
      setUser(user)
      // Fetch profile to check onboarding status and role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("contract_accepted_at, is_demo_client, full_name, role")
        .eq("id", user.id)
        .single()
      console.log("[Onboarding] Profile record:", profile, profileError)
      if (profile) {
        console.log("contract_accepted_at:", profile.contract_accepted_at)
        console.log("is_demo_client:", profile.is_demo_client)
        console.log("role:", profile.role)
      }
      if (profileError) {
        setError("Failed to load profile.")
        setChecking(false)
        return
      }
      setProfile(profile)
      if (profile && (profile.contract_accepted_at || profile.is_demo_client)) {
        const redirectPath = profile.role === "operator" ? "/dashboard/operator" : "/dashboard/client"
        console.log("[Onboarding] Redirecting to:", redirectPath)
        router.replace(redirectPath)
        return
      }
      setChecking(false)
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("Not authenticated")
      setLoading(false)
      return
    }
    // Fetch current profile to check for full_name
    let fullName = "Demo User"
    const { data: profileData, error: profileFetchError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()
    if (profileData && profileData.full_name) {
      fullName = profileData.full_name
    }
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      is_demo_client: true,
      contract_accepted_at: new Date().toISOString(),
      full_name: fullName,
    })
    if (upsertError) {
      setError(upsertError.message)
      setLoading(false)
      console.error("Failed to upsert profile after Start Demo:", upsertError)
      return
    }
    router.push("/dashboard/client")
  }

  const handlePaidPlan = async () => {
    setLoading(true)
    setError(null)
    // Call API to create Stripe Checkout session
    const res = await fetch("/api/stripe/create-checkout-session", { method: "POST" })
    const { url, error: apiError } = await res.json()
    if (apiError) {
      setError(apiError)
      setLoading(false)
      return
    }
    window.location.href = url
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