"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
} from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Shield, UserRound } from "lucide-react"
import { toast } from "sonner"
import {
  createGoogleProvider,
  ensureAuthPersistence,
  getClientUserProfile,
} from "@/lib/firebase-client"
import { DEFAULT_ADMIN_REDIRECT, DEFAULT_CLIENT_REDIRECT, isAdminRoute } from "@/lib/auth-routes"

type LoginPortalMode = "admin" | "client"

type ClientPortalHandoff = {
  workEmail: string
  phoneOnly: boolean
}

function getPortalMode(searchParams: ReturnType<typeof useSearchParams>): LoginPortalMode {
  if (searchParams.get("portal") === "client" || searchParams.get("handoff")) {
    return "client"
  }

  return "admin"
}

function getRedirectTarget(searchParams: ReturnType<typeof useSearchParams>) {
  const requested = searchParams.get("redirect")
  const clientPortalUrl =
    process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || "https://clients.readyaimgo.biz"

  if (!requested) {
    return getPortalMode(searchParams) === "client"
      ? DEFAULT_CLIENT_REDIRECT
      : DEFAULT_ADMIN_REDIRECT
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
  return isAdminRoute(redirectTarget)
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
  const portalMode = useMemo(() => getPortalMode(searchParams), [searchParams])
  const redirectTarget = useMemo(() => getRedirectTarget(searchParams), [searchParams])
  const handoffId = searchParams.get("handoff")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [handoffLoading, setHandoffLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isClientLoading, setIsClientLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    if (!handoffId) {
      return
    }

    let cancelled = false

    const loadHandoff = async () => {
      try {
        setHandoffLoading(true)
        const response = await fetch(`/api/client-handoff/${encodeURIComponent(handoffId)}`, {
          cache: "no-store",
        })
        const payload = await response.json()

        if (!response.ok || !payload?.handoff) {
          throw new Error(payload?.error || "Unable to load the saved client intake.")
        }

        if (cancelled) {
          return
        }

        const handoff = payload.handoff as ClientPortalHandoff
        if (!handoff.phoneOnly && handoff.workEmail) {
          setEmail((current) => current || handoff.workEmail)
        }
      } catch (error) {
        console.error(error)
      } finally {
        if (!cancelled) {
          setHandoffLoading(false)
        }
      }
    }

    void loadHandoff()

    return () => {
      cancelled = true
    }
  }, [handoffId])

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
          setIsClientLoading(false)
        }
      }
    }

    void initializeSession()

    return () => {
      isMounted = false
    }
  }, [redirectTarget, router])

  const handleClientSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsClientLoading(true)

    try {
      const auth = await ensureAuthPersistence()
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      await assertAuthorized(auth, credential.user.uid, redirectTarget)

      if (redirectTarget.startsWith("http")) {
        window.location.assign(redirectTarget)
      } else {
        router.replace(redirectTarget)
      }
    } catch (error: any) {
      console.error("Client sign-in error:", error)
      toast.error("Sign-in failed", {
        description: error?.message || "Unable to sign in with that email and password.",
      })
      setIsClientLoading(false)
    }
  }

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
      toast.error("Google sign-in failed", {
        description: error?.message || "An error occurred during Google sign-in.",
      })
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-center">
            <Link href="/" className="mb-6 inline-flex items-center text-indigo-600 hover:text-indigo-700">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>

            <div className="max-w-lg space-y-5">
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-700">
                {portalMode === "client" ? "Client Portal Login" : "ReadyAimGo Access"}
              </span>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                {portalMode === "client"
                  ? "Sign in to your client portal."
                  : "Choose the right login path."}
              </h1>
              <p className="text-lg leading-8 text-slate-600">
                {portalMode === "client"
                  ? "Use the email and password tied to your client account. If you came from intake, your saved email is already loaded here."
                  : "Client users sign in with email and password. ReadyAimGo administrators use Google sign-in."}
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            <Card className="border-white/90 bg-white/92 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-indigo-600" />
                  Client sign in
                </CardTitle>
                <CardDescription>
                  {handoffLoading
                    ? "Loading your saved client email…"
                    : "Use the email and password for your client dashboard account."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-5" onSubmit={handleClientSignIn}>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="jane@company.com"
                      autoComplete="email"
                      disabled={isClientLoading || checkingSession}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={isClientLoading || checkingSession}
                    />
                  </div>

                  <div className="grid gap-3">
                    <Button
                      type="submit"
                      disabled={isClientLoading || checkingSession || !email.trim() || !password}
                      className="w-full"
                    >
                      {isClientLoading || checkingSession ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {checkingSession ? "Checking session..." : "Signing in..."}
                        </>
                      ) : (
                        "Sign in to client dashboard"
                      )}
                    </Button>

                    <Button asChild type="button" variant="outline" className="w-full">
                      <Link href={handoffId ? `/signup?handoff=${encodeURIComponent(handoffId)}` : "/signup"}>
                        Create a new client account
                      </Link>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/90 bg-white/88 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Administrator access
                </CardTitle>
                <CardDescription>
                  Google sign-in remains the path for authorized ReadyAimGo administrators.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  className="h-12 w-full bg-white text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading || checkingSession}
                >
                  {isGoogleLoading || checkingSession ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {checkingSession ? "Checking session..." : "Signing in with Google..."}
                    </>
                  ) : (
                    <>
                      <svg className="mr-3 h-5 w-5" viewBox="0 0 48 48">
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
