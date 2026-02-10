"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, Globe, Smartphone, ExternalLink, Mail, FileVideo } from "lucide-react"
import type { ClientDirectoryEntry, ClientUpdate } from "@/lib/client-directory"

const VALID_CATEGORIES = ["website", "app", "rd", "housing", "transportation", "insurance"] as const
type CategorySlug = (typeof VALID_CATEGORIES)[number]

const CATEGORY_DISPLAY: Record<CategorySlug, string> = {
  website: "Website",
  app: "App",
  rd: "R/D",
  housing: "Housing",
  transportation: "Transportation",
  insurance: "Insurance",
}

/** Map URL category slug to API type (ModuleKey). */
const CATEGORY_TO_TYPE: Record<CategorySlug, string> = {
  website: "web",
  app: "app",
  rd: "rd",
  housing: "housing",
  transportation: "transportation",
  insurance: "insurance",
}

function isCategorySlug(s: string): s is CategorySlug {
  return VALID_CATEGORIES.includes(s as CategorySlug)
}

function formatUpdateDate(createdAt: string): string {
  try {
    const d = new Date(createdAt)
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString(undefined, { dateStyle: "medium" }) : createdAt
  } catch {
    return createdAt
  }
}

export default function StoryCategoryPage() {
  const params = useParams()
  const router = useRouter()
  const storyId = params.storyId as string
  const categoryParam = params.category as string
  const category = isCategorySlug(categoryParam) ? categoryParam : "website"

  const [client, setClient] = useState<ClientDirectoryEntry | null>(null)
  const [updates, setUpdates] = useState<ClientUpdate[]>([])
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (params.category && !isCategorySlug(params.category as string)) {
      router.replace(`/story/${storyId}/website`)
      return
    }
  }, [params.category, storyId, router])

  useEffect(() => {
    if (!storyId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    fetch(`/api/clients/${encodeURIComponent(storyId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data?.success && data?.client) {
          setClient(data.client)
        } else {
          setNotFound(true)
          setClient(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true)
          setClient(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [storyId])

  useEffect(() => {
    if (!storyId || !isCategorySlug(category)) {
      setUpdates([])
      return
    }
    const type = CATEGORY_TO_TYPE[category]
    let cancelled = false
    setUpdatesLoading(true)
    fetch(
      `/api/clients/${encodeURIComponent(storyId)}/updates?type=${encodeURIComponent(type)}&status=published&limit=10`
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data?.success && Array.isArray(data.updates)) {
          setUpdates(data.updates)
        } else {
          setUpdates([])
        }
      })
      .catch(() => {
        if (!cancelled) setUpdates([])
      })
      .finally(() => {
        if (!cancelled) setUpdatesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [storyId, category])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <p className="text-white/60">Loading…</p>
      </div>
    )
  }

  if (notFound || !client) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-white/80">Client not found.</p>
        <Link
          href="/"
          className="text-orange-500 hover:text-orange-400 font-medium flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>
    )
  }

  const clientName = client.name ?? "Client"
  const categoryName = CATEGORY_DISPLAY[category]
  const hasWebsite = Boolean(client.websiteUrl?.trim())
  const hasApp = Boolean(client.appUrl?.trim() || client.appStoreUrl?.trim())
  const showWebsitePreview = category === "website" && hasWebsite && client.websiteUrl

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white font-medium text-sm mb-8 transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Header: Client + Category */}
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            {clientName}
          </h1>
          <p className="text-orange-500 font-semibold uppercase tracking-wide mt-2">
            {categoryName}
          </p>
        </header>

        {/* Website live preview + Visit link (only when category is website and URL is set) */}
        {showWebsitePreview && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-500" />
              Live preview
            </h2>
            <a
              href={client.websiteUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden border border-white/10 bg-neutral-900/80 hover:border-orange-500/50 transition-colors"
            >
              <img
                src={`https://api.microlink.io/?url=${encodeURIComponent(client.websiteUrl!)}&screenshot=true&meta=false&embed=screenshot.url&colorScheme=light`}
                alt={`Preview of ${clientName} website`}
                className="w-full h-auto max-h-[420px] object-cover object-top"
                onError={(e) => {
                  const el = e.target as HTMLImageElement
                  el.style.display = "none"
                  const wrap = el.closest("a")
                  if (wrap) {
                    const fallback = document.createElement("div")
                    fallback.className = "py-16 text-center text-white/60 text-sm"
                    fallback.textContent = "Preview unavailable — click to visit site"
                    wrap.appendChild(fallback)
                  }
                }}
              />
            </a>
            <a
              href={client.websiteUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              <Globe className="w-4 h-4" />
              Visit Website
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </section>
        )}

        {/* Build Updates (from Firestore) */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileVideo className="w-5 h-5 text-orange-500" />
            Build Updates
          </h2>
          {updatesLoading ? (
            <p className="text-white/50 text-sm">Loading updates…</p>
          ) : updates.length > 0 ? (
            <ul className="space-y-3">
              {updates.map((update) => (
                <li
                  key={update.id}
                  className="bg-neutral-900/80 border border-white/10 rounded-lg p-4"
                >
                  <div className="font-medium text-white">{update.title}</div>
                  {(update.body ?? update.summary ?? update.details) && (
                    <p className="text-white/70 text-sm mt-1 whitespace-pre-wrap">
                      {update.body ?? update.summary ?? update.details}
                    </p>
                  )}
                  <p className="text-white/50 text-xs mt-2">
                    {formatUpdateDate(update.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-white/50 text-sm">No updates yet.</p>
          )}
        </section>

        {/* CTAs */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Get started</h2>
          <div className="flex flex-wrap gap-3">
            {hasWebsite && (
              <a
                href={client.websiteUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                <Globe className="w-4 h-4" />
                Visit Website
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {hasApp && (
              <a
                href={client.appStoreUrl?.trim() || client.appUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                View App
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-5 py-2.5 rounded-lg border border-white/20 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact / Get Started
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
