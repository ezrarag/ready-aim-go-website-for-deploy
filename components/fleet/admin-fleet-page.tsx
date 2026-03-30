"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { AdminMetricTile, AdminPanel, AdminPanelTitle } from "@/components/admin/admin-panel"
import { useToast } from "@/hooks/use-toast"
import { useFleetVehicles } from "@/hooks/use-fleet-vehicles"
import {
  FLEET_ANGLE_OPTIONS,
  FLEET_HEALTH_OPTIONS,
  FLEET_STATUS_OPTIONS,
  INITIAL_FLEET_FORM_STATE,
  buildFleetPayload,
  buildImaginUrl,
  getFleetFormState,
  getFleetHealthMeta,
  getFleetStatusMeta,
  type FleetAngle,
  type FleetHealthStatus,
  type FleetStatus,
  type FleetVehicle,
  type FleetVehicleFormState,
} from "@/lib/fleet"

type FleetAdminSectionProps = {
  redirectPath?: string
  embedded?: boolean
  title?: string
  description?: string
}

function PreviewPanel({
  make,
  model,
  year,
  angle,
}: {
  make: string
  model: string
  year: number | null
  angle: FleetAngle
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const previewReady = Boolean(make.trim() && model.trim() && year)
  const imageUrl = previewReady && year ? buildImaginUrl(make, model, year, angle) : ""

  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/30">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          {FLEET_ANGLE_OPTIONS.find((option) => option.value === angle)?.label}
        </div>
      </div>

      <div className="aspect-[4/3] p-4">
        {!previewReady ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/80 text-center text-sm text-muted-foreground">
            Enter make, model, and year for preview
          </div>
        ) : imageFailed ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/80 text-center text-sm text-muted-foreground">
            Preview unavailable
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={`${year} ${make} ${model} ${angle}`}
            className="h-full w-full object-contain"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
    </div>
  )
}

function isValidYear(value: string) {
  const year = Number(value)
  return Number.isInteger(year) && year >= 1900 && year <= 2100
}

