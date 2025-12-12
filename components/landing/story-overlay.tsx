"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Globe, FlaskConical, Building2, Truck, Shield } from "lucide-react"

interface StoryOverlayProps {
  isOpen: boolean
  onClose: () => void
}

interface StoryCard {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
}

const storyCards: StoryCard[] = [
  {
    id: "website",
    title: "WEBSITE",
    description: "Professional web presence that grows with your business",
    icon: Globe,
    iconBg: "bg-blue-600/30",
    iconColor: "text-blue-400"
  },
  {
    id: "rd",
    title: "R/D",
    description: "Research and development infrastructure to fuel innovation",
    icon: FlaskConical,
    iconBg: "bg-purple-600/30",
    iconColor: "text-purple-400"
  },
  {
    id: "housing",
    title: "HOUSING",
    description: "Managed real estate solutions for your team and operations",
    icon: Building2,
    iconBg: "bg-green-600/30",
    iconColor: "text-green-400"
  },
  {
    id: "transportation",
    title: "TRANSPORTATION",
    description: "Fleet management and logistics to keep you moving",
    icon: Truck,
    iconBg: "bg-orange-600/30",
    iconColor: "text-orange-400"
  },
  {
    id: "insurance",
    title: "INSURANCE",
    description: "Comprehensive coverage tailored to your business needs",
    icon: Shield,
    iconBg: "bg-red-600/30",
    iconColor: "text-red-400"
  }
]

export function StoryOverlay({ isOpen, onClose }: StoryOverlayProps) {
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
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                {storyCards.map((card, index) => {
                  const Icon = card.icon
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="group cursor-pointer"
                      onClick={() => {
                        // Handle card click - you can navigate or show details
                        console.log(`Selected: ${card.title}`)
                      }}
                    >
                      <div className="h-[400px] md:h-[450px] bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden hover:border-white/40 transition-all duration-300 hover:scale-105 flex flex-col">
                        {/* Top Section - Icon */}
                        <div className={`flex-1 min-h-[60%] ${card.iconBg} flex items-center justify-center relative`}>
                          <Icon className={`w-20 h-20 md:w-24 md:h-24 ${card.iconColor} transition-transform group-hover:scale-110`} />
                        </div>

                        {/* Bottom Section - Text */}
                        <div className="h-[40%] bg-gray-800/80 p-4 md:p-5 flex flex-col justify-center">
                          <h3 className="text-white font-bold text-base md:text-lg mb-2 uppercase tracking-wide">
                            {card.title}
                          </h3>
                          <p className="text-white/70 text-xs md:text-sm leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                      </div>
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
