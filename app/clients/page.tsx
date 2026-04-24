"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  CLIENT_SERVICE_OPTIONS,
  deriveClientInterestDefaults,
  normalizeClientServiceInterests,
  type ClientServiceInterestKey,
} from "@/lib/client-onboarding"
import type { ClientDirectoryEntry } from "@/lib/client-directory"

type PortalDestination = "/signup" | "/login"
type ClientMode = "claim" | "new"

type ClientHandoffForm = {
  contactName: string
  workEmail: string
  phone: string
  role: string
  companyName: string
  organizationType: string
  serviceInterests: ClientServiceInterestKey[]
  notes: string
}

type ClientPortalHandoff = {
  id: string
  mode: ClientMode
  destination: PortalDestination
  companyName: string
  contactName: string
  workEmail: string
  phoneOnly: boolean
  phone: string
  role: string
  organizationType: string
  serviceInterests: ClientServiceInterestKey[]
  notes: string
  claimedClientId: string | null
}

const ORGANIZATION_TYPES = [
  "Transportation",
  "Property operations",
  "Retail",
  "Hospitality",
  "Professional services",
  "Community organization",
  "Real estate",
  "Construction",
  "Other",
]

const EMPTY_FORM: ClientHandoffForm = {
  contactName: "",
  workEmail: "",
  phone: "",
  role: "",
  companyName: "",
  organizationType: "",
  serviceInterests: [],
  notes: "",
}

const claimTabsListClassName =
  "grid w-full grid-cols-2 rounded-[22px] border border-slate-200/80 bg-[rgba(247,248,252,0.95)] p-1.5 text-slate-600 shadow-sm"

const claimTabsTriggerClassName =
  "rounded-[16px] px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900 data-[state=active]:bg-[linear-gradient(180deg,#202a44_0%,#131a31_100%)] data-[state=active]:text-white data-[state=active]:shadow-[0_14px_28px_rgba(15,23,42,0.18)]"

const claimFieldClassName =
  "h-11 rounded-2xl border-slate-200/80 bg-[rgba(248,250,255,0.94)] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-slate-300 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:border-slate-200/80 disabled:bg-slate-100/90 disabled:text-slate-500 disabled:opacity-100"

const claimSelectClassName =
  "flex h-11 w-full rounded-2xl border border-slate-200/80 bg-[rgba(248,250,255,0.94)] px-3 py-2 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-0"

const claimTextareaClassName = `${claimFieldClassName} min-h-32 resize-none py-3`

const claimOutlineButtonClassName =
  "rounded-2xl border-slate-200 bg-white/92 text-slate-800 hover:bg-slate-50 hover:text-slate-950"

const claimEyebrowBadgeClassName =
  "border border-white/90 bg-white/88 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-slate-700 shadow-sm"

const claimLabelClassName = "text-sm font-medium text-slate-700"

function getInitialMode(intent: string | null, tab: string | null): ClientMode {
  if (tab === "new") {
    return "new"
  }

  if (tab === "claim") {
    return "claim"
  }

  return intent === "new" ? "new" : "claim"
}

function matchesClientSearch(client: ClientDirectoryEntry, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return true
  }

  return [client.name, client.storyId, ...client.brands]
    .join(" ")
    .toLowerCase()
    .includes(normalized)
}

