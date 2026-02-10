"use client"

import React, { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Globe, Smartphone, FlaskConical, Building2, Truck, Shield, ArrowRight } from "lucide-react"
import type { ClientDirectoryEntry, ModuleKey } from "@/lib/client-directory"
import { getDefaultModules } from "@/lib/client-directory"

interface StoryOverlayProps {
  isOpen: boolean
  onClose: () => void
  currentStory: string
  /** When set, module cards are driven from client.modules (enabled only). Fallback to static list. */
  client?: ClientDirectoryEntry | null
  /** Only show cards for these module keys (key field set on client: websiteUrl, appUrl, rdUrl, etc.). */
  moduleKeysWithData?: ModuleKey[]
  /** Called when user clicks a module card: (clientId, moduleId, areaTitle) */
  onOpenModule?: (clientId: string, moduleId: ModuleKey, areaTitle: string) => void
}

interface StoryCard {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  videoUrl: string
}

// Video URLs for each area (placeholder URLs - same for all stories)
const areaVideoUrls: Record<string, string> = {
  website: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/readyaimgo%2Fstory%2Fwebsitebusiness-loop.mp4?alt=media&token=9804d9a8-5972-4cbc-a7ad-5109fe3d7fda",
  app: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/readyaimgo%2Fstory%2Fwebsitebusiness-loop.mp4?alt=media&token=9804d9a8-5972-4cbc-a7ad-5109fe3d7fda",
  rd: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/readyaimgo%2Fstory%2Frd-placeholder.mp4?alt=media&token=PLACEHOLDER_TOKEN",
  housing: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/readyaimgo%2Fstory%2Fhousing-placeholder.mp4?alt=media&token=PLACEHOLDER_TOKEN",
  transportation: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/readyaimgo%2Fstory%2Ftransportation-placeholder.mp4?alt=media&token=PLACEHOLDER_TOKEN",
  insurance: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/readyaimgo%2Fstory%2Finsurance-placeholder.mp4?alt=media&token=PLACEHOLDER_TOKEN"
}


// Map module id to display title (uppercase)
const moduleTitles: Record<string, string> = {
  website: "WEBSITE",
  web: "WEBSITE",
  app: "APP",
  rd: "R/D",
  housing: "HOUSING",
  transportation: "TRANSPORTATION",
  insurance: "INSURANCE",
}

// Static story cards (fallback when client has no modules or for video/icon)
const allStoryCards: StoryCard[] = [
  { id: "website", title: "WEBSITE", description: "Professional web presence that grows with your business", icon: Globe, iconBg: "bg-blue-600/30", iconColor: "text-blue-400", videoUrl: areaVideoUrls.website },
  { id: "app", title: "APP", description: "Mobile and web apps that connect your business to customers", icon: Smartphone, iconBg: "bg-indigo-600/30", iconColor: "text-indigo-400", videoUrl: areaVideoUrls.app },
  { id: "rd", title: "R/D", description: "Research and development infrastructure to fuel innovation", icon: FlaskConical, iconBg: "bg-purple-600/30", iconColor: "text-purple-400", videoUrl: areaVideoUrls.rd },
  { id: "housing", title: "HOUSING", description: "Managed real estate solutions for your team and operations", icon: Building2, iconBg: "bg-green-600/30", iconColor: "text-green-400", videoUrl: areaVideoUrls.housing },
  { id: "transportation", title: "TRANSPORTATION", description: "Fleet management and logistics to keep you moving", icon: Truck, iconBg: "bg-orange-600/30", iconColor: "text-orange-400", videoUrl: areaVideoUrls.transportation },
  { id: "insurance", title: "INSURANCE", description: "Comprehensive coverage tailored to your business needs", icon: Shield, iconBg: "bg-red-600/30", iconColor: "text-red-400", videoUrl: areaVideoUrls.insurance },
]

const moduleKeyToCardId: Record<ModuleKey, string> = {
  web: "website",
  app: "app",
  rd: "rd",
  housing: "housing",
  transportation: "transportation",
  insurance: "insurance",
}

