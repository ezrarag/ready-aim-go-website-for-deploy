"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, BedDouble, Building2, Leaf, Loader2, MapPinned } from "lucide-react"
import { PropertyLocationMap } from "@/components/property-ops/property-location-map"
import { useUserWithRole } from "@/hooks/use-user-with-role"
import {
  formatPropertyAddress,
  getPropertyClassMeta,
  getPropertyStatusMeta,
  isHotelProperty,
} from "@/lib/rag-properties"
import type { RAGProperty } from "@/types/ragProperty"

const DISPLAY_FONT = '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif'
const BODY_FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

export function PropertyDetailPage({ propertyId }: { propertyId: string }) {
  const { session, loading: authLoading } = useUserWithRole()
  const [property, setProperty] = useState<RAGProperty | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const includePrivate = session?.profile?.role === "admin"

  useEffect(() => {
    let isMounted = true

    const loadProperty = async () => {
      if (authLoading) {
        return
      }

      if (!session) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/property-ops/${encodeURIComponent(propertyId)}${
            includePrivate ? "?includePrivate=true" : ""
          }`,
          {
            cache: "no-store",
          }
        )
        const result = (await response.json()) as {
          success?: boolean
          property?: RAGProperty
          error?: string
        }

        if (!response.ok || !result.success || !result.property) {
          throw new Error(result.error || "Unable to load property.")
        }

        if (!isMounted) {
          return
        }

        setProperty(result.property)
      } catch (propertyError) {
        console.error(propertyError)
        if (!isMounted) {
          return
        }
        setError(propertyError instanceof Error ? propertyError.message : "Unable to load property.")
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadProperty()

    return () => {
      isMounted = false
    }
  }, [authLoading, includePrivate, propertyId, session])

  const classMeta = useMemo(
    () => (property ? getPropertyClassMeta(property.propertyClass) : null),
    [property]
  )
  const statusMeta = useMemo(
    () => (property ? getPropertyStatusMeta(property.status) : null),
    [property]
  )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#5d73ad] text-white" style={{ fontFamily: BODY_FONT }}>
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="rounded-[0.75rem] border border-white/12 bg-[#31446d]/68 px-8 py-16 text-center text-white/72 backdrop-blur-sm">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            <p className="mt-4">Checking property access...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#5d73ad] text-white" style={{ fontFamily: BODY_FONT }}>
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="w-full rounded-[0.85rem] border border-white/12 bg-[#31446d]/76 p-8 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)] backdrop-blur-sm">
            <Link href="/property-ops" className="inline-flex items-center gap-2 text-white/72 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to portfolio
            </Link>
            <h1
              className="mt-6 text-[2.4rem] uppercase leading-none text-white"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
            >
              Property Detail
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
              Property detail pages are login-gated. Sign in through ReadyAimGo to view the
              portfolio detail and map surface.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/login?redirect=/property-ops/${encodeURIComponent(propertyId)}`}
                className="inline-flex items-center gap-2 rounded-[0.42rem] border border-[#ffb09a] bg-[#df8063] px-4 py-2 text-white shadow-[0_18px_45px_-28px_rgba(223,128,99,0.9)] transition hover:bg-[#e58b6d]"
              >
                Sign in
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/property-ops"
                className="inline-flex items-center gap-2 rounded-[0.42rem] border border-white/18 bg-[#203258]/75 px-4 py-2 text-white/90 backdrop-blur-sm transition hover:bg-[#1a2a49]"
              >
                Back to portfolio
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#5d73ad] text-white" style={{ fontFamily: BODY_FONT }}>
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="rounded-[0.75rem] border border-white/12 bg-[#31446d]/68 px-8 py-16 text-center text-white/72 backdrop-blur-sm">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            <p className="mt-4">Loading property detail...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !property || !classMeta || !statusMeta) {
    return (
      <div className="min-h-screen bg-[#5d73ad] text-white" style={{ fontFamily: BODY_FONT }}>
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="w-full rounded-[0.85rem] border border-white/12 bg-[#31446d]/76 p-8 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)] backdrop-blur-sm">
            <Link href="/property-ops" className="inline-flex items-center gap-2 text-white/72 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to portfolio
            </Link>
            <h1
              className="mt-6 text-[2.2rem] uppercase leading-none text-white"
              style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
            >
              Property unavailable
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/72 sm:text-base">
              {error || "This property could not be found."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#5d73ad] text-white" style={{ fontFamily: BODY_FONT }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#8ba3d6_0%,#637db8_34%,#445888_72%,#314162_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.28),transparent_34%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/property-ops"
          className="inline-flex items-center gap-2 text-white/72 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portfolio
        </Link>

        <section className="mt-8 rounded-[0.85rem] border border-white/12 bg-[#31446d]/76 p-6 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)] backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div
                className="text-[0.64rem] uppercase tracking-[0.32em] text-white/55"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic", fontWeight: 700 }}
              >
                Property Ops
              </div>
              <h1
                className="mt-4 text-[2.6rem] uppercase leading-none text-white sm:text-[3.4rem]"
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontStyle: "italic",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                }}
              >
                {property.publicName}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/78">
                {property.publicSummary}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-[0.38rem] border border-white/14 bg-white/[0.05] px-3 py-1.5 text-[0.66rem] uppercase tracking-[0.2em] text-white/82">
                {classMeta.label}
              </span>
              <span className="rounded-[0.38rem] border border-white/14 bg-white/[0.05] px-3 py-1.5 text-[0.66rem] uppercase tracking-[0.2em] text-white/82">
                {statusMeta.label}
              </span>
              <span className="rounded-[0.38rem] border border-white/14 bg-white/[0.05] px-3 py-1.5 text-[0.66rem] uppercase tracking-[0.2em] text-white/82">
                Node {property.node}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[0.75rem] border border-white/10 bg-black/10 p-4">
              <div className="text-[0.62rem] uppercase tracking-[0.26em] text-white/48">Name</div>
              <div className="mt-2 text-sm text-white/88">{property.name}</div>
            </div>
            <div className="rounded-[0.75rem] border border-white/10 bg-black/10 p-4">
              <div className="text-[0.62rem] uppercase tracking-[0.26em] text-white/48">Address</div>
              <div className="mt-2 text-sm text-white/88">{formatPropertyAddress(property)}</div>
            </div>
            <div className="rounded-[0.75rem] border border-white/10 bg-black/10 p-4">
              <div className="text-[0.62rem] uppercase tracking-[0.26em] text-white/48">Class</div>
              <div className="mt-2 text-sm text-white/88">{classMeta.label}</div>
            </div>
            <div className="rounded-[0.75rem] border border-white/10 bg-black/10 p-4">
              <div className="text-[0.62rem] uppercase tracking-[0.26em] text-white/48">Status</div>
              <div className="mt-2 text-sm text-white/88">{statusMeta.label}</div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-[0.85rem] border border-white/12 bg-[#31446d]/76 p-6 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)] backdrop-blur-sm">
              <div className="flex items-center gap-2 text-white">
                <MapPinned className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Property location</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/72">
                {formatPropertyAddress(property)}
              </p>
              <div className="mt-5">
                <PropertyLocationMap
                  lat={property.lat}
                  lng={property.lng}
                  label={property.publicName}
                />
              </div>
            </div>

            {isHotelProperty(property.propertyClass) && property.hotelDetails ? (
              <div className="rounded-[0.85rem] border border-white/12 bg-[#31446d]/76 p-6 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)] backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white">
                  <BedDouble className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Hotel detail</h2>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[0.75rem] border border-white/10 bg-black/10 p-4">
                    <div className="text-[0.62rem] uppercase tracking-[0.26em] text-white/48">
                      Room count
                    </div>
                    <div className="mt-2 text-sm text-white/88">
                      {property.hotelDetails.roomCount ?? "Not listed"}
                    </div>
                  </div>
                  <div className="rounded-[0.75rem] border border-white/10 bg-black/10 p-4">
                    <div className="text-[0.62rem] uppercase tracking-[0.26em] text-white/48">
                      Brand affiliation
                    </div>
                    <div className="mt-2 text-sm text-white/88">
                      {property.hotelDetails.brandAffiliation || "Not listed"}
                    </div>
                  </div>
                  <div className="rounded-[0.75rem] border border-white/10 bg-black/10 p-4">
                    <div className="text-[0.62rem] uppercase tracking-[0.26em] text-white/48">
                      Star rating
                    </div>
                    <div className="mt-2 text-sm text-white/88">
                      {property.hotelDetails.starRating ?? "Not listed"}
                    </div>
                  </div>
                  <div className="rounded-[0.75rem] border border-white/10 bg-black/10 p-4">
                    <div className="text-[0.62rem] uppercase tracking-[0.26em] text-white/48">
                      Target completion
                    </div>
                    <div className="mt-2 text-sm text-white/88">
                      {property.hotelDetails.targetCompletion || "Not listed"}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[0.85rem] border border-white/12 bg-[#31446d]/76 p-6 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)] backdrop-blur-sm">
              <div className="flex items-center gap-2 text-white">
                <Building2 className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Portfolio snapshot</h2>
              </div>
              <div className="mt-5 space-y-3 text-sm text-white/82">
                <div className="rounded-[0.75rem] border border-white/10 bg-black/10 p-4">
                  <div className="text-[0.62rem] uppercase tracking-[0.26em] text-white/48">
                    Node
                  </div>
                  <div className="mt-2">{property.node}</div>
                </div>
                <div className="rounded-[0.75rem] border border-white/10 bg-black/10 p-4">
                  <div className="text-[0.62rem] uppercase tracking-[0.26em] text-white/48">
                    Coordinates
                  </div>
                  <div className="mt-2">
                    {property.lat}, {property.lng}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[0.85rem] border border-white/12 bg-[#31446d]/76 p-6 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)] backdrop-blur-sm">
              <div className="flex items-center gap-2 text-white">
                <Leaf className="h-5 w-5" />
                <h2 className="text-lg font-semibold">NGO links</h2>
              </div>
              {property.ngoLinks.length === 0 ? (
                <p className="mt-4 text-sm leading-7 text-white/72">
                  This property does not currently expose a public NGO link.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {property.ngoLinks.map((link) => (
                    <div
                      key={`${property.id}-${link.ngoId}`}
                      className="rounded-[0.75rem] border border-white/10 bg-black/10 p-4"
                    >
                      <div className="font-medium text-white">{link.ngoName}</div>
                      <div className="mt-1 text-sm text-white/72">
                        {link.ngoSubdomain}.beamthinktank.space
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[0.68rem] uppercase tracking-[0.18em] text-white/64">
                        <span className="rounded-[0.35rem] border border-white/12 px-2.5 py-1">
                          {link.relationshipType}
                        </span>
                        <span className="rounded-[0.35rem] border border-white/12 px-2.5 py-1">
                          Linked by {link.linkedBy}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
