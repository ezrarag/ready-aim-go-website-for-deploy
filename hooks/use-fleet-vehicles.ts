"use client"

import { useEffect, useState } from "react"
import { normalizeFleetVehicle, sortFleetVehicles, type FleetVehicle } from "@/lib/fleet"

type UseFleetVehiclesOptions = {
  includeInactive?: boolean
}

let seedRequest: Promise<void> | null = null

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError"
}

function ensureFleetSeeded() {
  if (!seedRequest) {
    seedRequest = fetch("/api/fleet/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then(() => undefined)
      .catch(() => undefined)
  }

  return seedRequest
}

async function fetchFleetVehicles(includeInactive: boolean, signal?: AbortSignal) {
  const response = await fetch(`/api/fleet?includeInactive=${includeInactive ? "true" : "false"}`, {
    cache: "no-store",
    signal,
  })
  const payload = (await response.json()) as {
    success?: boolean
    vehicles?: Array<Record<string, unknown>>
    error?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Unable to load fleet vehicles.")
  }

  const vehicles = Array.isArray(payload.vehicles)
    ? payload.vehicles.map((vehicle) =>
        normalizeFleetVehicle(String(vehicle.id ?? ""), vehicle)
      )
    : []

  return sortFleetVehicles(vehicles)
}

export function useFleetVehicles(options: UseFleetVehiclesOptions = {}) {
  const { includeInactive = false } = options
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    const loadVehicles = async () => {
      setLoading(true)
      setError(null)

      try {
        await ensureFleetSeeded()
        const nextVehicles = await fetchFleetVehicles(includeInactive, abortController.signal)
        if (!isMounted) {
          return
        }
        setVehicles(nextVehicles)
      } catch (loadError) {
        if (isAbortError(loadError) || abortController.signal.aborted) {
          return
        }
        console.error(loadError)
        if (!isMounted) {
          return
        }
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load fleet vehicles."
        )
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadVehicles()

    const pollTimer = window.setInterval(() => {
      void loadVehicles()
    }, 15000)

    return () => {
      isMounted = false
      abortController.abort()
      window.clearInterval(pollTimer)
    }
  }, [includeInactive])

  const refresh = async () => {
    setError(null)

    try {
      await ensureFleetSeeded()
      const nextVehicles = await fetchFleetVehicles(includeInactive)
      setVehicles(nextVehicles)
    } catch (refreshError) {
      console.error(refreshError)
      setError(
        refreshError instanceof Error ? refreshError.message : "Unable to refresh fleet vehicles."
      )
    }
  }

  return { vehicles, loading, error, refresh }
}
