"use client"

import { motion } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StoryOverlay } from "./story-overlay"
import { RosterOverlay } from "./roster-overlay"
import { StoryAreaDetail } from "./story-area-detail"
import type { Hero as RosterHero } from "./roster-overlay"
import type { ClientDirectoryEntry, ModuleKey } from "@/lib/client-directory"

interface HeroProps {
  onWatchDemo?: () => void
  onViewProjects?: () => void
  initialStory?: string
}

const CATEGORY_SLUG_MAP: Record<string, string> = { web: "website", app: "app", rd: "rd", housing: "housing", transportation: "transportation", insurance: "insurance" }

export function Hero({ onWatchDemo, onViewProjects, initialStory }: HeroProps) {
  const router = useRouter()
  // Initialize story from localStorage or prop, default to femileasing
  const getInitialStory = () => {
    if (initialStory) return initialStory
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastViewedStory')
      return saved || "femileasing"
    }
    return "femileasing"
  }

  const [currentStory, setCurrentStory] = useState(() => getInitialStory())
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([])
  const [heroes, setHeroes] = useState<RosterHero[]>([])
  const [showStoryOverlay, setShowStoryOverlay] = useState(false)
  const [showRosterOverlay, setShowRosterOverlay] = useState(false)
  const [showAreaDetail, setShowAreaDetail] = useState(false)
  const [areaDetailPayload, setAreaDetailPayload] = useState<{ clientId: string; areaId: string; areaTitle: string } | null>(null)
  /** Module keys to show (only those with key field set on client: websiteUrl, appUrl, rdUrl, etc.). */
  const [storyModuleKeysWithData, setStoryModuleKeysWithData] = useState<ModuleKey[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const response = await fetch("/api/clients")
        if (!response.ok) return
        const payload = await response.json()
        if (!payload?.success || !Array.isArray(payload.clients)) return

        const list = payload.clients as ClientDirectoryEntry[]
        setClients(list)

        const mapped = list
          .filter((client) => Boolean(client.storyVideoUrl))
          .map((client) => ({
            id: client.id,
            name: client.name.toUpperCase(),
            storyId: client.storyId,
            videoUrl: client.storyVideoUrl!,
            isNew: client.isNewStory,
          }))

        if (mapped.length > 0) {
          setHeroes(mapped)
        }
      } catch (error) {
        console.error("Failed to fetch roster from /api/clients:", error)
      }
    }

    fetchRoster()
  }, [])

  // Sync with localStorage when story changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastViewedStory', currentStory)
    }
  }, [currentStory])

  // Update story if initialStory prop changes (e.g., from URL params)
  useEffect(() => {
    if (initialStory && initialStory !== currentStory) {
      setCurrentStory(initialStory)
    }
  }, [initialStory, currentStory])

  // Get video URL based on current story
  const getVideoUrl = (story: string) => {
    const selected = heroes.find((hero) => hero.storyId === story)
    return selected?.videoUrl ?? heroes[0]?.videoUrl ?? ""
  }

  // Handle hero selection from roster
  const handleHeroSelect = (storyId: string) => {
    setCurrentStory(storyId)
  }

  useEffect(() => {
    if (heroes.length === 0) return
    const hasCurrentStory = heroes.some((hero) => hero.storyId === currentStory)
    if (!hasCurrentStory) {
      setCurrentStory(heroes[0].storyId)
    }
  }, [heroes, currentStory])

  // Only show story cards when the client has the key field set for that category (edit client URLs)
  useEffect(() => {
    if (!showStoryOverlay) {
      setStoryModuleKeysWithData([])
      return
    }
    const client = clients.find((c) => c.storyId === currentStory)
    if (!client) {
      setStoryModuleKeysWithData([])
      return
    }
    const keys: ModuleKey[] = []
    if (client.websiteUrl?.trim()) keys.push("web")
    if (client.appUrl?.trim() || client.appStoreUrl?.trim()) keys.push("app")
    if (client.rdUrl?.trim()) keys.push("rd")
    if (client.housingUrl?.trim()) keys.push("housing")
    if (client.transportationUrl?.trim()) keys.push("transportation")
    if (client.insuranceUrl?.trim()) keys.push("insurance")
    setStoryModuleKeysWithData(keys)
  }, [showStoryOverlay, currentStory, clients])

  const videoUrl = getVideoUrl(currentStory)

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.play().catch((error) => {
        console.error('Error auto-playing video:', error)
      })
    }
  }, [currentStory, videoUrl])

  const handleVideoCanPlay = () => {
    videoRef.current?.play().catch(() => {})
  }

  // Handle F4 key to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault()
        window.location.href = '/business'
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <section className="fixed inset-0 h-screen w-screen flex items-center justify-center overflow-hidden z-0">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        {videoUrl ? (
          <video
            key={currentStory}
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            loop
            muted
            playsInline
            autoPlay
            onCanPlay={handleVideoCanPlay}
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : null}
        {/* Subtle overlay for text readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Left Side - Story and Roster Text (Vertically Centered) */}
      <div className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 z-20">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-2"
        >
          <button
            onClick={() => setShowStoryOverlay(true)}
            className="text-white hover:text-white/80 transition-colors text-left"
          >
            <h2 className="text-7xl md:text-9xl font-bold uppercase tracking-tight leading-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              STORY{(() => {
                const currentClient = clients.find((c) => c.storyId === currentStory)
                return currentClient?.name ? `: ${currentClient.name.toUpperCase()}` : ""
              })()}
            </h2>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRosterOverlay(true)}
              className="text-white hover:text-white/80 transition-colors text-left"
            >
              <h2 className="text-7xl md:text-9xl font-bold uppercase tracking-tight leading-none" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                ROSTER
              </h2>
            </button>
            <span className="bg-orange-500 text-white text-xs md:text-sm font-semibold px-2 py-1 rounded uppercase">
              NEW!
            </span>
          </div>
        </motion.div>
      </div>

      {/* Footer - Exit and Options Buttons - Matches Screenshot */}
      <div className="absolute bottom-8 right-8 md:bottom-12 md:right-16 z-20 flex items-center gap-4">
        {/* EXIT GAME Button Group */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center overflow-hidden"
        >
          {/* F4 Keybind Button - Grey background wrapping white text */}
          <div className="bg-gray-600 border-r border-white/30 text-white px-3 py-2 text-xs font-bold uppercase flex items-center justify-center min-w-[38px]">
            F4
          </div>
          {/* EXIT GAME Button - No background, just text */}
          <button
            onClick={() => window.location.href = '/business'}
            className="bg-transparent text-white px-4 py-2 text-sm font-semibold uppercase hover:text-white/80 transition-colors"
          >
            EXIT GAME
          </button>
        </motion.div>

        {/* OPTIONS Button Group */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center overflow-hidden"
        >
          {/* ESC Keybind Button - Grey background wrapping white text */}
          <div className="bg-gray-600 border-r border-white/30 text-white px-3 py-2 text-xs font-bold uppercase flex items-center justify-center min-w-[38px]">
            ESC
          </div>
          {/* OPTIONS Button - No background, just text */}
          <div className="bg-transparent text-white px-4 py-2 text-sm font-semibold uppercase">
            OPTIONS
          </div>
        </motion.div>
      </div>

      {/* Story Overlay */}
      <StoryOverlay
        isOpen={showStoryOverlay}
        onClose={() => setShowStoryOverlay(false)}
        currentStory={currentStory}
        client={clients.find((c) => c.storyId === currentStory) ?? null}
        moduleKeysWithData={storyModuleKeysWithData}
        onOpenModule={(clientId, moduleId, _areaTitle) => {
          const categorySlug = CATEGORY_SLUG_MAP[moduleId] ?? moduleId
          setShowStoryOverlay(false)
          router.push(`/story/${clientId}/${categorySlug}`)
        }}
      />

      {/* Module detail (Latest updates) */}
      <StoryAreaDetail
        isOpen={showAreaDetail}
        onClose={() => {
          setShowAreaDetail(false)
          setAreaDetailPayload(null)
        }}
        areaId={areaDetailPayload?.areaId ?? "web"}
        areaTitle={areaDetailPayload?.areaTitle ?? "Website"}
        currentStory={currentStory}
        clientId={areaDetailPayload?.clientId ?? ""}
      />

      {/* Roster Overlay */}
      <RosterOverlay
        isOpen={showRosterOverlay}
        onClose={() => setShowRosterOverlay(false)}
        currentStory={currentStory}
        onHeroSelect={handleHeroSelect}
        heroes={heroes}
      />
    </section>
  )
}
