"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ArrowRight, Volume2, VolumeX } from "lucide-react"
import { ActSelectorOverlay } from "./act-selector-overlay"
import { RoleSelectorOverlay } from "./role-selector-overlay"
import { SceneVideoPlayer } from "./scene-video-player"
import {
  defaultLandingSceneId,
  getLandingArea,
  getLandingScene,
  getScenesForArea,
  landingAreas,
  type LandingAreaId,
} from "@/lib/landing-scenes"

interface HeroProps {
  onWatchDemo?: () => void
  onViewProjects?: () => void
}

export function Hero({ onWatchDemo, onViewProjects }: HeroProps) {
  const router = useRouter()
  const [activeSceneId, setActiveSceneId] = useState(defaultLandingSceneId)
  const [showActOverlay, setShowActOverlay] = useState(false)
  const [showRoleOverlay, setShowRoleOverlay] = useState(false)
  const [isMuted, setIsMuted] = useState(true)

  const activeScene = getLandingScene(activeSceneId)
  const activeArea = getLandingArea(activeScene.area)
  const activeAreaScenes = useMemo(() => getScenesForArea(activeScene.area), [activeScene.area])
  const menuOverlayOpen = showActOverlay || showRoleOverlay

  const loadScene = (sceneId: string) => {
    setActiveSceneId(getLandingScene(sceneId).id)
  }

  const selectArea = (areaId: LandingAreaId) => {
    const area = getLandingArea(areaId)
    setActiveSceneId(area.defaultSceneId)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showActOverlay || showRoleOverlay) return

      if (event.key === "F4") {
        event.preventDefault()
        router.push("/business")
        return
      }

      if (event.key === "Escape") {
        event.preventDefault()
        router.push("/business")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router, showActOverlay, showRoleOverlay])

  return (
    <section className="fixed inset-0 z-0 flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      <SceneVideoPlayer
        scene={activeScene}
        onLoadScene={loadScene}
        pause={menuOverlayOpen}
        isMuted={isMuted}
      />

      <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(90deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.34)_36%,rgba(0,0,0,0.08)_70%)]" />

      {/* Main Left HUD Cluster */}
      <div className="absolute left-5 top-1/2 z-20 -translate-y-1/2 sm:left-8 md:left-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-2"
        >
          <div className="flex flex-col items-start">
            {/* Broadcast Network Logo Lockup Bug */}
            <div className="mb-3 flex items-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 border border-orange-400/80 bg-orange-500/15 px-2.5 py-1 font-mono text-[11px] font-black uppercase tracking-[0.24em] text-orange-400 shadow-sm backdrop-blur-sm">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                {activeScene.roleLabel.toUpperCase()}
              </div>
              <span className="text-white/40 text-xs font-bold">·</span>
              <span className="font-mono text-xs font-black uppercase tracking-[0.2em] text-white/70">
                {activeScene.actLabel.toUpperCase()}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onWatchDemo?.()
                  setShowActOverlay(true)
                }}
                className="text-left text-white transition hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <h2 className="text-[4rem] font-black uppercase leading-[0.82] tracking-tight sm:text-8xl md:text-9xl">
                  Story
                </h2>
              </button>

              <button
                type="button"
                onClick={() => setIsMuted((current) => !current)}
                className="inline-flex items-center gap-1.5 border border-orange-400/50 bg-black/60 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-orange-400 transition hover:bg-orange-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-orange-400"
                aria-label={isMuted ? "Enable sound for this act" : "Mute sound for this act"}
                title={isMuted ? "Enable sound" : "Mute sound"}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {isMuted ? "Sound off" : "Sound on"}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRoleOverlay(true)}
            className="text-left text-white transition hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <h2 className="text-[4rem] font-black uppercase leading-[0.82] tracking-tight sm:text-8xl md:text-9xl">
              Roster
            </h2>
          </button>

          {/* Subtitle & Metrics */}
          <div className="mt-4 max-w-lg border-l-2 border-orange-400/80 pl-4 space-y-2">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.12em] leading-relaxed text-white/90">
              Home turf: Milwaukee. Loadout: websites, apps, cohorts, property operations. Client base: local businesses across the city.
            </p>
            <div className="flex items-center gap-2.5 font-mono text-xs font-black tracking-widest text-orange-400 uppercase">
              <span>24 PROJECTS</span>
              <span>·</span>
              <span>6 IN BUILD</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom-Right HUD Group: PORTFOLIO & ESC/OPTIONS Stacked */}
      <div className="absolute bottom-6 right-5 z-20 flex flex-col items-end gap-2 sm:bottom-8 sm:right-8 md:bottom-12 md:right-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="group flex items-center overflow-hidden border border-white/20 bg-black/70 backdrop-blur-md shadow-lg transition hover:border-orange-400/80"
        >
          <div className="flex min-w-[38px] items-center justify-center border-r border-white/30 bg-orange-500 px-3 py-2 font-mono text-xs font-black uppercase text-slate-950 transition group-hover:bg-orange-400">
            PORT
          </div>
          <button
            type="button"
            onClick={() => router.push("/work")}
            className="flex items-center gap-2 bg-transparent px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.2em] text-white transition group-hover:text-orange-400"
          >
            Portfolio
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center overflow-hidden border border-white/20 bg-black/70 backdrop-blur-md shadow-lg"
        >
          <div className="flex min-w-[38px] items-center justify-center border-r border-white/30 bg-gray-600 px-3 py-2 font-mono text-xs font-black uppercase text-white">
            ESC
          </div>
          <button
            type="button"
            onClick={() => router.push("/business")}
            className="bg-transparent px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.2em] text-white transition hover:text-white/80"
          >
            Options
          </button>
        </motion.div>
      </div>

      <ActSelectorOverlay
        isOpen={showActOverlay}
        onClose={() => setShowActOverlay(false)}
        scenes={activeAreaScenes}
        activeSceneId={activeScene.id}
        areaLabel={activeArea.label}
        onSelectScene={loadScene}
      />

      <RoleSelectorOverlay
        isOpen={showRoleOverlay}
        onClose={() => setShowRoleOverlay(false)}
        areas={landingAreas}
        activeAreaId={activeScene.area}
        onSelectArea={selectArea}
      />
    </section>
  )
}
