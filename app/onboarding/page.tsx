
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

/** Onboarding without legacy DB — wire to Firebase Auth when ready. */
export default function OnboardingPage() {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [checkoutEmail, setCheckoutEmail] = useState("")

  useEffect(() => {
    setChecking(false)
  }, [])

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
      router.push("/dashboard/client")
    } catch (e: unknown) {
      console.error("[Onboarding] Demo error:", e)
      router.push("/dashboard/client")
    } finally {
      setLoading(false)
    }
  }

  const handlePaidPlan = async () => {
    setLoading(true)
    setError(null)
    const email = checkoutEmail.trim()
    if (!email.includes("@")) {
      setError("Enter a valid email below for Stripe checkout.")
      setLoading(false)
      return
    }
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || "Failed to create checkout session")
        setLoading(false)
        return
      }
      window.location.href = data.url
    } catch (e: unknown) {
      console.error("Stripe checkout error:", e)
      setError(e instanceof Error ? e.message : "Failed to start checkout")
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
    )
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
        <label className="block text-sm text-muted-foreground mb-1">Email (for paid plan / Stripe)</label>
        <input
          type="email"
          className="w-full border rounded-md px-3 py-2 mb-2 bg-background"
          placeholder="you@company.com"
          value={checkoutEmail}
          onChange={(e) => setCheckoutEmail(e.target.value)}
        />
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <div className="flex flex-col gap-4 mt-4">
          <Button onClick={handleDemo} disabled={loading} className="w-full">
            {loading ? "Processing..." : "Start Demo"}
          </Button>
          <Button onClick={handlePaidPlan} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
            {loading ? "Processing..." : "Start Paid Plan"}
          </Button>
          <Button asChild variant="outline" className="w-full mt-2">
            <a href="/api/logout">Logout</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
