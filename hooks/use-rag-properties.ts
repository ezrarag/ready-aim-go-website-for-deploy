"use client"

import { useEffect, useState } from "react"
import { normalizeRAGProperty, sortRAGProperties } from "@/lib/rag-properties"
import type { RAGProperty } from "@/types/ragProperty"

type UseRAGPropertiesOptions = {
  includePrivate?: boolean
}

type PropertySummary = {
  total: number
  active: number
  inRenovation: number
  beamLinked: number
}

async function fetchProperties(includePrivate: boolean, signal?: AbortSignal) {
  const response = await fetch(
    `/api/property-ops?includePrivate=${includePrivate ? "true" : "false"}`,
    {
      cache: "no-store",
      signal,
    }
  )

  const payload = (await response.json()) as {
    success?: boolean
    properties?: Array<Record<string, unknown>>
    summary?: PropertySummary
    error?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Unable to load property portfolio.")
  }

  const properties = Array.isArray(payload.properties)
    ? payload.properties.map((property) =>
        normalizeRAGProperty(String(property.id ?? ""), property)
      )
    : []

  return {
    properties: sortRAGProperties(properties),
    summary: payload.summary ?? {
      total: 0,
      active: 0,
      inRenovation: 0,
      beamLinked: 0,
    },
  }
}

export function useRAGProperties(options: UseRAGPropertiesOptions = {}) {
  const { includePrivate = false } = options
  const [properties, setProperties] = useState<RAGProperty[]>([])
  const [summary, setSummary] = useState<PropertySummary>({
    total: 0,
    active: 0,
    inRenovation: 0,
    beamLinked: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    const loadProperties = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchProperties(includePrivate, abortController.signal)
        if (!isMounted) {
          return
        }
        setProperties(result.properties)
        setSummary(result.summary)
      } catch (loadError) {
        console.error(loadError)
        if (!isMounted) {
          return
        }
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load property portfolio."
        )
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadProperties()

    const pollTimer = window.setInterval(() => {
      void loadProperties()
    }, 15000)

    return () => {
      isMounted = false
      abortController.abort()
      window.clearInterval(pollTimer)
    }
  }, [includePrivate])

  const refresh = async () => {
    setError(null)

    try {
      const result = await fetchProperties(includePrivate)
      setProperties(result.properties)
      setSummary(result.summary)
    } catch (refreshError) {
      console.error(refreshError)
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to refresh property portfolio."
      )
    }
  }

  return { properties, summary, loading, error, refresh }
}
