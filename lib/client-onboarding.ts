import type { ClientDirectoryEntry } from "@/lib/client-directory"

export const CLIENT_SERVICE_OPTIONS = [
  {
    id: "web",
    label: "Web presence",
    description: "Website updates, story publishing, and public presence management.",
  },
  {
    id: "app",
    label: "Apps and portals",
    description: "Client apps, internal portals, and product feature delivery.",
  },
  {
    id: "rd",
    label: "Research and development",
    description: "R&D support, experiments, and innovation planning.",
  },
  {
    id: "housing",
    label: "Housing support",
    description: "Housing wallet, lodging, and team accommodations.",
  },
  {
    id: "transportation",
    label: "Transportation",
    description: "Fleet operations, logistics, and transportation coordination.",
  },
  {
    id: "insurance",
    label: "Insurance",
    description: "Coverage planning and insurance support.",
  },
  {
    id: "property-ops",
    label: "Property ops",
    description: "Property operations, facilities oversight, and site coordination.",
  },
  {
    id: "beam-participants",
    label: "BEAM participants",
    description: "Participant operations, coaching, and cohort support.",
  },
] as const

export type ClientServiceInterestKey = (typeof CLIENT_SERVICE_OPTIONS)[number]["id"]

const CLIENT_SERVICE_OPTION_SET = new Set<string>(
  CLIENT_SERVICE_OPTIONS.map((option) => option.id)
)

export function normalizeClientServiceInterests(
  values: unknown
): ClientServiceInterestKey[] {
  if (!Array.isArray(values)) {
    return []
  }

  const normalized = values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value): value is ClientServiceInterestKey => CLIENT_SERVICE_OPTION_SET.has(value))

  return Array.from(new Set(normalized))
}

export function deriveClientInterestDefaults(
  client: Pick<
    ClientDirectoryEntry,
    | "websiteUrl"
    | "deployUrl"
    | "appUrl"
    | "rdUrl"
    | "housingUrl"
    | "transportationUrl"
    | "insuranceUrl"
    | "modules"
  >
): ClientServiceInterestKey[] {
  const defaults: ClientServiceInterestKey[] = []

  if (client.websiteUrl || client.deployUrl || client.modules?.web?.enabled) {
    defaults.push("web")
  }

  if (client.appUrl || client.modules?.app?.enabled) {
    defaults.push("app")
  }

  if (client.rdUrl || client.modules?.rd?.enabled) {
    defaults.push("rd")
  }

  if (client.housingUrl || client.modules?.housing?.enabled) {
    defaults.push("housing")
  }

  if (client.transportationUrl || client.modules?.transportation?.enabled) {
    defaults.push("transportation")
  }

  if (client.insuranceUrl || client.modules?.insurance?.enabled) {
    defaults.push("insurance")
  }

  return Array.from(new Set(defaults))
}
