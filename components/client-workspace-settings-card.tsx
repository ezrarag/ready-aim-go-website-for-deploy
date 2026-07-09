"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ADMIN_PRODUCT_KEYS, ADMIN_PRODUCT_LABELS, type AdminProductKey } from "@/lib/admin/products"
import { portalFetch } from "@/lib/portal-client"
import { cn } from "@/lib/utils"

type PortalWorkspaceRecord = {
  id: string
  name: string
  publicUrl: string | null
  previewImageUrl: string | null
  showOnFrontend: boolean
  activeProducts: AdminProductKey[]
}

type WorkspaceForm = {
  name: string
  publicUrl: string
  previewImageUrl: string
  showOnFrontend: boolean
  activeProducts: Set<AdminProductKey>
}

function createEmptyForm(): WorkspaceForm {
  return {
    name: "",
    publicUrl: "",
    previewImageUrl: "",
    showOnFrontend: false,
    activeProducts: new Set(),
  }
}

function formFromRecord(record: PortalWorkspaceRecord): WorkspaceForm {
  return {
    name: record.name || record.id,
    publicUrl: record.publicUrl || "",
    previewImageUrl: record.previewImageUrl || "",
    showOnFrontend: record.showOnFrontend,
    activeProducts: new Set(record.activeProducts),
  }
}

export function ClientWorkspaceSettingsCard({
  onSaved,
}: {
  onSaved?: () => void
}) {
  const [workspace, setWorkspace] = useState<PortalWorkspaceRecord | null>(null)
  const [form, setForm] = useState<WorkspaceForm>(createEmptyForm())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await portalFetch("/api/portal/workspace", { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true || !payload?.data) {
        throw new Error(payload?.error || `Workspace load returned ${response.status}`)
      }
      setWorkspace(payload.data as PortalWorkspaceRecord)
      setForm(formFromRecord(payload.data as PortalWorkspaceRecord))
    } catch (loadError) {
      setWorkspace(null)
      setError(loadError instanceof Error ? loadError.message : "Unable to load workspace settings.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const toggleProduct = (product: AdminProductKey) => {
    setForm((current) => {
      const nextProducts = new Set(current.activeProducts)
      if (nextProducts.has(product)) nextProducts.delete(product)
      else nextProducts.add(product)
      return { ...current, activeProducts: nextProducts }
    })
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const response = await portalFetch("/api/portal/workspace", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          publicUrl: form.publicUrl.trim(),
          previewImageUrl: form.previewImageUrl.trim(),
          showOnFrontend: form.showOnFrontend,
          activeProducts: Array.from(form.activeProducts),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload?.success !== true || !payload?.data) {
        throw new Error(payload?.error || `Workspace save returned ${response.status}`)
      }
      const nextWorkspace = payload.data as PortalWorkspaceRecord
      setWorkspace(nextWorkspace)
      setForm(formFromRecord(nextWorkspace))
      onSaved?.()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save workspace settings.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="bg-neutral-800 border-gray-200 md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">
            WORKSPACE
          </CardTitle>
          <p className="mt-2 text-sm text-neutral-400">
            Title, public URL, front-end visibility, and product selection for your workspace.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || saving}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading workspace settings...
          </div>
        ) : workspace ? (
          <>
            <div className="space-y-2">
              <label className="text-xs text-neutral-500 font-mono">WORKSPACE TITLE</label>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="bg-neutral-900 border-gray-200 text-white"
              />
            </div>

            <label className="flex items-start gap-3 rounded border border-gray-200 px-3 py-3">
              <Checkbox
                checked={form.showOnFrontend}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, showOnFrontend: checked === true }))
                }
              />
              <div>
                <p className="text-sm text-white font-mono">SHOW ON /WORK</p>
                <p className="text-xs text-neutral-500">
                  Allow this workspace to appear on the public showcase when its URL is ready.
                </p>
              </div>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs text-neutral-500 font-mono">PUBLIC URL</label>
                <Input
                  value={form.publicUrl}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, publicUrl: event.target.value }))
                  }
                  placeholder="https://client-site.com"
                  className="bg-neutral-900 border-gray-200 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-neutral-500 font-mono">PREVIEW IMAGE URL</label>
                <Input
                  value={form.previewImageUrl}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, previewImageUrl: event.target.value }))
                  }
                  placeholder="https://.../preview.png"
                  className="bg-neutral-900 border-gray-200 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-neutral-500 font-mono">PRODUCTS</label>
              <div className="flex flex-wrap gap-2">
                {ADMIN_PRODUCT_KEYS.map((product) => {
                  const active = form.activeProducts.has(product)
                  return (
                    <button
                      key={product}
                      type="button"
                      onClick={() => toggleProduct(product)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition",
                        active
                          ? "border-orange-500 bg-orange-500/10 text-orange-300"
                          : "border-gray-200 text-neutral-400 hover:bg-neutral-900"
                      )}
                    >
                      {ADMIN_PRODUCT_LABELS[product]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save workspace settings
              </Button>
            </div>
          </>
        ) : (
          <div className="text-sm text-neutral-400">
            No workspace is linked to this account yet.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
