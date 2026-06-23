"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Globe, Briefcase } from "lucide-react"
import type { ClientDirectoryEntry, ModuleKey } from "@/lib/client-directory"
import { isVisible, resolveDisplayName } from "@/lib/types/client-public-profile"

const MODULE_LABELS: Record<ModuleKey, string> = {
  web: "Web",
  app: "App",
  rd: "R&D",
  housing: "Housing",
  transportation: "Transportation",
  insurance: "Insurance",
}

const MODULE_URL_FIELDS: Record<ModuleKey, keyof ClientDirectoryEntry> = {
  web: "websiteUrl",
  app: "appUrl",
  rd: "rdUrl",
  housing: "housingUrl",
  transportation: "transportationUrl",
  insurance: "insuranceUrl",
}

const MODULE_ORDER: ModuleKey[] = ["web", "app", "rd", "housing", "transportation", "insurance"]

/**
 * Resolve the best PUBLIC site URL for screenshots and the visit link.
 * Prefer a real website / custom domain over the immutable *.vercel.app
 * deployment URL, which is protected by Vercel Deployment Protection and
 * would screenshot the "Log in to Vercel" wall.
 */
function resolvePublicSiteUrl(entry: ClientDirectoryEntry): string | null {
  const domains = entry.vercelProjectDomains ?? []
  const customDomain = domains.find((d) => d && !d.endsWith(".vercel.app"))

  const candidates = [
    entry.websiteUrl,
    customDomain,
    ...domains,
    entry.deployUrl,
  ]

  const raw = candidates.find((value) => Boolean(value && value.trim()))
  if (!raw) return null

  const trimmed = raw.trim()
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** ReadyAimGo products a client is actively utilizing (enabled modules). */
function getProductsInUse(entry: ClientDirectoryEntry): ModuleKey[] {
  return MODULE_ORDER.filter((key) => {
    const module = entry.modules?.[key]
    if (module) return module.enabled
    // Legacy clients without a modules map: infer from the area URL fields.
    return Boolean(entry[MODULE_URL_FIELDS[key]])
  })
}

function screenshotUrl(siteUrl: string): string {
  return `https://api.microlink.io/?url=${encodeURIComponent(
    siteUrl,
  )}&screenshot=true&meta=false&embed=screenshot.url&colorScheme=light`
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "")
}

type ShowcaseClient = {
  entry: ClientDirectoryEntry
  siteUrl: string
}

export default function WorkPage() {
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const res = await fetch("/api/clients")
        const data = await res.json()
        if (!active) return
        if (data?.success === false) {
          setError("Unable to load the client directory right now.")
        }
        setClients(Array.isArray(data?.clients) ? data.clients : [])
      } catch (err) {
        if (active) setError("Unable to load the client directory right now.")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const showcase = useMemo<ShowcaseClient[]>(() => {
    return clients
      .filter((entry) => {
        // Respect explicit hides; otherwise show any client with a public site.
        if (entry.showOnFrontend === false) return false
        if (!isVisible(entry.publicProfile, "roster")) return false
        return Boolean(resolvePublicSiteUrl(entry))
      })
      .map((entry) => ({ entry, siteUrl: resolvePublicSiteUrl(entry) as string }))
      .sort((a, b) =>
        resolveDisplayName(a.entry.name, a.entry.publicProfile).localeCompare(
          resolveDisplayName(b.entry.name, b.entry.publicProfile),
        ),
      )
  }, [clients])

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {/* Header */}
        <header className="mb-10 sm:mb-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em] text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back home
          </Link>

          <h1 className="mt-6 text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl">
            Our Work
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-medium uppercase tracking-[0.16em] text-white/55">
            Client sites we&apos;ve built and the ReadyAimGo products powering them.
          </p>
        </header>

        {/* States */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="animate-pulse overflow-hidden border border-white/10 bg-white/[0.03]"
              >
                <div className="aspect-[16/10] w-full bg-white/[0.06]" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-2/3 rounded bg-white/10" />
                  <div className="h-3 w-full rounded bg-white/[0.07]" />
                  <div className="h-6 w-3/4 rounded bg-white/[0.07]" />
                </div>
              </div>
            ))}
          </div>
        ) : showcase.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-white/10 bg-white/[0.03] px-6 py-24 text-center">
            <Briefcase className="mb-4 h-12 w-12 text-white/30" />
            <p className="text-lg font-bold uppercase tracking-[0.16em] text-white/70">
              No client sites published yet
            </p>
            <p className="mt-2 max-w-md text-sm text-white/45">
              {error
                ? error
                : "Clients appear here once they have a public site and are flagged to show on the front end."}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-xs font-black uppercase tracking-[0.3em] text-orange-400">
              {showcase.length} {showcase.length === 1 ? "client" : "clients"}
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map(({ entry, siteUrl }) => {
                const name = resolveDisplayName(entry.name, entry.publicProfile)
                const tagline =
                  entry.publicProfile?.identity?.tagline ||
                  entry.publicProfile?.taxonomy?.industry ||
                  entry.pulseSummary ||
                  null
                const products = getProductsInUse(entry)

                return (
                  <article
                    key={entry.id}
                    className="group flex flex-col overflow-hidden border border-white/12 bg-white/[0.03] transition hover:border-white/30"
                  >
                    <a
                      href={siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative block aspect-[16/10] w-full overflow-hidden bg-neutral-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={screenshotUrl(siteUrl)}
                        alt={`${name} website preview`}
                        loading="lazy"
                        className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.03]"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                    </a>

                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="text-xl font-black uppercase leading-tight tracking-tight">
                        {name}
                      </h2>
                      {tagline ? (
                        <p className="mt-2 line-clamp-2 text-sm text-white/55">{tagline}</p>
                      ) : null}

                      {products.length > 0 ? (
                        <div className="mt-4">
                          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/40">
                            Products in use
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {products.map((key) => (
                              <span
                                key={key}
                                className="border border-orange-400/40 bg-orange-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-300"
                              >
                                {MODULE_LABELS[key]}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                        <a
                          href={siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:text-orange-300"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          {stripProtocol(siteUrl)}
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                        {entry.storyId ? (
                          <Link
                            href={`/story/${encodeURIComponent(entry.storyId)}/website`}
                            className="ml-auto text-xs font-black uppercase tracking-[0.16em] text-white/45 transition hover:text-white"
                          >
                            Story
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
