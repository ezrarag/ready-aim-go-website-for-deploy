import React, { useRef, useState, useLayoutEffect, useEffect } from "react"
import { Zap, Menu as MenuIcon, User } from "lucide-react"
import clsx from "clsx"
import { motion, AnimatePresence } from "framer-motion"

interface StickyFloatingHeaderProps {
  pageTitle: string
  className?: string
  onInterested?: () => void
}

// Animated button component that cycles between "I'm interested" and "Log in" with user icon
function AnimatedInterestedButton({ onClick }: { onClick?: () => void }) {
  const [currentText, setCurrentText] = useState("I'm interested")
  const [isAnimating, setIsAnimating] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Cycle between texts every 30 seconds
    intervalRef.current = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentText(prev => prev === "I'm interested" ? "Log in" : "I'm interested")
        setIsAnimating(false)
      }, 500) // Animation duration
    }, 30000) // 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return (
    <button 
      className="flex items-center justify-center px-6 h-12 rounded-2xl font-semibold text-base bg-black text-white shadow-md ml-2 min-w-[140px] transition-all duration-500" 
      onClick={onClick}
    >
      <AnimatePresence mode="wait">
        {currentText === "I'm interested" ? (
          <motion.span
            key="interested"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center"
          >
            I'm interested
          </motion.span>
        ) : (
          <motion.span
            key="login"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            Log in
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

export const StickyFloatingHeader: React.FC<StickyFloatingHeaderProps> = ({ pageTitle, className, onInterested }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const rightMenuRef = useRef<HTMLDivElement>(null)
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(320)

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
      {/* Left: Icon + Page Title */}
      <div className="pointer-events-auto flex items-center gap-3 bg-[#F7F5F4] rounded-2xl shadow-lg px-4 py-3 min-w-[160px]">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#C7BFFF]">
          <Zap className="h-5 w-5 text-black" />
        </span>
        <span className="font-bold text-black text-base">{pageTitle}</span>
      </div>
      {/* Right: Hamburger + Dropdown */}
      <div
        className="pointer-events-auto flex items-center bg-[#F7F5F4] rounded-2xl shadow-lg px-4 py-3 gap-4 min-w-[260px] relative"
        ref={rightMenuRef}
      >
        {/* Hamburger Icon */}
        <button
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-transparent focus:outline-none"
          aria-label="Open menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <motion.div
            initial={false}
            animate={menuOpen ? "open" : "closed"}
            variants={{
              closed: { rotate: 0 },
              open: { rotate: 90 },
            }}
            className="w-6 h-6 flex items-center justify-center"
          >
            {/* Hamburger to X animation with three lines */}
            <motion.svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Top line */}
              <motion.rect
                x="4"
                y="6"
                width="16"
                height="2"
                rx="1"
                fill="black"
                animate={menuOpen ? { rotate: 45, y: 8, x: 4 } : { rotate: 0, y: 0, x: 4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
              {/* Middle line */}
              <motion.rect
                x="4"
                y="11"
                width="16"
                height="2"
                rx="1"
                fill="black"
                animate={menuOpen ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
              {/* Bottom line */}
              <motion.rect
                x="4"
                y="16"
                width="16"
                height="2"
                rx="1"
                fill="black"
                animate={menuOpen ? { rotate: -45, y: 4, x: 4 } : { rotate: 0, y: 0, x: 4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
            </motion.svg>
          </motion.div>
        </button>
        {/* I'm interested button */}
        <AnimatedInterestedButton onClick={onInterested} />
        {/* Dropdown Panel */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ width: dropdownWidth, right: 0 }}
              className="absolute top-[calc(100%+16px)] right-0 bg-[#F7F5F4] rounded-3xl shadow-2xl p-8 z-50 flex flex-col gap-6 border border-gray-100"
            >
              {/* Solutions */}
              <div>
                <div className="text-lg text-[#8B8892] font-medium mb-2">Solutions</div>
                <div className="flex flex-col gap-1">
                  <a href="#" className="font-bold text-black text-lg py-1">Multi-unit</a>
                  <a href="#" className="font-bold text-black text-lg py-1">Public</a>
                  <a href="#" className="font-bold text-black text-lg py-1">Business</a>
                </div>
              </div>
              {/* Informations */}
              <div>
                <div className="text-lg text-[#8B8892] font-medium mb-2">Informations</div>
                <div className="flex flex-col gap-1">
                  <a href="#" className="font-bold text-black text-lg py-1">Become a partner</a>
                  <a href="#" className="font-bold text-black text-lg py-1">Blog</a>
                  <a href="#" className="font-bold text-black text-lg py-1">Contact</a>
                </div>
              </div>
              {/* Platform Overview */}
              <div>
                <div className="text-lg text-[#8B8892] font-medium mb-2">Platform Overview</div>
                <div className="flex flex-col gap-1">
                  <a href="/platform/what-we-offer" className="font-bold text-black text-lg py-1">What We Offer</a>
                  <a href="/platform/features" className="font-bold text-black text-lg py-1">Platform Features</a>
                </div>
              </div>
              {/* Bottom row: Contact and combined language selector */}
              <div className="flex items-center justify-between mt-4 gap-2">
                <button className="flex-1 h-12 rounded-2xl bg-white text-black font-semibold text-base shadow border border-transparent">Contact</button>
                <button className="w-28 h-12 rounded-2xl bg-white text-black font-semibold text-base shadow border border-transparent flex items-center justify-center">
                  <span className="bg-black text-white px-2 py-1 rounded mr-1">fr</span>
                  <span className="px-2 py-1 rounded">en</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}

export default StickyFloatingHeader 