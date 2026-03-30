export type PulseProject = {
  name: string
  highlights: string[]
  nextAction?: string
  priority: "high" | "medium" | "low"
}

export type PublicPulseData = {
  summary: string
  priorities: string[]
  risks: string[]
  finance: string[]
  meetings: string[]
  actions: Array<{
    action: string
    owner: string
    priority: "high" | "medium" | "low"
    timeline: string
  }>
  byProject: PulseProject[]
  totalEvents: number
  lastUpdated: string
  error?: string
}

export type ParticipantRoleTrack = "business" | "hybrid" | "transport"
export type ParticipantRoleDemand = "high" | "medium" | "baseline"

export type BeamParticipantRole = {
  id: string
  title: string
  lane: string
  icon: "clipboard" | "route" | "monitor" | "spark" | "handshake" | "wrench"
  track: ParticipantRoleTrack
  focus: string
  responsibilities: string[]
  transportAreas: string[]
  pathways: string[]
  defaultSignals: string[]
  keywords: string[]
}

export type DerivedBeamParticipantRole = BeamParticipantRole & {
  demand: ParticipantRoleDemand
  demandLabel: string
  whyNow: string[]
  score: number
  pulseMentions: number
}

type PulseSignal = {
  kind: "summary" | "priority" | "risk" | "finance" | "meeting" | "action" | "project"
  text: string
}

const SOURCE_WEIGHTS: Record<PulseSignal["kind"], number> = {
  summary: 1.25,
  priority: 2.8,
  risk: 2.5,
  finance: 2.1,
  meeting: 1.9,
  action: 3.2,
  project: 2.4,
}

export const TRANSPORTATION_AREAS = [
  "Repair",
  "Build",
  "Restore",
  "R&D",
  "Legal & Insurance",
  "Logistics & Sourcing",
] as const

export const PARTICIPANT_PATHWAYS = [
  {
    title: "Community Member",
    detail: "Join active delivery work, earn credentials, and build transportation and business experience without needing a degree first.",
  },
  {
    title: "UWM / MATC Student",
    detail: "Use live partner work for practical experience, co-requisite coursework, and portfolio building.",
  },
  {
    title: "Faculty / Professor",
    detail: "Bring applied research, teaching, and mentorship into projects that serve real Milwaukee businesses.",
  },
  {
    title: "Entrepreneur",
    detail: "Use BEAM infrastructure, labor, and research support to move a business idea toward market.",
  },
] as const

