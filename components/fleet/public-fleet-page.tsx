"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, ImageOff, Shield, Wrench } from "lucide-react"
import { useFleetVehicles } from "@/hooks/use-fleet-vehicles"
import {
  FLEET_ANGLE_OPTIONS,
  buildImaginUrl,
  getFleetStatusMeta,
  type FleetAngle,
  type FleetStatus,
  type FleetVehicle,
} from "@/lib/fleet"
import { cn } from "@/lib/utils"

type FleetFilter = "all" | FleetStatus

const FILTER_OPTIONS: Array<{ value: FleetFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "rag", label: "RAG Fleet" },
  { value: "want", label: "Wishlist" },
  { value: "restore", label: "Restore Project" },
]

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_80px_-36px_rgba(249,115,22,0.6)] backdrop-blur-xl">
      <div className="text-[0.65rem] uppercase tracking-[0.28em] text-orange-300/80">{label}</div>
      <div className="mt-3 text-4xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-white/60">{hint}</div>
    </div>
  )
}

function FleetVehicleCard({ vehicle, index }: { vehicle: FleetVehicle; index: number }) {
  const [angle, setAngle] = useState<FleetAngle>("01")
  const [imageFailed, setImageFailed] = useState(false)
  const statusMeta = getFleetStatusMeta(vehicle.status)
  const imageUrl = buildImaginUrl(vehicle.make, vehicle.model, vehicle.year, angle)

  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])

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
      className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.065] p-4 shadow-[0_28px_85px_-45px_rgba(0,0,0,0.95)] backdrop-blur-xl"
    >
      <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]">
        <div
          className={cn(
            "absolute left-4 top-4 z-20 rounded-full border px-3 py-1 text-[0.68rem] uppercase tracking-[0.22em] backdrop-blur-md",
            statusMeta.pillClassName
          )}
        >
          {vehicle.statusLabel}
        </div>

        <div className="aspect-[4/3] p-6">
          {imageFailed ? (
            <div className="flex h-full flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-white/15 bg-black/20 text-center text-white/55">
              <ImageOff className="h-10 w-10" />
              <p className="mt-3 text-sm uppercase tracking-[0.22em]">Preview unavailable</p>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.02]"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          )}
        </div>

        <div className="absolute bottom-4 right-4 z-20 flex gap-2 rounded-full border border-white/10 bg-black/55 p-1 backdrop-blur-md">
          {FLEET_ANGLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAngle(option.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.2em] text-white/70 transition",
                angle === option.value && "bg-white text-black"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 px-1 pb-2 pt-5">
        <div className="text-[0.72rem] uppercase tracking-[0.26em] text-white/45">
          {vehicle.year} · {vehicle.config}
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-semibold leading-none text-white">
            {vehicle.make} {vehicle.model}
          </h2>
          <div className="font-mono text-sm text-amber-300">{vehicle.priceRange}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="text-[0.64rem] uppercase tracking-[0.22em] text-white/45">Engine</div>
            <div className="mt-2 text-sm text-white/85">{vehicle.engine}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
            <div className="text-[0.64rem] uppercase tracking-[0.22em] text-white/45">Payload</div>
            <div className="mt-2 text-sm text-white/85">{vehicle.payload}</div>
          </div>
        </div>

        <div className="h-px bg-white/10" />

        <p className="text-sm leading-7 text-white/66">{vehicle.purpose}</p>
      </div>
    </motion.article>
  )
}

export function PublicFleetPage() {
  const { vehicles, loading, error } = useFleetVehicles()
  const [activeFilter, setActiveFilter] = useState<FleetFilter>("all")

  const visibleVehicles = useMemo(() => {
    if (activeFilter === "all") {
      return vehicles
    }

    return vehicles.filter((vehicle) => vehicle.status === activeFilter)
  }, [activeFilter, vehicles])

  const metrics = useMemo(() => {
    const activeVehicles = vehicles.filter((vehicle) => vehicle.active)

    return {
      total: activeVehicles.length,
      rag: activeVehicles.filter((vehicle) => vehicle.status === "rag").length,
      want: activeVehicles.filter((vehicle) => vehicle.status === "want").length,
      restore: activeVehicles.filter((vehicle) => vehicle.status === "restore").length,
    }
  }, [vehicles])

  return (
    <div className="min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.34),transparent_48%)]" />
        <div className="absolute right-[-12rem] top-[18rem] h-[28rem] w-[28rem] rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute left-[-10rem] top-[34rem] h-[24rem] w-[24rem] rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm uppercase tracking-[0.2em] text-white/80 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
          >
            <Shield className="h-4 w-4 text-orange-300" />
            ReadyAimGo
          </Link>

          <Link
            href="/dashboard/transportation"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm uppercase tracking-[0.2em] text-black transition hover:bg-orange-200"
          >
            Admin Fleet
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <section className="pb-10 pt-16 sm:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-[0.72rem] uppercase tracking-[0.28em] text-orange-200">
            <Wrench className="h-4 w-4" />
            BEAM Transportation Fleet Cohort
          </div>

          <div className="mt-8 max-w-4xl">
            <h1 className="text-5xl font-semibold uppercase leading-none tracking-[0.03em] text-white sm:text-6xl lg:text-7xl">
              RAG Fleet & Wishlist
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/68">
              ReadyAimGo is BEAM Transportation&apos;s first fleet client, and cohort participants
              maintain these vehicles weekly as live service assets, wishlist targets, and restore
              builds.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Vehicles" value={metrics.total} hint="Active public inventory" />
          <SummaryCard label="RAG Fleet" value={metrics.rag} hint="Current operating vehicles" />
          <SummaryCard label="Wishlist" value={metrics.want} hint="Planned acquisitions" />
          <SummaryCard
            label="Restore Projects"
            value={metrics.restore}
            hint="Legacy builds in the cohort"
          />
        </section>

        <section className="mt-10 flex flex-wrap gap-3">
          {FILTER_OPTIONS.map((option) => {
            const isActive = activeFilter === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveFilter(option.value)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm uppercase tracking-[0.22em] transition backdrop-blur-md",
                  isActive
                    ? "border-white bg-white text-black"
                    : "border-white/10 bg-white/8 text-white/70 hover:border-white/30 hover:bg-white/12 hover:text-white"
                )}
              >
                {option.label}
              </button>
            )
          })}
        </section>

        <section className="mt-10 flex-1">
          {loading ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] px-8 py-16 text-center text-white/65 backdrop-blur-xl">
              Syncing fleet inventory from Firestore...
            </div>
          ) : error ? (
            <div className="rounded-[2rem] border border-rose-500/30 bg-rose-500/10 px-8 py-16 text-center text-rose-100 backdrop-blur-xl">
              {error}
            </div>
          ) : visibleVehicles.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] px-8 py-16 text-center text-white/65 backdrop-blur-xl">
              No vehicles match the current filter.
            </div>
          ) : (
            <motion.div layout className="grid gap-6 lg:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {visibleVehicles.map((vehicle, index) => (
                  <FleetVehicleCard key={vehicle.id} vehicle={vehicle} index={index} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </div>
    </div>
  )
}
