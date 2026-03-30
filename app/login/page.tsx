"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
} from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Shield } from "lucide-react"
import { toast } from "sonner"
import {
  createGoogleProvider,
  ensureAuthPersistence,
  getClientUserProfile,
} from "@/lib/firebase-client"

const DEFAULT_ADMIN_REDIRECT = "/dashboard/transportation"

function getRedirectTarget(searchParams: ReturnType<typeof useSearchParams>) {
  const requested = searchParams.get("redirect")
  const clientPortalUrl =
    process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || "https://clients.readyaimgo.biz"

  if (!requested) {
    return DEFAULT_ADMIN_REDIRECT
  }

  if (requested.startsWith("/")) {
    return requested
  }

  if (requested === clientPortalUrl) {
    return requested
  }

  return DEFAULT_ADMIN_REDIRECT
}

function targetRequiresAdmin(redirectTarget: string) {
  return redirectTarget.startsWith("/admin")
}

async function assertAuthorized(auth: Auth, uid: string, redirectTarget: string) {
  const profile = await getClientUserProfile(uid)

  if (targetRequiresAdmin(redirectTarget) && profile?.role !== "admin") {
    await signOut(auth)
    throw new Error('Only Firestore users/{uid} docs with role === "admin" can access admin routes.')
  }

  return profile
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = useMemo(() => getRedirectTarget(searchParams), [searchParams])
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let isMounted = true

    const initializeSession = async () => {
      try {
        const auth = await ensureAuthPersistence()
        const redirectResult = await getRedirectResult(auth).catch((error) => {
          console.error(error)
          return null
        })
        const currentUser = redirectResult?.user ?? auth.currentUser

        if (!currentUser) {
          return
        }

        await assertAuthorized(auth, currentUser.uid, redirectTarget)

        if (!isMounted) {
          return
        }

        if (redirectTarget.startsWith("http")) {
          window.location.assign(redirectTarget)
        } else {
          router.replace(redirectTarget)
        }
      } catch (error: unknown) {
        console.error(error)
        toast.error("Unable to continue sign-in", {
          description:
            error instanceof Error
              ? error.message
              : "An unknown error occurred while checking your account.",
        })
      } finally {
        if (isMounted) {
          setCheckingSession(false)
          setIsGoogleLoading(false)
        }
      }
    }

    void initializeSession()

    return () => {
      isMounted = false
    }
  }, [redirectTarget, router])

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)

    try {
      const auth = await ensureAuthPersistence()
      const provider = createGoogleProvider()

      try {
        const credential = await signInWithPopup(auth, provider)
        await assertAuthorized(auth, credential.user.uid, redirectTarget)

        if (redirectTarget.startsWith("http")) {
          window.location.assign(redirectTarget)
        } else {
          router.replace(redirectTarget)
        }
      } catch (error: any) {
        if (error?.code === "auth/popup-blocked" || error?.code === "auth/web-storage-unsupported") {
          await signInWithRedirect(auth, provider)
          return
        }

        throw error
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error)
      toast.error("Sign-in failed", {
        description: error?.message || "An error occurred during Google sign-in.",
      })
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link href="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">ReadyAimGo Admin Access</CardTitle>
            <CardDescription>Sign in with your Google account to access the admin dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  This area is restricted to authorized ReadyAimGo administrators only.
                </p>
              </div>

              <Button
                type="button"
                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-3 font-semibold shadow-sm h-12"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || checkingSession}
              >
                {isGoogleLoading || checkingSession ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {checkingSession ? "Checking session..." : "Signing in with Google..."}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                      <g>
                        <path d="M44.5 20H24v8.5h11.7C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 6 .9 8.3 2.7l6.2-6.2C34.2 4.5 29.3 2.5 24 2.5c-6.6 0-12.2 2.7-16.2 7.2z" fill="#FFC107"/>
                        <path d="M6.3 14.7l7 5.1C15.1 17.1 19.2 14 24 14c3.1 0 6 .9 8.3 2.7l6.2-6.2C34.2 4.5 29.3 2.5 24 2.5c-6.6 0-12.2 2.7-16.2 7.2z" fill="#FF3D00"/>
                        <path d="M24 43.5c5.7 0 10.6-1.9 14.5-5.2l-6.7-5.5C29.8 37 24 37 24 37c-5.8 0-10.7-3.1-13.2-7.5l-7 5.4C7.8 40.8 15.3 43.5 24 43.5z" fill="#4CAF50"/>
                        <path d="M44.5 20H24v8.5h11.7c-1.2 3.2-4.2 6.5-11.7 6.5-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 6 .9 8.3 2.7l6.2-6.2C34.2 4.5 29.3 2.5 24 2.5c-6.6 0-12.2 2.7-16.2 7.2z" fill="#1976D2"/>
                      </g>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Only authorized administrators can access this area.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