const ROLE_DEFINITIONS: BeamParticipantRole[] = [
  {
    id: "intake-guide",
    title: "Client Intake Guide",
    lane: "Onboarding",
    icon: "clipboard",
    track: "business",
    focus: "Turn inbound interest into clean briefs, access steps, and next actions so the rest of the team can move fast.",
    responsibilities: [
      "Translate requests into role-ready briefs",
      "Keep participant onboarding and access lists current",
      "Route new work to the right project lane",
    ],
    transportAreas: ["Logistics & Sourcing"],
    pathways: ["Community Member", "UWM / MATC Student"],
    defaultSignals: [
      "Best when new partner requests and participant intake need a single intake owner.",
      "Keeps the business side of the cohort from stalling before work is assigned.",
    ],
    keywords: [
      "client",
      "intake",
      "onboarding",
      "access",
      "participant",
      "brief",
      "scope",
      "assignment",
      "directory",
      "website",
    ],
  },
  {
    id: "ops-dispatcher",
    title: "Operations Dispatcher",
    lane: "Delivery",
    icon: "route",
    track: "hybrid",
    focus: "Turn pulse priorities, meetings, and live work into assignments, timelines, and accountable follow-up.",
    responsibilities: [
      "Convert priorities into daily or weekly assignments",
      "Prep meetings and maintain follow-up loops",
      "Keep transportation and business deliverables moving together",
    ],
    transportAreas: ["Repair", "Build", "Restore", "Logistics & Sourcing"],
    pathways: ["Community Member", "UWM / MATC Student", "Entrepreneur"],
    defaultSignals: [
      "Critical when multiple owners, timelines, and workstreams need one operating rhythm.",
      "Connects transportation delivery with ReadyAimGo's client-facing commitments.",
    ],
    keywords: [
      "timeline",
      "owner",
      "meeting",
      "calendar",
      "task",
      "action",
      "urgent",
      "deliver",
      "follow-up",
      "schedule",
      "coordination",
      "project",
    ],
  },
  {
    id: "systems-operator",
    title: "Web + Systems Operator",
    lane: "Systems",
    icon: "monitor",
    track: "business",
    focus: "Keep websites, dashboards, deployment flows, and internal tooling aligned with the work the cohort is actually doing.",
    responsibilities: [
      "Maintain dashboard and website accuracy",
      "Support deployment and automation workflows",
      "Bridge project telemetry into clean operating views",
    ],
    transportAreas: ["R&D"],
    pathways: ["UWM / MATC Student", "Faculty / Professor"],
    defaultSignals: [
      "Needed anytime site updates, deploy issues, or dashboard drift start creating confusion.",
      "Turns pulse signals into cleaner operations visibility for the team.",
    ],
    keywords: [
      "deploy",
      "vercel",
      "github",
      "website",
      "dashboard",
      "system",
      "sync",
      "repo",
      "tooling",
      "admin",
      "automation",
    ],
  },
  {
    id: "story-producer",
    title: "Story + Activity Producer",
    lane: "Community",
    icon: "spark",
    track: "business",
    focus: "Capture progress, explain impact, and turn project motion into stories that help participants, partners, and funders understand the work.",
    responsibilities: [
      "Document wins, updates, and cohort activity",
      "Package social, case-study, and partner-facing proof",
      "Keep the public narrative tied to live work",
    ],
    transportAreas: ["Build", "Restore"],
    pathways: ["Community Member", "UWM / MATC Student", "Entrepreneur"],
    defaultSignals: [
      "Strong fit when the team is shipping work but the story of that work is still invisible.",
      "Helps business and transportation activity turn into trust-building public proof.",
    ],
    keywords: [
      "story",
      "activity",
      "content",
      "community",
      "social",
      "brand",
      "outreach",
      "message",
      "update",
      "highlight",
    ],
  },
  {
    id: "partner-builder",
    title: "Partner Growth Builder",
    lane: "Partnerships",
    icon: "handshake",
    track: "hybrid",
    focus: "Translate business needs, finance signals, and partnership conversations into scoped opportunities for cohort delivery.",
    responsibilities: [
      "Shape partner briefs and growth offers",
      "Track revenue, proposals, and business readiness",
      "Convert outside conversations into cohort-friendly work",
    ],
    transportAreas: ["Legal & Insurance", "Logistics & Sourcing", "R&D"],
    pathways: ["Entrepreneur", "Faculty / Professor", "Community Member"],
    defaultSignals: [
      "Useful when opportunities are appearing faster than the team can package them into offers.",
      "Keeps business growth tied to concrete cohort capacity instead of loose conversations.",
    ],
    keywords: [
      "finance",
      "payment",
      "revenue",
      "proposal",
      "partner",
      "business",
      "contract",
      "sales",
      "growth",
      "insurance",
      "legal",
      "opportunity",
    ],
  },
  {
    id: "transport-bridge",
    title: "Transportation Bridge Lead",
    lane: "BEAM Transportation",
    icon: "wrench",
    track: "transport",
    focus: "Map ReadyAimGo staff demand into BEAM Transportation's repair, build, restore, research, compliance, and sourcing lanes.",
    responsibilities: [
      "Translate business-side needs into transportation work packages",
      "Coordinate with the cohort on vehicles, sourcing, and mobility tasks",
      "Keep transportation opportunities visible to staff and participants",
    ],
    transportAreas: [...TRANSPORTATION_AREAS],
    pathways: ["Community Member", "UWM / MATC Student", "Faculty / Professor", "Entrepreneur"],
    defaultSignals: [
      "This role is the handoff point when business operations need vehicles, repairs, sourcing, or transportation-specific research.",
      "It keeps the public staff page connected to the BEAM Transportation cohort instead of treating it as a separate world.",
    ],
    keywords: [
      "fleet",
      "vehicle",
      "transport",
      "repair",
      "build",
      "restore",
      "logistics",
      "sourcing",
      "mobility",
      "cohort",
      "driver",
      "route",
      "insurance",
    ],
  },
]

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9&+\s/-]/g, " ")
}

