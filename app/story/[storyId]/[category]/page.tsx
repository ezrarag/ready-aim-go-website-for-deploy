"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, Globe, Smartphone, ExternalLink, Mail, FileVideo, Users, TrendingUp, CheckCircle } from "lucide-react"
import type { ClientDirectoryEntry, ClientUpdate } from "@/lib/client-directory"
import {
  isVisible,
  resolveDisplayName,
  formatCentPrice,
  computePlatformTenure,
} from "@/lib/types/client-public-profile"
import type { PublicGrowth, PublicPricingTier, PublicPerson, PublicService, PublicProduct } from "@/lib/types/client-public-profile"

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

  const pp = client.publicProfile
  const clientName = resolveDisplayName(client.name ?? "Client", pp)
  const categoryName = CATEGORY_DISPLAY[category]
  const hasWebsite = Boolean(client.websiteUrl?.trim())
  const hasApp = Boolean(client.appUrl?.trim() || client.appStoreUrl?.trim())
  const showWebsitePreview = category === "website" && hasWebsite && client.websiteUrl

  // publicProfile-driven display values (all with fallbacks)
  const bio = pp?.identity?.bio
  const tagline = pp?.identity?.tagline
  const industry = pp?.taxonomy?.industry
  const taxonomyPills = [
    ...(industry ? [industry] : []),
    ...(pp?.taxonomy?.services ?? []).slice(0, 4),
  ]

  // Category-aware filters — show services/products relevant to this story area
  const moduleKey = CATEGORY_TO_TYPE[category] // e.g. "web", "transportation"
  const services: PublicService[] = isVisible(pp, "services")
    ? (pp?.services ?? []).filter(
        (s) => s.available && (!s.category || s.category === moduleKey || s.category === category)
      )
    : []
  const products: PublicProduct[] = isVisible(pp, "products")
    ? (pp?.products ?? []).filter((p) => p.available)
    : []
  const pricing: PublicPricingTier[] = isVisible(pp, "pricing") ? (pp?.pricing ?? []) : []
  const people: PublicPerson[] = isVisible(pp, "people") ? (pp?.people ?? []) : []

  // Growth stats bar
  const growth: PublicGrowth | undefined = pp?.growth
  type GrowthStat = { label: string; value: string | number }
  const growthStats: GrowthStat[] = []
  if (growth) {
    if (growth.projectsCompleted !== undefined) growthStats.push({ label: "Projects completed", value: growth.projectsCompleted })
    if (growth.activeProjects !== undefined) growthStats.push({ label: "Active projects", value: growth.activeProjects })
    if (growth.activeFleetSize !== undefined) growthStats.push({ label: "Fleet size", value: growth.activeFleetSize })
    if (growth.propertiesManaged !== undefined) growthStats.push({ label: "Properties", value: growth.propertiesManaged })
    if (growth.updatesPublished !== undefined) growthStats.push({ label: "Updates published", value: growth.updatesPublished })
    if (growth.beamParticipantsSupported !== undefined) growthStats.push({ label: "BEAM supported", value: growth.beamParticipantsSupported })
    const tenure = computePlatformTenure(growth.platformTenureStart)
    if (tenure) growthStats.push({ label: "On platform", value: tenure })
  }

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
          {/* Tagline from publicProfile.identity */}
          {tagline && (
            <p className="text-white/60 text-base mt-2 leading-relaxed">{tagline}</p>
          )}
          {/* Taxonomy pills */}
          {taxonomyPills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {taxonomyPills.map((pill) => (
                <span
                  key={pill}
                  className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 text-xs font-medium uppercase tracking-wide"
                >
                  {pill}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Bio from publicProfile.identity — shown when present */}
        {bio && (
          <section className="mb-10 prose prose-invert prose-sm max-w-none">
            <p className="text-white/75 text-base leading-relaxed whitespace-pre-wrap">{bio}</p>
          </section>
        )}

        {/* Growth indicators bar — shown when publicProfile.growth has data */}
        {growthStats.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Growth
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {growthStats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-neutral-900/80 border border-white/10 rounded-lg p-3 text-center"
                >
                  <p className="text-xl md:text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/50 mt-0.5 uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

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

        {/* Services — from publicProfile.services filtered to this category */}
        {services.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-orange-500" />
              Services
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((svc) => (
                <li
                  key={svc.id}
                  className="bg-neutral-900/80 border border-white/10 rounded-lg p-4"
                >
                  <p className="font-semibold text-white">{svc.title}</p>
                  <p className="text-white/60 text-sm mt-1">{svc.description}</p>
                  {svc.priceHint && (
                    <p className="text-orange-400 text-xs font-medium mt-2">{svc.priceHint}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Pricing tiers — from publicProfile.pricing */}
        {pricing.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">Pricing</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {pricing.map((tier) => (
                <div
                  key={tier.id}
                  className={`relative bg-neutral-900/80 border rounded-lg p-5 flex flex-col ${
                    tier.highlight ? "border-orange-500" : "border-white/10"
                  }`}
                >
                  {tier.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wide">
                      Popular
                    </span>
                  )}
                  <p className="font-bold text-white text-lg">{tier.name}</p>
                  <p className="text-orange-400 font-semibold mt-1">
                    {formatCentPrice(tier.priceMonthly)}
                    {tier.priceMonthly ? <span className="text-white/40 text-xs font-normal"> / mo</span> : null}
                  </p>
                  <p className="text-white/60 text-sm mt-2 flex-1">{tier.description}</p>
                  {tier.features.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-white/70 text-sm">
                          <CheckCircle className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {tier.ctaLabel && tier.ctaUrl && (
                    <a
                      href={tier.ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 block text-center bg-orange-600 hover:bg-orange-500 text-white font-medium py-2 rounded-lg text-sm transition-colors"
                    >
                      {tier.ctaLabel}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Products / marketplace cards — from publicProfile.products */}
        {products.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-neutral-900/80 border border-white/10 rounded-lg overflow-hidden flex flex-col"
                >
                  {prod.imageUrl && (
                    <img
                      src={prod.imageUrl}
                      alt={prod.title}
                      className="w-full h-40 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  )}
                  <div className="p-4 flex flex-col flex-1">
                    <p className="font-semibold text-white">{prod.title}</p>
                    <p className="text-white/60 text-sm mt-1 flex-1">{prod.description}</p>
                    {prod.price !== undefined && (
                      <p className="text-orange-400 font-semibold mt-2">
                        {formatCentPrice(prod.price)}
                      </p>
                    )}
                    {prod.purchaseUrl && (
                      <a
                        href={prod.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 text-center bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 rounded-lg transition-colors border border-white/20"
                      >
                        Get it <ExternalLink className="inline w-3 h-3 ml-1" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Team bios — from publicProfile.people */}
        {people.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              Team
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {people.map((person) => (
                <div
                  key={person.id}
                  className="bg-neutral-900/80 border border-white/10 rounded-lg p-4 flex gap-4"
                >
                  {person.avatarUrl ? (
                    <img
                      src={person.avatarUrl}
                      alt={person.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                      <span className="text-orange-400 font-bold text-sm">
                        {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{person.name}</p>
                    <p className="text-orange-400 text-xs font-medium uppercase tracking-wide mt-0.5">{person.role}</p>
                    {person.bio && (
                      <p className="text-white/60 text-xs mt-1 line-clamp-3">{person.bio}</p>
                    )}
                    {person.linkedinUrl && (
                      <a
                        href={person.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-orange-400 hover:underline mt-1 inline-block"
                      >
                        LinkedIn ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
