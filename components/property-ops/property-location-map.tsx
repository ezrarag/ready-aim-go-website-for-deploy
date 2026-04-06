"use client"

import { useEffect, useRef, useState } from "react"
import { Loader } from "@googlemaps/js-api-loader"
import { Loader2, MapPinned } from "lucide-react"

export function PropertyLocationMap({
  lat,
  lng,
  label,
}: {
  lat: number
  lng: number
  label: string
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    const initMap = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""

      if (!apiKey) {
        setLoading(false)
        setError("Google Maps API key is not configured.")
        return
      }

      try {
        setLoading(true)
        setError(null)

        const loader = new Loader({
          apiKey,
          version: "weekly",
        })

        const google = await loader.load()

        if (!mapRef.current || isCancelled) {
          return
        }

        const map = new google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          rotateControl: false,
        })

        new google.maps.Marker({
          map,
          position: { lat, lng },
          title: label,
        })

        setLoading(false)
      } catch (mapError) {
        console.error(mapError)
        if (isCancelled) {
          return
        }
        setError("Unable to load the property map.")
        setLoading(false)
      }
    }

    void initMap()

    return () => {
      isCancelled = true
    }
  }, [label, lat, lng])

  return (
    <div className="relative overflow-hidden rounded-[1.2rem] border border-white/12 bg-[#13213a]/80">
      <div ref={mapRef} className="h-[320px] w-full" />
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#13213a]/82 text-white/72 backdrop-blur-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading map...
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#13213a]/82 px-6 text-center text-sm text-white/72 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <MapPinned className="h-6 w-6" />
            <p className="mt-3">{error}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
