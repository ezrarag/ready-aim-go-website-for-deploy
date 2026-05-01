"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getRedirectResult, signOut } from "firebase/auth"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { ensureAuthPersistence, getClientUserProfile } from "@/lib/firebase-client"
import { DEFAULT_ADMIN_REDIRECT, isAdminRoute } from "@/lib/auth-routes"

function getRedirectTarget(searchParams: ReturnType<typeof useSearchParams>) {
  const requested = searchParams.get("redirect")
  return requested && requested.startsWith("/") ? requested : DEFAULT_ADMIN_REDIRECT
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = useMemo(() => getRedirectTarget(searchParams), [searchParams])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    ;(async () => {
      try {
        const auth = await ensureAuthPersistence()
        const redirectResult = await getRedirectResult(auth)
        const currentUser = redirectResult?.user ?? auth.currentUser

        if (!currentUser) {
          router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
          return
        }

        if (isAdminRoute(redirectTarget)) {
          const profile = await getClientUserProfile(currentUser.uid)
          if (profile?.role !== "admin") {
            await signOut(auth)
            throw new Error('Only Firestore users/{uid} docs with role === "admin" can access admin routes.')
          }
        }

        router.replace(redirectTarget)
      } catch (e) {
        console.error(e)
        if (isMounted) {
          const message = e instanceof Error ? e.message : "Authentication redirect failed"
          setError(message)
          toast.error("Authentication redirect failed", {
            description: message,
          })
          router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [redirectTarget, router])

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
