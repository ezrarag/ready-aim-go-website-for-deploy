import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, BadgeDollarSign, CheckCircle2 } from "lucide-react"
import { getFirestoreDb } from "@/lib/firestore"
import { serializeFirestoreDocument } from "@/lib/firestore-json"

type ServiceEconomicsRow = {
  item: string
  cost: string
  note: string
}

type ServiceRecord = {
  slug: string
  name: string
  tagline: string
  price: string
  videoUrl: string
  features: string[]
  economics: ServiceEconomicsRow[]
}

type PageProps = {
  params: Promise<{ slug: string }>
}

export const dynamic = "force-dynamic"

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []
}

function normalizeEconomics(value: unknown): ServiceEconomicsRow[] {
  if (!Array.isArray(value)) return []
  return value
    .map((row) => {
      if (Array.isArray(row)) {
        return {
          item: readString(row[0]),
          cost: readString(row[1]),
          note: readString(row[2]),
        }
      }
      if (row && typeof row === "object") {
        const record = row as Record<string, unknown>
        return {
          item: readString(record.item) || readString(record.label) || readString(record.name),
          cost: readString(record.cost) || readString(record.price),
          note: readString(record.note) || readString(record.description),
        }
      }
      return { item: "", cost: "", note: "" }
    })
    .filter((row) => row.item || row.cost || row.note)
}

function toYouTubeEmbedUrl(videoUrl: string): string {
  if (!videoUrl) return ""
  try {
    const url = new URL(videoUrl)
    if (url.hostname.includes("youtube.com") && url.pathname.startsWith("/embed/")) return url.toString()
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v")
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : videoUrl
    }
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace("/", "")
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : videoUrl
    }
  } catch {
    return videoUrl
  }
  return videoUrl
}

async function getServiceRecord(slug: string): Promise<ServiceRecord | null> {
  const db = getFirestoreDb()
  if (!db) return null

  const doc = await db.collection("services").doc(slug).get()
  if (!doc.exists) return null

  const data = serializeFirestoreDocument(doc.id, doc.data()) as Record<string, unknown>
  const name = readString(data.name) || slug
  return {
    slug,
    name,
    tagline: readString(data.tagline),
    price: readString(data.price),
    videoUrl: readString(data.videoUrl),
    features: readStringArray(data.features),
    economics: normalizeEconomics(data.economics),
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const service = await getServiceRecord(slug)
  if (!service) {
    return {
      title: "Service | ReadyAimGo",
      robots: { index: false, follow: true },
    }
  }

  return {
    title: `${service.name} | ReadyAimGo`,
    description: service.tagline,
    robots: { index: true, follow: true },
  }
}

export async function ServiceSlugPage({ slug }: { slug: string }) {
  const service = await getServiceRecord(slug)
  if (!service) notFound()

  const embedUrl = toYouTubeEmbedUrl(service.videoUrl)
  const intakeHref = `/intake?service=${encodeURIComponent(service.slug)}`
  const hasVideo = Boolean(embedUrl)

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.24),transparent_34%),linear-gradient(135deg,rgba(49,68,109,0.9),rgba(17,24,39,1))]" />
      <div id="top" className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <Link href="/services" className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white/72 transition hover:border-orange-200/40 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Services
        </Link>

        <section className={`mt-6 grid gap-6 lg:items-stretch ${hasVideo ? "lg:grid-cols-[1fr_0.92fr]" : "lg:grid-cols-1"}`}>
          <div className="relative overflow-hidden rounded-[0.75rem] border border-white/12 bg-[#31446d]/70 p-6 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)] backdrop-blur-sm sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(18,28,54,0.32)_62%,rgba(14,20,36,0.78)_100%)]" />
            <div className="relative">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.34em] text-orange-200/80">ReadyAimGo Services</p>
              <h1 className="mt-5 max-w-3xl text-5xl font-black uppercase italic leading-[0.88] tracking-[0.05em] text-white sm:text-7xl">
                {service.name}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/76">{service.tagline}</p>
              <div className="mt-8 inline-flex items-center gap-3">
                <BadgeDollarSign className="h-5 w-5 text-white/45" />
                <span className="text-sm font-black uppercase tracking-[0.2em] text-white/60">{service.price}</span>
              </div>
              <div className="mt-10">
                <Link href={intakeHref} className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-[#223255] transition hover:bg-orange-100">
                  Start Intake
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {hasVideo ? (
            <div className="relative overflow-hidden rounded-[0.75rem] border border-white/12 bg-black/20 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)]">
              <iframe
                src={embedUrl}
                title={`${service.name} video`}
                className="aspect-video h-full min-h-[20rem] w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : null}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[0.75rem] border border-white/12 bg-[#2f416a]/70 p-5 backdrop-blur-sm sm:p-6">
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.32em] text-white/50">Features</p>
            <h2 className="mt-3 text-3xl font-black uppercase italic tracking-[0.04em]">Field Capabilities</h2>
            <div className="mt-6 grid gap-3">
              {service.features.length > 0 ? service.features.map((feature) => (
                <div key={feature} className="flex gap-3 rounded-[0.55rem] border border-white/10 bg-black/10 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-100" />
                  <p className="text-sm leading-6 text-white/78">{feature}</p>
                </div>
              )) : <p className="text-sm text-white/60">Features are being finalized.</p>}
            </div>
          </div>

          <div className="rounded-[0.75rem] border border-white/12 bg-[#2f416a]/70 p-5 backdrop-blur-sm sm:p-6">
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.32em] text-white/50">Economics</p>
            <h2 className="mt-3 text-3xl font-black uppercase italic tracking-[0.04em]">Operating Stack</h2>
            <div className="mt-6 overflow-hidden rounded-[0.55rem] border border-white/10">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-white/[0.08] text-white/70">
                  <tr>
                    <th className="p-3 text-left text-[0.62rem] uppercase tracking-[0.22em]">Line Item</th>
                    <th className="p-3 text-left text-[0.62rem] uppercase tracking-[0.22em]">Cost</th>
                    <th className="p-3 text-left text-[0.62rem] uppercase tracking-[0.22em]">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {service.economics.map((row) => (
                    <tr key={`${row.item}-${row.cost}`} className="border-t border-white/10">
                      <td className="p-3 font-semibold text-white">{row.item}</td>
                      <td className="p-3 font-mono text-orange-100">{row.cost}</td>
                      <td className="p-3 text-white/68">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-8 border-t border-white/10 py-8">
          <p className="text-orange-400 text-xs font-black uppercase tracking-[0.34em]">
            Ready To Start?
          </p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-4xl font-black uppercase italic leading-[0.92] tracking-[0.05em] text-white sm:text-5xl lg:text-6xl">
                {service.name} - {service.price}
              </h2>
            </div>
            <div className="w-full max-w-sm lg:w-auto lg:max-w-none">
              <Link
                href={intakeHref}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-orange-400 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-[#223255] transition hover:bg-orange-300 lg:inline-flex lg:w-auto"
              >
                Start Intake
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="mt-4">
            <Link href="#top" className="text-sm text-white/56 transition hover:text-white/80">
              Read the service brief from the top ↑
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

export default async function DynamicServicePage({ params }: PageProps) {
  const { slug } = await params
  return <ServiceSlugPage slug={slug} />
}
