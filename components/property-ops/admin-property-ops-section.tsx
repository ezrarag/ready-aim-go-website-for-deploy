"use client"

import { useEffect, useMemo, useState } from "react"
import { Link2, Loader2, Plus, RefreshCw } from "lucide-react"
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
import { AdminMetricTile, AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { useToast } from "@/hooks/use-toast"
import { useRAGProperties } from "@/hooks/use-rag-properties"
import {
  RAG_PROPERTY_CLASS_OPTIONS,
  RAG_PROPERTY_STATUS_OPTIONS,
  INITIAL_RAG_PROPERTY_FORM_STATE,
  buildRAGPropertyPayload,
  getPropertyClassMeta,
  getPropertyStatusMeta,
  getRAGPropertyFormState,
  isHotelProperty,
  propertyHasGroundsLink,
  type RAGPropertyFormState,
} from "@/lib/rag-properties"
import type { RAGProperty, RAGPropertyNGOLink } from "@/types/ragProperty"

const NGO_RELATIONSHIP_OPTIONS: Array<{
  value: RAGPropertyNGOLink["relationshipType"]
  label: string
}> = [
  { value: "anchor-site", label: "Anchor Site" },
  { value: "service-site", label: "Service Site" },
  { value: "cohort-project", label: "Cohort Project" },
  { value: "training-site", label: "Training Site" },
]

type AdminPropertyOpsSectionProps = {
  actorId: string
  actorLabel: string
}

function isValidCoordinate(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed)
}

