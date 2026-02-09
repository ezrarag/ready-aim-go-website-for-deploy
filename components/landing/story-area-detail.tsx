"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowRight, FileText } from "lucide-react"
import type { ClientUpdate } from "@/lib/client-directory"

interface StoryAreaDetailProps {
  isOpen: boolean
  onClose: () => void
  areaId: string
  areaTitle: string
  currentStory: string
  /** When set, fetches and shows Latest updates for this client + module type */
  clientId?: string
}

const areaTabs: Record<string, string[]> = {
  website: ["Website", "App", "Other"],
  web: ["Website", "App", "Other"],
  app: ["Releases", "Features", "Support"],
  rd: ["Research", "Development", "Innovation"],
  housing: ["Properties", "Management", "Services"],
  transportation: ["Fleet", "Logistics", "Operations"],
  insurance: ["Coverage", "Claims", "Support"],
}

export function StoryAreaDetail({ isOpen, onClose, areaId, areaTitle, currentStory, clientId }: StoryAreaDetailProps) {
  const [activeTab, setActiveTab] = useState(0)
  const [updates, setUpdates] = useState<ClientUpdate[]>([])
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const tabs = areaTabs[areaId] || areaTabs.web || ["Tab 1", "Tab 2", "Tab 3"]

  const updateType = areaId === "website" ? "web" : areaId

  useEffect(() => {
    if (!isOpen || !clientId || !updateType) {
      setUpdates([])
      return
    }
    let cancelled = false
    setUpdatesLoading(true)
    fetch(
      `/api/clients/${encodeURIComponent(clientId)}/updates?type=${encodeURIComponent(updateType)}&status=published&limit=10`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.success && Array.isArray(data.updates)) setUpdates(data.updates)
      })
      .catch(() => {
        if (!cancelled) setUpdates([])
      })
      .finally(() => {
        if (!cancelled) setUpdatesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, clientId, updateType])

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

          {/* Overlay Content - full viewport on mobile with scroll */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-[70] flex flex-col md:items-center md:justify-center p-0 md:px-8 pointer-events-none overflow-hidden"
          >
            <div className="pointer-events-auto w-full max-w-6xl bg-black/90 backdrop-blur-md border-0 md:border border-white/20 rounded-none md:rounded-lg overflow-hidden flex flex-col max-h-[100dvh] md:max-h-[90vh]">
              {/* Header - tighter on mobile */}
              <div className="border-b border-white/20 p-4 md:p-8 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-1 md:mb-2 uppercase truncate">
                      {areaTitle}
                    </h2>
                    <p className="text-white/60 text-xs md:text-sm uppercase">Story: {currentStory}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-9 h-9 md:w-10 md:h-10 shrink-0 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/20 rounded hover:bg-black/80 transition-colors"
                    aria-label="Close overlay"
                  >
                    <X className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Tabs - scrollable on small screens */}
              <div className="border-b border-white/20 px-3 md:px-8 shrink-0">
                <div className="flex gap-1 md:gap-4 overflow-x-auto -mb-px">
                  {tabs.map((tab, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveTab(index)}
                      className={`px-3 py-2.5 md:px-4 md:py-3 text-xs md:text-base font-semibold uppercase transition-colors whitespace-nowrap ${
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

              {/* Content Area - scrollable */}
              <div className="p-4 md:p-8 min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {/* Latest updates (GitHub-style feed) */}
                {clientId && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-white uppercase mb-3">Latest updates</h3>
                    {updatesLoading ? (
                      <p className="text-white/60 text-sm">Loading…</p>
                    ) : updates.length === 0 ? (
                      <p className="text-white/60 text-sm">No published updates yet.</p>
                    ) : (
                      <ul className="space-y-3">
                        {updates.map((u) => (
                          <li
                            key={u.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                          >
                            <FileText className="w-5 h-5 text-white/50 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="font-semibold text-white">{u.title}</p>
                              {u.summary && (
                                <p className="text-sm text-white/70 mt-1">{u.summary}</p>
                              )}
                              <p className="text-xs text-white/50 mt-1">
                                {new Date(u.createdAt).toLocaleDateString()}
                                {u.versionLabel && ` · ${u.versionLabel}`}
                              </p>
                              {u.video?.publicUrl && (
                                <a
                                  href={u.video.publicUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-orange-400 hover:underline mt-1 inline-block"
                                >
                                  Watch video
                                </a>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-white"
                >
                  <h3 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 uppercase">
                    {tabs[activeTab]}
                  </h3>
                  <div className="space-y-3 md:space-y-4 text-white/70">
                    <p className="text-base md:text-lg">
                      Content for {tabs[activeTab]} tab will be displayed here.
                    </p>
                    <p className="text-sm">
                      This is a placeholder for the {tabs[activeTab].toLowerCase()} content specific to {areaTitle} in the {currentStory} story.
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Footer - tighter on mobile */}
              <div className="border-t border-white/20 p-4 md:p-8 flex justify-end shrink-0">
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

