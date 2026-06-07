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
  autoAdvanceSeconds?: number   // NEW: seconds before auto-advancing to nextSceneId
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

// ── Signup URLs ────────────────────────────────────────────────────────────────

export const SPACE_SIGNUP_URL =
  "https://clients.readyaimgo.biz/auth?redirectTo=/checkout&plan=space_100"
export const MOTION_SIGNUP_URL =
  "https://clients.readyaimgo.biz/auth?redirectTo=/checkout&plan=motion_100"
export const NEXUS_SIGNUP_URL =
  "https://clients.readyaimgo.biz/auth?redirectTo=/checkout&plan=nexus_50"
export const COHORT_SIGNUP_URL =
  "https://clients.readyaimgo.biz/auth?redirectTo=/checkout&plan=cohort_100"

// ── Space Network video URLs ───────────────────────────────────────────────────
// Scene A and B are uploaded. C–H use Scene A as placeholder until uploads complete.
// Replace each PLACEHOLDER comment with the real Firebase Storage URL when ready.

export const SPACE_SCENE_A_VIDEO_URL =
  "https://firebasestorage.googleapis.com/v0/b/readyaimgo-ab187.firebasestorage.app/o/Business%20Area%20Asset%20Videos%2FSpace%2FScene%20A.mov?alt=media&token=e4c12473-0145-4532-8a7f-3127ce13e915"

export const SPACE_SCENE_B_VIDEO_URL =
  "https://firebasestorage.googleapis.com/v0/b/readyaimgo-ab187.firebasestorage.app/o/Business%20Area%20Asset%20Videos%2FSpace%2FScene%20B.mov?alt=media&token=d0e81d77-64b2-4f10-a076-e2b0a6bcf8ca"

export const SPACE_SCENE_C_VIDEO_URL = 
  "https://firebasestorage.googleapis.com/v0/b/readyaimgo-ab187.firebasestorage.app/o/Business%20Area%20Asset%20Videos%2FSpace%2FScene%20C.mov?alt=media&token=0e2824c7-4608-453d-8bff-d096fc12e535"

export const SPACE_SCENE_D_VIDEO_URL = 
  "https://firebasestorage.googleapis.com/v0/b/readyaimgo-ab187.firebasestorage.app/o/Business%20Area%20Asset%20Videos%2FSpace%2FScene%20D.mov?alt=media&token=776fa524-4d85-4947-9508-41db95b4aeb5"

export const SPACE_SCENE_E_VIDEO_URL = 
  "https://firebasestorage.googleapis.com/v0/b/readyaimgo-ab187.firebasestorage.app/o/Business%20Area%20Asset%20Videos%2FSpace%2FScene%20F.mov?alt=media&token=a4c185b6-9100-411c-8ad2-6f16947c9ac9"

export const SPACE_SCENE_F_VIDEO_URL = 
  "https://firebasestorage.googleapis.com/v0/b/readyaimgo-ab187.firebasestorage.app/o/Business%20Area%20Asset%20Videos%2FSpace%2FScene%20F2.mov?alt=media&token=31f08a7a-cf42-40e1-ae09-1b3d0c04bb8d"

export const SPACE_SCENE_G_VIDEO_URL = 
  "https://firebasestorage.googleapis.com/v0/b/readyaimgo-ab187.firebasestorage.app/o/Business%20Area%20Asset%20Videos%2FSpace%2FScene%20G.mov?alt=media&token=148f19c7-698b-4bb7-81cd-00667441902b"

export const SPACE_SCENE_H_VIDEO_URL = 
  "https://firebasestorage.googleapis.com/v0/b/readyaimgo-ab187.firebasestorage.app/o/Business%20Area%20Asset%20Videos%2FSpace%2FScene%20H.mov?alt=media&token=7fc61222-7aa0-45e8-8896-199952196706"

// ── Motion Network video URLs ──────────────────────────────────────────────────
// All placeholders until Motion videos are uploaded.

export const MOTION_SCENE_A_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const MOTION_SCENE_B_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const MOTION_SCENE_C_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const MOTION_SCENE_D_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const MOTION_SCENE_E_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const MOTION_SCENE_F_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const MOTION_SCENE_G_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL

// ── Nexus video URLs ───────────────────────────────────────────────────────────

