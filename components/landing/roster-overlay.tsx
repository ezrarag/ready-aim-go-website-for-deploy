"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"

interface RosterOverlayProps {
  isOpen: boolean
  onClose: () => void
  currentStory: string
  onHeroSelect: (storyId: string) => void
  heroes: Hero[]
}

export interface Hero {
  id: string
  name: string
  storyId: string
  videoUrl: string
  isNew?: boolean
}

export function RosterOverlay({ isOpen, onClose, currentStory, onHeroSelect, heroes }: RosterOverlayProps) {
  const [previewStoryId, setPreviewStoryId] = React.useState<string | null>(null)
  const activePreviewStoryId = previewStoryId ?? currentStory

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

  React.useEffect(() => {
    if (!isOpen) {
      setPreviewStoryId(null)
    }
  }, [isOpen])

  const handleHeroClick = (hero: Hero) => {
    // Save to localStorage
    localStorage.setItem('lastViewedStory', hero.storyId)
    
    // Call the callback
    onHeroSelect(hero.storyId)
    
    // Close the overlay
    onClose()
  }

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

          {/* Overlay Content - scrollable when viewport is short (laptop/small desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex flex-col min-h-0 px-3 py-4 md:px-8 md:py-6 pointer-events-none overflow-hidden"
          >
            <div className="pointer-events-auto w-full max-w-7xl flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-contain pt-2 md:pt-0 mx-auto">
              {/* Title - tighter on mobile */}
              <div className="mb-4 md:mb-8 shrink-0">
                <h2 className="text-3xl sm:text-4xl md:text-7xl font-bold text-white mb-1 md:mb-2">HERO GALLERY</h2>
                <p className="text-white/60 text-sm md:text-lg">Select a hero to explore their story</p>
              </div>

              {/* Heroes Grid - smaller cards and gaps on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 pb-16 md:pb-0">
                {heroes.map((hero, index) => {
                  const isSelected = hero.storyId === currentStory
                  const showPreview = activePreviewStoryId === hero.storyId
                  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      handleHeroClick(hero)
                    }
                  }
                  return (
                    <motion.div
                      key={hero.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: index * 0.04 }}
                      className="group cursor-pointer relative outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-lg"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleHeroClick(hero)}
                      onKeyDown={handleCardKeyDown}
                      onMouseEnter={() => setPreviewStoryId(hero.storyId)}
                      onMouseLeave={() => setPreviewStoryId(null)}
                      onFocus={() => setPreviewStoryId(hero.storyId)}
                      onBlur={() => setPreviewStoryId((current) => (current === hero.storyId ? null : current))}
                    >
                      <div className={`h-[220px] sm:h-[260px] md:h-[320px] bg-black/70 border rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 flex flex-col ${
                        isSelected 
                          ? 'border-orange-500 border-2' 
                          : 'border-white/20 hover:border-white/40'
                      }`}>
                        {/* Top Section - Hero Portrait/Video Preview */}
                        <div className="flex-1 min-h-[60%] bg-gradient-to-br from-blue-600/30 to-purple-600/30 flex items-center justify-center relative overflow-hidden">
                          {showPreview ? (
                            <video
                              className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity"
                              loop
                              muted
                              playsInline
                              autoPlay
                              preload="metadata"
                            >
                              <source src={hero.videoUrl} type="video/mp4" />
                            </video>
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-700/40 via-slate-900/30 to-black/70" />
                          )}
                          <div className="absolute inset-0 bg-black/20" />
                          
                          {/* Hero Name Overlay */}
                          <div className="relative z-10 text-center px-3">
                            <h3 className="text-white font-bold text-lg sm:text-xl md:text-3xl uppercase tracking-wide drop-shadow-lg">
                              {hero.name}
                            </h3>
                            {!showPreview ? (
                              <p className="mt-2 text-[10px] sm:text-xs uppercase tracking-[0.24em] text-white/60">
                                Hover or focus to preview
                              </p>
                            ) : null}
                          </div>
                          
                          {/* NEW Badge */}
                          {hero.isNew && (
                            <div className="absolute top-4 right-4 z-10">
                              <span className="bg-orange-500 text-white text-xs md:text-sm font-semibold px-2 py-1 rounded uppercase">
                                NEW!
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Section - Hero Info */}
                        <div className="h-[40%] bg-gray-800/80 p-3 md:p-5 flex flex-col justify-center">
                          <h3 className="text-white font-bold text-sm md:text-lg mb-1 md:mb-2 uppercase tracking-wide">
                            {hero.name}
                          </h3>
                          <p className="text-white/70 text-[11px] md:text-sm leading-snug">
                            {isSelected ? "Currently Selected" : "Click to select this hero"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              {heroes.length === 0 && (
                <div className="mt-6 border border-white/20 rounded-lg p-6 bg-black/40">
                  <p className="text-white/80 text-sm">No roster entries found in Firestore `clients` collection.</p>
                </div>
              )}

              {/* ESC Hint / Back Button - fixed at bottom on mobile so always visible */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={onClose}
                className="fixed bottom-4 left-4 right-4 md:absolute md:bottom-12 md:left-16 md:right-auto z-10 py-2 md:py-0 text-white/60 text-xs md:text-sm font-mono hover:text-white/80 transition-colors cursor-pointer flex justify-center md:justify-start"
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
