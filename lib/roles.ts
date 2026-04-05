/**
 * Shared types and Firestore helpers for the RAG roles system.
 * Roles are created by RAG admins and can be published to BEAM Transportation
 * for participant discovery and cohort formation.
 */
import { getFirestoreDb } from './firestore'

export type RoleTrack = 'apprentice' | 'technician' | 'cohort_lead'
export type RoleStatus = 'draft' | 'open' | 'forming' | 'filled' | 'closed'
export type RoleCity = 'Milwaukee' | 'Chicago' | 'Atlanta' | 'Orlando' | 'Madison' | 'Remote'

export interface BeamRole {
  id: string
  title: string
  description: string
  responsibilities: string[]
  skillsRequired: string[]
  skillsPreferred: string[]
  track: RoleTrack
  city: RoleCity
  hoursPerWeek: number
  durationWeeks: number
  status: RoleStatus
  beamVisible: boolean
  clientId?: string          // RAG client this role serves (e.g. the RAG fleet contract)
  vehicleTypes?: string[]    // which vehicle types this cohort will work on
  openSlots: number
  filledSlots: number
  compensation: {
    model: 'stipend' | 'hourly' | 'revenue_share'
    amountCents: number     // hourly rate or monthly stipend in cents
    currency: 'USD'
    notes?: string
  }
  supervisorId?: string
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export interface CohortApplication {
  id: string
  roleId: string
  roleTitle: string
  applicantName: string
  applicantEmail: string
  applicantCity: string
  phone?: string
  bio: string
  experience: string
  availability: string      // e.g. "Tuesday/Thursday mornings"
  currentlyEnrolled: boolean // UWM or MATC
  institution?: string
  status: 'pending' | 'reviewed' | 'accepted' | 'declined'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  cohortId?: string         // set when accepted into a formed cohort
}

// ── Firestore helpers ──────────────────────────────────────────────────────

export async function getPublishedRoles(): Promise<BeamRole[]> {
  const db = getFirestoreDb()
  if (!db) return []
  try {
    const snap = await db
      .collection('roles')
      .where('beamVisible', '==', true)
      .where('status', 'in', ['open', 'forming'])
      .orderBy('createdAt', 'desc')
      .get()
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BeamRole))
  } catch (e) {
    // Fallback if composite index not yet created
    console.warn('getPublishedRoles: index fallback', e)
    const snap = await db.collection('roles').get()
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() } as BeamRole))
      .filter(r => r.beamVisible && (r.status === 'open' || r.status === 'forming'))
  }
}

export async function getAllRoles(): Promise<BeamRole[]> {
  const db = getFirestoreDb()
  if (!db) return []
  try {
    const snap = await db.collection('roles').orderBy('createdAt', 'desc').get()
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BeamRole))
  } catch (e) {
    console.warn('getAllRoles fallback', e)
    const snap = await db.collection('roles').get()
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BeamRole))
  }
}

export async function getRoleById(id: string): Promise<BeamRole | null> {
  const db = getFirestoreDb()
  if (!db) return null
  const doc = await db.collection('roles').doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as BeamRole
}

export async function createRole(
  data: Omit<BeamRole, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Firebase not initialized')
  const now = new Date().toISOString()
  const ref = db.collection('roles').doc()
  await ref.set({ ...data, createdAt: now, updatedAt: now })
  return ref.id
}

export async function updateRole(
  id: string,
  data: Partial<Omit<BeamRole, 'id' | 'createdAt'>>
): Promise<void> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Firebase not initialized')
  await db.collection('roles').doc(id).update({
    ...data,
    updatedAt: new Date().toISOString(),
  })
}

export async function publishRole(id: string): Promise<void> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Firebase not initialized')
  await db.collection('roles').doc(id).update({
    beamVisible: true,
    status: 'open',
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export async function unpublishRole(id: string): Promise<void> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Firebase not initialized')
  await db.collection('roles').doc(id).update({
    beamVisible: false,
    updatedAt: new Date().toISOString(),
  })
}

export async function createCohortApplication(
  data: Omit<CohortApplication, 'id' | 'submittedAt' | 'status'>
): Promise<string> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Firebase not initialized')
  const ref = db.collection('cohortApplications').doc()
  await ref.set({
    ...data,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  })
  // Also increment filledSlots counter on the role when accepted — handled separately
  return ref.id
}

export async function getCohortApplicationsByRole(
  roleId: string
): Promise<CohortApplication[]> {
  const db = getFirestoreDb()
  if (!db) return []
  const snap = await db
    .collection('cohortApplications')
    .where('roleId', '==', roleId)
    .orderBy('submittedAt', 'desc')
    .get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CohortApplication))
}

