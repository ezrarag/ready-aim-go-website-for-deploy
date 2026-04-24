"use client"

import { useEffect, useState } from "react"
import {
  computeRAGServicesSummary,
  normalizeRAGService,
  sortRAGServices,
  type RAGService,
} from "@/lib/rag-services"

type UseRAGServicesSummary = ReturnType<typeof computeRAGServicesSummary>

type ServicesPayload = {
  success?: boolean
  services?: Array<Record<string, unknown>>
  seeded?: boolean
  error?: string
}

async function fetchServices(signal?: AbortSignal) {
  const response = await fetch("/api/services", {
    cache: "no-store",
    signal,
  })

  const payload = (await response.json()) as ServicesPayload

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Unable to load infrastructure services.")
  }

  const services = Array.isArray(payload.services)
    ? payload.services.map((service) =>
        normalizeRAGService(String(service.id ?? ""), service)
      )
    : []

  const sortedServices = sortRAGServices(services)

  return {
    services: sortedServices,
    seeded: Boolean(payload.seeded),
    summary: computeRAGServicesSummary(sortedServices),
  }
}

export function useRAGServices() {
  const [services, setServices] = useState<RAGService[]>([])
  const [summary, setSummary] = useState<UseRAGServicesSummary>({
    totalMonthlyCost: 0,
    overdueCount: 0,
    dueThisWeekCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seeded, setSeeded] = useState(false)

  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    const loadServices = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchServices(abortController.signal)
        if (!isMounted) {
          return
        }

        setServices(result.services)
        setSummary(result.summary)
        setSeeded((current) => current || result.seeded)
      } catch (loadError) {
        console.error(loadError)
        if (!isMounted) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load infrastructure services."
        )
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadServices()

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [])

  const refresh = async () => {
    setError(null)

    try {
      const result = await fetchServices()
      setServices(result.services)
      setSummary(result.summary)
      setSeeded((current) => current || result.seeded)
    } catch (refreshError) {
      console.error(refreshError)
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to refresh infrastructure services."
      )
    }
  }

  return {
    services,
    summary,
    loading,
    error,
    seeded,
    refresh,
  }
}
