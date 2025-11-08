"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
// TODO: Implement Firebase authentication
import { useState } from "react"

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRoleClick = async (role: "client" | "operator") => {
    setLoading(true)
    // Redirect to client portal
    const clientPortalUrl = process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || 'https://clients.readyaimgo.biz';
    window.location.href = clientPortalUrl;
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <Link href="/" className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        <div className="shadow-xl bg-white rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Join ReadyAimGo</h1>
          <p className="mb-8 text-gray-600">Choose your path to get started</p>
          <div className="flex flex-col gap-4">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-semibold py-4 rounded-full"
              onClick={() => handleRoleClick("client")}
              disabled={loading}
            >
              {loading ? "Loading..." : "Continue as Client"}
            </Button>
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-semibold py-4 rounded-full"
              onClick={() => handleRoleClick("operator")}
              disabled={loading}
            >
              {loading ? "Loading..." : "Continue as Operator"}
            </Button>
          </div>
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
