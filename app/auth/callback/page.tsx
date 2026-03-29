"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

/** OAuth / magic-link landing — wire to Firebase Auth `getRedirectResult` or equivalent. */
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const redirectTo = searchParams.get("redirect") || "/dashboard"
    ;(async () => {
      try {
        toast.info("Complete Firebase auth handoff in auth/callback")
        router.replace(redirectTo)
      } catch (e) {
        console.error(e)
        setError("Authentication redirect failed")
        router.replace("/login")
      }
    })()
  }, [router, searchParams])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-600">Completing sign-in...</p>
      </div>
    </div>
  )
}
