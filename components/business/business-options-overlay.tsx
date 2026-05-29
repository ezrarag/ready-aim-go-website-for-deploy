"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"

type BusinessOption = {
  id: string
  label: string
  href?: string
  disabled?: boolean
  note?: string
  subItems?: {
    id: string
    label: string
    href: string
    note?: string
  }[]
}

type BusinessOptionsOverlayProps = {
  isOpen: boolean
  onClose: () => void
  options: BusinessOption[]
}

export function BusinessOptionsOverlay({
  isOpen,
  onClose,
  options,
}: BusinessOptionsOverlayProps) {
  const [activeItem, setActiveItem] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_42%),linear-gradient(135deg,_rgba(210,220,255,0.96),_rgba(194,204,244,0.96)_46%,_rgba(228,231,255,0.92))] backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6 py-12"
          >
            <div className="pointer-events-none flex w-full max-w-5xl items-center justify-between gap-10">
              <div className="hidden lg:block">
                <div className="flex items-baseline gap-3">
                  <h2
                    className="text-6xl font-black tracking-[-0.06em] text-slate-900"
                    style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
                  >
                    READYAIMGO
                  </h2>
                  <span className="text-5xl font-black text-orange-500">2</span>
                </div>
                <p className="mt-4 max-w-sm text-sm uppercase tracking-[0.35em] text-slate-600">
                  Business Command Console
                </p>
              </div>

              <div className="pointer-events-auto w-full max-w-md">
                <div className="mb-8">
                  <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                    ReadyAimGo
                  </div>
                  <h1
                    className="mt-3 text-5xl font-black uppercase tracking-[-0.05em] text-slate-950"
                    style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
                  >
                    Options
                  </h1>
                </div>

                <nav className="space-y-2">
                  {options.map((option) => {
                    const isActive = activeItem === option.id
                    const hasSubItems = Boolean(option.subItems?.length)
                    const content = (
                      <div
                        className={`flex items-center justify-between border px-5 py-4 transition-all duration-150 ${
                          option.disabled
                            ? "cursor-not-allowed border-white/50 bg-white/20 text-slate-500"
                            : isActive
                              ? "border-white/90 bg-white/95 text-slate-950 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.5)]"
                              : "border-white/40 bg-white/55 text-slate-800 hover:border-white/80 hover:bg-white/85"
                        }`}
                      >
                        <div>
                          <div className="text-2xl font-black uppercase tracking-[-0.04em]">
                            {option.label}
                          </div>
                          {option.note ? (
                            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                              {option.note}
                            </div>
                          ) : null}
                        </div>
                        {!option.disabled ? (
                          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500">
                            {hasSubItems ? "View" : "Open"}
                          </div>
                        ) : null}
                      </div>
                    )

                    if (hasSubItems) {
                      return (
                        <motion.div
                          key={option.id}
                          layout
                          onMouseEnter={() => setActiveItem(option.id)}
                          onMouseLeave={() => setActiveItem(null)}
                          className="border border-white/40 bg-white/45"
                        >
                          <button
                            type="button"
                            onClick={() => setActiveItem(isActive ? null : option.id)}
                            onFocus={() => setActiveItem(option.id)}
                            className="block w-full text-left"
                          >
                            {content}
                          </button>

                          <AnimatePresence initial={false}>
                            {isActive ? (
                              <motion.div
                                key="services-options"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                                className="overflow-hidden border-t border-white/45"
                              >
                                <div className="grid gap-2 p-3">
                                  {option.href ? (
                                    <Link
                                      href={option.href}
                                      onClick={onClose}
                                      className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white transition hover:bg-slate-800"
                                    >
                                      <span className="text-sm font-black uppercase tracking-[0.22em]">
                                        View All Services
                                      </span>
                                      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-400">
                                        Open
                                      </span>
                                    </Link>
                                  ) : null}

                                  {option.subItems?.map((subItem, index) => (
                                    <motion.div
                                      key={subItem.id}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.035, duration: 0.18 }}
                                    >
                                      <Link
                                        href={subItem.href}
                                        onClick={onClose}
                                        className="block border border-white/45 bg-white/65 px-4 py-3 text-slate-900 transition hover:border-white/90 hover:bg-white"
                                      >
                                        <div className="text-xl font-black uppercase tracking-[-0.04em]">
                                          {subItem.label}
                                        </div>
                                        {subItem.note ? (
                                          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                            {subItem.note}
                                          </div>
                                        ) : null}
                                      </Link>
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </motion.div>
                      )
                    }

                    if (option.disabled || !option.href) {
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onMouseEnter={() => setActiveItem(option.id)}
                          onMouseLeave={() => setActiveItem(null)}
                          className="block w-full text-left"
                        >
                          {content}
                        </button>
                      )
                    }

                    return (
                      <Link
                        key={option.id}
                        href={option.href}
                        onMouseEnter={() => setActiveItem(option.id)}
                        onMouseLeave={() => setActiveItem(null)}
                        onClick={onClose}
                        className="block"
                      >
                        {content}
                      </Link>
                    )
                  })}
                </nav>

                <div className="mt-8 flex items-center justify-between text-slate-700">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em]">
                    More routes can be added here later.
                  </span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] hover:text-slate-950"
                  >
                    <kbd className="rounded bg-slate-700 px-2 py-1 text-[10px] font-bold text-white">
                      ESC
                    </kbd>
                    Back
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
