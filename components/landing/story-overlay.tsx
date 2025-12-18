"use client"

import React, { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Globe, FlaskConical, Building2, Truck, Shield, ArrowRight, Lock } from "lucide-react"

interface StoryOverlayProps {
  isOpen: boolean
  onClose: () => void
  currentStory: string
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
  rd: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/readyaimgo%2Fstory%2Frd-placeholder.mp4?alt=media&token=PLACEHOLDER_TOKEN",
  housing: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/readyaimgo%2Fstory%2Fhousing-placeholder.mp4?alt=media&token=PLACEHOLDER_TOKEN",
  transportation: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/readyaimgo%2Fstory%2Ftransportation-placeholder.mp4?alt=media&token=PLACEHOLDER_TOKEN",
  insurance: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/readyaimgo%2Fstory%2Finsurance-placeholder.mp4?alt=media&token=PLACEHOLDER_TOKEN"
}

// Determine if an area is locked for a specific story
const isAreaLocked = (areaId: string, storyId: string): boolean => {
  // Website is unlocked for everyone except bishop
  if (areaId === "website") {
    return storyId === "bishop"
  }
  // All other areas are locked for everyone
  return true
}

// Define story areas available for each story
const storyAreasByStory: Record<string, string[]> = {
  femileasing: ["website", "rd", "housing", "transportation", "insurance"],
  carlot: ["website", "rd", "housing", "transportation", "insurance"],
  bishop: ["website", "rd", "housing", "transportation", "insurance"],
  BDSO: ["website", "rd", "housing", "transportation", "insurance"],
  // Add more stories here as they're added
}

// All available story cards
const allStoryCards: StoryCard[] = [
  {
    id: "website",
    title: "WEBSITE",
    description: "Professional web presence that grows with your business",
    icon: Globe,
    iconBg: "bg-blue-600/30",
    iconColor: "text-blue-400",
    videoUrl: areaVideoUrls.website
  },
  {
    id: "rd",
    title: "R/D",
    description: "Research and development infrastructure to fuel innovation",
    icon: FlaskConical,
    iconBg: "bg-purple-600/30",
    iconColor: "text-purple-400",
    videoUrl: areaVideoUrls.rd
  },
  {
    id: "housing",
    title: "HOUSING",
    description: "Managed real estate solutions for your team and operations",
    icon: Building2,
    iconBg: "bg-green-600/30",
    iconColor: "text-green-400",
    videoUrl: areaVideoUrls.housing
  },
  {
    id: "transportation",
    title: "TRANSPORTATION",
    description: "Fleet management and logistics to keep you moving",
    icon: Truck,
    iconBg: "bg-orange-600/30",
    iconColor: "text-orange-400",
    videoUrl: areaVideoUrls.transportation
  },
  {
    id: "insurance",
    title: "INSURANCE",
    description: "Comprehensive coverage tailored to your business needs",
    icon: Shield,
    iconBg: "bg-red-600/30",
    iconColor: "text-red-400",
    videoUrl: areaVideoUrls.insurance
  }
]

export function StoryOverlay({ isOpen, onClose, currentStory }: StoryOverlayProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  
  // Filter story cards based on current story
  const availableAreas = storyAreasByStory[currentStory] || storyAreasByStory.femileasing
  const storyCards = allStoryCards.filter(card => availableAreas.includes(card.id))
  
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

          {/* Overlay Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 md:px-8 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-7xl">
              {/* Title */}
              <div className="mb-8">
                <h2 className="text-5xl md:text-7xl font-bold text-white mb-2">STORY</h2>
                <p className="text-white/60 text-lg">Select an area to explore</p>
                {currentStory && (
                  <p className="text-white/40 text-sm mt-1 uppercase">Story: {currentStory}</p>
                )}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                {storyCards.map((card, index) => {
                  const Icon = card.icon
                  const isHovered = hoveredCard === card.id
                  const isLocked = isAreaLocked(card.id, currentStory)
                  
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="group cursor-pointer relative"
                      onMouseEnter={() => setHoveredCard(card.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <motion.div
                        className="h-[400px] md:h-[450px] bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden hover:border-white/40 transition-all duration-300 flex flex-col relative"
                        animate={{
                          scale: isHovered ? 1.05 : 1,
                        }}
                      >
                        {/* Top Section - Video always playing */}
                        <div className={`flex-1 min-h-[60%] ${card.iconBg} relative overflow-hidden`}>
                          {/* Video that always plays */}
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
                          
                          {/* Lock indicator */}
                          {isLocked && (
                            <div className="absolute top-4 right-4 z-20">
                              <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-full p-2">
                                <Lock className="w-4 h-4 text-white/60" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bottom Section - Animated to expand fully on hover */}
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
                                className="p-4 md:p-5 h-full flex flex-col justify-center"
                              >
                                <h3 className="text-white font-bold text-base md:text-lg mb-2 uppercase tracking-wide">
                                  {card.title}
                                </h3>
                                <p className="text-white/70 text-xs md:text-sm leading-relaxed">
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
                                {isLocked ? (
                                  <div className="flex flex-col items-center gap-3 text-center">
                                    <Lock className="w-8 h-8 text-white/60" />
                                    <span className="text-white/60 text-sm font-semibold uppercase">Locked</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-white hover:text-white/80 transition-colors cursor-pointer">
                                    <span className="text-base md:text-lg font-semibold uppercase">Explore</span>
                                    <ArrowRight className="w-5 h-5" />
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={onClose}
                className="absolute top-8 right-8 md:top-12 md:right-16 w-10 h-10 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/20 rounded hover:bg-black/80 transition-colors"
                aria-label="Close overlay"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>

              {/* ESC Hint / Back Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={onClose}
                className="absolute bottom-8 right-8 md:bottom-12 md:right-16 text-white/60 text-sm font-mono hover:text-white/80 transition-colors cursor-pointer"
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
