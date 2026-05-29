"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Boxes, Building2, Car, Users } from "lucide-react"
import type { LandingArea, LandingAreaId } from "@/lib/landing-scenes"

const areaIcons: Record<LandingAreaId, typeof Building2> = {
  space: Building2,
  motion: Car,
  nexus: Boxes,
  cohort: Users,
}

type RoleSelectorOverlayProps = {
  isOpen: boolean
  onClose: () => void
  areas: LandingArea[]
  activeAreaId: LandingAreaId
  onSelectArea: (areaId: LandingAreaId) => void
}

export function RoleSelectorOverlay({
  isOpen,
  onClose,
  areas,
  activeAreaId,
  onSelectArea,
}: RoleSelectorOverlayProps) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="fixed inset-0 z-40 bg-black/86 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex flex-col px-4 py-5 pointer-events-none sm:px-8 sm:py-8"
          >
            <div className="pointer-events-auto mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-y-auto">
              <header className="shrink-0">
                <p className="text-xs font-black uppercase tracking-[0.36em] text-orange-400">
                  ReadyAimGo roles
                </p>
                <h2 className="mt-2 text-5xl font-black uppercase leading-none tracking-tight text-white sm:text-7xl md:text-8xl">
                  Roster
                </h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
                  Pick the business area that controls the current scene deck.
                </p>
              </header>

              <div className="mt-8 grid gap-3 pb-20 md:grid-cols-2 xl:grid-cols-4">
                {areas.map((area, index) => {
                  const isActive = area.id === activeAreaId
                  const Icon = areaIcons[area.id]

                  return (
                    <motion.button
                      key={area.id}
                      type="button"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.24, delay: index * 0.04 }}
                      onClick={() => {
                        onSelectArea(area.id)
                        onClose()
                      }}
                      className={`group min-h-[280px] border p-5 text-left transition ${
                        isActive
                          ? "border-orange-400 bg-white text-black"
                          : "border-white/18 bg-black/[0.88] text-white hover:border-white/50 hover:bg-black/95"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center border ${isActive ? "border-black/15 bg-black text-white" : "border-white/15 bg-white/10 text-orange-400"}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <ArrowRight className={`mt-2 h-5 w-5 transition group-hover:translate-x-1 ${isActive ? "text-black" : "text-white/50"}`} />
                      </div>

                      <h3 className="mt-8 text-4xl font-black uppercase leading-none tracking-tight">
                        {area.shortLabel}
                      </h3>
                      <p className={`mt-3 text-xs font-black uppercase tracking-[0.24em] ${isActive ? "text-orange-600" : "text-orange-400"}`}>
                        {area.subtitle}
                      </p>
                      <p className={`mt-5 text-sm font-semibold leading-6 ${isActive ? "text-black/65" : "text-white/60"}`}>
                        {area.description}
                      </p>
                    </motion.button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="fixed bottom-4 left-4 right-4 z-10 flex justify-center text-xs font-black uppercase tracking-[0.22em] text-white/60 transition hover:text-white md:absolute md:bottom-12 md:left-16 md:right-auto"
              >
                <span className="flex items-center gap-2">
                  <kbd className="bg-white/10 px-2 py-1 text-[10px] text-white">ESC</kbd>
                  Back
                </span>
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
