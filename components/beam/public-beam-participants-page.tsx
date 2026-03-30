"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  ClipboardList,
  Handshake,
  MonitorUp,
  Plus,
  Route,
  Search,
  Shield,
  Sparkles,
  Wrench,
} from "lucide-react"
import {
  PARTICIPANT_PATHWAYS,
  TRANSPORTATION_AREAS,
  deriveBeamParticipantRoles,
  deriveTransportationBridgeSignals,
  type DerivedBeamParticipantRole,
  type PublicPulseData,
} from "@/lib/beam-participants"
import { TRANSPORTATION_SITE_URL } from "@/lib/vehicle-inventory"
import { cn } from "@/lib/utils"

type RoleFilter = "all" | "urgent" | "business" | "transport"

const FILTER_OPTIONS: Array<{ value: RoleFilter; label: string }> = [
  { value: "all", label: "All Roles" },
  { value: "urgent", label: "Pulse Urgent" },
  { value: "business", label: "Business Lanes" },
  { value: "transport", label: "Bridge Roles" },
]

const DISPLAY_FONT = '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif'
const BODY_FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

const ROLE_ICON_MAP = {
  clipboard: ClipboardList,
  route: Route,
  monitor: MonitorUp,
  spark: Sparkles,
  handshake: Handshake,
  wrench: Wrench,
} as const

