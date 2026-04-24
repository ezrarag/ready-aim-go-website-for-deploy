"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, Users, Handshake } from "lucide-react"

interface OptionsMenuOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export function OptionsMenuOverlay({ isOpen, onClose }: OptionsMenuOverlayProps) {
  const router = useRouter()
  const [activeMenuItem, setActiveMenuItem] = React.useState<string | null>(null)

  // Handle ESC key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  const menuItems = [
    { id: "SOCIAL", label: "SOCIAL", action: () => {} },
    { id: "CAREER_PROFILE", label: "CAREER PROFILE", action: () => {} },
    { id: "HIGHLIGHTS", label: "HIGHLIGHTS", action: () => {} },
    { id: "OPTIONS", label: "OPTIONS", action: () => {} },
    { id: "CREDITS", label: "CREDITS", action: () => {} },
    { id: "EXIT_TO_DESKTOP", label: "EXIT TO DESKTOP", action: () => router.push('/business') },
  ]

  const signInOptions = [
    { id: "ADMIN", label: "Admin", icon: Shield, color: "text-blue-600", action: () => router.push('/dashboard/admin') },
    { id: "CLIENTS", label: "Clients", icon: Users, color: "text-green-600", action: () => router.push('/clients?intent=claim') },
    { id: "PARTNERS", label: "Partners", icon: Handshake, color: "text-purple-600", action: () => router.push('/partners') },
  ]

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
            className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-100 via-purple-100 to-blue-100"
            onClick={onClose}
          />

          {/* Overlay Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[101] flex flex-col pointer-events-none"
          >
            <div className="flex-1 flex relative">
              {/* Left Side - Logo */}
              <div className="absolute left-12 top-1/2 -translate-y-1/2 z-10">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="pointer-events-auto"
                >
                  {/* READYAIMGO 2 Logo */}
                  <div className="flex items-baseline gap-2">
                    <h1 className="text-4xl font-bold text-gray-800 tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                      READYAIMGO
                    </h1>
                    <span className="text-3xl font-bold text-orange-500">2</span>
                  </div>
                </motion.div>
              </div>

              {/* Center - Menu Items */}
              <div className="flex-1 flex flex-col items-center justify-center pointer-events-auto">
                {/* OPTIONS Title */}
                <motion.h1
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl font-bold text-gray-800 mb-16 tracking-tight"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  OPTIONS
                </motion.h1>

                {/* Menu Items */}
                <nav className="flex flex-col gap-0 w-full max-w-md">
                  {menuItems.map((item, index) => {
                    const isActive = activeMenuItem === item.id
                    const isHighlighted = item.id === "SOCIAL" || item.id === "OPTIONS" || item.id === "CREDITS" || item.id === "EXIT_TO_DESKTOP"
                    
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        onClick={() => {
                          setActiveMenuItem(item.id)
                          if (item.action) {
                            item.action()
                            if (item.id !== "EXIT_TO_DESKTOP") {
                              onClose()
                            }
                          }
                        }}
                        onMouseEnter={() => setActiveMenuItem(item.id)}
                        onMouseLeave={() => setActiveMenuItem(null)}
                        className={`
                          text-left px-6 py-3 transition-all duration-200 rounded
                          ${isHighlighted 
                            ? 'bg-gray-200/90 text-gray-800 font-semibold' 
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200/50'
                          }
                          ${isActive && !isHighlighted ? 'bg-gray-200/70' : ''}
                        `}
                        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                      >
                        {item.label}
                      </motion.button>
                    )
                  })}
                </nav>

                {/* Sign In Options Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-12 pt-8 border-t border-gray-400/30 w-full max-w-md"
                >
                  <div className="text-gray-600 text-xs font-semibold uppercase tracking-widest mb-4 text-center">
                    SIGN IN AS
                  </div>
                  <div className="flex flex-col gap-2">
                    {signInOptions.map((option) => {
                      const Icon = option.icon
                      return (
                        <motion.button
                          key={option.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            option.action()
                            onClose()
                          }}
                          className="flex items-center gap-3 px-4 py-3 bg-white/60 hover:bg-white/80 rounded-lg transition-colors"
                        >
                          <Icon className={`h-5 w-5 ${option.color}`} />
                          <span className="text-sm font-semibold text-gray-800">{option.label}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </motion.div>
              </div>

              {/* Top Right - User Info */}
              <div className="absolute top-6 right-6 z-10">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="pointer-events-auto bg-white/80 backdrop-blur-sm border border-gray-300 rounded-lg px-4 py-2 flex items-center gap-2"
                >
                  <span className="text-gray-800 text-sm font-semibold uppercase tracking-wide">
                    GUEST
                  </span>
                  <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">W</span>
                  </div>
                  <div className="w-4 h-4 bg-gray-600 rounded"></div>
                </motion.div>
              </div>

              {/* Bottom Right - ESC BACK */}
              <div className="absolute bottom-8 right-8 z-10">
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={onClose}
                  className="pointer-events-auto flex items-center gap-2 text-white hover:text-white/90 transition-colors"
                >
                  <kbd className="px-2 py-1 bg-gray-600/80 rounded text-xs font-bold text-white">ESC</kbd>
                  <span className="text-sm font-semibold uppercase text-gray-800">BACK</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