export const NEXUS_SCENE_A_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const NEXUS_SCENE_B_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const NEXUS_SCENE_C_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const NEXUS_SCENE_D_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const NEXUS_SCENE_E_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const NEXUS_SCENE_F_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const NEXUS_SCENE_G_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL

// ── Cohort Network video URLs ──────────────────────────────────────────────────

export const COHORT_SCENE_A_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const COHORT_SCENE_B_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const COHORT_SCENE_C_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const COHORT_SCENE_D_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const COHORT_SCENE_E_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const COHORT_SCENE_F_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL
export const COHORT_SCENE_G_VIDEO_URL = SPACE_SCENE_A_VIDEO_URL

// ── Landing areas ──────────────────────────────────────────────────────────────

export const landingAreas: LandingArea[] = [
  {
    id: "space",
    label: "Space Network",
    shortLabel: "Space",
    subtitle: "$100/mo · 24-hr access · Credits",
    description:
      "Retail, storage, and meeting space with 24-hour access. Credits redeem for hotel stays, pop-up storefronts, and premium rooms. A key — not a booking window.",
    serviceHref: "/services/space",
    defaultSceneId: "space-scene-a",
  },
  {
    id: "motion",
    label: "Motion Network",
    shortLabel: "Motion",
    subtitle: "$100/mo · BEAM drivers · Fleet",
    description:
      "Fractional fleet logistics — rides, delivery, and scheduled supply runs — powered by BEAM Transportation cohort drivers. Move the operation without owning a vehicle.",
    serviceHref: "/services/motion",
    defaultSceneId: "motion-scene-a",
  },
  {
    id: "nexus",
    label: "Nexus",
    shortLabel: "Nexus",
    subtitle: "$50/mo · Hosting · Creative · Device",
    description:
      "Full web and app hosting, a professional creative team on standby, and a dedicated business device — three expenses bundled into one subscription.",
    serviceHref: "/services/nexus",
    defaultSceneId: "nexus-scene-a",
  },
  {
    id: "cohort",
    label: "Cohort Network",
    shortLabel: "Cohort",
    subtitle: "$100/mo · Tech · Creative · Logistics · Forge",
    description:
      "Fractional access to four pre-trained BEAM specialist tracks. The team without the payroll — tech, creative, logistics, and hands-on production work.",
    serviceHref: "/services/cohort",
    defaultSceneId: "cohort-scene-a",
  },
]

// ── Shared secondary buttons ───────────────────────────────────────────────────

const spaceSecondaryButton: LandingSceneButton = {
  label: "Join Space Network · $100/mo",
  href: SPACE_SIGNUP_URL,
}
const motionSecondaryButton: LandingSceneButton = {
  label: "Join Motion Network · $100/mo",
  href: MOTION_SIGNUP_URL,
}
const nexusSecondaryButton: LandingSceneButton = {
  label: "Join Nexus · $50/mo",
  href: NEXUS_SIGNUP_URL,
}
const cohortSecondaryButton: LandingSceneButton = {
  label: "Join Cohort Network · $100/mo",
  href: COHORT_SIGNUP_URL,
}

// ── Landing scenes ─────────────────────────────────────────────────────────────
// overlayTitle and overlaySubtitle are derived directly from the voiceover
// transcription in each scene. They should feel like a distillation of what
// is being said on screen — not marketing copy that contradicts the voiceover.
//
// autoAdvanceSeconds: how long the scene plays before auto-advancing.
// Set to the approximate runtime of that scene's voiceover + 3 seconds buffer.
// Scene runtimes calculated at 140 wpm from the production documents.

