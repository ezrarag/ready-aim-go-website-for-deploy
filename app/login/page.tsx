"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Shield } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const redirectTo = searchParams.get('redirect') || '/dashboard'
        router.push(redirectTo)
      }
    }
    checkAuth()
  }, [router, searchParams])

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      const redirectTo = searchParams.get('redirect') || '/dashboard'
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`
        }
      })
      
      if (error) {
        throw error
      }
      
      // On success, Supabase will redirect automatically
      toast.success("Redirecting to Google...", {
        description: "Please complete the sign-in process.",
      })
    } catch (error: any) {
      console.error("Google sign-in error:", error)
      toast.error("Google sign-in failed", {
        description: error.message || "An error occurred during Google sign-in.",
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
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in with Google...
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
