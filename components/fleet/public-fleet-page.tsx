"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, ImageOff, Plus, Search, Shield, Wrench } from "lucide-react"
import { useFleetVehicles } from "@/hooks/use-fleet-vehicles"
import {
  FLEET_ANGLE_OPTIONS,
  buildImaginUrl,
  getFleetHealthMeta,
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

const DISPLAY_FONT = '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif'
const BODY_FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

function SummaryCard({
  label,
  value,
  hint,
  accentClassName,
}: {
  label: string
  value: number
  hint: string
  accentClassName: string
}) {
  return (
    <div className="relative overflow-hidden rounded-[0.55rem] border border-white/12 bg-[#2f416a]/70 px-5 py-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.9)] backdrop-blur-sm">
      <div className={cn("absolute left-0 top-0 h-full w-1.5", accentClassName)} />
      <div className="pl-3">
        <div
          className="text-[0.62rem] uppercase tracking-[0.32em] text-white/55"
          style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
        >
          {label}
        </div>
        <div
          className="mt-2 text-4xl leading-none text-white"
          style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
        >
          {value}
        </div>
        <div className="mt-2 text-sm text-white/68">{hint}</div>
      </div>
    </div>
  )
}

function FleetVehicleCard({ vehicle, index }: { vehicle: FleetVehicle; index: number }) {
  const [angle, setAngle] = useState<FleetAngle>("01")
  const [imageFailed, setImageFailed] = useState(false)
  const statusMeta = getFleetStatusMeta(vehicle.status)
  const healthMeta = getFleetHealthMeta(vehicle.healthStatus)
  const imageUrl = buildImaginUrl(vehicle.make, vehicle.model, vehicle.year, angle)
  const summaryText = vehicle.purpose || vehicle.notes || "No fleet notes added yet."

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
      className="group relative overflow-hidden rounded-[0.65rem] border border-white/12 bg-[#31446d]/76 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)] backdrop-blur-sm transition-colors hover:border-white/35"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(18,28,54,0.32)_62%,rgba(14,20,36,0.78)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_44%)]" />

      {imageFailed ? (
        <div className="absolute inset-y-8 right-6 flex w-[38%] items-center justify-center rounded-[0.55rem] border border-dashed border-white/12 bg-black/10 text-white/45">
          <div className="flex flex-col items-center text-center">
            <ImageOff className="h-10 w-10" />
            <p
              className="mt-3 text-[0.68rem] uppercase tracking-[0.22em]"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
            >
              Preview unavailable
            </p>
          </div>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          className="absolute bottom-0 right-[-3%] h-[74%] w-auto object-contain opacity-35 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-45"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      )}

      <div className="relative z-10 flex min-h-[21rem] flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className="text-[0.64rem] uppercase tracking-[0.32em] text-white/55"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
            >
              {vehicle.statusLabel} · {vehicle.year}
            </div>
            <h2
              className="mt-4 max-w-[13rem] text-[2.1rem] uppercase leading-none text-white sm:text-[2.4rem]"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700, letterSpacing: "0.05em" }}
            >
              {vehicle.make} {vehicle.model}
            </h2>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div
              className={cn(
                "rounded-[0.38rem] border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.2em] backdrop-blur-sm",
                statusMeta.pillClassName
              )}
            >
              {vehicle.statusLabel}
            </div>
            <div
              className={cn(
                "rounded-[0.38rem] border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.2em] backdrop-blur-sm",
                healthMeta.className
              )}
            >
              {healthMeta.label}
            </div>
          </div>
        </div>

        <p className="mt-5 max-w-[20rem] text-sm leading-6 text-white/78 sm:text-[0.96rem]">
          {summaryText}
        </p>

        <div className="mt-auto space-y-4 pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[0.5rem] border border-white/10 bg-black/10 px-4 py-3">
              <div
                className="text-[0.58rem] uppercase tracking-[0.28em] text-white/45"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Config
              </div>
              <div className="mt-2 text-sm text-white/88">{vehicle.config}</div>
            </div>
            <div className="rounded-[0.5rem] border border-white/10 bg-black/10 px-4 py-3">
              <div
                className="text-[0.58rem] uppercase tracking-[0.28em] text-white/45"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Engine
              </div>
              <div className="mt-2 text-sm text-white/88">{vehicle.engine}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-4">
            <div className="flex flex-wrap gap-2">
              <span
                className="rounded-[0.35rem] border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-white/74"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Payload {vehicle.payload}
              </span>
              <span
                className="rounded-[0.35rem] border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-white/74"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Plate {vehicle.licensePlate || "TBD"}
              </span>
              <span
                className="rounded-[0.35rem] border border-orange-300/30 bg-orange-300/10 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em] text-orange-100"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                {vehicle.priceRange}
              </span>
            </div>

            <div className="flex gap-1 rounded-[0.42rem] border border-white/10 bg-[#24345a]/80 p-1 backdrop-blur-sm">
              {FLEET_ANGLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAngle(option.value)}
                  className={cn(
                    "rounded-[0.28rem] px-2.5 py-1.5 text-[0.6rem] uppercase tracking-[0.18em] transition",
                    angle === option.value
                      ? "bg-white text-[#223255]"
                      : "text-white/68 hover:bg-white/10 hover:text-white"
                  )}
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

