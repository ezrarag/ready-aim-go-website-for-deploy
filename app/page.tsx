"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import StickyFloatingHeader from "@/components/ui/sticky-floating-header"
import { Hero } from "@/components/landing/hero"

export default function HomePage() {
  const router = useRouter()

  const handleLogin = useCallback(async () => {
    router.push("/login")
  }, [router])

  const handleVideoPlay = useCallback(() => {
    // Optional: Handle video play if needed
  }, [])

  const handleViewProjects = useCallback(() => {
    router.push("/work")
  }, [router])

  return (
    <div className="h-screen overflow-hidden bg-black relative">
      <Hero onWatchDemo={() => {}} onViewProjects={handleViewProjects} />

      <div className="relative z-40">
        <StickyFloatingHeader
          pageTitle="Home"
          onInterested={handleLogin}
          onVideoPlay={handleVideoPlay}
        />
      </div>
    </div>
  )
}