export function FleetAdminSection({
  redirectPath: _redirectPath = "/dashboard/transportation",
  embedded = false,
  title = "RAG Fleet Admin",
  description = "Add, edit, hide, or soft-delete vehicles. Public changes stream into /fleet in real time.",
}: FleetAdminSectionProps) {
  const { toast } = useToast()
  const { vehicles, loading, error, refresh } = useFleetVehicles({ includeInactive: true })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<FleetVehicleFormState>(INITIAL_FLEET_FORM_STATE)
  const [editingVehicle, setEditingVehicle] = useState<FleetVehicle | null>(null)
  const [saving, setSaving] = useState(false)
  const [rowActionId, setRowActionId] = useState<string | null>(null)
  const activeCount = useMemo(() => vehicles.filter((vehicle) => vehicle.active).length, [vehicles])
  const inactiveCount = vehicles.length - activeCount
  const restoreCount = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status === "restore").length,
    [vehicles]
  )

  const resetForm = () => {
    setForm(INITIAL_FLEET_FORM_STATE)
    setEditingVehicle(null)
  }

  const openCreateSheet = () => {
    resetForm()
    setSheetOpen(true)
  }

  const openEditSheet = (vehicle: FleetVehicle) => {
    setEditingVehicle(vehicle)
    setForm(getFleetFormState(vehicle))
    setSheetOpen(true)
  }

  const handleSheetChange = (open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const handleFieldChange = <Key extends keyof FleetVehicleFormState>(
    key: Key,
    value: FleetVehicleFormState[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    const requiredTextFields = [
      form.make,
      form.model,
      form.color,
      form.config,
      form.engine,
      form.payload,
      form.priceRange,
      form.purpose,
    ]

    if (requiredTextFields.some((value) => value.trim().length === 0) || !isValidYear(form.year)) {
      toast({
        title: "Complete the fleet form",
        description: "Make, model, year, specs, price range, and purpose are required.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload = buildFleetPayload(form)
      const response = await fetch(editingVehicle ? `/api/fleet/${editingVehicle.id}` : "/api/fleet", {
        method: editingVehicle ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingVehicle
            ? {
                ...payload,
                active: editingVehicle.active,
              }
            : payload
        ),
      })
      const result = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to save fleet vehicle.")
      }

      toast({
        title: editingVehicle ? "Vehicle updated" : "Vehicle created",
        description: `${form.make} ${form.model} is now synced with the public fleet page.`,
      })

      handleSheetChange(false)
      await refresh()
    } catch (saveError) {
      console.error(saveError)
      toast({
        title: "Save failed",
        description: saveError instanceof Error ? saveError.message : "Unknown Firestore error.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSetActive = async (vehicle: FleetVehicle, nextActive: boolean) => {
    setRowActionId(vehicle.id)

    try {
      const response = await fetch(`/api/fleet/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: nextActive }),
      })
      const result = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to update fleet visibility.")
      }

      toast({
        title: nextActive ? "Vehicle restored to public page" : "Vehicle hidden from public page",
        description: `${vehicle.make} ${vehicle.model} is now ${nextActive ? "visible" : "hidden"}.`,
      })
      await refresh()
    } catch (toggleError) {
      console.error(toggleError)
      toast({
        title: "Unable to update visibility",
        description: toggleError instanceof Error ? toggleError.message : "Unknown Firestore error.",
        variant: "destructive",
      })
    } finally {
      setRowActionId(null)
    }
  }

  const handleSoftDelete = async (vehicle: FleetVehicle) => {
    setRowActionId(vehicle.id)

    try {
      const response = await fetch(`/api/fleet/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      })
      const result = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to delete fleet vehicle.")
      }

      toast({
        title: "Vehicle soft-deleted",
        description: `${vehicle.make} ${vehicle.model} was removed from the public fleet page.`,
      })
      await refresh()
    } catch (deleteError) {
      console.error(deleteError)
      toast({
        title: "Delete failed",
        description: deleteError instanceof Error ? deleteError.message : "Unknown Firestore error.",
        variant: "destructive",
      })
    } finally {
      setRowActionId(null)
    }
  }

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-muted/30 px-4 py-8 sm:px-6 lg:px-8"}>
      <div className={embedded ? "space-y-6" : "mx-auto max-w-7xl space-y-6"}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className={embedded ? "text-2xl font-bold text-foreground" : "text-3xl font-bold text-foreground"}>{title}</h1>
            <p className="text-muted-foreground">{description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Auth gating is temporarily disabled here so the login flow can be built and tested separately.
            </p>
          </div>
          <Button onClick={openCreateSheet}>
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <AdminMetricTile label="Total Vehicles" value={vehicles.length} />
          <AdminMetricTile
            label="Active on Public Page"
            value={activeCount}
            hint={`${inactiveCount} currently hidden`}
          />
          <AdminMetricTile label="Restore Projects" value={restoreCount} />
        </div>

        <AdminPanel>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <AdminPanelTitle>Fleet Inventory</AdminPanelTitle>
                <div className="text-sm text-muted-foreground">
                  All vehicles, including inactive records and restore builds.
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading vehicles...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-700">
                {error}
              </div>
            ) : vehicles.length === 0 ? (
              <div className="rounded-2xl border border-border/80 bg-muted/30 p-6 text-sm text-muted-foreground">
                No fleet vehicles found yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="admin-table-head hover:bg-transparent">
                    <TableHead>Status</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Make</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Config</TableHead>
                    <TableHead>Price Range</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Edit</TableHead>
                    <TableHead>Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((vehicle) => {
                    const statusMeta = getFleetStatusMeta(vehicle.status)
                    const healthMeta = getFleetHealthMeta(vehicle.healthStatus)
                    const rowBusy = rowActionId === vehicle.id

                    return (
                      <TableRow key={vehicle.id} className="admin-table-row">
                        <TableCell>
                          <Badge variant="outline" className={statusMeta.cardClassName}>
                            {statusMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{vehicle.year}</TableCell>
                        <TableCell>{vehicle.make}</TableCell>
                        <TableCell>{vehicle.model}</TableCell>
                        <TableCell className="max-w-[18rem] truncate">{vehicle.config}</TableCell>
                        <TableCell className="font-mono text-xs">{vehicle.priceRange}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={healthMeta.className}>
                            {healthMeta.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={vehicle.active}
                              disabled={rowBusy}
                              onCheckedChange={(checked) => void handleSetActive(vehicle, checked)}
                            />
                            <span className="text-sm text-muted-foreground">
                              {vehicle.active ? "Visible" : "Hidden"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => openEditSheet(vehicle)}>
                            Edit
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={rowBusy || !vehicle.active}
                            onClick={() => void handleSoftDelete(vehicle)}
                          >
                            {rowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </AdminPanel>
      </div>

      <Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
        <SheetContent className="w-full overflow-y-auto border-l border-border bg-background/95 sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</SheetTitle>
            <SheetDescription>
              Vehicle updates sync straight into Firestore and stream to the public fleet page.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 space-y-8">
            <div className="grid gap-4 md:grid-cols-3">
              {FLEET_ANGLE_OPTIONS.map((option) => (
                <PreviewPanel
                  key={option.value}
                  make={form.make}
                  model={form.model}
                  year={isValidYear(form.year) ? Number(form.year) : null}
                  angle={option.value}
                />
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fleet-make">Make</Label>
                <Input
                  id="fleet-make"
                  value={form.make}
                  onChange={(event) => handleFieldChange("make", event.target.value)}
                  placeholder="Ford"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fleet-model">Model</Label>
                <Input
                  id="fleet-model"
                  value={form.model}
                  onChange={(event) => handleFieldChange("model", event.target.value)}
                  placeholder="Transit"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fleet-year">Year</Label>
                <Input
                  id="fleet-year"
                  inputMode="numeric"
                  value={form.year}
                  onChange={(event) => handleFieldChange("year", event.target.value.replace(/[^\d]/g, ""))}
                  placeholder="2025"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fleet-color">Color</Label>
                <Input
                  id="fleet-color"
                  value={form.color}
                  onChange={(event) => handleFieldChange("color", event.target.value)}
                  placeholder="Oxford White"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fleet-config">Config</Label>
                <Input
                  id="fleet-config"
                  value={form.config}
                  onChange={(event) => handleFieldChange("config", event.target.value)}
                  placeholder="High Roof 148&quot; AWD"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fleet-engine">Engine</Label>
                <Input
                  id="fleet-engine"
                  value={form.engine}
                  onChange={(event) => handleFieldChange("engine", event.target.value)}
                  placeholder="3.5L EcoBoost V6"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fleet-payload">Payload</Label>
                <Input
                  id="fleet-payload"
                  value={form.payload}
                  onChange={(event) => handleFieldChange("payload", event.target.value)}
                  placeholder="4,640 lbs"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => handleFieldChange("status", value as FleetStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {FLEET_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fleet-price-range">Price Range</Label>
                <Input
                  id="fleet-price-range"
                  value={form.priceRange}
                  onChange={(event) => handleFieldChange("priceRange", event.target.value)}
                  placeholder="$54,000–$62,000"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fleet-purpose">Purpose</Label>
                <Textarea
                  id="fleet-purpose"
                  rows={4}
                  value={form.purpose}
                  onChange={(event) => handleFieldChange("purpose", event.target.value)}
                  placeholder="1–2 sentences on how this vehicle fits the RAG / BEAM cohort."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fleet-notes">Notes</Label>
                <Textarea
                  id="fleet-notes"
                  rows={4}
                  value={form.notes}
                  onChange={(event) => handleFieldChange("notes", event.target.value)}
                  placeholder="Internal maintenance notes, sourcing context, or admin reminders."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fleet-vin">VIN</Label>
                <Input
                  id="fleet-vin"
                  value={form.vin}
                  onChange={(event) => handleFieldChange("vin", event.target.value)}
                  placeholder="Optional until assigned"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fleet-license-plate">License Plate</Label>
                <Input
                  id="fleet-license-plate"
                  value={form.licensePlate}
                  onChange={(event) => handleFieldChange("licensePlate", event.target.value)}
                  placeholder="Optional until assigned"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Health Status</Label>
                <Select
                  value={form.healthStatus}
                  onValueChange={(value) =>
                    handleFieldChange("healthStatus", value as FleetHealthStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select health status" />
                  </SelectTrigger>
                  <SelectContent>
                    {FLEET_HEALTH_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => handleSheetChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving..." : editingVehicle ? "Save Changes" : "Save Vehicle"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export function AdminFleetPage() {
  return <FleetAdminSection />
}
