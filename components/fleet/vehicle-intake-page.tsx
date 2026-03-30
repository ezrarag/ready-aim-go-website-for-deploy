"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, ChevronLeft, Loader2, Search, Upload, CarFront } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  INITIAL_VEHICLE_INTAKE_FORM,
  VEHICLE_STATUS_OPTIONS,
  formatCurrencyInput,
  sanitizeVin,
  type DecodedVinVehicle,
  type VehicleIntakeFormState,
} from "@/lib/vehicle-inventory"

type SaveVehicleResult = {
  success?: boolean
  error?: string
  vehicle?: {
    id: string
    vin: string
    make: string
    model: string
    year: number | null
  }
  links?: {
    ragClientId: string
    transportationClientId: string
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function applyDecodedVehicle(
  current: VehicleIntakeFormState,
  decoded: DecodedVinVehicle
): VehicleIntakeFormState {
  return {
    ...current,
    make: decoded.make || current.make,
    model: decoded.model || current.model,
    year: decoded.year ? String(decoded.year) : current.year,
    vehicleType: decoded.vehicleType || current.vehicleType,
    fuelType: decoded.fuelType || current.fuelType,
    bodyClass: decoded.bodyClass || current.bodyClass,
    gvwr: decoded.gvwr || current.gvwr,
  }
}

export function VehicleIntakePage() {
  const { toast } = useToast()
  const [form, setForm] = useState<VehicleIntakeFormState>(INITIAL_VEHICLE_INTAKE_FORM)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lookupWarning, setLookupWarning] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [savedVehicle, setSavedVehicle] = useState<SaveVehicleResult["vehicle"] | null>(null)
  const [linkedClients, setLinkedClients] = useState<SaveVehicleResult["links"] | null>(null)

  const cleanedVin = useMemo(() => sanitizeVin(form.vin), [form.vin])
  const isLookupReady = cleanedVin.length === 17
  const progressValue = savedVehicle ? 100 : saving ? 72 : lookupLoading ? 28 : 0

  const handleFieldChange = <Key extends keyof VehicleIntakeFormState>(
    key: Key,
    value: VehicleIntakeFormState[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleLookup = async () => {
    if (!isLookupReady) {
      setPageError("Enter a full 17-character VIN before lookup.")
      return
    }

    setLookupLoading(true)
    setPageError(null)
    setLookupWarning(null)
    setSavedVehicle(null)
    setLinkedClients(null)

    try {
      const response = await fetch(`/api/vehicles/decode-vin?vin=${encodeURIComponent(cleanedVin)}`, {
        cache: "no-store",
      })
      const result = (await response.json()) as {
        success?: boolean
        error?: string
        warning?: string
        decoded?: DecodedVinVehicle
      }

      if (!response.ok || !result.success || !result.decoded) {
        throw new Error(result.error || "VIN lookup failed.")
      }

      setForm((current) => applyDecodedVehicle({ ...current, vin: cleanedVin }, result.decoded!))
      setLookupWarning(result.warning || null)
      toast({
        title: "VIN decoded",
        description: "Vehicle details were pulled from NHTSA and are ready for review.",
      })
    } catch (error) {
      console.error(error)
      const message = error instanceof Error ? error.message : "VIN lookup failed."
      setPageError(message)
      toast({
        title: "Lookup failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLookupLoading(false)
    }
  }

  const handleSave = async () => {
    setPageError(null)
    setSavedVehicle(null)
    setLinkedClients(null)

    if (cleanedVin.length !== 17) {
      setPageError("VIN must be 17 characters before saving.")
      return
    }

    if (!form.make.trim() || !form.model.trim() || !form.year.trim()) {
      setPageError("Make, model, and year are required.")
      return
    }

    const year = Number(form.year)
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      setPageError("Year must be a valid four-digit value.")
      return
    }

    if (form.currentMileage.trim() && Number.isNaN(Number(form.currentMileage))) {
      setPageError("Current mileage must be numeric.")
      return
    }

    if (form.purchasePrice.trim() && formatCurrencyInput(form.purchasePrice) === null) {
      setPageError("Purchase price must be numeric.")
      return
    }

    setSaving(true)

    try {
      const formData = new FormData()
      const fields: Array<[keyof VehicleIntakeFormState, string]> = [
        ["vin", cleanedVin],
        ["make", form.make.trim()],
        ["model", form.model.trim()],
        ["year", form.year.trim()],
        ["vehicleType", form.vehicleType.trim()],
        ["fuelType", form.fuelType.trim()],
        ["bodyClass", form.bodyClass.trim()],
        ["gvwr", form.gvwr.trim()],
        ["licensePlate", form.licensePlate.trim()],
        ["city", form.city.trim()],
        ["assignedCity", form.assignedCity.trim()],
        ["currentMileage", form.currentMileage.trim()],
        ["purchasePrice", form.purchasePrice.trim()],
        ["status", form.status],
      ]

      for (const [key, value] of fields) {
        formData.append(key, value)
      }

      for (const photo of selectedPhotos) {
        formData.append("photos", photo)
      }

      const response = await fetch("/api/vehicles", {
        method: "POST",
        body: formData,
      })
      const result = (await response.json()) as SaveVehicleResult

      if (!response.ok || !result.success || !result.vehicle) {
        throw new Error(result.error || "Vehicle save failed.")
      }

      setSavedVehicle(result.vehicle)
      setLinkedClients(result.links ?? null)
      setForm(INITIAL_VEHICLE_INTAKE_FORM)
      setSelectedPhotos([])
      setLookupWarning(null)
      toast({
        title: "Vehicle created",
        description: `${result.vehicle.make} ${result.vehicle.model} was saved to inventory.`,
      })
    } catch (error) {
      console.error(error)
      const message = error instanceof Error ? error.message : "Vehicle save failed."
      setPageError(message)
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard/transportation" className="inline-flex items-center gap-1 hover:text-foreground">
                <ChevronLeft className="h-4 w-4" />
                Transportation
              </Link>
              <span>/</span>
              <span>Add Vehicle</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-foreground">Vehicle Intake</h1>
            <p className="text-muted-foreground">
              Decode the VIN, add local assignment details, upload photos, and link the vehicle into both RAG and BEAM transportation records.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="border-border/70 bg-card/80">
              <Link href="/dashboard/transportation">Back to Transportation</Link>
            </Button>
            {savedVehicle ? (
              <Button asChild>
                <Link href={`/dashboard/transportation/vehicles/${savedVehicle.id}`}>Open Vehicle Detail</Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <AdminMetricTile
            label="VIN Ready"
            value={cleanedVin.length}
            hint={isLookupReady ? "Lookup can run now" : "17 characters required"}
            valueClassName="text-3xl font-semibold tabular-nums"
          />
          <AdminMetricTile
            label="Photos Selected"
            value={selectedPhotos.length}
            hint={selectedPhotos.length > 0 ? "Ready for Storage upload" : "Optional multiple upload"}
          />
          <AdminMetricTile
            label="Intake Progress"
            value={`${progressValue}%`}
            trailing={<CarFront className="h-8 w-8 text-primary/70" />}
          />
        </div>

        <AdminPanel>
          <CardHeader className="space-y-4">
            <div className="space-y-1">
              <AdminPanelTitle>VIN Decode</AdminPanelTitle>
              <CardDescription>
                NHTSA vPIC lookup fills the baseline vehicle facts before you finish local fleet intake details.
              </CardDescription>
            </div>
            <Progress value={progressValue} className="h-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            {savedVehicle ? (
              <Alert className="border-emerald-500/30 bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle>Vehicle saved successfully</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>
                    {savedVehicle.year ? `${savedVehicle.year} ` : ""}
                    {savedVehicle.make} {savedVehicle.model} was added to the inventory and linked into the required client records.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" asChild>
                      <Link href={`/dashboard/transportation/vehicles/${savedVehicle.id}`}>
                        Open vehicle detail
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSavedVehicle(null)
                        setLinkedClients(null)
                      }}
                    >
                      Add another vehicle
                    </Button>
                  </div>
                  {linkedClients ? (
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">RAG client: {linkedClients.ragClientId}</Badge>
                      <Badge variant="outline">
                        Transportation client: {linkedClients.transportationClientId}
                      </Badge>
                    </div>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

            {pageError ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to continue</AlertTitle>
                <AlertDescription>{pageError}</AlertDescription>
              </Alert>
            ) : null}

            {lookupWarning ? (
              <Alert>
                <AlertTitle>Lookup warning</AlertTitle>
                <AlertDescription>{lookupWarning}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
              <AdminPanelInset className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-vin">VIN</Label>
                  <div className="flex gap-2">
                    <Input
                      id="vehicle-vin"
                      value={form.vin}
                      onChange={(event) => handleFieldChange("vin", sanitizeVin(event.target.value))}
                      placeholder="1FTBW3X80RKA12345"
                      className="font-mono uppercase"
                    />
                    <Button type="button" onClick={handleLookup} disabled={!isLookupReady || lookupLoading}>
                      {lookupLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Look up
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    VIN is sanitized to 17 valid characters before lookup and save.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="vehicle-photos">Photos</Label>
                  <Input
                    id="vehicle-photos"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(event) =>
                      setSelectedPhotos(Array.from(event.target.files ?? []))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Files upload to Firebase Storage at <span className="font-mono">vehicles/&lt;vehicleId&gt;/photos/</span>.
                  </p>
                </div>

                <div className="space-y-3">
                  {selectedPhotos.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
                      No photos selected yet.
                    </div>
                  ) : (
                    selectedPhotos.map((photo) => (
                      <div
                        key={`${photo.name}-${photo.size}`}
                        className="flex items-center justify-between rounded-xl border border-border/80 bg-card/70 px-4 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{photo.name}</div>
                          <div className="text-xs text-muted-foreground">{formatFileSize(photo.size)}</div>
                        </div>
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))
                  )}
                </div>
              </AdminPanelInset>

              <AdminPanelInset className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Vehicle Details</h2>
                  <p className="text-sm text-muted-foreground">
                    Decoded values stay editable so intake can continue even if the VIN response is incomplete.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-make">Make</Label>
                    <Input
                      id="vehicle-make"
                      value={form.make}
                      onChange={(event) => handleFieldChange("make", event.target.value)}
                      placeholder="Ford"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-model">Model</Label>
                    <Input
                      id="vehicle-model"
                      value={form.model}
                      onChange={(event) => handleFieldChange("model", event.target.value)}
                      placeholder="Transit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-year">Year</Label>
                    <Input
                      id="vehicle-year"
                      inputMode="numeric"
                      value={form.year}
                      onChange={(event) => handleFieldChange("year", event.target.value.replace(/[^\d]/g, ""))}
                      placeholder="2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) => handleFieldChange("status", value as VehicleIntakeFormState["status"])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle status" />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-type">Vehicle Type</Label>
                    <Input
                      id="vehicle-type"
                      value={form.vehicleType}
                      onChange={(event) => handleFieldChange("vehicleType", event.target.value)}
                      placeholder="Truck"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-fuel">Fuel Type</Label>
                    <Input
                      id="vehicle-fuel"
                      value={form.fuelType}
                      onChange={(event) => handleFieldChange("fuelType", event.target.value)}
                      placeholder="Gasoline"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-body-class">Body Class</Label>
                    <Input
                      id="vehicle-body-class"
                      value={form.bodyClass}
                      onChange={(event) => handleFieldChange("bodyClass", event.target.value)}
                      placeholder="Cargo Van"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-gvwr">GVWR</Label>
                    <Input
                      id="vehicle-gvwr"
                      value={form.gvwr}
                      onChange={(event) => handleFieldChange("gvwr", event.target.value)}
                      placeholder="Class 2H: 9,001 - 10,000 lb"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-base font-semibold text-foreground">Operations Fields</h3>
                  <p className="text-sm text-muted-foreground">
                    Local assignment and ownership data is not part of the VIN decode and must be set here.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-license-plate">License Plate</Label>
                    <Input
                      id="vehicle-license-plate"
                      value={form.licensePlate}
                      onChange={(event) => handleFieldChange("licensePlate", event.target.value.toUpperCase())}
                      placeholder="ABC-1234"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-city">City</Label>
                    <Input
                      id="vehicle-city"
                      value={form.city}
                      onChange={(event) => handleFieldChange("city", event.target.value)}
                      placeholder="Milwaukee"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-assigned-city">Assigned City</Label>
                    <Input
                      id="vehicle-assigned-city"
                      value={form.assignedCity}
                      onChange={(event) => handleFieldChange("assignedCity", event.target.value)}
                      placeholder="Madison"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-mileage">Current Mileage</Label>
                    <Input
                      id="vehicle-mileage"
                      inputMode="numeric"
                      value={form.currentMileage}
                      onChange={(event) =>
                        handleFieldChange("currentMileage", event.target.value.replace(/[^\d]/g, ""))
                      }
                      placeholder="12840"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="vehicle-purchase-price">Purchase Price</Label>
                    <Input
                      id="vehicle-purchase-price"
                      inputMode="decimal"
                      value={form.purchasePrice}
                      onChange={(event) => handleFieldChange("purchasePrice", event.target.value)}
                      placeholder="$54,900"
                    />
                  </div>
                </div>
              </AdminPanelInset>
            </div>
          </CardContent>
        </AdminPanel>

        <AdminPanel>
          <CardHeader>
            <CardTitle className="text-lg">Save Intake</CardTitle>
            <CardDescription>
              Saving writes the vehicle document, uploads any photos, and updates both linked client arrays.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Target writes: <span className="font-mono">vehicles/&lt;vehicleId&gt;</span>, RAG{" "}
              <span className="font-mono">fleetVehicleIds</span>, and Transportation{" "}
              <span className="font-mono">assignedVehicles</span>.
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save vehicle
            </Button>
          </CardContent>
        </AdminPanel>
      </div>
    </DashboardLayout>
  )
}
