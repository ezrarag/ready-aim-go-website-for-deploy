"use client"

import { useEffect } from "react"
import { getClientAuth } from "@/lib/firebase-client"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"

/**
 * Shown when a portal user's ragAllowlist entry has active=false.
 * Provides a clear message and a sign-out option so they can log in
 * with a different account.
 */
export default function NoAccessPage() {
  const router = useRouter()

  // Clear any stale revocation cookie on mount so a future re-grant works.
  useEffect(() => {
    document.cookie = "portal_revoked=; Max-Age=0; path=/"
  }, [])

  const handleSignOut = async () => {
    try {
      const auth = getClientAuth()
      if (auth) await signOut(auth)
    } catch {
      // best-effort
    }
    router.push("/login")
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wide mb-2">
            Access Revoked
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Your portal access has been deactivated. If you believe this is an
            error, please contact your account representative at{" "}
            <a
              href="mailto:support@readyaimgo.io"
              className="text-orange-400 hover:underline"
            >
              support@readyaimgo.io
            </a>
            .
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSignOut}
            className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold uppercase rounded transition-colors"
          >
            Sign Out
          </button>
          <a
            href="/"
            className="block w-full px-6 py-3 border border-white/20 hover:border-white/40 text-white/70 hover:text-white text-sm font-semibold uppercase rounded transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    </main>
  )
}
