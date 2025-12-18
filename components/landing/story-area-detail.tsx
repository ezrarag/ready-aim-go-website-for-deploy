"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowRight } from "lucide-react"

interface StoryAreaDetailProps {
  isOpen: boolean
  onClose: () => void
  areaId: string
  areaTitle: string
  currentStory: string
}

// Define tabs for each area
const areaTabs: Record<string, string[]> = {
  website: ["Website", "App", "Other"],
  rd: ["Research", "Development", "Innovation"],
  housing: ["Properties", "Management", "Services"],
  transportation: ["Fleet", "Logistics", "Operations"],
  insurance: ["Coverage", "Claims", "Support"]
}

export function StoryAreaDetail({ isOpen, onClose, areaId, areaTitle, currentStory }: StoryAreaDetailProps) {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = areaTabs[areaId] || ["Tab 1", "Tab 2", "Tab 3"]

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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Overlay Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-[70] flex items-center justify-center px-4 md:px-8 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-6xl bg-black/90 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="border-b border-white/20 p-6 md:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-2 uppercase">
                      {areaTitle}
                    </h2>
                    <p className="text-white/60 text-sm uppercase">Story: {currentStory}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/20 rounded hover:bg-black/80 transition-colors"
                    aria-label="Close overlay"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-white/20 px-6 md:px-8">
                <div className="flex gap-2 md:gap-4 overflow-x-auto">
                  {tabs.map((tab, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveTab(index)}
                      className={`px-4 py-3 text-sm md:text-base font-semibold uppercase transition-colors whitespace-nowrap ${
                        activeTab === index
                          ? "text-white border-b-2 border-white"
                          : "text-white/60 hover:text-white/80"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div className="p-6 md:p-8 min-h-[400px]">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-white"
                >
                  <h3 className="text-2xl md:text-3xl font-bold mb-4 uppercase">
                    {tabs[activeTab]}
                  </h3>
                  <div className="space-y-4 text-white/70">
                    <p className="text-lg">
                      Content for {tabs[activeTab]} tab will be displayed here.
                    </p>
                    <p className="text-sm">
                      This is a placeholder for the {tabs[activeTab].toLowerCase()} content specific to {areaTitle} in the {currentStory} story.
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Footer */}
              <div className="border-t border-white/20 p-6 md:p-8 flex justify-end">
                <button
                  onClick={onClose}
                  className="text-white/60 text-sm font-mono hover:text-white/80 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <kbd className="px-2 py-1 bg-black/50 rounded text-xs">ESC</kbd>
                  <span>BACK</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

