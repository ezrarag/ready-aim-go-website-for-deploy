import { NextRequest, NextResponse } from "next/server"
import { sanitizeVin } from "@/lib/vehicle-inventory"

export const dynamic = "force-dynamic"

function readDecodedValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export async function GET(request: NextRequest) {
  const vin = sanitizeVin(request.nextUrl.searchParams.get("vin") ?? "")

  if (vin.length !== 17) {
    return NextResponse.json(
      {
        success: false,
        error: "VIN must be 17 characters.",
      },
      { status: 400 }
    )
  }

  const lookupUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`
  const response = await fetch(lookupUrl, { cache: "no-store" })

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        error: "VIN lookup failed.",
      },
      { status: 502 }
    )
  }

  const payload = (await response.json()) as {
    Results?: Array<Record<string, unknown>>
  }
  const record = payload.Results?.[0]

  if (!record) {
    return NextResponse.json(
      {
        success: false,
        error: "No VIN record returned.",
      },
      { status: 404 }
    )
  }

  const year = Number(readDecodedValue(record.ModelYear))

  return NextResponse.json({
    success: true,
    vin,
    decoded: {
      make: readDecodedValue(record.Make),
      model: readDecodedValue(record.Model),
      year: Number.isFinite(year) ? year : null,
      vehicleType: readDecodedValue(record.VehicleType),
      fuelType: readDecodedValue(record.FuelTypePrimary),
      bodyClass: readDecodedValue(record.BodyClass),
      gvwr: readDecodedValue(record.GVWR),
    },
    warning: readDecodedValue(record.ErrorText) || undefined,
  })
}