export function StoryOverlay({ isOpen, onClose, currentStory, client, moduleKeysWithData = [], onOpenModule }: StoryOverlayProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})

  const modules = client?.modules ?? getDefaultModules()
  const allEnabledKeys = (["web", "app", "rd", "housing", "transportation", "insurance"] as const).filter(
    (k) => modules[k]?.enabled !== false
  )
  // Only show cards whose key field is set on the client (websiteUrl, appUrl, rdUrl, etc.)
  const moduleKeys = !client ? [] : allEnabledKeys.filter((k) => moduleKeysWithData.includes(k))
  const storyCards: StoryCard[] = moduleKeys.map((key) => {
    const staticCard = allStoryCards.find((c) => c.id === (moduleKeyToCardId[key] ?? key)) ?? allStoryCards[0]
    const mod = modules[key]
    return {
      ...staticCard,
      id: key,
      title: moduleTitles[key] ?? key.toUpperCase(),
      description: mod?.overview ?? staticCard.description,
    }
  })
  
  // Play all videos when overlay opens
  React.useEffect(() => {
    if (isOpen) {
      storyCards.forEach(card => {
        const video = videoRefs.current[card.id]
        if (video) {
          video.play().catch(() => {})
        }
      })
    } else {
      // Pause all videos when overlay closes
      storyCards.forEach(card => {
        const video = videoRefs.current[card.id]
        if (video) {
          video.pause()
        }
      })
    }
  }, [isOpen, storyCards])
  
  // Handle ESC key to close
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose()
    }
  }

  React.useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown as any)
      return () => window.removeEventListener("keydown", handleKeyDown as any)
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Overlay Content - scrollable on mobile, centered on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center px-3 py-4 md:px-8 md:py-6 pointer-events-none overflow-hidden"
          >
            <div className="pointer-events-auto w-full max-w-7xl flex flex-col min-h-0 md:min-h-none flex-1 md:flex-initial overflow-y-auto overscroll-contain">
              {/* Title - tighter on mobile */}
              <div className="mb-4 md:mb-8 shrink-0">
                <h2 className="text-3xl sm:text-4xl md:text-7xl font-bold text-white mb-1 md:mb-2">
                  STORY{client?.name ? `: ${client.name.toUpperCase()}` : ""}
                </h2>
                <p className="text-white/60 text-sm md:text-lg">Select an area to explore</p>
                {currentStory && (
                  <p className="text-white/40 text-xs md:text-sm mt-0.5 md:mt-1 uppercase">Story: {currentStory}</p>
                )}
              </div>

              {/* Cards Grid - only categories that have published updates in Firestore */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 pb-20 md:pb-0">
                {storyCards.length === 0 ? (
                  <p className="text-white/60 text-sm col-span-full py-8">
                    {client ? "No story categories with updates yet." : "No story data for this hero."}
                  </p>
                ) : (
                  storyCards.map((card, index) => {
                    const isHovered = hoveredCard === card.id
                    const canOpen = client && onOpenModule
                    const handleCardClick = () => {
                      if (canOpen) onOpenModule(client.id, card.id as ModuleKey, card.title)
                    }
                    const handleKeyDown = (e: React.KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleCardClick()
                      }
                    }
                    return (
                      <motion.div
                        key={card.id}
                        role="button"
                        tabIndex={0}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className="group cursor-pointer relative outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-lg"
                        onMouseEnter={() => setHoveredCard(card.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={handleCardClick}
                        onKeyDown={handleKeyDown}
                        aria-label={`Open ${card.title}, ${card.description}`}
                      >
                        <motion.div
                          className="h-[260px] sm:h-[320px] md:h-[450px] bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden hover:border-white/40 transition-all duration-300 flex flex-col relative"
                          animate={{
                            scale: isHovered ? 1.05 : 1,
                          }}
                        >
                          <div className={`flex-1 min-h-[60%] ${card.iconBg} relative overflow-hidden`}>
                            <video
                              ref={(el) => {
                                if (el) videoRefs.current[card.id] = el
                              }}
                              className="absolute inset-0 w-full h-full object-cover"
                              loop
                              muted
                              playsInline
                              autoPlay
                            >
                              <source src={card.videoUrl} type="video/mp4" />
                            </video>
                          </div>

                          <motion.div
                            className="bg-gray-800/80 absolute bottom-0 left-0 right-0 overflow-hidden z-30"
                            animate={{
                              height: isHovered ? "100%" : "40%",
                              top: isHovered ? "0%" : "auto",
                            }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                          >
                            <AnimatePresence mode="wait">
                              {!isHovered ? (
                                <motion.div
                                  key="collapsed"
                                  initial={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="p-3 md:p-5 h-full flex flex-col justify-center"
                                >
                                  <h3 className="text-white font-bold text-sm md:text-lg mb-1 md:mb-2 uppercase tracking-wide">
                                    {card.title}
                                  </h3>
                                  <p className="text-white/70 text-[11px] md:text-sm leading-snug line-clamp-2 md:line-clamp-none">
                                    {card.description}
                                  </p>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="expanded"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="h-full flex items-center justify-center p-4 md:p-5"
                                >
                                  <div className="flex items-center gap-2 text-white hover:text-white/80 transition-colors cursor-pointer">
                                    <span className="text-base md:text-lg font-semibold uppercase">Explore</span>
                                    <ArrowRight className="w-5 h-5" />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    )
                  })
                )}
              </div>

              {/* ESC Hint / Back Button - fixed at bottom on mobile so always visible */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={onClose}
                className="fixed bottom-4 right-4 left-4 md:absolute md:bottom-12 md:right-16 md:left-auto z-10 py-2 md:py-0 text-white/60 text-xs md:text-sm font-mono hover:text-white/80 transition-colors cursor-pointer flex justify-center md:justify-end"
                aria-label="Go back"
              >
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-black/50 rounded text-xs">ESC</kbd>
                  <span>BACK</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