export function AdminPropertyOpsSection({
  actorId,
  actorLabel,
}: AdminPropertyOpsSectionProps) {
  const { toast } = useToast()
  const { properties, loading, error, refresh } = useRAGProperties({ includePrivate: true })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<RAGPropertyFormState>(INITIAL_RAG_PROPERTY_FORM_STATE)
  const [editingProperty, setEditingProperty] = useState<RAGProperty | null>(null)
  const [saving, setSaving] = useState(false)
  const [rowActionId, setRowActionId] = useState<string | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("")
  const [syncing, setSyncing] = useState(false)
  const [linkForm, setLinkForm] = useState({
    ngoId: "",
    ngoName: "",
    ngoSubdomain: "",
    relationshipType: "service-site" as RAGPropertyNGOLink["relationshipType"],
  })

  useEffect(() => {
    if (!properties.length) {
      setSelectedPropertyId("")
      return
    }

    if (!selectedPropertyId || !properties.some((property) => property.id === selectedPropertyId)) {
      setSelectedPropertyId(properties[0].id)
    }
  }, [properties, selectedPropertyId])

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId) ?? null,
    [properties, selectedPropertyId]
  )
  const publicCount = useMemo(
    () => properties.filter((property) => property.isPublic).length,
    [properties]
  )
  const groundsLinkedCount = useMemo(
    () => properties.filter((property) => propertyHasGroundsLink(property)).length,
    [properties]
  )
  const renovationCount = useMemo(
    () => properties.filter((property) => property.status === "in-renovation").length,
    [properties]
  )

  const resetForm = () => {
    setForm(INITIAL_RAG_PROPERTY_FORM_STATE)
    setEditingProperty(null)
  }

  const openCreateSheet = () => {
    resetForm()
    setSheetOpen(true)
  }

  const openEditSheet = (property: RAGProperty) => {
    setEditingProperty(property)
    setForm(getRAGPropertyFormState(property))
    setSheetOpen(true)
  }

  const handleSheetChange = (open: boolean) => {
    setSheetOpen(open)
    if (!open) {
      resetForm()
    }
  }

  const handleFieldChange = <Key extends keyof RAGPropertyFormState>(
    key: Key,
    value: RAGPropertyFormState[Key]
  ) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    const requiredTextFields = [
      form.name,
      form.address,
      form.city,
      form.state,
      form.zip,
      form.node,
      form.publicName,
      form.publicSummary,
    ]

    if (
      requiredTextFields.some((value) => value.trim().length === 0) ||
      !isValidCoordinate(form.lat) ||
      !isValidCoordinate(form.lng)
    ) {
      toast({
        title: "Complete the property form",
        description:
          "Identity, location, node, public summary fields, and coordinates are required.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const payload = buildRAGPropertyPayload(
        form,
        editingProperty?.createdBy || actorLabel || actorId
      )
      const response = await fetch(
        editingProperty ? `/api/property-ops/${editingProperty.id}` : "/api/property-ops",
        {
          method: editingProperty ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const result = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to save property.")
      }

      toast({
        title: editingProperty ? "Property updated" : "Property created",
        description: `${form.publicName} is now synced with the property operations portfolio.`,
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

  const handleSetPublic = async (property: RAGProperty, nextPublic: boolean) => {
    setRowActionId(property.id)

    try {
      const response = await fetch(`/api/property-ops/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: nextPublic }),
      })
      const result = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to update property visibility.")
      }

      toast({
        title: nextPublic ? "Property published" : "Property hidden",
        description: `${property.publicName} is now ${nextPublic ? "visible" : "hidden"} on /property-ops.`,
      })
      await refresh()
    } catch (toggleError) {
      console.error(toggleError)
      toast({
        title: "Unable to update visibility",
        description:
          toggleError instanceof Error ? toggleError.message : "Unknown Firestore error.",
        variant: "destructive",
      })
    } finally {
      setRowActionId(null)
    }
  }

  const patchNGOLinks = async (property: RAGProperty, nextLinks: RAGPropertyNGOLink[]) => {
    const response = await fetch(`/api/property-ops/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ngoLinks: nextLinks }),
    })
    const result = (await response.json()) as { success?: boolean; error?: string }

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Unable to update NGO links.")
    }
  }

  const handleAddNGOLink = async () => {
    if (!selectedProperty) {
      return
    }

    const requiredValues = [
      linkForm.ngoId,
      linkForm.ngoName,
      linkForm.ngoSubdomain,
      linkForm.relationshipType,
    ]

    if (requiredValues.some((value) => value.trim().length === 0)) {
      toast({
        title: "Complete the NGO link",
        description: "NGO id, name, subdomain, and relationship type are required.",
        variant: "destructive",
      })
      return
    }

    try {
      setRowActionId(selectedProperty.id)
      const nextLinks = [
        ...selectedProperty.ngoLinks.filter(
          (link) => link.ngoId.trim().toLowerCase() !== linkForm.ngoId.trim().toLowerCase()
        ),
        {
          ngoId: linkForm.ngoId.trim(),
          ngoName: linkForm.ngoName.trim(),
          ngoSubdomain: linkForm.ngoSubdomain.trim(),
          relationshipType: linkForm.relationshipType,
          linkedAt: new Date().toISOString(),
          linkedBy: actorLabel || actorId,
        },
      ]

      await patchNGOLinks(selectedProperty, nextLinks)
      toast({
        title: "NGO link updated",
        description: `${selectedProperty.publicName} is now linked to ${linkForm.ngoName.trim()}.`,
      })
      setLinkForm({
        ngoId: "",
        ngoName: "",
        ngoSubdomain: "",
        relationshipType: "service-site",
      })
      await refresh()
    } catch (linkError) {
      console.error(linkError)
      toast({
        title: "Unable to update NGO links",
        description: linkError instanceof Error ? linkError.message : "Unknown Firestore error.",
        variant: "destructive",
      })
    } finally {
      setRowActionId(null)
    }
  }

  const handleRemoveNGOLink = async (property: RAGProperty, ngoId: string) => {
    try {
      setRowActionId(property.id)
      const nextLinks = property.ngoLinks.filter((link) => link.ngoId !== ngoId)
      await patchNGOLinks(property, nextLinks)
      toast({
        title: "NGO link removed",
        description: `${property.publicName} no longer carries the ${ngoId} link.`,
      })
      await refresh()
    } catch (removeError) {
      console.error(removeError)
      toast({
        title: "Unable to remove NGO link",
        description:
          removeError instanceof Error ? removeError.message : "Unknown Firestore error.",
        variant: "destructive",
      })
    } finally {
      setRowActionId(null)
    }
  }

  const handleSyncGrounds = async () => {
    setSyncing(true)

    try {
      const response = await fetch("/api/property-ops/sync-grounds", {
        method: "POST",
      })
      const result = (await response.json()) as {
        success?: boolean
        syncedCount?: number
        error?: string
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to sync Grounds-linked properties.")
      }

      toast({
        title: "Grounds sync complete",
        description: `${result.syncedCount ?? 0} property record(s) synced to acquisitionSites.`,
      })
      await refresh()
    } catch (syncError) {
      console.error(syncError)
      toast({
        title: "Grounds sync failed",
        description: syncError instanceof Error ? syncError.message : "Unknown Firestore error.",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Property Operations Admin</h2>
          <p className="text-muted-foreground">
            Manage the Firestore-backed RAG property portfolio here. Public changes stream into
            "/property-ops" in real time.
          </p>
        </div>
        <Button onClick={openCreateSheet}>
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetricTile label="Total Properties" value={properties.length} />
        <AdminMetricTile label="Published" value={publicCount} />
        <AdminMetricTile label="Grounds-Linked" value={groundsLinkedCount} />
        <AdminMetricTile label="In Renovation" value={renovationCount} />
      </div>

      <AdminPanel>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <AdminPanelTitle>Property Inventory</AdminPanelTitle>
              <div className="text-sm text-muted-foreground">
                All `ragProperties` records, including hidden properties and Grounds-linked sites.
              </div>
            </div>
            <Button variant="outline" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading properties...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-700">
              {error}
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-6 text-sm text-muted-foreground">
              No property records found yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="admin-table-head hover:bg-transparent">
                  <TableHead>Public</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Node</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>NGO Links</TableHead>
                  <TableHead>Grounds FK</TableHead>
                  <TableHead>Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((property) => {
                  const classMeta = getPropertyClassMeta(property.propertyClass)
                  const statusMeta = getPropertyStatusMeta(property.status)
                  const rowBusy = rowActionId === property.id

                  return (
                    <TableRow key={property.id} className="admin-table-row">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={property.isPublic}
                            disabled={rowBusy}
                            onCheckedChange={(checked) => void handleSetPublic(property, checked)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {property.isPublic ? "Visible" : "Hidden"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{property.publicName}</div>
                        <div className="text-xs text-muted-foreground">{property.address}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={classMeta.cardClassName}>
                          {classMeta.shortLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusMeta.cardClassName}>
                          {statusMeta.shortLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>{property.node}</TableCell>
                      <TableCell>
                        {property.city}, {property.state}
                      </TableCell>
                      <TableCell>{property.ngoLinks.length}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {property.beamGroundsPropertyId || "Pending"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => openEditSheet(property)}>
                          Edit
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

      <AdminPanel>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <AdminPanelTitle>NGO Link Manager</AdminPanelTitle>
              <div className="text-sm text-muted-foreground">
                Manage `ngoLinks` on property records and push Grounds-linked properties into
                `acquisitionSites`.
              </div>
            </div>
            <Button onClick={() => void handleSyncGrounds()} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Sync Grounds-linked properties
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {properties.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-muted/30 p-6 text-sm text-muted-foreground">
              Add a property before managing NGO links.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-2">
                  <Label>Select property</Label>
                  <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.publicName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <AdminPanelInset>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Grounds sync candidates</div>
                      <div className="text-2xl font-semibold text-foreground">
                        {groundsLinkedCount}
                      </div>
                    </div>
                    <Badge variant="outline">{groundsLinkedCount} linked</Badge>
                  </div>
                </AdminPanelInset>
              </div>

              {selectedProperty ? (
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3">
                    {selectedProperty.ngoLinks.length === 0 ? (
                      <div className="rounded-2xl border border-border/80 bg-muted/30 p-6 text-sm text-muted-foreground">
                        No NGO links added yet for {selectedProperty.publicName}.
                      </div>
                    ) : (
                      selectedProperty.ngoLinks.map((link) => (
                        <AdminPanelInset key={`${selectedProperty.id}-${link.ngoId}`} className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-medium text-foreground">{link.ngoName}</div>
                              <div className="text-sm text-muted-foreground">
                                {link.ngoId} · {link.ngoSubdomain}.beamthinktank.space
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={rowActionId === selectedProperty.id}
                              onClick={() => void handleRemoveNGOLink(selectedProperty, link.ngoId)}
                            >
                              Remove
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{link.relationshipType}</Badge>
                            <Badge variant="outline">Linked by {link.linkedBy}</Badge>
                            <Badge variant="outline">
                              {new Date(link.linkedAt).toLocaleDateString()}
                            </Badge>
                          </div>
                        </AdminPanelInset>
                      ))
                    )}
                  </div>

                  <AdminPanelInset className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-foreground">Add or replace NGO link</div>
                      <div className="text-sm text-muted-foreground">
                        Adding an existing `ngoId` replaces the prior record on this property.
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="property-link-ngo-id">NGO ID</Label>
                      <Input
                        id="property-link-ngo-id"
                        value={linkForm.ngoId}
                        onChange={(event) =>
                          setLinkForm((current) => ({ ...current, ngoId: event.target.value }))
                        }
                        placeholder="grounds"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="property-link-ngo-name">NGO Name</Label>
                      <Input
                        id="property-link-ngo-name"
                        value={linkForm.ngoName}
                        onChange={(event) =>
                          setLinkForm((current) => ({ ...current, ngoName: event.target.value }))
                        }
                        placeholder="BEAM Grounds"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="property-link-subdomain">NGO Subdomain</Label>
                      <Input
                        id="property-link-subdomain"
                        value={linkForm.ngoSubdomain}
                        onChange={(event) =>
                          setLinkForm((current) => ({
                            ...current,
                            ngoSubdomain: event.target.value,
                          }))
                        }
                        placeholder="grounds"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Relationship Type</Label>
                      <Select
                        value={linkForm.relationshipType}
                        onValueChange={(value) =>
                          setLinkForm((current) => ({
                            ...current,
                            relationshipType: value as RAGPropertyNGOLink["relationshipType"],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a relationship type" />
                        </SelectTrigger>
                        <SelectContent>
                          {NGO_RELATIONSHIP_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={() => void handleAddNGOLink()} disabled={rowActionId === selectedProperty.id}>
                      {rowActionId === selectedProperty.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Save NGO Link
                    </Button>
                  </AdminPanelInset>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </AdminPanel>

      <Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
        <SheetContent className="w-full overflow-y-auto border-l border-border bg-background/95 sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{editingProperty ? "Edit Property" : "Add Property"}</SheetTitle>
            <SheetDescription>
              Property updates sync directly into Firestore and stream to the public property
              operations page.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 space-y-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="property-name">Property Name</Label>
                <Input
                  id="property-name"
                  value={form.name}
                  onChange={(event) => handleFieldChange("name", event.target.value)}
                  placeholder="North Avenue Hotel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-node">Node</Label>
                <Input
                  id="property-node"
                  value={form.node}
                  onChange={(event) => handleFieldChange("node", event.target.value)}
                  placeholder="Milwaukee"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="property-address">Address</Label>
                <Input
                  id="property-address"
                  value={form.address}
                  onChange={(event) => handleFieldChange("address", event.target.value)}
                  placeholder="1234 North Avenue"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-city">City</Label>
                <Input
                  id="property-city"
                  value={form.city}
                  onChange={(event) => handleFieldChange("city", event.target.value)}
                  placeholder="Milwaukee"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-state">State</Label>
                <Input
                  id="property-state"
                  value={form.state}
                  onChange={(event) => handleFieldChange("state", event.target.value)}
                  placeholder="WI"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-zip">ZIP</Label>
                <Input
                  id="property-zip"
                  value={form.zip}
                  onChange={(event) => handleFieldChange("zip", event.target.value)}
                  placeholder="53212"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-lat">Latitude</Label>
                <Input
                  id="property-lat"
                  value={form.lat}
                  onChange={(event) => handleFieldChange("lat", event.target.value)}
                  placeholder="43.0389"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-lng">Longitude</Label>
                <Input
                  id="property-lng"
                  value={form.lng}
                  onChange={(event) => handleFieldChange("lng", event.target.value)}
                  placeholder="-87.9065"
                />
              </div>
              <div className="space-y-2">
                <Label>Property Class</Label>
                <Select
                  value={form.propertyClass}
                  onValueChange={(value) =>
                    handleFieldChange("propertyClass", value as RAGProperty["propertyClass"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property class" />
                  </SelectTrigger>
                  <SelectContent>
                    {RAG_PROPERTY_CLASS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    handleFieldChange("status", value as RAGProperty["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {RAG_PROPERTY_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-client-id">Client ID</Label>
                <Input
                  id="property-client-id"
                  value={form.clientId}
                  onChange={(event) => handleFieldChange("clientId", event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-client-name">Client Name</Label>
                <Input
                  id="property-client-name"
                  value={form.clientName}
                  onChange={(event) => handleFieldChange("clientName", event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-public-name">Public Name</Label>
                <Input
                  id="property-public-name"
                  value={form.publicName}
                  onChange={(event) => handleFieldChange("publicName", event.target.value)}
                  placeholder="North Avenue Hotel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-public-image">Public Image URL</Label>
                <Input
                  id="property-public-image"
                  value={form.publicImageUrl}
                  onChange={(event) => handleFieldChange("publicImageUrl", event.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="property-public-summary">Public Summary</Label>
                <Textarea
                  id="property-public-summary"
                  rows={4}
                  value={form.publicSummary}
                  onChange={(event) => handleFieldChange("publicSummary", event.target.value)}
                  placeholder="1–2 sentences on how this property fits the RAG and BEAM Grounds portfolio."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between rounded-xl border border-border/80 px-4 py-3">
                  <div>
                    <div className="font-medium text-foreground">Public listing</div>
                    <div className="text-sm text-muted-foreground">
                      Visible on /property-ops when enabled.
                    </div>
                  </div>
                  <Switch
                    checked={form.isPublic}
                    onCheckedChange={(checked) => handleFieldChange("isPublic", checked)}
                  />
                </div>
              </div>

              {isHotelProperty(form.propertyClass) ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="property-room-count">Room Count</Label>
                    <Input
                      id="property-room-count"
                      value={form.roomCount}
                      onChange={(event) => handleFieldChange("roomCount", event.target.value)}
                      placeholder="96"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="property-star-rating">Star Rating</Label>
                    <Input
                      id="property-star-rating"
                      value={form.starRating}
                      onChange={(event) => handleFieldChange("starRating", event.target.value)}
                      placeholder="3.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="property-brand">Brand Affiliation</Label>
                    <Input
                      id="property-brand"
                      value={form.brandAffiliation}
                      onChange={(event) => handleFieldChange("brandAffiliation", event.target.value)}
                      placeholder="Independent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="property-renovation-budget">Renovation Budget</Label>
                    <Input
                      id="property-renovation-budget"
                      value={form.renovationBudget}
                      onChange={(event) => handleFieldChange("renovationBudget", event.target.value)}
                      placeholder="1250000"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="property-target-completion">Target Completion</Label>
                    <Input
                      id="property-target-completion"
                      value={form.targetCompletion}
                      onChange={(event) => handleFieldChange("targetCompletion", event.target.value)}
                      placeholder="2026-09-30"
                    />
                  </div>
                </>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="property-square-footage">Square Footage</Label>
                <Input
                  id="property-square-footage"
                  value={form.squareFootage}
                  onChange={(event) => handleFieldChange("squareFootage", event.target.value)}
                  placeholder="18000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-purchase-price">Purchase Price</Label>
                <Input
                  id="property-purchase-price"
                  value={form.purchasePrice}
                  onChange={(event) => handleFieldChange("purchasePrice", event.target.value)}
                  placeholder="2500000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-current-value">Current Value</Label>
                <Input
                  id="property-current-value"
                  value={form.currentValue}
                  onChange={(event) => handleFieldChange("currentValue", event.target.value)}
                  placeholder="3100000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="property-grounds-id">BEAM Grounds Property ID</Label>
                <Input
                  id="property-grounds-id"
                  value={form.beamGroundsPropertyId}
                  onChange={(event) =>
                    handleFieldChange("beamGroundsPropertyId", event.target.value)
                  }
                  placeholder="Optional foreign key"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="property-notes">Notes</Label>
                <Textarea
                  id="property-notes"
                  rows={4}
                  value={form.notes}
                  onChange={(event) => handleFieldChange("notes", event.target.value)}
                  placeholder="Internal acquisition notes, management context, or sync reminders."
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => handleSheetChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving..." : editingProperty ? "Save Changes" : "Save Property"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
