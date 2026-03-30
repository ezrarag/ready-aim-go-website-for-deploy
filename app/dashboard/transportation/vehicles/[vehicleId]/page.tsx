import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Images } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { Badge } from "@/components/ui/badge"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getVehicleById } from "@/lib/vehicle-admin"
import { VEHICLE_STATUS_OPTIONS } from "@/lib/vehicle-inventory"

function formatDate(value: Date | null) {
  if (!value) return "Pending"
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value)
}

function formatNumber(value: number | null) {
  if (value === null) return "Not set"
  return value.toLocaleString("en-US")
}

function formatCurrency(value: number | null) {
  if (value === null) return "Not set"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function VehicleDetailPage(
  props: { params: Promise<{ vehicleId: string }> }
) {
  const params = await props.params
  const vehicle = await getVehicleById(params.vehicleId)

  if (!vehicle) {
    notFound()
  }

  const statusLabel =
    VEHICLE_STATUS_OPTIONS.find((option) => option.value === vehicle.status)?.label ?? vehicle.status

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link
                href="/dashboard/transportation"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                Transportation
              </Link>
              <span>/</span>
              <Link href="/dashboard/transportation/add-vehicle" className="hover:text-foreground">
                Add Vehicle
              </Link>
              <span>/</span>
              <span>{vehicle.id}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-foreground">
              {vehicle.year ? `${vehicle.year} ` : ""}
              {vehicle.make} {vehicle.model}
            </h1>
            <p className="text-muted-foreground">
              Vehicle inventory detail for intake record <span className="font-mono">{vehicle.id}</span>.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1 text-sm">
              {statusLabel}
            </Badge>
            <Badge variant="outline" className="px-3 py-1 font-mono text-sm">
              {vehicle.vin}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <AdminMetricTile label="Photos" value={vehicle.photos.length} />
          <AdminMetricTile label="Mileage" value={formatNumber(vehicle.currentMileage)} />
          <AdminMetricTile label="Purchase Price" value={formatCurrency(vehicle.purchasePrice)} />
          <AdminMetricTile label="Created" value={formatDate(vehicle.createdAt)} valueClassName="text-lg" />
        </div>

        <AdminPanel>
          <CardHeader>
            <AdminPanelTitle>Vehicle Snapshot</AdminPanelTitle>
            <CardDescription>Decoded VIN fields and local fleet assignments saved during intake.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminPanelInset>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Vehicle Type</div>
              <div className="mt-2 text-sm text-foreground">{vehicle.vehicleType || "Not set"}</div>
            </AdminPanelInset>
            <AdminPanelInset>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Fuel Type</div>
              <div className="mt-2 text-sm text-foreground">{vehicle.fuelType || "Not set"}</div>
            </AdminPanelInset>
            <AdminPanelInset>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Body Class</div>
              <div className="mt-2 text-sm text-foreground">{vehicle.bodyClass || "Not set"}</div>
            </AdminPanelInset>
            <AdminPanelInset>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">GVWR</div>
              <div className="mt-2 text-sm text-foreground">{vehicle.gvwr || "Not set"}</div>
            </AdminPanelInset>
            <AdminPanelInset>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">License Plate</div>
              <div className="mt-2 text-sm text-foreground">{vehicle.licensePlate || "Not set"}</div>
            </AdminPanelInset>
            <AdminPanelInset>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Home City</div>
              <div className="mt-2 text-sm text-foreground">{vehicle.city || "Not set"}</div>
            </AdminPanelInset>
            <AdminPanelInset>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Assigned City</div>
              <div className="mt-2 text-sm text-foreground">{vehicle.assignedCity || "Not set"}</div>
            </AdminPanelInset>
            <AdminPanelInset>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Updated</div>
              <div className="mt-2 text-sm text-foreground">{formatDate(vehicle.updatedAt)}</div>
            </AdminPanelInset>
          </CardContent>
        </AdminPanel>

        <AdminPanel>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Images className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Photos</CardTitle>
            </div>
            <CardDescription>
              Uploaded to Firebase Storage under <span className="font-mono">vehicles/{vehicle.id}/photos/</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vehicle.photos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 p-6 text-sm text-muted-foreground">
                No photos were uploaded for this vehicle.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {vehicle.photos.map((photo) => (
                  <div
                    key={photo.storagePath}
                    className="overflow-hidden rounded-xl border border-border/80 bg-card/80"
                  >
                    <div className="aspect-[4/3] bg-muted/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.publicUrl}
                        alt={photo.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="space-y-2 p-4">
                      <div className="truncate text-sm font-medium text-foreground">{photo.name}</div>
                      <Separator />
                      <div className="text-xs text-muted-foreground">{photo.storagePath}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </AdminPanel>
      </div>
    </DashboardLayout>
  )
}
