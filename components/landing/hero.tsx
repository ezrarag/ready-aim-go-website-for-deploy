"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
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
    <section className="fixed inset-0 z-0 flex h-dvh w-screen items-center justify-center overflow-hidden bg-black">
      <SceneVideoPlayer scene={activeScene} onLoadScene={loadScene} pause={menuOverlayOpen} />

      <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(90deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.34)_36%,rgba(0,0,0,0.08)_70%)]" />

      <div className="absolute left-5 top-1/2 z-20 -translate-y-1/2 sm:left-8 md:left-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-2"
        >
          <button
            type="button"
            onClick={() => {
              onWatchDemo?.()
              setShowActOverlay(true)
            }}
            className="text-left text-white transition hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.34em] text-orange-400">
              {activeScene.roleLabel} · {activeScene.actLabel}
            </span>
            <h2 className="text-[4rem] font-black uppercase leading-[0.82] tracking-tight sm:text-8xl md:text-9xl">
              Story
            </h2>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowRoleOverlay(true)}
              className="text-left text-white transition hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <h2 className="text-[4rem] font-black uppercase leading-[0.82] tracking-tight sm:text-8xl md:text-9xl">
                Roster
              </h2>
            </button>
            <span className="bg-orange-500 px-2 py-1 text-xs font-black uppercase text-white md:text-sm">
              New
            </span>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="absolute bottom-6 left-5 z-20 hidden max-w-sm border border-white/15 bg-black/55 p-4 text-white backdrop-blur-sm sm:block md:left-16"
      >
        <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-400">
          Selected role
        </p>
        <h3 className="mt-2 text-2xl font-black uppercase leading-none">{activeArea.label}</h3>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/48">
          {activeArea.subtitle}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={activeArea.serviceHref}
            className="inline-flex items-center gap-2 border border-white/15 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white hover:text-black"
          >
            Service brief
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={onViewProjects}
            className="inline-flex items-center border border-white/15 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-white hover:text-black"
          >
            Projects
          </button>
        </div>
      </motion.div>

      <div className="absolute bottom-6 right-5 z-20 flex flex-col items-end gap-2 sm:bottom-8 sm:right-8 sm:flex-row md:bottom-12 md:right-16 md:gap-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center overflow-hidden"
        >
          <div className="flex min-w-[38px] items-center justify-center border-r border-white/30 bg-gray-600 px-3 py-2 text-xs font-black uppercase text-white">
            F4
          </div>
          <button
            type="button"
            onClick={() => router.push("/business")}
            className="bg-transparent px-4 py-2 text-sm font-black uppercase text-white transition hover:text-white/80"
          >
            Business
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center overflow-hidden"
        >
          <div className="flex min-w-[38px] items-center justify-center border-r border-white/30 bg-gray-600 px-3 py-2 text-xs font-black uppercase text-white">
            ESC
          </div>
          <button
            type="button"
            onClick={() => router.push("/business")}
            className="bg-transparent px-4 py-2 text-sm font-black uppercase text-white transition hover:text-white/80"
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