export async function updateApplicationStatus(
  applicationId: string,
  status: CohortApplication['status'],
  reviewedBy: string
): Promise<void> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Firebase not initialized')
  await db.collection('cohortApplications').doc(applicationId).update({
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy,
  })
}

/**
 * Seed realistic transportation roles for demo/investor use.
 * Call once from admin or a one-time script.
 */
export async function seedTransportationRoles(): Promise<void> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Firebase not initialized')
  const existing = await db.collection('roles').limit(1).get()
  if (!existing.empty) return // already seeded

  const now = new Date().toISOString()
  const roles: Omit<BeamRole, 'id'>[] = [
    {
      title: 'Fleet Technician Apprentice',
      description:
        'Hands-on vehicle maintenance on ReadyAimGo fleet. Work alongside certified technicians performing weekly inspections, fluid checks, tire monitoring, and diagnostic scans. Earn while you learn under BEAM supervision.',
      responsibilities: [
        'Weekly vehicle inspections (oil, coolant, brake, tire)',
        'Log service records in BEAM digital system',
        'Shadow lead technician on repair tasks',
        'Attend bi-weekly BEAM cohort check-ins',
      ],
      skillsRequired: ['Basic automotive interest', 'Reliable transportation to service location', 'Smartphone'],
      skillsPreferred: ['UWM or MATC enrollment', 'Prior shop experience', 'Valid driver license'],
      track: 'apprentice',
      city: 'Milwaukee',
      hoursPerWeek: 10,
      durationWeeks: 16,
      status: 'open',
      beamVisible: true,
      vehicleTypes: ['suv', 'box_truck'],
      openSlots: 4,
      filledSlots: 0,
      compensation: {
        model: 'hourly',
        amountCents: 1400,
        currency: 'USD',
        notes: '$14/hr stipend funded by RAG fleet service contract',
      },
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    },
    {
      title: 'Lead Fleet Technician',
      description:
        'Lead weekly maintenance sessions on the RAG vehicle fleet. Supervise apprentice cohort members, sign off on service logs, and deliver the monthly written fleet health report to RAG operations. This role is the client-facing face of BEAM Transportation.',
      responsibilities: [
        'Run weekly service sessions for assigned RAG vehicles',
        'Supervise and mentor 2–4 apprentices',
        'Sign off on all service records',
        'Compile and deliver monthly fleet health report',
        'Communicate directly with RAG operations contact',
      ],
      skillsRequired: ['ASE certification or equivalent experience', 'Valid driver license', '2+ years shop experience'],
      skillsPreferred: ['Fleet maintenance background', 'Digital record-keeping experience'],
      track: 'technician',
      city: 'Milwaukee',
      hoursPerWeek: 20,
      durationWeeks: 26,
      status: 'open',
      beamVisible: true,
      vehicleTypes: ['suv', 'box_truck'],
      openSlots: 2,
      filledSlots: 0,
      compensation: {
        model: 'hourly',
        amountCents: 2200,
        currency: 'USD',
        notes: '$22/hr + performance bonus tied to monthly fleet health scores',
      },
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    },
    {
      title: 'Cohort Lead — Milwaukee Fleet',
      description:
        'Manage the day-to-day operations of the BEAM Transportation Milwaukee cohort. Own the schedule, coordinate with RAG, handle participant check-ins, and represent BEAM at client meetings. This is a leadership role with a path toward full-time NGO staff.',
      responsibilities: [
        'Own the weekly service schedule for all RAG fleet vehicles',
        'Manage cohort member assignments and attendance',
        'Represent BEAM Transportation in RAG client meetings',
        'Track KPIs: service completion rate, vehicle uptime, participant hours',
        'Report weekly to BEAM Transportation director',
      ],
      skillsRequired: ['Strong organizational skills', 'Prior team leadership experience', 'Automotive background'],
      skillsPreferred: ['NGO or workforce development experience', 'Milwaukee community ties'],
      track: 'cohort_lead',
      city: 'Milwaukee',
      hoursPerWeek: 30,
      durationWeeks: 52,
      status: 'forming',
      beamVisible: true,
      vehicleTypes: ['suv', 'box_truck', 'van'],
      openSlots: 1,
      filledSlots: 0,
      compensation: {
        model: 'stipend',
        amountCents: 160000,
        currency: 'USD',
        notes: '$1,600/mo stipend. Reviewed quarterly. Path to full-time at 12 months.',
      },
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    },
  ]

  for (const role of roles) {
    await db.collection('roles').add(role)
  }
  console.log('Seeded', roles.length, 'transportation roles')
}