export default function ClientsPage() {
  const searchParams = useSearchParams()
  const intent = searchParams.get("intent")
  const tab = searchParams.get("tab")
  const handoffId = searchParams.get("handoff")
  const [mode, setMode] = useState<ClientMode>(() => getInitialMode(intent, tab))
  const [clients, setClients] = useState<ClientDirectoryEntry[]>([])
  const [search, setSearch] = useState("")
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [form, setForm] = useState<ClientHandoffForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [handoffLoading, setHandoffLoading] = useState(false)
  const [error, setError] = useState("")
  const [submittingTo, setSubmittingTo] = useState<PortalDestination | null>(null)

  useEffect(() => {
    setMode(getInitialMode(intent, tab))
  }, [intent, tab])

  useEffect(() => {
    if (!handoffId) {
      return
    }

    let cancelled = false

    const loadHandoff = async () => {
      try {
        setHandoffLoading(true)
        const response = await fetch(`/api/client-handoff/${encodeURIComponent(handoffId)}`, {
          cache: "no-store",
        })
        const payload = await response.json()

        if (!response.ok || !payload?.handoff) {
          throw new Error(payload?.error || "Unable to load the saved client intake.")
        }

        if (cancelled) {
          return
        }

        const handoff = payload.handoff as ClientPortalHandoff
        setMode(handoff.mode)
        setSelectedClientId(handoff.mode === "claim" ? handoff.claimedClientId : null)
        setForm({
          contactName: handoff.contactName,
          workEmail: handoff.phoneOnly ? "" : handoff.workEmail,
          phone: handoff.phone,
          role: handoff.role,
          companyName: handoff.companyName,
          organizationType: handoff.organizationType,
          serviceInterests: normalizeClientServiceInterests(handoff.serviceInterests),
          notes: handoff.notes,
        })
        setError("")
      } catch (handoffError) {
        console.error(handoffError)
        if (!cancelled) {
          setError(
            handoffError instanceof Error
              ? handoffError.message
              : "Unable to load the saved client intake."
          )
        }
      } finally {
        if (!cancelled) {
          setHandoffLoading(false)
        }
      }
    }

    void loadHandoff()

    return () => {
      cancelled = true
    }
  }, [handoffId])

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/clients", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("Failed to load clients.")
        }

        const payload = await response.json()
        const nextClients = Array.isArray(payload.clients)
          ? (payload.clients as ClientDirectoryEntry[]).filter(
              (client) => client.showOnFrontend !== false
            )
          : []

        setClients(nextClients)
      } catch (fetchError) {
        console.error(fetchError)
        setError("Unable to load the current client roster.")
      } finally {
        setLoading(false)
      }
    }

    void loadClients()
  }, [])

  const filteredClients = useMemo(
    () => clients.filter((client) => matchesClientSearch(client, search)),
    [clients, search]
  )

  useEffect(() => {
    if (mode !== "claim") {
      return
    }

    if (!selectedClientId || !filteredClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(filteredClients[0]?.id ?? null)
    }
  }, [filteredClients, mode, selectedClientId])

  const selectedClient =
    clients.find((client) => client.id === selectedClientId) ?? null

  useEffect(() => {
    if (mode !== "claim" || !selectedClient) {
      return
    }

    setForm((current) => ({
      ...current,
      serviceInterests:
        current.serviceInterests.length > 0
          ? current.serviceInterests
          : deriveClientInterestDefaults(selectedClient),
    }))
  }, [mode, selectedClient])

  const selectedStoryHref = selectedClient
    ? `/story/${encodeURIComponent(selectedClient.storyId)}/website`
    : null

  const handleFieldChange = <K extends keyof ClientHandoffForm>(
    field: K,
    value: ClientHandoffForm[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const toggleService = (serviceId: ClientServiceInterestKey, checked: boolean) => {
    setForm((current) => ({
      ...current,
      serviceInterests: checked
        ? Array.from(new Set([...current.serviceInterests, serviceId]))
        : current.serviceInterests.filter((value) => value !== serviceId),
    }))
  }

  const submitHandoff = async (destination: PortalDestination) => {
    setError("")
    setSubmittingTo(destination)

    try {
      const response = await fetch("/api/client-handoff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: mode === "claim" && selectedClient ? "claim" : "new",
          destination,
          claimedClientId: mode === "claim" ? selectedClient?.id : null,
          contactName: form.contactName,
          workEmail: form.workEmail,
          phone: form.phone,
          role: form.role,
          companyName: mode === "claim" ? selectedClient?.name ?? form.companyName : form.companyName,
          organizationType: form.organizationType,
          serviceInterests: form.serviceInterests,
          notes: form.notes,
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload?.portalUrl) {
        throw new Error(payload?.error || "Unable to continue to the client portal.")
      }

      window.location.assign(payload.portalUrl)
    } catch (submitError) {
      console.error(submitError)
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to continue to the client portal."
      )
      setSubmittingTo(null)
    }
  }

  const claimDisabled =
    mode === "claim" &&
    (!selectedClient ||
      !form.contactName.trim() ||
      (!form.workEmail.trim() && form.phone.replace(/\D/g, "").length < 7))

  const newClientDisabled =
    mode === "new" &&
    (!form.companyName.trim() ||
      !form.contactName.trim() ||
      (!form.workEmail.trim() && form.phone.replace(/\D/g, "").length < 7))

  const isSubmitDisabled =
    handoffLoading || submittingTo !== null || (mode === "claim" ? claimDisabled : newClientDisabled)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_32%),linear-gradient(180deg,_#fffdf8_0%,_#f5f7fb_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <section className="space-y-6">
            <Badge variant="secondary" className={claimEyebrowBadgeClassName}>
              Client onboarding gateway
            </Badge>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Find your business on ReadyAimGo, confirm the fit, and continue into the client
                portal with context already attached.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-slate-600">
                Existing clients can claim the story that already represents them. New visitors can
                introduce their business here and then continue to
                {" "}
                <span className="font-semibold text-slate-900">clients.readyaimgo.biz</span>
                {" "}
                to finish account setup.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Preview first",
                  copy: "Search the live roster, check the story entry, and make sure you have the right business.",
                  icon: Search,
                },
                {
                  title: "Submit intake",
                  copy: "Add the contact and demographic details that should follow your account into the portal.",
                  icon: UserRound,
                },
                {
                  title: "Continue with context",
                  copy: "Signup or login in the client portal with the claimed business and requested service areas already attached.",
                  icon: Sparkles,
                },
              ].map((item) => (
                <Card key={item.title} className="border-white/80 bg-white/75 shadow-sm">
                  <CardContent className="space-y-3 p-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#202a44_0%,#131a31_100%)] text-white">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.copy}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="overflow-hidden border-white/80 bg-white/80 shadow-lg">
              <CardHeader className="border-b border-slate-200/70 bg-white/60">
                <CardTitle className="text-slate-950">Choose your path</CardTitle>
                <CardDescription className="text-slate-600">
                  Existing clients should claim their current story. New businesses can start a
                  fresh intake.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6">
                {handoffLoading ? (
                  <div className="mb-6 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Loading the saved client intake details…
                  </div>
                ) : null}

                <Tabs value={mode} onValueChange={(value) => setMode(value as ClientMode)}>
                  <TabsList className={claimTabsListClassName}>
                    <TabsTrigger value="claim" className={claimTabsTriggerClassName}>
                      Claim an existing business
                    </TabsTrigger>
                    <TabsTrigger value="new" className={claimTabsTriggerClassName}>
                      Become a new client
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="claim" className="mt-6 space-y-5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search PaynePros, Asher Mining, SweetFreak, story IDs, or brands"
                        className={`h-12 pl-10 ${claimFieldClassName}`}
                      />
                    </div>

                    {loading ? (
                      <div className="flex min-h-40 items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                      </div>
                    ) : filteredClients.length === 0 ? (
                      <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                        No public client entries matched that search.
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {filteredClients.map((client) => {
                          const isSelected = client.id === selectedClientId
                          const enabledServices = deriveClientInterestDefaults(client)

                          return (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => setSelectedClientId(client.id)}
                              className={`rounded-[28px] border p-5 text-left transition-all ${
                                isSelected
                                  ? "border-[#1d2740] bg-[linear-gradient(180deg,#18233d_0%,#0d1327_100%)] text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)]"
                                  : "border-slate-200/90 bg-[linear-gradient(180deg,rgba(249,250,254,0.98)_0%,rgba(242,246,253,0.98)_100%)] text-slate-900 shadow-[0_10px_26px_rgba(148,163,184,0.12)] hover:border-slate-300 hover:shadow-[0_16px_32px_rgba(148,163,184,0.16)]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xl font-semibold">{client.name}</p>
                                  <p
                                    className={`mt-1 text-sm ${
                                      isSelected ? "text-white/70" : "text-slate-600"
                                    }`}
                                  >
                                    {client.storyId}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    isSelected
                                      ? "border-white/15 bg-white/12 text-white"
                                      : "border-slate-200/80 bg-white/90 text-slate-600"
                                  }
                                >
                                  {client.status}
                                </Badge>
                              </div>

                              {client.brands.length > 0 ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {client.brands.slice(0, 3).map((brand) => (
                                    <Badge
                                      key={brand}
                                      variant="outline"
                                      className={
                                        isSelected
                                          ? "border-white/20 bg-white/10 text-white/90"
                                          : "border-slate-200/80 bg-white/80 text-slate-600"
                                      }
                                    >
                                      {brand}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}

                              <p
                                className={`mt-4 line-clamp-3 text-sm leading-6 ${
                                  isSelected ? "text-white/80" : "text-slate-700"
                                }`}
                              >
                                {client.pulseSummary || client.lastActivity || "Current client story entry."}
                              </p>

                              {enabledServices.length > 0 ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {enabledServices.map((serviceId) => {
                                    const option = CLIENT_SERVICE_OPTIONS.find(
                                      (item) => item.id === serviceId
                                    )
                                    if (!option) {
                                      return null
                                    }

                                    return (
                                      <Badge
                                        key={serviceId}
                                        variant="outline"
                                        className={
                                          isSelected
                                            ? "border-white/10 bg-white/12 text-white"
                                            : "border-slate-200/80 bg-white/78 text-slate-600"
                                        }
                                      >
                                        {option.label}
                                      </Badge>
                                    )
                                  })}
                                </div>
                              ) : null}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {selectedClient ? (
                      <Card className="border-slate-200 bg-slate-50/80">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-xl text-slate-950">
                            <Store className="h-5 w-5 text-slate-700" />
                            {selectedClient.name}
                          </CardTitle>
                          <CardDescription className="text-slate-600">
                            Review the current story entry before continuing into the portal.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                Story ID
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-950">
                                {selectedClient.storyId}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                                Current status
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-950">
                                {selectedClient.status}
                              </p>
                            </div>
                          </div>

                          <p className="text-sm leading-7 text-slate-600">
                            {selectedClient.pulseSummary ||
                              "This business already has a ReadyAimGo story entry you can claim."}
                          </p>

                          <div className="flex flex-wrap gap-3">
                            {selectedStoryHref ? (
                              <Button asChild variant="outline" className={claimOutlineButtonClassName}>
                                <Link href={selectedStoryHref}>
                                  Preview current story
                                  <ExternalLink className="ml-2 h-4 w-4" />
                                </Link>
                              </Button>
                            ) : null}

                            {selectedClient.websiteUrl ? (
                              <Button asChild variant="outline" className={claimOutlineButtonClassName}>
                                <a
                                  href={selectedClient.websiteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Visit website
                                  <ExternalLink className="ml-2 h-4 w-4" />
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="new" className="mt-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="border-slate-200 bg-white">
                        <CardContent className="space-y-4 p-5">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#202a44_0%,#131a31_100%)] text-white">
                            <Building2 className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-lg font-semibold text-slate-950">
                              New client intake
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              Tell us who you are, what kind of organization you run, and which
                              ReadyAimGo areas you want to activate.
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-200 bg-white">
                        <CardContent className="space-y-4 p-5">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                            <CheckCircle2 className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-lg font-semibold text-slate-950">
                              Portal-ready handoff
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              When you continue, your intake follows you into the client portal so
                              the first dashboard session starts with business context already in
                              place.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </section>

          <section className="lg:sticky lg:top-8">
            <Card className="overflow-hidden border-white/80 bg-white/88 shadow-xl">
              <CardHeader className="border-b border-slate-200/70 bg-white/75">
                <CardTitle className="text-slate-950">
                  {mode === "claim" ? "Claim your business" : "Start your client intake"}
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Add the contact details and service areas that should follow you into the client
                  portal.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                {error ? (
                  <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                {mode === "claim" && selectedClient ? (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                      Selected business
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">
                      {selectedClient.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedClient.storyId}
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name" className={claimLabelClassName}>
                      Your name
                    </Label>
                    <Input
                      id="contact-name"
                      value={form.contactName}
                      onChange={(event) => handleFieldChange("contactName", event.target.value)}
                      placeholder="Jane Smith"
                      className={claimFieldClassName}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="work-email" className={claimLabelClassName}>
                      Work email
                      {!form.workEmail.trim() && form.phone.replace(/\D/g, "").length >= 7 ? (
                        <span className="ml-2 text-xs font-normal text-amber-600">(optional — phone provided)</span>
                      ) : (
                        <span className="ml-1 text-xs font-normal text-slate-400">or phone below</span>
                      )}
                    </Label>
                    <Input
                      id="work-email"
                      type="email"
                      value={form.workEmail}
                      onChange={(event) => handleFieldChange("workEmail", event.target.value)}
                      placeholder="jane@company.com"
                      className={claimFieldClassName}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className={claimLabelClassName}>
                      Phone
                      {!form.workEmail.trim() ? (
                        <span className="ml-1 text-xs font-normal text-slate-400">(required if no email)</span>
                      ) : null}
                    </Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(event) => handleFieldChange("phone", event.target.value)}
                      placeholder="(312) 555-0199"
                      className={claimFieldClassName}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className={claimLabelClassName}>
                      Role or title
                    </Label>
                    <Input
                      id="role"
                      value={form.role}
                      onChange={(event) => handleFieldChange("role", event.target.value)}
                      placeholder="Founder, operations lead, executive director"
                      className={claimFieldClassName}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company-name" className={claimLabelClassName}>
                      Company name
                    </Label>
                    <Input
                      id="company-name"
                      value={mode === "claim" && selectedClient ? selectedClient.name : form.companyName}
                      onChange={(event) => handleFieldChange("companyName", event.target.value)}
                      placeholder="Enter your business name"
                      disabled={mode === "claim" && Boolean(selectedClient)}
                      className={claimFieldClassName}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organization-type" className={claimLabelClassName}>
                      Organization type
                    </Label>
                    <select
                      id="organization-type"
                      value={form.organizationType}
                      onChange={(event) =>
                        handleFieldChange("organizationType", event.target.value)
                      }
                      className={claimSelectClassName}
                    >
                      <option value="">Select one</option>
                      {ORGANIZATION_TYPES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className={claimLabelClassName}>Service areas to discuss</Label>
                  <div className="grid gap-3">
                    {CLIENT_SERVICE_OPTIONS.map((option) => {
                      const checked = form.serviceInterests.includes(option.id)

                      return (
                        <label
                          key={option.id}
                          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/80 bg-[rgba(248,250,255,0.92)] px-4 py-3"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => toggleService(option.id, value === true)}
                            className="mt-0.5 border-slate-300 focus-visible:ring-slate-300 data-[state=checked]:border-[#1d2740] data-[state=checked]:bg-[#1d2740] data-[state=checked]:text-white"
                          />
                          <span className="space-y-1">
                            <span className="block text-sm font-semibold text-slate-900">
                              {option.label}
                            </span>
                            <span className="block text-sm leading-6 text-slate-600">
                              {option.description}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className={claimLabelClassName}>
                    Demographic or onboarding notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(event) => handleFieldChange("notes", event.target.value)}
                    placeholder="Share market, operating region, team size, client population, or what you need ReadyAimGo to activate first."
                    className={claimTextareaClassName}
                  />
                </div>

                <div className="grid gap-3">
                  <Button
                    onClick={() => void submitHandoff("/signup")}
                    disabled={isSubmitDisabled}
                    className="w-full rounded-2xl bg-[linear-gradient(180deg,#202a44_0%,#131a31_100%)] text-white shadow-[0_18px_35px_rgba(15,23,42,0.16)] hover:opacity-95"
                  >
                    {submittingTo === "/signup" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending to client signup
                      </>
                    ) : (
                      <>
                        Continue to client signup
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => void submitHandoff("/login")}
                    disabled={isSubmitDisabled}
                    className={`w-full ${claimOutlineButtonClassName}`}
                  >
                    {submittingTo === "/login" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending to client login
                      </>
                    ) : (
                      "I already have a portal account"
                    )}
                  </Button>
                </div>

                <p className="text-xs leading-6 text-slate-500">
                  This step prepares your business context on
                  {" "}
                  <span className="font-semibold text-slate-700">readyaimgo.biz</span>
                  {" "}
                  and carries it into
                  {" "}
                  <span className="font-semibold text-slate-700">
                    clients.readyaimgo.biz
                  </span>
                  {" "}
                  for account access.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  )
}
