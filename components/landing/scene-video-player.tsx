"use client"

import { useEffect, useRef, useState, type SyntheticEvent } from "react"
import { motion } from "framer-motion"
import { ArrowRight, ExternalLink, Volume2, VolumeX } from "lucide-react"
import type { LandingScene } from "@/lib/landing-scenes"

type SceneVideoPlayerProps = {
  scene: LandingScene
  onLoadScene: (sceneId: string) => void
  pause?: boolean
}

export function SceneVideoPlayer({ scene, onLoadScene, pause = false }: SceneVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isOverlayRevealed, setIsOverlayRevealed] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [videoFailed, setVideoFailed] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(scene.autoAdvanceSeconds ?? 0)
  const [isAutoAdvancePaused, setIsAutoAdvancePaused] = useState(false)
  const autoAdvanceSeconds = scene.autoAdvanceSeconds ?? 0
  const hasAutoAdvance = autoAdvanceSeconds > 0 && Boolean(scene.nextSceneId)

  useEffect(() => {
    const video = videoRef.current
    setIsOverlayRevealed(false)
    setVideoFailed(false)
    setRemainingSeconds(autoAdvanceSeconds)
    setIsAutoAdvancePaused(false)

    if (!video) return

    video.currentTime = 0
    video.muted = isMuted
    if (!pause) {
      video.play().catch(() => {})
    }
  }, [scene.id, autoAdvanceSeconds])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (pause) {
      video.pause()
      return
    }

    video.play().catch(() => {})
  }, [pause, scene.id])

  useEffect(() => {
    const video = videoRef.current
    if (video) video.muted = isMuted
  }, [isMuted, scene.id])

  const getLoopStart = (duration: number) => {
    if (!Number.isFinite(duration) || duration <= 0) return 0
    return Math.min(scene.loopStartSeconds, Math.max(duration - 0.25, 0))
  }

  const playFromLoopPoint = (video = videoRef.current) => {
    if (!video) return

    video.currentTime = getLoopStart(video.duration)
    video.play().catch(() => {})
  }

  const handleTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    if (!Number.isFinite(video.duration) || video.duration <= 0) return

    if (video.currentTime >= video.duration - scene.revealOffsetSeconds) {
      setIsOverlayRevealed(true)
    }

    if (video.currentTime >= video.duration - 0.05) {
      playFromLoopPoint(video)
    }
  }

  const handleVideoEnded = (event: SyntheticEvent<HTMLVideoElement>) => {
    playFromLoopPoint(event.currentTarget)
  }

  const handlePrimaryClick = () => {
    setIsAutoAdvancePaused(true)
    const nextSceneId = scene.primaryButton.nextSceneId ?? scene.nextSceneId
    if (nextSceneId) onLoadScene(nextSceneId)
  }

  useEffect(() => {
    if (!hasAutoAdvance || pause || isAutoAdvancePaused) return

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          const nextSceneId = scene.nextSceneId
          if (nextSceneId) onLoadScene(nextSceneId)
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [hasAutoAdvance, isAutoAdvancePaused, onLoadScene, pause, scene.id, scene.nextSceneId])

  const toggleSound = () => {
    const shouldMute = !isMuted
    setIsMuted(shouldMute)

    const video = videoRef.current
    if (!video) return

    video.muted = shouldMute
    if (!shouldMute && !pause) {
      video.play().catch(() => {})
    }
  }

  const cancelAutoAdvance = () => {
    setIsAutoAdvancePaused(true)
  }

  const progressPercent =
    hasAutoAdvance && autoAdvanceSeconds > 0
      ? Math.max(0, Math.min(100, (remainingSeconds / autoAdvanceSeconds) * 100))
      : 0

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {!videoFailed ? (
        <video
          key={scene.id}
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          loop
          muted={isMuted}
          playsInline
          autoPlay
          preload="auto"
          onCanPlay={() => {
            if (!pause) videoRef.current?.play().catch(() => {})
          }}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnded}
          onError={() => setVideoFailed(true)}
        >
          <source src={scene.videoSrc} type="video/mp4" />
        </video>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(249,115,22,0.28),transparent_28%),radial-gradient(circle_at_30%_70%,rgba(59,130,246,0.22),transparent_28%),linear-gradient(135deg,#050608,#111827_48%,#020617)]" />
      )}

      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/75 to-transparent" />

      {videoFailed ? (
        <div className="absolute left-5 right-5 top-24 z-10 max-w-xs break-words border border-white/15 bg-black/55 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/60 backdrop-blur-sm md:left-auto md:right-8">
          Add video asset at {scene.videoSrc}
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggleSound}
        className="absolute bottom-6 left-5 z-40 flex h-11 w-11 items-center justify-center border border-white/15 bg-black/55 text-white transition hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-orange-400 sm:bottom-8 md:bottom-12"
        aria-label={isMuted ? "Enable video sound" : "Mute video sound"}
        title={isMuted ? "Enable sound" : "Mute sound"}
      >
        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <motion.div
        initial={false}
        animate={{
          opacity: isOverlayRevealed ? 1 : 0,
          y: isOverlayRevealed ? 0 : 12,
          pointerEvents: isOverlayRevealed ? "auto" : "none",
        }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="absolute inset-0 z-30 flex items-end justify-center px-4 pb-24 pt-24 sm:items-center sm:pb-10"
        aria-hidden={!isOverlayRevealed}
      >
        <div className="flex w-full max-w-5xl flex-col items-start gap-6 border border-white/15 bg-black/72 p-5 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.85)] backdrop-blur-md sm:p-8 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.34em] text-orange-400">
              {scene.actLabel} · {scene.sceneLabel}
            </p>
            <h3 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-[0.92] tracking-tight text-white sm:text-6xl md:text-7xl">
              {scene.overlayTitle}
            </h3>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/68 sm:text-base">
              {scene.overlaySubtitle}
            </p>
          </div>

          <div className="grid w-full gap-3 sm:w-auto sm:min-w-[420px] sm:grid-cols-2">
            <button
              type="button"
              onClick={handlePrimaryClick}
              className="inline-flex min-h-14 items-center justify-center gap-2 bg-white px-4 py-3 text-center text-sm font-black uppercase tracking-[0.08em] text-black transition hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {scene.primaryButton.label}
              <ArrowRight className="h-4 w-4" />
            </button>

            {scene.secondaryButton.href ? (
              <a
                href={scene.secondaryButton.href}
                onClick={cancelAutoAdvance}
                className="inline-flex min-h-14 items-center justify-center gap-2 bg-orange-500 px-4 py-3 text-center text-sm font-black uppercase tracking-[0.08em] text-white transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-white"
              >
                {scene.secondaryButton.label}
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}

            {hasAutoAdvance ? (
              <button
                type="button"
                onClick={cancelAutoAdvance}
                className="col-span-full flex flex-col gap-2 text-left focus:outline-none focus:ring-2 focus:ring-orange-400"
                aria-label="Pause automatic scene advance"
              >
                <div className="h-1.5 w-full overflow-hidden bg-white/15">
                  <div
                    className="h-full bg-[#f97316] transition-[width] duration-1000 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white/60">
                  {isAutoAdvancePaused
                    ? "Paused — click → to continue"
                    : `Next in ${Math.max(0, Math.ceil(remainingSeconds))}s`}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