function trimSignal(value: string, limit = 120) {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, limit - 1).trimEnd()}...`
}

function buildPulseSignals(pulseData?: PublicPulseData | null): PulseSignal[] {
  if (!pulseData) return []

  const signals: PulseSignal[] = []

  if (pulseData.summary) {
    signals.push({ kind: "summary", text: pulseData.summary })
  }

  for (const item of pulseData.priorities ?? []) {
    signals.push({ kind: "priority", text: item })
  }

  for (const item of pulseData.risks ?? []) {
    signals.push({ kind: "risk", text: item })
  }

  for (const item of pulseData.finance ?? []) {
    signals.push({ kind: "finance", text: item })
  }

  for (const item of pulseData.meetings ?? []) {
    signals.push({ kind: "meeting", text: item })
  }

  for (const item of pulseData.actions ?? []) {
    signals.push({
      kind: "action",
      text: `${item.action} Owner ${item.owner} Timeline ${item.timeline}`,
    })
  }

  for (const item of pulseData.byProject ?? []) {
    signals.push({
      kind: "project",
      text: [item.name, ...item.highlights, item.nextAction ?? ""].join(" "),
    })
  }

  return signals
}

function scoreSignal(signal: PulseSignal, keywords: string[]) {
  const normalizedSignal = normalizeText(signal.text)

  return keywords.reduce((score, keyword) => {
    return normalizedSignal.includes(keyword) ? score + SOURCE_WEIGHTS[signal.kind] : score
  }, 0)
}

function demandFromScore(score: number): ParticipantRoleDemand {
  if (score >= 7.5) return "high"
  if (score >= 3.2) return "medium"
  return "baseline"
}

function demandLabelFromScore(score: number) {
  if (score >= 7.5) return "Pulse urgent"
  if (score >= 3.2) return "Pulse active"
  return "Standing need"
}

export function deriveBeamParticipantRoles(
  pulseData?: PublicPulseData | null
): DerivedBeamParticipantRole[] {
  const signals = buildPulseSignals(pulseData)

  return ROLE_DEFINITIONS.map((role, index) => {
    const matches = signals
      .map((signal) => ({
        signal,
        score: scoreSignal(signal, role.keywords),
      }))
      .filter((match) => match.score > 0)
      .sort((left, right) => right.score - left.score)

    const score = matches.reduce((total, match) => total + match.score, 0)
    const whyNow =
      matches.slice(0, 2).map((match) => trimSignal(match.signal.text)) || role.defaultSignals

    return {
      ...role,
      demand: demandFromScore(score),
      demandLabel: demandLabelFromScore(score),
      whyNow: whyNow.length > 0 ? whyNow : role.defaultSignals,
      score: Number((score + (ROLE_DEFINITIONS.length - index) * 0.01).toFixed(2)),
      pulseMentions: matches.length,
    }
  }).sort((left, right) => right.score - left.score)
}

export function deriveTransportationBridgeSignals(pulseData?: PublicPulseData | null): string[] {
  const signals = buildPulseSignals(pulseData)
  const bridgeKeywords = [
    "fleet",
    "vehicle",
    "transport",
    "repair",
    "build",
    "restore",
    "logistics",
    "sourcing",
    "insurance",
    "mobility",
    "driver",
    "route",
  ]

  const matches = signals
    .map((signal) => ({
      text: trimSignal(signal.text, 132),
      score: scoreSignal(signal, bridgeKeywords),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((item) => item.text)

  if (matches.length > 0) return matches

  return [
    "Use the transportation bridge when staff work touches fleet, sourcing, mobility, or partner vehicle support.",
    "The BEAM Transportation site is organized around repair, build, restore, research, legal and insurance, and logistics and sourcing lanes.",
    "A dedicated bridge role keeps participant pathways and business demand connected instead of splitting them into separate funnels.",
  ]
}