export function PublicFleetPage() {
  const { vehicles, loading, error } = useFleetVehicles()
  const [activeFilter, setActiveFilter] = useState<FleetFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")

  const visibleVehicles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return vehicles.filter((vehicle) => {
      if (activeFilter !== "all" && vehicle.status !== activeFilter) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [
        vehicle.make,
        vehicle.model,
        vehicle.config,
        vehicle.engine,
        vehicle.payload,
        vehicle.priceRange,
        vehicle.statusLabel,
        vehicle.purpose,
        vehicle.notes,
        vehicle.licensePlate,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [activeFilter, searchTerm, vehicles])

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
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{ fontFamily: BODY_FONT, backgroundColor: "#5d73ad" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#8ba3d6_0%,#637db8_34%,#445888_72%,#314162_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_26%,rgba(15,23,42,0.22)_100%)]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div className="absolute right-[-12rem] top-[12rem] h-[28rem] w-[28rem] rounded-full bg-[#d1d8f2]/15 blur-3xl" />
        <div className="absolute left-[-10rem] bottom-[-4rem] h-[22rem] w-[22rem] rounded-full bg-[#1b2542]/22 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[90rem] flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <Link
            href="/business"
            className="inline-flex items-center gap-3 rounded-[0.45rem] border border-white/20 bg-[#f3f5ff]/78 px-4 py-3 text-[#26365d] shadow-[0_18px_45px_-28px_rgba(15,23,42,0.65)] transition hover:bg-white"
          >
            <Shield className="h-4 w-4" />
            <span
              className="text-[0.72rem] uppercase tracking-[0.28em]"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
            >
              ReadyAimGo Ops
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-[0.45rem] border border-white/20 bg-[#f3f5ff]/78 px-4 py-3 text-[#26365d] shadow-[0_18px_45px_-28px_rgba(15,23,42,0.65)]">
              <div className="text-[0.58rem] uppercase tracking-[0.3em] text-[#4b5d8d]/80">BEAM Transportation</div>
              <div
                className="mt-1 text-sm uppercase tracking-[0.18em]"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Fleet Browse
              </div>
            </div>
            <Link
              href="/dashboard/transportation"
              className="inline-flex items-center gap-2 rounded-[0.45rem] border border-white/18 bg-[#203258]/75 px-4 py-3 text-white/90 backdrop-blur-sm transition hover:bg-[#1a2a49]"
            >
              <span
                className="text-[0.72rem] uppercase tracking-[0.22em]"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Admin Fleet
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <section className="pb-8 pt-14 sm:pt-16">
          <div className="inline-flex items-center gap-2 rounded-[0.45rem] border border-white/14 bg-[#203258]/45 px-4 py-2 text-[0.68rem] uppercase tracking-[0.28em] text-white/80 backdrop-blur-sm">
            <Wrench className="h-4 w-4" />
            Live cohort directory
          </div>

          <div className="mt-8 max-w-5xl">
            <h1
              className="text-[clamp(4.2rem,10vw,6.8rem)] uppercase leading-none text-white"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700, letterSpacing: "0.08em" }}
            >
              Browse
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/78 sm:text-lg">
              Browse live fleet vehicles, wishlist targets, and restore builds maintained by the
              BEAM Transportation cohort for ReadyAimGo&apos;s operations network.
            </p>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTER_OPTIONS.map((option) => {
                const isActive = activeFilter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActiveFilter(option.value)}
                    className={cn(
                      "rounded-[0.35rem] border px-4 py-2 text-sm uppercase tracking-[0.18em] transition backdrop-blur-sm",
                      isActive
                        ? "border-[#8ad8ff] bg-[#4dbdff]/85 text-white shadow-[0_0_28px_rgba(77,189,255,0.35)]"
                        : "border-white/10 bg-[#24365d]/72 text-white/72 hover:border-white/28 hover:bg-[#2a3d67] hover:text-white"
                    )}
                    style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-[0.35rem] border border-white/14 bg-[#ecf1ff]/14 px-3 py-2 text-white/82 backdrop-blur-sm">
                <Search className="h-4 w-4 text-white/68" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Filter fleet, wishlist, restores..."
                  className="w-56 bg-transparent text-sm text-white outline-none placeholder:text-white/48 sm:w-72"
                />
              </label>

              <Link
                href="/dashboard/transportation/add-vehicle"
                className="inline-flex items-center gap-2 rounded-[0.35rem] border border-[#ffb09a] bg-[#df8063] px-4 py-2 text-white shadow-[0_18px_45px_-28px_rgba(223,128,99,0.9)] transition hover:bg-[#e58b6d]"
              >
                <Plus className="h-4 w-4" />
                <span
                  className="text-sm uppercase tracking-[0.18em]"
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                >
                  Create
                </span>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total Vehicles"
              value={metrics.total}
              hint="Active public inventory"
              accentClassName="bg-white/85"
            />
            <SummaryCard
              label="RAG Fleet"
              value={metrics.rag}
              hint="Current operating vehicles"
              accentClassName="bg-emerald-300"
            />
            <SummaryCard
              label="Wishlist"
              value={metrics.want}
              hint="Planned acquisitions"
              accentClassName="bg-amber-300"
            />
            <SummaryCard
              label="Restore"
              value={metrics.restore}
              hint="Legacy builds in the cohort"
              accentClassName="bg-sky-300"
            />
          </div>
        </section>

        <section className="mt-10 flex-1">
          {loading ? (
            <div className="rounded-[0.75rem] border border-white/12 bg-[#31446d]/68 px-8 py-16 text-center text-white/72 backdrop-blur-sm">
              Syncing fleet inventory from Firestore...
            </div>
          ) : error ? (
            <div className="rounded-[0.75rem] border border-rose-400/30 bg-rose-500/10 px-8 py-16 text-center text-rose-100 backdrop-blur-sm">
              {error}
            </div>
          ) : visibleVehicles.length === 0 ? (
            <div className="rounded-[0.75rem] border border-white/12 bg-[#31446d]/68 px-8 py-16 text-center text-white/72 backdrop-blur-sm">
              No vehicles match the current filter.
            </div>
          ) : (
            <motion.div layout className="grid gap-5 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {visibleVehicles.map((vehicle, index) => (
                  <FleetVehicleCard key={vehicle.id} vehicle={vehicle} index={index} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <div
            className="text-[0.64rem] uppercase tracking-[0.3em] text-white/52"
            style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
          >
            Auto-refreshes every 15 seconds from Firestore
          </div>
          <Link
            href="/business"
            className="inline-flex items-center gap-2 text-white/78 transition hover:text-white"
          >
            <span
              className="text-[0.68rem] uppercase tracking-[0.24em]"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
            >
              Return to business
            </span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
