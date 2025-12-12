"use client"

import { motion } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { StoryOverlay } from "./story-overlay"

interface HeroProps {
  onWatchDemo?: () => void
  onViewProjects?: () => void
}

export function Hero({ onWatchDemo, onViewProjects }: HeroProps) {
  const [currentStory, setCurrentStory] = useState("femileasing")
  const [showStoryOverlay, setShowStoryOverlay] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Get video URL based on current story
  const getVideoUrl = (story: string) => {
    const videoUrls: Record<string, string> = {
      femileasing: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/femileasing%2Fstory%2Ffemileasing2.mp4?alt=media&token=c6e20116-3eda-47fd-9fa2-9a39f67d2214"
    }
    return videoUrls[story] || videoUrls.femileasing
  }

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error('Error auto-playing video:', error)
      })
    }
  }, [currentStory])

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
        <video
          key={currentStory}
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted
          playsInline
          autoPlay
        >
          <source src={getVideoUrl(currentStory)} type="video/mp4" />
        </video>
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
              STORY
            </h2>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/roster'}
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
      <StoryOverlay isOpen={showStoryOverlay} onClose={() => setShowStoryOverlay(false)} />
    </section>
  )
}