export const landingScenes: LandingScene[] = [

  // ════════════════════════════════════════════════════════════════════════════
  // SPACE NETWORK — 8 scenes (A through H)
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: "space-scene-a",
    area: "space",
    roleLabel: "Space Network",
    actLabel: "Act 1 of 8",
    sceneLabel: "Scene A",
    eyebrow: "The problem",
    videoSrc: SPACE_SCENE_A_VIDEO_URL,
    overlayTitle: "The broken model",
    overlaySubtitle:
      "Commercial leases ask for years of commitment before a business has proven demand.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 20,
    nextSceneId: "space-scene-b",
    primaryButton: { label: "What Space Network is →", nextSceneId: "space-scene-b" },
    secondaryButton: spaceSecondaryButton,
  },
  {
    id: "space-scene-b",
    area: "space",
    roleLabel: "Space Network",
    actLabel: "Act 2 of 8",
    sceneLabel: "Scene B",
    eyebrow: "What it is",
    videoSrc: SPACE_SCENE_B_VIDEO_URL,
    overlayTitle: "A key — not a booking window",
    overlaySubtitle:
      "$100/mo. 24-hr access to retail, storage, and meeting space. 12 credits/mo for hotel stays and pop-ups. A cut of in-space sales back to the platform.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 56,
    nextSceneId: "space-scene-c",
    primaryButton: { label: "The economics →", nextSceneId: "space-scene-c" },
    secondaryButton: spaceSecondaryButton,
  },
  {
    id: "space-scene-c",
    area: "space",
    roleLabel: "Space Network",
    actLabel: "Act 3 of 8",
    sceneLabel: "Scene C",
    eyebrow: "The economics",
    videoSrc: SPACE_SCENE_C_VIDEO_URL,
    overlayTitle: "Permanent access — not hours",
    overlaySubtitle:
      "Storage at midnight. Retail on Saturday. Credits for hotel partners and pop-up slots. Space Network only grows when members grow.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 43,
    nextSceneId: "space-scene-d",
    primaryButton: { label: "Milwaukee landscape →", nextSceneId: "space-scene-d" },
    secondaryButton: spaceSecondaryButton,
  },
  {
    id: "space-scene-d",
    area: "space",
    roleLabel: "Space Network",
    actLabel: "Act 4 of 8",
    sceneLabel: "Scene D",
    eyebrow: "Milwaukee landscape",
    videoSrc: SPACE_SCENE_D_VIDEO_URL,
    overlayTitle: "Plug in — don't replace",
    overlaySubtitle:
      "Sherman Phoenix. VIA CDC. Riverworks. MiSA. Voces de la Frontera. UWM. Space Network connects to what Milwaukee already has.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 29,
    nextSceneId: "space-scene-e",
    primaryButton: { label: "Three paths to capacity →", nextSceneId: "space-scene-e" },
    secondaryButton: spaceSecondaryButton,
  },
  {
    id: "space-scene-e",
    area: "space",
    roleLabel: "Space Network",
    actLabel: "Act 5 of 8",
    sceneLabel: "Scene E",
    eyebrow: "Three acquisition paths",
    videoSrc: SPACE_SCENE_E_VIDEO_URL,
    overlayTitle: "Now · 6 months · 18 months",
    overlaySubtitle:
      "Hospitality blocks immediately. BID/NID storefront at 6 months. University master-lease at 12–18 months. Each path proves the next.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 36,
    nextSceneId: "space-scene-f",
    primaryButton: { label: "Hotel credit network →", nextSceneId: "space-scene-f" },
    secondaryButton: spaceSecondaryButton,
  },
  {
    id: "space-scene-f",
    area: "space",
    roleLabel: "Space Network",
    actLabel: "Act 6 of 8",
    sceneLabel: "Scene F",
    eyebrow: "Hotel credit network",
    videoSrc: SPACE_SCENE_F_VIDEO_URL,
    overlayTitle: "Business travel built into the subscription",
    overlaySubtitle:
      "Mid-week hotel inventory becomes the credit redemption network. The hotel gets occupancy. Members get business travel. Credits move the gap.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 30,
    nextSceneId: "space-scene-g",
    primaryButton: { label: "Partner framework →", nextSceneId: "space-scene-g" },
    secondaryButton: spaceSecondaryButton,
  },
  {
    id: "space-scene-g",
    area: "space",
    roleLabel: "Space Network",
    actLabel: "Act 7 of 8",
    sceneLabel: "Scene G",
    eyebrow: "Partner framework",
    videoSrc: SPACE_SCENE_G_VIDEO_URL,
    overlayTitle: "We bring members. You bring space.",
    overlaySubtitle:
      "Property reserve from every subscription. Revenue share on in-space sales. Protected inventory. Your revenue grows as members grow — not just as headcount grows.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 30,
    nextSceneId: "space-scene-h",
    primaryButton: { label: "Next steps →", nextSceneId: "space-scene-h" },
    secondaryButton: spaceSecondaryButton,
  },
  {
    id: "space-scene-h",
    area: "space",
    roleLabel: "Space Network",
    actLabel: "Act 8 of 8",
    sceneLabel: "Scene H",
    eyebrow: "Next steps",
    videoSrc: SPACE_SCENE_H_VIDEO_URL,
    overlayTitle: "The members are ready. We are looking for the space.",
    overlaySubtitle:
      "Join the demand grid. Pitch a hotel or BID this week. Align a community organization. Sign a memorandum of understanding.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 42,
    nextSceneId: "space-scene-a",
    primaryButton: { label: "Start again →", nextSceneId: "space-scene-a" },
    secondaryButton: spaceSecondaryButton,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // MOTION NETWORK — 7 scenes (A through G)
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: "motion-scene-a",
    area: "motion",
    roleLabel: "Motion Network",
    actLabel: "Act 1 of 7",
    sceneLabel: "Scene A",
    eyebrow: "The logistics problem",
    videoSrc: MOTION_SCENE_A_VIDEO_URL,
    overlayTitle: "Most businesses need to move things",
    overlaySubtitle:
      "Products. People. Equipment. But they cannot afford a vehicle, a driver, or a logistics operation. Motion Network is the subscription that solves it.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 20,
    nextSceneId: "motion-scene-b",
    primaryButton: { label: "What Motion includes →", nextSceneId: "motion-scene-b" },
    secondaryButton: motionSecondaryButton,
  },
  {
    id: "motion-scene-b",
    area: "motion",
    roleLabel: "Motion Network",
    actLabel: "Act 2 of 7",
    sceneLabel: "Scene B",
    eyebrow: "What it includes",
    videoSrc: MOTION_SCENE_B_VIDEO_URL,
    overlayTitle: "Delivery · Team transport · Scheduled runs",
    overlaySubtitle:
      "Submit a request through the platform. BEAM drivers fulfill it on schedule. Credits cover core logistics. Additional runs at per-trip rate.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 52,
    nextSceneId: "motion-scene-c",
    primaryButton: { label: "The economics →", nextSceneId: "motion-scene-c" },
    secondaryButton: motionSecondaryButton,
  },
  {
    id: "motion-scene-c",
    area: "motion",
    roleLabel: "Motion Network",
    actLabel: "Act 3 of 7",
    sceneLabel: "Scene C",
    eyebrow: "The economics",
    videoSrc: MOTION_SCENE_C_VIDEO_URL,
    overlayTitle: "$100 replaces $300–550 in ad hoc logistics",
    overlaySubtitle:
      "Rideshare runs $12–25/trip. Delivery runs $30–80. Van rental $100–200/day. Motion Network: $100/mo flat. Scheduled, not reactive.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 40,
    nextSceneId: "motion-scene-d",
    primaryButton: { label: "Three use cases →", nextSceneId: "motion-scene-d" },
    secondaryButton: motionSecondaryButton,
  },
  {
    id: "motion-scene-d",
    area: "motion",
    roleLabel: "Motion Network",
    actLabel: "Act 4 of 7",
    sceneLabel: "Scene D",
    eyebrow: "Three use cases",
    videoSrc: MOTION_SCENE_D_VIDEO_URL,
    overlayTitle: "Product · People · Supply",
    overlaySubtitle:
      "Inventory to customers. Team to job sites. Recurring supply pickups. Three types of business movement — one subscription.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 36,
    nextSceneId: "motion-scene-e",
    primaryButton: { label: "The BEAM connection →", nextSceneId: "motion-scene-e" },
    secondaryButton: motionSecondaryButton,
  },
  {
    id: "motion-scene-e",
    area: "motion",
    roleLabel: "Motion Network",
    actLabel: "Act 5 of 7",
    sceneLabel: "Scene E",
    eyebrow: "BEAM drivers",
    videoSrc: MOTION_SCENE_E_VIDEO_URL,
    overlayTitle: "Every ride builds a career",
    overlaySubtitle:
      "BEAM Transportation cohort participants — trained, vetted, building professional records through active routes. Not gig workers. A workforce pipeline.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 40,
    nextSceneId: "motion-scene-f",
    primaryButton: { label: "Who it's for →", nextSceneId: "motion-scene-f" },
    secondaryButton: motionSecondaryButton,
  },
  {
    id: "motion-scene-f",
    area: "motion",
    roleLabel: "Motion Network",
    actLabel: "Act 6 of 7",
    sceneLabel: "Scene F",
    eyebrow: "Who it's for",
    videoSrc: MOTION_SCENE_F_VIDEO_URL,
    overlayTitle: "The business that has outgrown its personal car",
    overlaySubtitle:
      "Small retail. Pop-up vendors. Event producers. Food businesses. Contractors. Nonprofits. If your business needs to move — Motion Network moves it.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 38,
    nextSceneId: "motion-scene-g",
    primaryButton: { label: "Get started →", nextSceneId: "motion-scene-g" },
    secondaryButton: motionSecondaryButton,
  },
  {
    id: "motion-scene-g",
    area: "motion",
    roleLabel: "Motion Network",
    actLabel: "Act 7 of 7",
    sceneLabel: "Scene G",
    eyebrow: "Join Motion Network",
    videoSrc: MOTION_SCENE_G_VIDEO_URL,
    overlayTitle: "BEAM drivers. Managed fleet. $100/mo.",
    overlaySubtitle:
      "Subscribe, complete intake, and your first logistics run can happen within the week. readyaimgo.biz",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 22,
    nextSceneId: "motion-scene-a",
    primaryButton: { label: "Start again →", nextSceneId: "motion-scene-a" },
    secondaryButton: motionSecondaryButton,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // NEXUS — 7 scenes (A through G)
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: "nexus-scene-a",
    area: "nexus",
    roleLabel: "Nexus",
    actLabel: "Act 1 of 7",
    sceneLabel: "Scene A",
    eyebrow: "The problem",
    videoSrc: NEXUS_SCENE_A_VIDEO_URL,
    overlayTitle: "Three expenses. One subscription.",
    overlaySubtitle:
      "Most businesses pay separately for hosting, a design team, and a device. Nexus bundles all three for $50/month.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 18,
    nextSceneId: "nexus-scene-b",
    primaryButton: { label: "What Nexus includes →", nextSceneId: "nexus-scene-b" },
    secondaryButton: nexusSecondaryButton,
  },
  {
    id: "nexus-scene-b",
    area: "nexus",
    roleLabel: "Nexus",
    actLabel: "Act 2 of 7",
    sceneLabel: "Scene B",
    eyebrow: "What's included",
    videoSrc: NEXUS_SCENE_B_VIDEO_URL,
    overlayTitle: "Hosting · Creative team · Business device",
    overlaySubtitle:
      "Fully managed hosting. A design and dev team on standby. A dedicated Apple or Android device provisioned for your business. All three — active, not one-time.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 55,
    nextSceneId: "nexus-scene-c",
    primaryButton: { label: "The economics →", nextSceneId: "nexus-scene-c" },
    secondaryButton: nexusSecondaryButton,
  },
  {
    id: "nexus-scene-c",
    area: "nexus",
    roleLabel: "Nexus",
    actLabel: "Act 3 of 7",
    sceneLabel: "Scene C",
    eyebrow: "The economics",
    videoSrc: NEXUS_SCENE_C_VIDEO_URL,
    overlayTitle: "$50 versus $97–280 if purchased separately",
    overlaySubtitle:
      "Managed hosting: $30–80/mo. Freelance design: $50–150/hr. Business device amortized: $17–50/mo. Nexus: $50/mo flat.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 38,
    nextSceneId: "nexus-scene-d",
    primaryButton: { label: "Upgrade path →", nextSceneId: "nexus-scene-d" },
    secondaryButton: nexusSecondaryButton,
  },
  {
    id: "nexus-scene-d",
    area: "nexus",
    roleLabel: "Nexus",
    actLabel: "Act 4 of 7",
    sceneLabel: "Scene D",
    eyebrow: "Upgrade path",
    videoSrc: NEXUS_SCENE_D_VIDEO_URL,
    overlayTitle: "Nexus → Pro → C-Suite",
    overlaySubtitle:
      "Nexus at $50/mo. Pro at $600/mo adds AI financial insights, multi-brand, Stripe, and lead inbox. C-Suite at $5–9K/mo for full enterprise operations.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 42,
    nextSceneId: "nexus-scene-e",
    primaryButton: { label: "Who it's for →", nextSceneId: "nexus-scene-e" },
    secondaryButton: nexusSecondaryButton,
  },
  {
    id: "nexus-scene-e",
    area: "nexus",
    roleLabel: "Nexus",
    actLabel: "Act 5 of 7",
    sceneLabel: "Scene E",
    eyebrow: "Who it's for",
    videoSrc: NEXUS_SCENE_E_VIDEO_URL,
    overlayTitle: "The solo operator doing everything alone",
    overlaySubtitle:
      "Freelancers. Solo retail. Service businesses. Real estate agents. Coaches. Side businesses becoming primary businesses. If you need a website — Nexus is your foundation.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 38,
    nextSceneId: "nexus-scene-f",
    primaryButton: { label: "How to start →", nextSceneId: "nexus-scene-f" },
    secondaryButton: nexusSecondaryButton,
  },
  {
    id: "nexus-scene-f",
    area: "nexus",
    roleLabel: "Nexus",
    actLabel: "Act 6 of 7",
    sceneLabel: "Scene F",
    eyebrow: "How to start",
    videoSrc: NEXUS_SCENE_F_VIDEO_URL,
    overlayTitle: "Live in 5 to 7 business days",
    overlaySubtitle:
      "Subscribe. Complete intake. ReadyAimGo provisions hosting, assigns your creative team, and configures your device. Your digital foundation goes live before the end of the week.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 32,
    nextSceneId: "nexus-scene-g",
    primaryButton: { label: "Join Nexus →", nextSceneId: "nexus-scene-g" },
    secondaryButton: nexusSecondaryButton,
  },
  {
    id: "nexus-scene-g",
    area: "nexus",
    roleLabel: "Nexus",
    actLabel: "Act 7 of 7",
    sceneLabel: "Scene G",
    eyebrow: "Join Nexus",
    videoSrc: NEXUS_SCENE_G_VIDEO_URL,
    overlayTitle: "Hosting. Creative team. Device. $50/mo.",
    overlaySubtitle:
      "No contract. Your digital foundation will be live before the end of the week. readyaimgo.biz",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 22,
    nextSceneId: "nexus-scene-a",
    primaryButton: { label: "Start again →", nextSceneId: "nexus-scene-a" },
    secondaryButton: nexusSecondaryButton,
  },

  // ════════════════════════════════════════════════════════════════════════════
  // COHORT NETWORK — 7 scenes (A through G)
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: "cohort-scene-a",
    area: "cohort",
    roleLabel: "Cohort Network",
    actLabel: "Act 1 of 7",
    sceneLabel: "Scene A",
    eyebrow: "The hiring gap",
    videoSrc: COHORT_SCENE_A_VIDEO_URL,
    overlayTitle: "The business needs people before it can afford to hire",
    overlaySubtitle:
      "A developer. A designer. A logistics coordinator. Hiring takes time, payroll, and risk. Cohort Network is fractional access to pre-trained specialist teams — $100/mo.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 24,
    nextSceneId: "cohort-scene-b",
    primaryButton: { label: "Four specialist tracks →", nextSceneId: "cohort-scene-b" },
    secondaryButton: cohortSecondaryButton,
  },
  {
    id: "cohort-scene-b",
    area: "cohort",
    roleLabel: "Cohort Network",
    actLabel: "Act 2 of 7",
    sceneLabel: "Scene B",
    eyebrow: "Four specialist tracks",
    videoSrc: COHORT_SCENE_B_VIDEO_URL,
    overlayTitle: "Tech · Creative · Logistics · Forge",
    overlaySubtitle:
      "Tech: web, app, integrations, ops. Creative: design, content, branding, video. Logistics: delivery coordination, fulfillment. Forge: fabrication, installation, production builds.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 65,
    nextSceneId: "cohort-scene-c",
    primaryButton: { label: "The economics →", nextSceneId: "cohort-scene-c" },
    secondaryButton: cohortSecondaryButton,
  },
  {
    id: "cohort-scene-c",
    area: "cohort",
    roleLabel: "Cohort Network",
    actLabel: "Act 3 of 7",
    sceneLabel: "Scene C",
    eyebrow: "The economics",
    videoSrc: COHORT_SCENE_C_VIDEO_URL,
    overlayTitle: "$100 versus $2,500–6,000 if hired independently",
    overlaySubtitle:
      "Junior developer: $2–5K/mo. Freelance designer: $50–150/hr. Logistics coordinator: $18–25/hr. Fabricator: $20–40/hr. Cohort Network: $100/mo for all four tracks.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 40,
    nextSceneId: "cohort-scene-d",
    primaryButton: { label: "Who it solves for →", nextSceneId: "cohort-scene-d" },
    secondaryButton: cohortSecondaryButton,
  },
  {
    id: "cohort-scene-d",
    area: "cohort",
    roleLabel: "Cohort Network",
    actLabel: "Act 4 of 7",
    sceneLabel: "Scene D",
    eyebrow: "Who it solves for",
    videoSrc: COHORT_SCENE_D_VIDEO_URL,
    overlayTitle: "Too active to do everything alone. Too small to hire.",
    overlaySubtitle:
      "The photographer who needs a website and delivery logistics. The nonprofit who needs design and a database. The contractor who needs fabrication support. Cohort gives them the team.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 36,
    nextSceneId: "cohort-scene-e",
    primaryButton: { label: "The BEAM training model →", nextSceneId: "cohort-scene-e" },
    secondaryButton: cohortSecondaryButton,
  },
  {
    id: "cohort-scene-e",
    area: "cohort",
    roleLabel: "Cohort Network",
    actLabel: "Act 5 of 7",
    sceneLabel: "Scene E",
    eyebrow: "BEAM training model",
    videoSrc: COHORT_SCENE_E_VIDEO_URL,
    overlayTitle: "Trained before they touch your project",
    overlaySubtitle:
      "BEAM cohort graduates complete a training track and are assessed before entering the client project pool. Real output for members. Real professional records for specialists.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 38,
    nextSceneId: "cohort-scene-f",
    primaryButton: { label: "Who it's for →", nextSceneId: "cohort-scene-f" },
    secondaryButton: cohortSecondaryButton,
  },
  {
    id: "cohort-scene-f",
    area: "cohort",
    roleLabel: "Cohort Network",
    actLabel: "Act 6 of 7",
    sceneLabel: "Scene F",
    eyebrow: "Who it's for",
    videoSrc: COHORT_SCENE_F_VIDEO_URL,
    overlayTitle: "If your business needs a team — Cohort Network is yours",
    overlaySubtitle:
      "Freelancers. Solo operators. Nonprofits. Event producers. BEAM-adjacent businesses. Anyone who needs expertise they cannot yet afford to hire.",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 38,
    nextSceneId: "cohort-scene-g",
    primaryButton: { label: "Join Cohort →", nextSceneId: "cohort-scene-g" },
    secondaryButton: cohortSecondaryButton,
  },
  {
    id: "cohort-scene-g",
    area: "cohort",
    roleLabel: "Cohort Network",
    actLabel: "Act 7 of 7",
    sceneLabel: "Scene G",
    eyebrow: "Join Cohort Network",
    videoSrc: COHORT_SCENE_G_VIDEO_URL,
    overlayTitle: "Tech. Creative. Logistics. Forge. $100/mo.",
    overlaySubtitle:
      "Subscribe, complete intake, and submit your first request. Your team is ready. readyaimgo.biz",
    loopStartSeconds: 5,
    revealOffsetSeconds: 1,
    autoAdvanceSeconds: 20,
    nextSceneId: "cohort-scene-a",
    primaryButton: { label: "Start again →", nextSceneId: "cohort-scene-a" },
    secondaryButton: cohortSecondaryButton,
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

export const defaultLandingSceneId = "space-scene-a"

export function getLandingScene(sceneId: string): LandingScene {
  return landingScenes.find((scene) => scene.id === sceneId) ?? landingScenes[0]
}

export function getLandingArea(areaId: LandingAreaId): LandingArea {
  return landingAreas.find((area) => area.id === areaId) ?? landingAreas[0]
}

export function getScenesForArea(areaId: LandingAreaId): LandingScene[] {
  return landingScenes.filter((scene) => scene.area === areaId)
}

export function getSceneCount(areaId: LandingAreaId): number {
  return getScenesForArea(areaId).length
}

export function getNextScene(sceneId: string): LandingScene | null {
  const current = getLandingScene(sceneId)
  if (!current.nextSceneId) return null
  return getLandingScene(current.nextSceneId)
}
