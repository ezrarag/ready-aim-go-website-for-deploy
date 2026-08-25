"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ArrowUpRight, Globe, CheckCircle2, Clock, Circle, Building2, MapPin, Tag } from "lucide-react"
import { MODULE_LABELS, type PublicShowcaseClient, type ShowcaseStatus, slugify } from "@/lib/client-showcase"

function screenshotUrl(siteUrl: string): string {
  return `https://api.microlink.io/?url=${encodeURIComponent(
    siteUrl,
  )}&screenshot=true&meta=false&embed=screenshot.url&colorScheme=light`
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "")
}

const STATUS_BADGE_STYLE: Record<ShowcaseStatus, string> = {
  live: "bg-emerald-500 text-slate-950 font-bold",
  in_build: "bg-orange-500 text-slate-950 font-bold",
  ongoing: "bg-white text-slate-950 font-bold",
  discovery: "bg-purple-400 text-slate-950 font-bold",
}

const STATUS_LABELS: Record<ShowcaseStatus, string> = {
  live: "Live",
  in_build: "In Build",
  ongoing: "Ongoing",
  discovery: "Discovery",
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const rawParam = params?.slug as string | undefined
  const slugOrId = rawParam ? decodeURIComponent(rawParam) : ""

  const [clients, setClients] = useState<PublicShowcaseClient[]>([])
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const res = await fetch("/api/clients?public=1", { cache: "no-store" })
        const data = await res.json()
        if (!active) return
        setClients(Array.isArray(data?.clients) ? data.clients : [])
      } catch (err) {
        console.error("Failed to load showcase clients:", err)
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const project = useMemo(() => {
    if (!slugOrId) return null
    return (
      clients.find((c) => c.slug === slugOrId || c.id === slugOrId) ||
      clients.find((c) => slugify(c.name) === slugOrId) ||
      null
    )
  }, [clients, slugOrId])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse font-mono text-xs uppercase tracking-widest text-orange-400">
          Loading project details...
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black text-white px-5 py-20">
        <div className="mx-auto max-w-3xl text-center border border-white/10 bg-white/[0.03] p-12">
          <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-4">
            Project Not Found
          </h1>
          <p className="text-sm text-white/55 mb-8">
            The project &ldquo;{slugOrId}&rdquo; could not be found or is no longer listed in our public work index.
          </p>
          <Link
            href="/work"
            className="inline-flex items-center gap-2 border border-orange-400/50 bg-orange-400/10 px-5 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-orange-400 transition hover:bg-orange-400 hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to All Work
          </Link>
        </div>
      </div>
    )
  }

  const hasImage =
    !imgError &&
    (project.previewImageUrl || (project.siteUrl ? screenshotUrl(project.siteUrl) : null))

  // Fallback milestone data if not explicitly provided
  const milestones = project.milestones || [
    { label: "Requirements & Scope", status: "complete" as const },
    { label: "Prototype & Architecture", status: project.status === "live" ? ("complete" as const) : ("in_progress" as const) },
    { label: "Production & Launch", status: project.status === "live" ? ("complete" as const) : ("not_started" as const) },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Breadcrumb & Navigation */}
        <div className="mb-8">
          <Link
            href="/work"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em] text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All work
          </Link>
        </div>

        {/* Hero Header */}
        <header className="border-b border-white/10 pb-8 mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className={`inline-block px-3 py-1 font-mono text-xs uppercase tracking-[0.16em] ${
                STATUS_BADGE_STYLE[project.status]
              }`}
            >
              {STATUS_LABELS[project.status]}
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-white/45">
              {project.location || "Milwaukee, WI"}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black uppercase leading-[0.92] tracking-tight text-white">
            {project.name}
          </h1>

          {project.tagline ? (
            <p className="mt-4 max-w-3xl text-lg font-medium text-white/70 leading-relaxed">
              {project.tagline}
            </p>
          ) : null}
        </header>

        {/* 2-Column Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-10">
          {/* Main Column */}
          <div className="space-y-8">
            {/* Image / Screen Preview */}
            <div className="overflow-hidden border border-white/12 bg-neutral-900 aspect-[16/9] relative">
              {hasImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={project.previewImageUrl || (project.siteUrl ? screenshotUrl(project.siteUrl) : "")}
                  alt={`${project.name} preview`}
                  className="h-full w-full object-cover object-top"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="h-full w-full bg-[repeating-linear-gradient(45deg,#15171C_0_14px,#1b1e24_14px_28px)] flex items-center justify-center p-6 text-center">
                  <div>
                    <div className="font-mono text-xs uppercase tracking-[0.24em] text-orange-400 font-bold mb-2">
                      {STATUS_LABELS[project.status]}
                    </div>
                    <div className="font-mono text-xs uppercase tracking-[0.16em] text-white/40">
                      No external preview available
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Problem Section */}
            <section className="space-y-3">
              <div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                The Problem
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-white/80">
                {project.problem ||
                  `${project.name} needed an integrated solution to streamline operations, engage customers, and elevate their brand presence in the local market.`}
              </p>
            </section>

            {/* What We Built Section */}
            <section className="space-y-3 pt-4 border-t border-white/10">
              <div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-orange-400">
                What We Built
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-white/80">
                {project.whatWeBuilt ||
                  `We engineered a custom digital platform tailored to ${project.name}'s specific workflows, combining modern Web/App interfaces with robust backend automation and real-time analytics.`}
              </p>
            </section>

            {/* Tags */}
            {project.tags.length > 0 ? (
              <section className="pt-4 border-t border-white/10">
                <div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-3">
                  Scope &amp; Focus
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-mono uppercase tracking-[0.14em] text-white/80"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Products Involved */}
            <div className="border border-white/12 bg-white/[0.03] p-6 space-y-4">
              <div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/45">
                Products Involved
              </div>
              <div className="space-y-2">
                {project.products.map((key) => (
                  <div
                    key={key}
                    className="border border-orange-400/40 bg-orange-400/10 p-3.5 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-display font-black uppercase text-base text-white">
                        {MODULE_LABELS[key] || key}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-orange-400">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress / Milestones */}
            <div className="border border-white/12 bg-white/[0.03] p-6 space-y-4">
              <div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/45">
                Progress Milestones
              </div>
              <div className="space-y-3">
                {milestones.map((m, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-sm">
                    {m.status === "complete" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    ) : m.status === "in_progress" ? (
                      <Clock className="h-4 w-4 text-orange-400 mt-0.5 shrink-0 animate-pulse" />
                    ) : (
                      <Circle className="h-4 w-4 text-white/30 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className={`font-semibold ${m.status === "not_started" ? "text-white/40" : "text-white"}`}>
                        {m.label}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                        {m.status === "complete"
                          ? "Complete"
                          : m.status === "in_progress"
                          ? "In Progress"
                          : "Not Started"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Details Summary */}
            <div className="border border-white/12 bg-white/[0.03] p-6 space-y-3 font-mono text-xs uppercase tracking-wider text-white/70">
              <div className="font-bold text-white/45 text-[10px] tracking-[0.2em] mb-2">
                Project Details
              </div>
              {project.sector ? (
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/40">Sector</span>
                  <span className="text-white">{project.sector}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-white/40">Location</span>
                <span className="text-white">{project.location || "Milwaukee, WI"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Status</span>
                <span className="text-white">{STATUS_LABELS[project.status]}</span>
              </div>
            </div>

            {/* Action Link / Site Visit */}
            <div>
              {project.siteUrl ? (
                <a
                  href={project.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 border border-orange-400 bg-orange-400 px-6 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-orange-300"
                >
                  <Globe className="h-4 w-4" />
                  Visit Live Site
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              ) : (
                <div className="border border-dashed border-white/20 p-4 text-center text-xs font-mono uppercase tracking-wider text-white/45">
                  Internal / In-Build Project — No Public URL Yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
