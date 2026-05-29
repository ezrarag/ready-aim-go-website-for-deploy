export type LandingAreaId = "space" | "motion" | "nexus" | "cohort"

export type LandingSceneButton = {
  label: string
  href?: string
  nextSceneId?: string
}

export type LandingScene = {
  id: string
  area: LandingAreaId
  roleLabel: string
  actLabel: string
  sceneLabel: string
  eyebrow: string
  videoSrc: string
  overlayTitle: string
  overlaySubtitle: string
  loopStartSeconds: number
  revealOffsetSeconds: number
  nextSceneId?: string
  primaryButton: LandingSceneButton
  secondaryButton: LandingSceneButton
}

export type LandingArea = {
  id: LandingAreaId
  label: string
  shortLabel: string
  subtitle: string
  description: string
  serviceHref: string
  defaultSceneId: string
}

export const SPACE_SIGNUP_URL =
  "https://clients.readyaimgo.biz/auth?redirectTo=/checkout&plan=space_100"

export const SPACE_SCENE_A_VIDEO_URL =
  "https://firebasestorage.googleapis.com/v0/b/readyaimgo-ab187.firebasestorage.app/o/Business%20Area%20Asset%20Videos%2FSpace%2FAct%20I%20Scene%20A.mov?alt=media&token=4bd97c01-46c9-451d-81cb-4c9a36eadeee"

export const SPACE_SCENE_B_VIDEO_URL =
  "https://firebasestorage.googleapis.com/v0/b/readyaimgo-ab187.firebasestorage.app/o/Business%20Area%20Asset%20Videos%2FSpace%2FAct%20I%20Scene%20B.mov?alt=media&token=86eda1a5-eaef-4161-9fe8-6a053ea59fbf"

export const landingAreas: LandingArea[] = [
  {
    id: "space",
    label: "Space Network",
    shortLabel: "Space",
    subtitle: "Meeting rooms · Pop-ups · Studio",
    description: "Activate flexible environments for launches, meetings, studios, and pop-up demand.",
    serviceHref: "/services/space",
    defaultSceneId: "space-scene-a",
  },
  {
    id: "motion",
    label: "Motion Network",
    shortLabel: "Motion",
    subtitle: "Rides · Delivery · Fleet",
    description: "Coordinate movement, routes, delivery, and fleet-backed operator support.",
    serviceHref: "/services/motion",
    defaultSceneId: "motion-act-1",
  },
  {
    id: "nexus",
    label: "Nexus",
    shortLabel: "Nexus",
    subtitle: "Web · App · Creative · Hardware",
    description: "Build the operating layer for sites, apps, creative systems, and client-ready tools.",
    serviceHref: "/services/nexus",
    defaultSceneId: "nexus-act-1",
  },
  {
    id: "cohort",
    label: "Cohort Network",
    shortLabel: "Cohort",
    subtitle: "Specialist teams · BEAM workforce",
    description: "Assemble trained teams around creative, technical, logistics, and support tracks.",
    serviceHref: "/services/cohort",
    defaultSceneId: "cohort-act-1",
  },
]

const spaceSecondaryButton: LandingSceneButton = {
  label: "Join Space Network - $100/mo",
  href: SPACE_SIGNUP_URL,
}

