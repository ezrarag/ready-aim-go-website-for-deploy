"use client"

import React, { useRef, useState, useLayoutEffect, useEffect } from "react"
import { Zap } from "lucide-react"
import clsx from "clsx"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface StickyFloatingHeaderProps {
  pageTitle: string
  className?: string
  onInterested?: () => void
  onVideoPlay?: () => void
}

export const StickyFloatingHeader: React.FC<StickyFloatingHeaderProps> = ({ pageTitle, className, onInterested, onVideoPlay }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const rightMenuRef = useRef<HTMLDivElement>(null)
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(320)

  // Check for user session
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if supabase is available (client-side)
        if (typeof window !== 'undefined' && (window as any).supabase) {
          const { data: { session }, error } = await (window as any).supabase.auth.getSession()
          if (!error && session?.user) {
            setUser(session.user)
          }
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }
    checkSession()
  }, [])

  const handleHomeClick = () => {
    if (onVideoPlay) {
      onVideoPlay()
    }
  }

  const handleMenuClick = () => {
    if (onVideoPlay) {
      onVideoPlay()
    }
    setMenuOpen((open) => !open)
  }

  const handleSignIn = () => {
    if (onInterested) {
      onInterested()
    } else {
      window.location.href = '/login'
    }
  }

  useLayoutEffect(() => {
    if (rightMenuRef.current) {
      setDropdownWidth(rightMenuRef.current.offsetWidth)
    }
  }, [rightMenuRef.current])

  return (
    <header
      className={clsx(
        "sticky top-0 z-30 w-full flex justify-between items-center px-6 pt-6 pointer-events-none",
        className
      )}
      style={{ background: "transparent" }}
    >
      {/* Left: Icon + Page Title - Commented out for now */}
      {/* <button
        onClick={handleHomeClick}
        className="pointer-events-auto flex items-center gap-3 bg-black/60 backdrop-blur-sm border border-white/20 px-4 py-2 min-w-[160px] cursor-pointer hover:bg-black/80 transition-colors"
      >
        <span className="inline-flex items-center justify-center w-8 h-8 bg-white/20">
          <Zap className="h-4 w-4 text-white" />
        </span>
        <span className="font-bold text-white text-sm">{pageTitle}</span>
      </button> */}
      
      {/* Right: Overwatch-style header button - Far Right */}
      <div
        className="pointer-events-auto flex items-center gap-0 relative ml-auto"
        ref={rightMenuRef}
      >
        {/* White Profile Button - Matches Screenshot */}
        {!loading && (
          <button
            onClick={user ? handleMenuClick : handleSignIn}
            className="flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <span className="text-black text-sm font-semibold uppercase tracking-wide">
              {user ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'USER').toUpperCase() : 'SIGN IN'}
            </span>
            
            {/* Blue Snowflake/Starburst Icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="#3B82F6" stroke="#3B82F6" strokeWidth="1"/>
              <circle cx="12" cy="10" r="2" fill="#3B82F6"/>
            </svg>
            
            {/* Black Paw Print Icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 10C8 11.1 7.1 12 6 12C4.9 12 4 11.1 4 10C4 8.9 4.9 8 6 8C7.1 8 8 8.9 8 10ZM10 6C10 7.1 9.1 8 8 8C6.9 8 6 7.1 6 6C6 4.9 6.9 4 8 4C9.1 4 10 4.9 10 6ZM16 6C16 7.1 15.1 8 14 8C12.9 8 12 7.1 12 6C12 4.9 12.9 4 14 4C15.1 4 16 4.9 16 6ZM20 10C20 11.1 19.1 12 18 12C16.9 12 16 11.1 16 10C16 8.9 16.9 8 18 8C19.1 8 20 8.9 20 10ZM12 16C12 17.1 11.1 18 10 18C8.9 18 8 17.1 8 16C8 14.9 8.9 14 10 14C11.1 14 12 14.9 12 16Z"/>
            </svg>
          </button>
        )}

        {/* Dropdown Panel */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ width: dropdownWidth, right: 0 }}
              className="absolute top-[calc(100%+8px)] right-0 bg-black/95 backdrop-blur-md border border-white/20 p-6 z-50 flex flex-col gap-4"
            >
              {/* Solutions */}
              <div>
                <div className="text-sm text-white/60 font-medium mb-2">Solutions</div>
                <div className="flex flex-col gap-1">
                  <Link href="#" className="font-semibold text-white text-sm py-1 hover:text-white/80 transition-colors">Learn about the team</Link>
                  <a href="https://beamthinktank.space" target="_blank" rel="noopener noreferrer" className="font-semibold text-white text-sm py-1 hover:text-white/80 transition-colors">Learn about BEAM</a>
                </div>
              </div>
              {/* Informations */}
              <div>
                <div className="text-sm text-white/60 font-medium mb-2">Informations</div>
                <div className="flex flex-col gap-1">
                  <Link href="#" className="font-semibold text-white text-sm py-1 hover:text-white/80 transition-colors">Become a client</Link>
                  <a href="https://clients.readyaimgo.biz" target="_blank" rel="noopener noreferrer" className="font-semibold text-white text-sm py-1 hover:text-white/80 transition-colors">Client portal</a>
                  <Link href="/pricing" className="font-semibold text-white text-sm py-1 hover:text-white/80 transition-colors">View Pricing</Link>
                  <Link href="/contact" className="font-semibold text-white text-sm py-1 hover:text-white/80 transition-colors">Contact</Link>
                </div>
              </div>
              {/* ReadyAimGo */}
              <div>
                <div className="text-sm text-white/60 font-medium mb-2">ReadyAimGo</div>
                <div className="flex flex-col gap-1">
                  <Link href="/onboarding" className="font-semibold text-white text-sm py-1 hover:text-white/80 transition-colors">Join the Team</Link>
                  <Link href="/dashboard" className="font-semibold text-white text-sm py-1 hover:text-white/80 transition-colors">RAG Service Dashboard</Link>
                </div>
              </div>
              {user && (
                <div className="pt-4 border-t border-white/20">
                  <Link href="/logout" className="font-semibold text-white text-sm py-1 hover:text-white/80 transition-colors">Sign Out</Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

export default StickyFloatingHeader 