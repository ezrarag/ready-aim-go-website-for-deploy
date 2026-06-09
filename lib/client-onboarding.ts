import type { ClientDirectoryEntry } from "@/lib/client-directory"

export const CLIENT_SERVICE_OPTIONS = [
  {
    id: "nexus",
    label: "Nexus",
    description: "Web, app, R&D, creative support, and client operating infrastructure.",
  },
  {
    id: "space",
    label: "Space",
    description: "Workspace, rooms, pop-ups, studios, property ops, and facilities support.",
  },
  {
    id: "motion",
    label: "Motion",
    description: "Transportation, fleet, rides, delivery, and logistics coordination.",
  },
  {
    id: "cohort",
    label: "Cohort",
    description: "BEAM participants, specialist teams, training, and cohort delivery capacity.",
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

  if (
    client.websiteUrl ||
    client.deployUrl ||
    client.appUrl ||
    client.rdUrl ||
    client.modules?.web?.enabled ||
    client.modules?.app?.enabled ||
    client.modules?.rd?.enabled
  ) {
    defaults.push("nexus")
  }

  if (client.housingUrl || client.modules?.housing?.enabled) {
    defaults.push("space")
  }

  if (client.transportationUrl || client.modules?.transportation?.enabled) {
    defaults.push("motion")
  }

  return Array.from(new Set(defaults))
}
