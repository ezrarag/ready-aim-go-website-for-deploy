"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  BedDouble,
  Building2,
  Hammer,
  Home,
  Hotel,
  ImageOff,
  Landmark,
  Leaf,
  TriangleAlert,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getPropertyClassMeta,
  getPropertyStatusMeta,
  isHotelProperty,
  propertyIsBeamLinked,
} from "@/lib/rag-properties"
import type { RAGProperty, RAGPropertyClass } from "@/types/ragProperty"

const DISPLAY_FONT = '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif'

function getPropertyIcon(propertyClass: RAGPropertyClass) {
  switch (propertyClass) {
    case "commercial-space":
      return Building2
    case "hotel-established":
      return Hotel
    case "hotel-remake":
      return Hammer
    case "mixed-use-civic":
      return Landmark
    case "distressed":
      return TriangleAlert
    case "residential-portfolio":
      return Home
    default:
      return Building2
  }
}

export function PropertyOpsCard({
  property,
  index,
}: {
  property: RAGProperty
  index: number
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const classMeta = getPropertyClassMeta(property.propertyClass)
  const statusMeta = getPropertyStatusMeta(property.status)
  const Icon = getPropertyIcon(property.propertyClass)
  const beamLinked = propertyIsBeamLinked(property)
  const hotelProperty = isHotelProperty(property.propertyClass)
  const roomCount = property.hotelDetails?.roomCount
  const brandAffiliation = property.hotelDetails?.brandAffiliation

  useEffect(() => {
    setImageFailed(false)
  }, [property.publicImageUrl])

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 18, scale: 0.98 }}
      transition={{
        duration: 0.42,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.045,
        layout: { duration: 0.28 },
      }}
      className="group relative overflow-hidden rounded-[0.65rem] border border-white/12 bg-[#31446d]/76 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)] backdrop-blur-sm transition-colors hover:border-white/35"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(18,28,54,0.32)_62%,rgba(14,20,36,0.78)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_44%)]" />

      {property.publicImageUrl && !imageFailed ? (
        <img
          src={property.publicImageUrl}
          alt={property.publicName}
          className="absolute inset-0 h-full w-full object-cover opacity-24 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-32"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-x-6 top-6 flex h-44 items-center justify-center rounded-[0.65rem] border border-white/10 text-white/90 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.8)]",
            classMeta.placeholderClassName
          )}
        >
          <div className="flex flex-col items-center text-center">
            <AnimatePresence mode="wait">
              {imageFailed ? (
                <motion.div
                  key="image-off"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                >
                  <ImageOff className="mx-auto h-10 w-10" />
                </motion.div>
              ) : (
                <motion.div
                  key="icon"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                >
                  <Icon className="mx-auto h-10 w-10" />
                </motion.div>
              )}
            </AnimatePresence>
            <p
              className="mt-4 text-[0.7rem] uppercase tracking-[0.28em] text-white/82"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
            >
              {classMeta.shortLabel}
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 flex min-h-[24rem] flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className="text-[0.64rem] uppercase tracking-[0.32em] text-white/55"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
            >
              Property Portfolio
            </div>
            <h2
              className="mt-4 max-w-[15rem] text-[1.95rem] uppercase leading-none text-white sm:text-[2.2rem]"
              style={{
                fontFamily: DISPLAY_FONT,
                fontStyle: "italic",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              {property.publicName}
            </h2>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div
              className={cn(
                "rounded-[0.38rem] border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.2em] backdrop-blur-sm",
                classMeta.pillClassName
              )}
            >
              {classMeta.shortLabel}
            </div>
            <div
              className={cn(
                "rounded-[0.38rem] border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.2em] backdrop-blur-sm",
                statusMeta.pillClassName
              )}
            >
              {statusMeta.shortLabel}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className="rounded-[0.35rem] border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-white/74"
            style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
          >
            Node {property.node}
          </span>
          <span
            className="rounded-[0.35rem] border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-white/74"
            style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
          >
            {property.city}, {property.state}
          </span>
        </div>

        <p className="mt-5 max-w-[22rem] text-sm leading-6 text-white/78 line-clamp-2 sm:text-[0.96rem]">
          {property.publicSummary}
        </p>

        <div className="mt-auto space-y-4 pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[0.5rem] border border-white/10 bg-black/10 px-4 py-3">
              <div
                className="text-[0.58rem] uppercase tracking-[0.28em] text-white/45"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Class
              </div>
              <div className="mt-2 text-sm text-white/88">{classMeta.label}</div>
            </div>
            <div className="rounded-[0.5rem] border border-white/10 bg-black/10 px-4 py-3">
              <div
                className="text-[0.58rem] uppercase tracking-[0.28em] text-white/45"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Status
              </div>
              <div className="mt-2 text-sm text-white/88">{statusMeta.label}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-4">
            <div className="flex flex-wrap gap-2">
              {beamLinked ? (
                <span className="inline-flex items-center gap-2 rounded-[0.35rem] border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-emerald-100">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/16">
                    <Leaf className="h-3 w-3" />
                  </span>
                  BEAM Grounds cohort active
                </span>
              ) : null}
              {hotelProperty && (roomCount || brandAffiliation) ? (
                <span
                  className="inline-flex items-center gap-2 rounded-[0.35rem] border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-white/74"
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                >
                  <BedDouble className="h-3.5 w-3.5" />
                  {roomCount ? `${roomCount} rooms` : brandAffiliation}
                  {roomCount && brandAffiliation ? ` · ${brandAffiliation}` : ""}
                </span>
              ) : null}
            </div>

            <Link
              href={`/property-ops/${property.id}`}
              className="inline-flex items-center gap-2 rounded-[0.42rem] border border-white/16 bg-[#24345a]/80 px-3.5 py-2 text-white transition hover:bg-[#203258]"
            >
              <span
                className="text-[0.72rem] uppercase tracking-[0.22em]"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Learn more
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
