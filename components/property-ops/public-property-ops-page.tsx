"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  Building2,
  Home,
  Search,
  Shield,
  Sprout,
} from "lucide-react"
import { AdminPropertyOpsSection } from "@/components/property-ops/admin-property-ops-section"
import { PropertyOpsCard } from "@/components/property-ops/property-ops-card"
import { useRAGProperties } from "@/hooks/use-rag-properties"
import { useUserWithRole } from "@/hooks/use-user-with-role"
import {
  getPropertyClassMeta,
  getPropertyStatusMeta,
  type RAGPropertySummary,
} from "@/lib/rag-properties"
import { cn } from "@/lib/utils"

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

function GatedAdminNotice({
  loading,
  isAdmin,
}: {
  loading: boolean
  isAdmin: boolean
}) {
  if (loading) {
    return (
      <div className="rounded-[0.75rem] border border-white/12 bg-[#31446d]/68 px-8 py-16 text-center text-white/72 backdrop-blur-sm">
        Checking admin access...
      </div>
    )
  }

  if (isAdmin) {
    return null
  }

  return (
    <div className="rounded-[0.75rem] border border-white/12 bg-[#31446d]/68 p-8 text-white/82 backdrop-blur-sm">
      <div className="inline-flex items-center gap-2 rounded-[0.45rem] border border-white/14 bg-[#203258]/45 px-4 py-2 text-[0.68rem] uppercase tracking-[0.28em] text-white/80 backdrop-blur-sm">
        <Home className="h-4 w-4" />
        Admin gate
      </div>
      <h2
        className="mt-5 text-[1.9rem] uppercase leading-none text-white"
        style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
      >
        Property Admin
      </h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72 sm:text-base">
        Property admin controls only render for signed-in users whose Firestore user profile is
        marked with the admin role. Public visitors can browse the portfolio without access to
        editing, NGO linking, or Grounds sync.
      </p>
      <div className="mt-6">
        <Link
          href="/login?redirect=/property-ops"
          className="inline-flex items-center gap-2 rounded-[0.42rem] border border-[#ffb09a] bg-[#df8063] px-4 py-2 text-white shadow-[0_18px_45px_-28px_rgba(223,128,99,0.9)] transition hover:bg-[#e58b6d]"
        >
          <span
            className="text-sm uppercase tracking-[0.18em]"
            style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
          >
            Sign in for admin
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

export function PublicPropertyOpsPage() {
  const galleryRef = useRef<HTMLElement | null>(null)
  const { properties, summary, loading, error } = useRAGProperties()
  const { session, loading: authLoading } = useUserWithRole()
  const [propertyClassFilter, setPropertyClassFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [nodeFilter, setNodeFilter] = useState("all")
  const [beamLinkedOnly, setBeamLinkedOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const isAdmin = session?.profile?.role === "admin"
  const actorId = session?.user.id || ""
  const actorLabel =
    session?.email || session?.full_name || session?.profile?.email || session?.user.id || ""

  const classOptions = useMemo(
    () =>
      Array.from(new Set(properties.map((property) => property.propertyClass)))
        .map((value) => ({
          value,
          label: getPropertyClassMeta(value).label,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [properties]
  )

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(properties.map((property) => property.status)))
        .map((value) => ({
          value,
          label: getPropertyStatusMeta(value).label,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [properties]
  )

  const nodeOptions = useMemo(
    () => Array.from(new Set(properties.map((property) => property.node))).sort(),
    [properties]
  )

  const visibleProperties = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return properties.filter((property) => {
      if (propertyClassFilter !== "all" && property.propertyClass !== propertyClassFilter) {
        return false
      }

      if (statusFilter !== "all" && property.status !== statusFilter) {
        return false
      }

      if (nodeFilter !== "all" && property.node !== nodeFilter) {
        return false
      }

      if (beamLinkedOnly && property.ngoLinks.length === 0) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return [
        property.publicName,
        property.publicSummary,
        property.node,
        property.city,
        property.state,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    })
  }, [beamLinkedOnly, nodeFilter, properties, propertyClassFilter, searchTerm, statusFilter])

  const metrics: RAGPropertySummary = summary

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
              <div className="text-[0.58rem] uppercase tracking-[0.3em] text-[#4b5d8d]/80">
                BEAM Grounds
              </div>
              <div
                className="mt-1 text-sm uppercase tracking-[0.18em]"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Property Browse
              </div>
            </div>
            <Link
              href="#admin"
              className="inline-flex items-center gap-2 rounded-[0.45rem] border border-white/18 bg-[#203258]/75 px-4 py-3 text-white/90 backdrop-blur-sm transition hover:bg-[#1a2a49]"
            >
              <span
                className="text-[0.72rem] uppercase tracking-[0.22em]"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Admin Property Ops
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <section className="pb-8 pt-14 sm:pt-16">
          <div className="inline-flex items-center gap-2 rounded-[0.45rem] border border-white/14 bg-[#203258]/45 px-4 py-2 text-[0.68rem] uppercase tracking-[0.28em] text-white/80 backdrop-blur-sm">
            <Sprout className="h-4 w-4" />
            Property Ops
          </div>

          <div className="mt-8 max-w-5xl">
            <h1
              className="text-[clamp(3.4rem,8vw,5.8rem)] uppercase leading-none text-white"
              style={{
                fontFamily: DISPLAY_FONT,
                fontStyle: "italic",
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              RAG Property Portfolio
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/78 sm:text-lg">
              ReadyAimGo manages commercial, hospitality, and civic real estate for clients and
              provides BEAM Grounds cohort participants with a real working portfolio.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => galleryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex items-center gap-2 rounded-[0.42rem] border border-[#ffb09a] bg-[#df8063] px-4 py-2 text-white shadow-[0_18px_45px_-28px_rgba(223,128,99,0.9)] transition hover:bg-[#e58b6d]"
              >
                <span
                  className="text-sm uppercase tracking-[0.18em]"
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                >
                  Explore portfolio
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-[0.42rem] border border-white/18 bg-[#203258]/75 px-4 py-2 text-white/90 backdrop-blur-sm transition hover:bg-[#1a2a49]"
              >
                <span
                  className="text-sm uppercase tracking-[0.18em]"
                  style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
                >
                  Connect your property
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total Properties"
              value={metrics.total}
              hint="Live portfolio records"
              accentClassName="bg-white/85"
            />
            <SummaryCard
              label="Active"
              value={metrics.active}
              hint="Current managed sites"
              accentClassName="bg-emerald-300"
            />
            <SummaryCard
              label="In Renovation"
              value={metrics.inRenovation}
              hint="Remake and repositioning work"
              accentClassName="bg-amber-300"
            />
            <SummaryCard
              label="BEAM-Linked"
              value={metrics.beamLinked}
              hint="NGO-linked properties"
              accentClassName="bg-sky-300"
            />
          </div>
        </section>

        <section ref={galleryRef} className="mt-10 space-y-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex flex-col gap-2 rounded-[0.35rem] border border-white/14 bg-[#ecf1ff]/14 px-3 py-2 text-white/82 backdrop-blur-sm">
                <span className="text-[0.58rem] uppercase tracking-[0.22em] text-white/56">
                  Property class
                </span>
                <select
                  value={propertyClassFilter}
                  onChange={(event) => setPropertyClassFilter(event.target.value)}
                  className="bg-transparent text-sm text-white outline-none"
                >
                  <option value="all" className="text-black">
                    All classes
                  </option>
                  {classOptions.map((option) => (
                    <option key={option.value} value={option.value} className="text-black">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 rounded-[0.35rem] border border-white/14 bg-[#ecf1ff]/14 px-3 py-2 text-white/82 backdrop-blur-sm">
                <span className="text-[0.58rem] uppercase tracking-[0.22em] text-white/56">
                  Status
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="bg-transparent text-sm text-white outline-none"
                >
                  <option value="all" className="text-black">
                    All statuses
                  </option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value} className="text-black">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 rounded-[0.35rem] border border-white/14 bg-[#ecf1ff]/14 px-3 py-2 text-white/82 backdrop-blur-sm">
                <span className="text-[0.58rem] uppercase tracking-[0.22em] text-white/56">
                  Node / city
                </span>
                <select
                  value={nodeFilter}
                  onChange={(event) => setNodeFilter(event.target.value)}
                  className="bg-transparent text-sm text-white outline-none"
                >
                  <option value="all" className="text-black">
                    All nodes
                  </option>
                  {nodeOptions.map((option) => (
                    <option key={option} value={option} className="text-black">
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => setBeamLinkedOnly((current) => !current)}
                className={cn(
                  "rounded-[0.35rem] border px-4 py-2 text-sm uppercase tracking-[0.18em] transition backdrop-blur-sm",
                  beamLinkedOnly
                    ? "border-[#8ad8ff] bg-[#4dbdff]/85 text-white shadow-[0_0_28px_rgba(77,189,255,0.35)]"
                    : "border-white/10 bg-[#24365d]/72 text-white/72 hover:border-white/28 hover:bg-[#2a3d67] hover:text-white"
                )}
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                {beamLinkedOnly ? "BEAM-linked only" : "Show BEAM-linked"}
              </button>
            </div>

            <label className="flex items-center gap-2 rounded-[0.35rem] border border-white/14 bg-[#ecf1ff]/14 px-3 py-2 text-white/82 backdrop-blur-sm">
              <Search className="h-4 w-4 text-white/68" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Filter properties, nodes, cities..."
                className="w-56 bg-transparent text-sm text-white outline-none placeholder:text-white/48 sm:w-72"
              />
            </label>
          </div>

          {loading ? (
            <div className="rounded-[0.75rem] border border-white/12 bg-[#31446d]/68 px-8 py-16 text-center text-white/72 backdrop-blur-sm">
              Syncing property portfolio from Firestore...
            </div>
          ) : error ? (
            <div className="rounded-[0.75rem] border border-rose-400/30 bg-rose-500/10 px-8 py-16 text-center text-rose-100 backdrop-blur-sm">
              {error}
            </div>
          ) : visibleProperties.length === 0 ? (
            <div className="rounded-[0.75rem] border border-white/12 bg-[#31446d]/68 px-8 py-16 text-center text-white/72 backdrop-blur-sm">
              No properties match the current filter.
            </div>
          ) : (
            <motion.div layout className="grid gap-5 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {visibleProperties.map((property, index) => (
                  <PropertyOpsCard key={property.id} property={property} index={index} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        <section id="admin" className="mt-14 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-[0.45rem] border border-white/14 bg-[#203258]/45 px-4 py-2 text-[0.68rem] uppercase tracking-[0.28em] text-white/80 backdrop-blur-sm">
            <Building2 className="h-4 w-4" />
            Admin surface
          </div>

          {isAdmin ? (
            <div className="rounded-[0.85rem] border border-white/12 bg-white px-4 py-6 text-slate-950 shadow-[0_32px_90px_-60px_rgba(15,23,42,0.8)] sm:px-6">
              <AdminPropertyOpsSection actorId={actorId} actorLabel={actorLabel} />
            </div>
          ) : (
            <GatedAdminNotice loading={authLoading} isAdmin={isAdmin} />
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