function formatTimeAgo(timestamp?: string) {
  if (!timestamp) return "Pending refresh"

  const now = new Date()
  const then = new Date(timestamp)
  const diffInMinutes = Math.floor((now.getTime() - then.getTime()) / (1000 * 60))

  if (Number.isNaN(diffInMinutes)) return "Pending refresh"
  if (diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  return `${Math.floor(diffInMinutes / 1440)}d ago`
}

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
    <div className="relative overflow-hidden rounded-[0.55rem] border border-white/12 bg-[#31446d]/74 px-5 py-4 shadow-[0_22px_64px_-42px_rgba(15,23,42,0.92)] backdrop-blur-sm">
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

function RoleCard({
  role,
  index,
}: {
  role: DerivedBeamParticipantRole
  index: number
}) {
  const Icon = ROLE_ICON_MAP[role.icon]

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{
        duration: 0.38,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.04,
        layout: { duration: 0.25 },
      }}
      className="group relative overflow-hidden rounded-[0.68rem] border border-white/12 bg-[#31446d]/76 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)] backdrop-blur-sm transition-colors hover:border-white/35"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(18,28,54,0.34)_58%,rgba(14,20,36,0.82)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_42%)]" />

      <div className="relative z-10 flex h-full min-h-[27rem] flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              className="text-[0.64rem] uppercase tracking-[0.32em] text-white/55"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
            >
              {role.lane}
            </div>
            <h2
              className="mt-4 max-w-[14rem] text-[2rem] uppercase leading-none text-white sm:text-[2.3rem]"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700, letterSpacing: "0.05em" }}
            >
              {role.title}
            </h2>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-[0.6rem] border border-white/14 bg-black/10 text-white/86">
              <Icon className="h-6 w-6" />
            </div>
            <div
              className={cn(
                "rounded-[0.38rem] border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.2em] backdrop-blur-sm",
                role.demand === "high"
                  ? "border-[#8ad8ff] bg-[#4dbdff]/18 text-[#dff6ff]"
                  : role.demand === "medium"
                    ? "border-[#ffdb92] bg-[#f4b35f]/18 text-[#ffe9b8]"
                    : "border-white/12 bg-white/[0.06] text-white/78"
              )}
            >
              {role.demandLabel}
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-white/78 sm:text-[0.96rem]">{role.focus}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {role.responsibilities.slice(0, 2).map((responsibility) => (
            <div
              key={responsibility}
              className="rounded-[0.5rem] border border-white/10 bg-black/10 px-4 py-3"
            >
              <div
                className="text-[0.58rem] uppercase tracking-[0.28em] text-white/45"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Needed For
              </div>
              <div className="mt-2 text-sm text-white/88">{responsibility}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[0.55rem] border border-white/10 bg-black/10 px-4 py-4">
          <div
            className="text-[0.6rem] uppercase tracking-[0.28em] text-white/45"
            style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
          >
            Pulse Readout
          </div>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            {role.whyNow.map((signal) => (
              <li key={signal} className="flex gap-2">
                <span className="mt-[0.42rem] h-1.5 w-1.5 rounded-full bg-[#8ad8ff]" />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto space-y-4 pt-5">
          <div className="flex flex-wrap gap-2">
            {role.transportAreas.map((area) => (
              <span
                key={area}
                className={cn(
                  "rounded-[0.35rem] border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.18em]",
                  role.track === "transport"
                    ? "border-[#ffb09a]/45 bg-[#df8063]/18 text-[#ffe0d5]"
                    : "border-white/10 bg-white/[0.05] text-white/74"
                )}
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                {area}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
            <div className="flex flex-wrap gap-2">
              {role.pathways.map((pathway) => (
                <span
                  key={pathway}
                  className="rounded-[0.35rem] border border-white/10 bg-black/10 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-white/74"
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                >
                  {pathway}
                </span>
              ))}
            </div>
            <div
              className="text-[0.64rem] uppercase tracking-[0.24em] text-white/48"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
            >
              {role.pulseMentions > 0 ? `${role.pulseMentions} pulse match${role.pulseMentions === 1 ? "" : "es"}` : "Core role lane"}
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

export function PublicBeamParticipantsPage() {
  const [pulseData, setPulseData] = useState<PublicPulseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<RoleFilter>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const deferredSearchTerm = useDeferredValue(searchTerm)

  useEffect(() => {
    let isActive = true

    const fetchPulse = async () => {
      try {
        const response = await fetch("/api/pulse", { cache: "no-store" })
        const data = (await response.json()) as PublicPulseData

        if (!isActive) return

        if (!response.ok) {
          setError(data.error || "Failed to load pulse")
        } else {
          setError(data.error || null)
        }

        setPulseData(data)
      } catch (fetchError) {
        if (!isActive) return
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load pulse")
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchPulse()
    const interval = window.setInterval(fetchPulse, 5 * 60 * 1000)

    return () => {
      isActive = false
      window.clearInterval(interval)
    }
  }, [])

  const roles = useMemo(() => deriveBeamParticipantRoles(pulseData), [pulseData])
  const bridgeSignals = useMemo(() => deriveTransportationBridgeSignals(pulseData), [pulseData])

  const visibleRoles = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase()

    return roles.filter((role) => {
      if (activeFilter === "urgent" && role.demand !== "high") {
        return false
      }

      if (activeFilter === "business" && role.track !== "business") {
        return false
      }

      if (activeFilter === "transport" && role.track === "business") {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [
        role.title,
        role.lane,
        role.focus,
        ...role.responsibilities,
        ...role.transportAreas,
        ...role.pathways,
        ...role.whyNow,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [activeFilter, deferredSearchTerm, roles])

  const metrics = useMemo(() => {
    const urgentRoles = roles.filter((role) => role.demand === "high").length
    const bridgeRoles = roles.filter((role) => role.track !== "business").length

    return {
      roles: roles.length,
      urgentRoles,
      pulseActions: pulseData?.actions?.length ?? 0,
      bridgeRoles,
    }
  }, [pulseData, roles])

  const topPriorities = pulseData?.priorities?.slice(0, 3) ?? []

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{ fontFamily: BODY_FONT, backgroundColor: "#5d73ad" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#8ba3d6_0%,#637db8_33%,#445888_72%,#314162_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_26%,rgba(15,23,42,0.24)_100%)]" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div className="absolute right-[-10rem] top-[10rem] h-[28rem] w-[28rem] rounded-full bg-[#d1d8f2]/18 blur-3xl" />
        <div className="absolute left-[-9rem] bottom-[-4rem] h-[24rem] w-[24rem] rounded-full bg-[#1b2542]/24 blur-3xl" />
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
              <div className="text-[0.58rem] uppercase tracking-[0.3em] text-[#4b5d8d]/80">
                BEAM Participants
              </div>
              <div
                className="mt-1 text-sm uppercase tracking-[0.18em]"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Staff Browse
              </div>
            </div>
            <Link
              href={TRANSPORTATION_SITE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-[0.45rem] border border-white/18 bg-[#203258]/75 px-4 py-3 text-white/90 backdrop-blur-sm transition hover:bg-[#1a2a49]"
            >
              <span
                className="text-[0.72rem] uppercase tracking-[0.22em]"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Transportation Bridge
              </span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <section className="grid gap-8 pb-8 pt-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-[0.45rem] border border-white/14 bg-[#203258]/45 px-4 py-2 text-[0.68rem] uppercase tracking-[0.28em] text-white/80 backdrop-blur-sm">
              <BriefcaseBusiness className="h-4 w-4" />
              Pulse-informed role browser
            </div>

            <div className="mt-8 max-w-5xl">
              <h1
                className="text-[clamp(4rem,10vw,6.7rem)] uppercase leading-none text-white"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700, letterSpacing: "0.08em" }}
              >
                Staff
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/78 sm:text-lg">
                Use this board to route community members, students, faculty, and entrepreneurs into the
                business participant roles ReadyAimGo needs right now. The role demand below is shaped by the
                built-in Pulse feed, then bridged into BEAM Transportation so fleet, sourcing, and repair work
                stay connected to the public business experience.
              </p>
            </div>
          </div>

          <div className="rounded-[0.8rem] border border-white/12 bg-[#31446d]/74 p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.92)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4">
              <div
                className="text-[0.64rem] uppercase tracking-[0.32em] text-white/55"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Pulse Readout
              </div>
              <div
                className={cn(
                  "rounded-[0.35rem] border px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.18em]",
                  error
                    ? "border-[#ffb09a]/45 bg-[#df8063]/18 text-[#ffe0d5]"
                    : "border-white/12 bg-white/[0.06] text-white/72"
                )}
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                {loading ? "Syncing" : error ? "Fallback mode" : "Live"}
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/82">
              {pulseData?.summary ||
                "Pulse is quiet right now, so this page is showing the standing participant roles that keep business and transportation work moving."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[0.55rem] border border-white/10 bg-black/10 px-4 py-3">
                <div
                  className="text-[0.58rem] uppercase tracking-[0.28em] text-white/45"
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                >
                  Events
                </div>
                <div className="mt-2 text-2xl text-white">{pulseData?.totalEvents ?? 0}</div>
              </div>
              <div className="rounded-[0.55rem] border border-white/10 bg-black/10 px-4 py-3">
                <div
                  className="text-[0.58rem] uppercase tracking-[0.28em] text-white/45"
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                >
                  Updated
                </div>
                <div className="mt-2 text-lg text-white">{formatTimeAgo(pulseData?.lastUpdated)}</div>
              </div>
            </div>

            <div className="mt-5">
              <div
                className="text-[0.58rem] uppercase tracking-[0.28em] text-white/45"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                What needs attention
              </div>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                {(topPriorities.length > 0
                  ? topPriorities
                  : [
                      "Keep a visible intake role for new participant and partner requests.",
                      "Maintain at least one bridge role for transportation-related business work.",
                      "Use the staff board as the routing layer between pulse activity and cohort delivery.",
                    ]
                ).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-[0.42rem] h-1.5 w-1.5 rounded-full bg-[#8ad8ff]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
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
                  placeholder="Filter roles, pathways, transport lanes..."
                  className="w-56 bg-transparent text-sm text-white outline-none placeholder:text-white/48 sm:w-80"
                />
              </label>

              <Link
                href={TRANSPORTATION_SITE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[0.35rem] border border-[#ffb09a] bg-[#df8063] px-4 py-2 text-white shadow-[0_18px_45px_-28px_rgba(223,128,99,0.9)] transition hover:bg-[#e58b6d]"
              >
                <Plus className="h-4 w-4" />
                <span
                  className="text-sm uppercase tracking-[0.18em]"
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                >
                  Open Transportation
                </span>
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Role Lanes"
              value={metrics.roles}
              hint="Standing participant lanes"
              accentClassName="bg-white/85"
            />
            <SummaryCard
              label="Pulse Urgent"
              value={metrics.urgentRoles}
              hint="Roles with strong live demand"
              accentClassName="bg-[#8ad8ff]"
            />
            <SummaryCard
              label="Live Actions"
              value={metrics.pulseActions}
              hint="Current pulse action count"
              accentClassName="bg-[#ffd791]"
            />
            <SummaryCard
              label="Bridge Roles"
              value={metrics.bridgeRoles}
              hint="Transportation-adjacent lanes"
              accentClassName="bg-[#ffb09a]"
            />
          </div>
        </section>

        <section className="mt-10 flex-1">
          {visibleRoles.length === 0 ? (
            <div className="rounded-[0.75rem] border border-white/12 bg-[#31446d]/68 px-8 py-16 text-center text-white/72 backdrop-blur-sm">
              No roles match the current filter.
            </div>
          ) : (
            <motion.div layout className="grid gap-5 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {visibleRoles.map((role, index) => (
                  <RoleCard key={role.id} role={role} index={index} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-[0.8rem] border border-white/12 bg-[#31446d]/74 p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.92)] backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div
                  className="text-[0.62rem] uppercase tracking-[0.3em] text-white/52"
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                >
                  Bridge To Transportation
                </div>
                <h2
                  className="mt-3 text-[2.35rem] uppercase leading-none text-white"
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700, letterSpacing: "0.05em" }}
                >
                  Move Community Forward
                </h2>
              </div>

              <Link
                href={TRANSPORTATION_SITE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[0.35rem] border border-white/14 bg-black/10 px-4 py-2 text-white/90 transition hover:bg-black/20"
              >
                <span
                  className="text-[0.68rem] uppercase tracking-[0.22em]"
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                >
                  Open Site
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/78 sm:text-[0.96rem]">
              BEAM Transportation is already framed around six delivery lanes, so this page treats staff
              roles as the intake layer for work that may need repair, build, restore, research, legal and
              insurance, or logistics and sourcing support.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {TRANSPORTATION_AREAS.map((area) => (
                <span
                  key={area}
                  className="rounded-[0.35rem] border border-[#ffb09a]/45 bg-[#df8063]/18 px-2.5 py-1 text-[0.64rem] uppercase tracking-[0.18em] text-[#ffe0d5]"
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                >
                  {area}
                </span>
              ))}
            </div>

            <div className="mt-6 rounded-[0.65rem] border border-white/10 bg-black/10 px-5 py-5">
              <div
                className="text-[0.58rem] uppercase tracking-[0.28em] text-white/45"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Bridge opportunities
              </div>
              <ul className="mt-3 space-y-2 text-sm text-white/80">
                {bridgeSignals.map((signal) => (
                  <li key={signal} className="flex gap-2">
                    <span className="mt-[0.42rem] h-1.5 w-1.5 rounded-full bg-[#ffb09a]" />
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-[0.8rem] border border-white/12 bg-[#31446d]/74 p-6 shadow-[0_30px_90px_-58px_rgba(15,23,42,0.92)] backdrop-blur-sm">
            <div
              className="text-[0.62rem] uppercase tracking-[0.3em] text-white/52"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
            >
              Participant Pathways
            </div>
            <h2
              className="mt-3 text-[2.35rem] uppercase leading-none text-white"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700, letterSpacing: "0.05em" }}
            >
              Who Can Plug In
            </h2>

            <div className="mt-6 grid gap-3">
              {PARTICIPANT_PATHWAYS.map((pathway) => (
                <div
                  key={pathway.title}
                  className="rounded-[0.62rem] border border-white/10 bg-black/10 px-4 py-4"
                >
                  <div
                    className="text-[0.68rem] uppercase tracking-[0.22em] text-[#8ad8ff]"
                    style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                  >
                    {pathway.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/78">{pathway.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <div
            className="text-[0.64rem] uppercase tracking-[0.3em] text-white/52"
            style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
          >
            Pulse refreshes every 5 minutes while transportation remains one click away
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link
              href={TRANSPORTATION_SITE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-white/78 transition hover:text-white"
            >
              <span
                className="text-[0.68rem] uppercase tracking-[0.24em]"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Go to transportation
              </span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
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
    </div>
  )
}
