"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

interface RosterOverlayProps {
  isOpen: boolean
  onClose: () => void
  currentStory: string
  onHeroSelect: (storyId: string) => void
}

interface Hero {
  id: string
  name: string
  storyId: string
  videoUrl: string
  isNew?: boolean
}

const heroes: Hero[] = [
  {
    id: "femileasing",
    name: "FEMILEASING",
    storyId: "femileasing",
    videoUrl: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/femileasing%2Fstory%2Ffemileasing2.mp4?alt=media&token=c6e20116-3eda-47fd-9fa2-9a39f67d2214",
    isNew: false
  },
  {
    id: "carlot",
    name: "CARLOT",
    storyId: "carlot",
    videoUrl: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/carlot%2Fstory%2Fcarlot.mp4?alt=media&token=a43310b0-7fee-4ff3-a5be-62751da05831",
    isNew: true
  },
  {
  id: "bishop",
  name: "BISHOP",
  storyId: "bishop",
  videoUrl: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/bishop-central-united%2Fstories%2Fbishop.mp4?alt=media&token=7cb00fc5-76e0-4e92-82af-894df88f500e",
  isNew: true
  },
  {
    id: "BDSO",
    name: "BDSO",
    storyId: "BDSO",
    videoUrl: "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/black-diaspora-symphony%2Fstories%2Fdayvin.mp4?alt=media&token=a128daf8-02cf-4544-b5b3-a1676ae5a7d3",
    isNew: true
  }
]

export function RosterOverlay({ isOpen, onClose, currentStory, onHeroSelect }: RosterOverlayProps) {
  const router = useRouter()

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

  const handleHeroClick = (hero: Hero) => {
    // Save to localStorage
    localStorage.setItem('lastViewedStory', hero.storyId)
    
    // Call the callback
    onHeroSelect(hero.storyId)
    
    // Close the overlay
    onClose()
    
    // Redirect to home page
    router.push('/')
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
                <h2 className="text-5xl md:text-7xl font-bold text-white mb-2">HERO GALLERY</h2>
                <p className="text-white/60 text-lg">Select a hero to explore their story</p>
              </div>

              {/* Heroes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {heroes.map((hero, index) => {
                  const isSelected = hero.storyId === currentStory
                  return (
                    <motion.div
                      key={hero.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="group cursor-pointer relative"
                      onClick={() => handleHeroClick(hero)}
                    >
                      <div className={`h-[280px] md:h-[320px] bg-black/60 backdrop-blur-sm border rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 flex flex-col ${
                        isSelected 
                          ? 'border-orange-500 border-2' 
                          : 'border-white/20 hover:border-white/40'
                      }`}>
                        {/* Top Section - Hero Portrait/Video Preview */}
                        <div className="flex-1 min-h-[60%] bg-gradient-to-br from-blue-600/30 to-purple-600/30 flex items-center justify-center relative overflow-hidden">
                          {/* Video Preview */}
                          <video
                            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                            loop
                            muted
                            playsInline
                            autoPlay
                          >
                            <source src={hero.videoUrl} type="video/mp4" />
                          </video>
                          
                          {/* Hero Name Overlay */}
                          <div className="relative z-10 text-center px-4">
                            <h3 className="text-white font-bold text-2xl md:text-3xl uppercase tracking-wide drop-shadow-lg">
                              {hero.name}
                            </h3>
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
                        <div className="h-[40%] bg-gray-800/80 p-4 md:p-5 flex flex-col justify-center">
                          <h3 className="text-white font-bold text-base md:text-lg mb-2 uppercase tracking-wide">
                            {hero.name}
                          </h3>
                          <p className="text-white/70 text-xs md:text-sm leading-relaxed">
                            {isSelected ? "Currently Selected" : "Click to select this hero"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* ESC Hint / Back Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={onClose}
                className="absolute bottom-8 left-8 md:bottom-12 md:left-16 text-white/60 text-sm font-mono hover:text-white/80 transition-colors cursor-pointer"
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

