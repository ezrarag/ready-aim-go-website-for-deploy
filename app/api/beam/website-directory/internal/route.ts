import { NextResponse } from "next/server"
import { getBeamHomeInternalDirectoryEndpoints } from "@/lib/beam-api"

interface BeamWebsiteDirectoryEntry {
  id: string
  label: string
  title: string
  subtitle: string
  url: string
  previewImageUrl: string
  sortOrder: number
  isActive: boolean
  createdBy: string
  updatedBy: string
  source: string
}

export const dynamic = "force-dynamic"
export const revalidate = 0

function normalizeEntry(entry: unknown): BeamWebsiteDirectoryEntry | null {
  if (!entry || typeof entry !== "object") return null
  const record = entry as Record<string, unknown>
  const id = typeof record.id === "string" ? record.id : ""
  const label = typeof record.label === "string" ? record.label : ""
  const title = typeof record.title === "string" ? record.title : ""
  const subtitle = typeof record.subtitle === "string" ? record.subtitle : ""
  const url = typeof record.url === "string" ? record.url : ""
  const previewImageUrl = typeof record.previewImageUrl === "string" ? record.previewImageUrl : ""
  const sortOrder = typeof record.sortOrder === "number" ? record.sortOrder : 0
  const isActive = typeof record.isActive === "boolean" ? record.isActive : true
  const createdBy = typeof record.createdBy === "string" ? record.createdBy : ""
  const updatedBy = typeof record.updatedBy === "string" ? record.updatedBy : ""
  const source = typeof record.source === "string" ? record.source : "internal"

  if (!id || !label || !title || !url) return null

  return {
    id,
    label,
    title,
    subtitle,
    url,
    previewImageUrl,
    sortOrder,
    isActive,
    createdBy,
    updatedBy,
    source,
  }
}

export async function GET() {
  const directoryEndpoints = getBeamHomeInternalDirectoryEndpoints()
  const errors: string[] = []

  for (const endpoint of directoryEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
        next: { revalidate: 0 },
      })

      if (!res.ok) {
        errors.push(`${endpoint} (${res.status})`)
        continue
      }

      const payload = await res.json()
      const rawEntries: unknown[] = Array.isArray(payload?.data?.entries)
        ? payload.data.entries
        : Array.isArray(payload?.entries)
          ? payload.entries
          : []

      const entries = rawEntries
        .map((entry: unknown) => normalizeEntry(entry))
        .filter((entry): entry is BeamWebsiteDirectoryEntry => entry !== null)

      return NextResponse.json({
        success: true,
        source: endpoint,
        entries,
      })
    } catch (error) {
      errors.push(`${endpoint} (${error instanceof Error ? error.message : "request failed"})`)
    }
  }

  return NextResponse.json({
    success: false,
    source: null,
    entries: [],
    error: `Unable to fetch BEAM Home directory. ${errors.join(" | ")}`,
  })
}