export const landingScenes: LandingScene[] = [
  {
    id: "space-scene-a",
    area: "space",
    roleLabel: "Space Network",
    actLabel: "Act 1",
    sceneLabel: "Scene A",
    eyebrow: "Pop-up launch",
    videoSrc: SPACE_SCENE_A_VIDEO_URL,
    overlayTitle: "Launch your Pop-up",
    overlaySubtitle: "Turn short-term demand into a room, storefront, studio, or hosted activation.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    nextSceneId: "space-scene-b",
    primaryButton: { label: "See More Environments", nextSceneId: "space-scene-b" },
    secondaryButton: spaceSecondaryButton,
  },
  {
    id: "space-scene-b",
    area: "space",
    roleLabel: "Space Network",
    actLabel: "Act 2",
    sceneLabel: "Scene B",
    eyebrow: "Meeting room block",
    videoSrc: SPACE_SCENE_B_VIDEO_URL,
    overlayTitle: "Book the room before the lease",
    overlaySubtitle: "Aggregate client demand first, then route it into partner capacity.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    nextSceneId: "space-scene-c",
    primaryButton: { label: "See Studio Environments", nextSceneId: "space-scene-c" },
    secondaryButton: spaceSecondaryButton,
  },
  {
    id: "space-scene-c",
    area: "space",
    roleLabel: "Space Network",
    actLabel: "Act 3",
    sceneLabel: "Scene C",
    eyebrow: "Studio session",
    videoSrc: SPACE_SCENE_A_VIDEO_URL,
    overlayTitle: "Stage the content room",
    overlaySubtitle: "Use Space credits for shoots, workshops, demos, and production days.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    nextSceneId: "space-scene-d",
    primaryButton: { label: "See Storefront Environments", nextSceneId: "space-scene-d" },
    secondaryButton: spaceSecondaryButton,
  },
  {
    id: "space-scene-d",
    area: "space",
    roleLabel: "Space Network",
    actLabel: "Act 4",
    sceneLabel: "Scene D",
    eyebrow: "Partner inventory",
    videoSrc: SPACE_SCENE_A_VIDEO_URL,
    overlayTitle: "Route demand into partner space",
    overlaySubtitle: "Keep the network flexible while partners see reserved, recurring demand.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    nextSceneId: "space-scene-a",
    primaryButton: { label: "Return to Pop-up Launch", nextSceneId: "space-scene-a" },
    secondaryButton: spaceSecondaryButton,
  },
  {
    id: "motion-act-1",
    area: "motion",
    roleLabel: "Motion Network",
    actLabel: "Act 1",
    sceneLabel: "Dispatch",
    eyebrow: "Route activation",
    videoSrc: SPACE_SCENE_A_VIDEO_URL,
    overlayTitle: "Move the operation",
    overlaySubtitle: "Coordinate rides, delivery, and fleet support around real client demand.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    nextSceneId: "motion-act-2",
    primaryButton: { label: "See Motion Routes", nextSceneId: "motion-act-2" },
    secondaryButton: { label: "View Motion Network", href: "/services/motion" },
  },
  {
    id: "motion-act-2",
    area: "motion",
    roleLabel: "Motion Network",
    actLabel: "Act 2",
    sceneLabel: "Fleet",
    eyebrow: "Fleet support",
    videoSrc: SPACE_SCENE_A_VIDEO_URL,
    overlayTitle: "Build the fleet layer",
    overlaySubtitle: "Turn vehicles, drivers, and recurring routes into a coordinated service lane.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    nextSceneId: "motion-act-1",
    primaryButton: { label: "Return to Dispatch", nextSceneId: "motion-act-1" },
    secondaryButton: { label: "View Motion Network", href: "/services/motion" },
  },
  {
    id: "nexus-act-1",
    area: "nexus",
    roleLabel: "Nexus",
    actLabel: "Act 1",
    sceneLabel: "Build",
    eyebrow: "Digital launch",
    videoSrc: SPACE_SCENE_A_VIDEO_URL,
    overlayTitle: "Build the business layer",
    overlaySubtitle: "Connect web, app, creative, and hardware into a hosted operating presence.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    nextSceneId: "nexus-act-2",
    primaryButton: { label: "See Nexus Systems", nextSceneId: "nexus-act-2" },
    secondaryButton: { label: "View Nexus", href: "/services/nexus" },
  },
  {
    id: "nexus-act-2",
    area: "nexus",
    roleLabel: "Nexus",
    actLabel: "Act 2",
    sceneLabel: "Operate",
    eyebrow: "Client-ready systems",
    videoSrc: SPACE_SCENE_A_VIDEO_URL,
    overlayTitle: "Operate from one hub",
    overlaySubtitle: "Shape the tools, creative, and client flows that make the business repeatable.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    nextSceneId: "nexus-act-1",
    primaryButton: { label: "Return to Digital Launch", nextSceneId: "nexus-act-1" },
    secondaryButton: { label: "View Nexus", href: "/services/nexus" },
  },
  {
    id: "cohort-act-1",
    area: "cohort",
    roleLabel: "Cohort Network",
    actLabel: "Act 1",
    sceneLabel: "Assemble",
    eyebrow: "Team formation",
    videoSrc: SPACE_SCENE_A_VIDEO_URL,
    overlayTitle: "Assemble the specialist team",
    overlaySubtitle: "Bring trained operators into creative, technical, logistics, and support work.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    nextSceneId: "cohort-act-2",
    primaryButton: { label: "See Cohort Tracks", nextSceneId: "cohort-act-2" },
    secondaryButton: { label: "View Cohort Network", href: "/services/cohort" },
  },
  {
    id: "cohort-act-2",
    area: "cohort",
    roleLabel: "Cohort Network",
    actLabel: "Act 2",
    sceneLabel: "Deploy",
    eyebrow: "Workforce deployment",
    videoSrc: SPACE_SCENE_A_VIDEO_URL,
    overlayTitle: "Deploy the workforce",
    overlaySubtitle: "Match recurring work to trained teams and keep the service motion visible.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    nextSceneId: "cohort-act-1",
    primaryButton: { label: "Return to Team Formation", nextSceneId: "cohort-act-1" },
    secondaryButton: { label: "View Cohort Network", href: "/services/cohort" },
  },
]

export const defaultLandingSceneId = "space-scene-a"

export function getLandingScene(sceneId: string) {
  return landingScenes.find((scene) => scene.id === sceneId) ?? landingScenes[0]
}

export function getLandingArea(areaId: LandingAreaId) {
  return landingAreas.find((area) => area.id === areaId) ?? landingAreas[0]
}

export function getScenesForArea(areaId: LandingAreaId) {
  return landingScenes.filter((scene) => scene.area === areaId)
}
