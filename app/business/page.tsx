"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Users, Trophy, Volume2, VolumeX, Wifi, Battery, Menu, MessageCircle, Mic, Video } from "lucide-react"

export default function BusinessPage() {
  const [activeMenuItem, setActiveMenuItem] = useState("PLAY")
  const [isMusicEnabled, setIsMusicEnabled] = useState(false)
  // TODO: Replace with your background image URL when ready
  // Example: const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>("https://your-image-url.com/image.jpg")
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null)
  const backgroundMusicRef = useRef<HTMLAudioElement>(null)

  const BUSINESS_LOADING_TRACK =
    "https://firebasestorage.googleapis.com/v0/b/readyaimgo-clients-temp.firebasestorage.app/o/readyaimgo%2Fbusiness-loading-page%2Fmusic%2FLil%20Revenged%20-%20No%20Lies.mp3?alt=media&token=5a2b9656-14f8-4851-bfa8-c81d5611d4c1"

  useEffect(() => {
    const audio = backgroundMusicRef.current
    if (!audio) return

    if (isMusicEnabled) {
      audio.play().catch(() => {})
      return
    }

    audio.pause()
    audio.currentTime = 0
  }, [isMusicEnabled])

  const menuItems = [
    { id: "PLAY", label: "PLAY", href: "/" },
    { id: "FLEET_OPS", label: "FLEET OPS", href: "/fleet" },
    { id: "PROPERTY_OPS", label: "PROPERTY OPS" },
    { id: "READYAIMGO_STAFF", label: "READYAIMGO STAFF", href: "/beam-participants" },
  ]

  const socialItems = [
    { id: "BEAM_PARTICIPANTS", label: "BEAM PARTICIPANTS", href: "/beam-participants" },
    { id: "CHALLENGES", label: "CHALLENGES" },
  ]

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <audio ref={backgroundMusicRef} src={BUSINESS_LOADING_TRACK} loop preload="auto" />

      {/* Background Image - Full Screen */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: backgroundImageUrl 
            ? `url(${backgroundImageUrl})` 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Bar */}
        <div className="flex justify-between items-start p-6">
          {/* Top Left - Logo and Icons */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Mic className="w-4 h-4 text-white/60" />
              <Video className="w-4 h-4 text-white/60" />
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-4xl font-bold text-white tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                READYAIMGO
              </h1>
              <span className="text-3xl font-bold text-orange-500">2</span>
            </div>
          </div>

          {/* Top Right - User Info and System Icons */}
          <div className="flex items-center gap-4">
            {/* Edit Button */}
            <button className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
              <div className="w-8 h-8 border-2 border-white/40 rounded flex items-center justify-center">
                <span className="text-xs font-bold">Y</span>
              </div>
              <span className="text-sm uppercase tracking-wide">EDIT</span>
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2">
              <Avatar className="w-10 h-10 border-2 border-white/30">
                <AvatarImage src="/placeholder.svg" alt="User" />
                <AvatarFallback className="bg-white/20 text-white">
                  <span className="text-xs font-bold">RAG</span>
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-white font-bold text-sm uppercase tracking-wide">
                  USERNAME
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-white/70 text-xs uppercase">BUSINESS</span>
                </div>
              </div>
            </div>

            {/* Social Icon */}
            <button className="w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded flex items-center justify-center hover:bg-white/30 transition-colors">
              <Users className="w-5 h-5 text-white" />
            </button>

            {/* Trophy Icon */}
            <button className="w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded flex items-center justify-center hover:bg-white/30 transition-colors">
              <Trophy className="w-5 h-5 text-white" />
            </button>

            {/* System Icons */}
            <div className="flex items-center gap-3 ml-2">
              <button
                onClick={() => setIsMusicEnabled((prev) => !prev)}
                className="text-white/80 hover:text-white transition-colors"
                aria-label={isMusicEnabled ? "Disable background music" : "Enable background music"}
                title={isMusicEnabled ? "Disable background music" : "Enable background music"}
              >
                {isMusicEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <Wifi className="w-5 h-5 text-white/80" />
              <Battery className="w-5 h-5 text-white/80" />
            </div>

            {/* Menu Button */}
            <button className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Left Navigation Menu */}
          <div className="flex flex-col justify-center pl-12 py-20">
            <nav className="flex flex-col space-y-0">
              {/* Primary Menu Items */}
              {menuItems.map((item) => {
                const menuItemClassName = `
                  block text-left transition-all duration-300 py-2 cursor-pointer w-full
                  ${activeMenuItem === item.id
                    ? 'text-white text-5xl font-bold tracking-wide'
                    : 'text-white/70 text-5xl font-normal tracking-wide hover:text-white/90'
                  }
                `
                const menuItemStyle = {
                  textShadow: activeMenuItem === item.id 
                    ? '0 0 15px rgba(255, 255, 255, 0.6), 0 0 30px rgba(59, 130, 246, 0.4), 0 0 45px rgba(59, 130, 246, 0.2)' 
                    : 'none',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }

                if (item.href) {
                  return (
                    <Link 
                      key={item.id} 
                      href={item.href}
                      onClick={() => setActiveMenuItem(item.id)}
                      className={menuItemClassName}
                      style={menuItemStyle}
                    >
                      {item.label}
                    </Link>
                  )
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveMenuItem(item.id)}
                    className={menuItemClassName}
                    style={menuItemStyle}
                  >
                    {item.label}
                  </button>
                )
              })}

              {/* Social Section */}
              <div className="mt-12 pt-8 border-t border-white/20">
                <div className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-6">
                  SOCIAL
                </div>
                {socialItems.map((item) => {
                  const socialItemClassName = `
                    block text-left transition-all duration-200 mb-3
                    ${activeMenuItem === item.id
                      ? 'text-white text-2xl font-bold tracking-wide'
                      : 'text-white/60 text-2xl font-normal tracking-wide hover:text-white/80'
                    }
                  `

                  if (item.href) {
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setActiveMenuItem(item.id)}
                        className={socialItemClassName}
                        style={{
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                        }}
                      >
                        {item.label}
                      </Link>
                    )
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveMenuItem(item.id)}
                      className={socialItemClassName}
                      style={{
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                      }}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </nav>
          </div>

          {/* Right Content Area - Empty for now */}
          <div className="flex-1" />
        </div>

        {/* Bottom Left - Chat */}
        <div className="absolute bottom-6 left-6">
          <button className="flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-2 hover:bg-black/60 transition-colors">
            <MessageCircle className="w-5 h-5 text-white" />
            <span className="text-white text-sm font-semibold uppercase tracking-wide">
              CHAT
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
