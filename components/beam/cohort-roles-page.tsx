"use client"

/**
 * CohortRolesPage
 * ───────────────
 * Public-facing cohort roles page, designed for
 * transportation.beamthinktank.space/cohort
 *
 * Fetches published roles from readyaimgo.biz/api/roles?beamVisible=true
 * Participants can read role details and submit an expression of interest.
 * Submissions POST to readyaimgo.biz/api/cohort-applications.
 *
 * Design: dark tactical, matching the fleet browser aesthetic.
 */

import { useState, useEffect } from 'react'
import type { BeamRole, CohortApplication } from '@/lib/roles'

const RAG_API = 'https://www.readyaimgo.biz/api'

const TRACK_LABELS: Record<string, string> = {
  apprentice: 'APPRENTICE',
  technician: 'TECHNICIAN',
  cohort_lead: 'COHORT LEAD',
}

const TRACK_COLORS: Record<string, string> = {
  apprentice: '#22c55e',   // green
  technician: '#f59e0b',   // amber
  cohort_lead: '#a78bfa',  // purple
}

const STATUS_LABELS: Record<string, string> = {
  open: 'OPEN',
  forming: 'FORMING NOW',
  filled: 'FILLED',
}

const STATUS_COLORS: Record<string, string> = {
  open: '#22c55e',
  forming: '#f59e0b',
  filled: '#6b7280',
}

const COMP_MODEL_LABELS: Record<string, string> = {
  stipend: 'Monthly stipend',
  hourly: 'Hourly',
  revenue_share: 'Revenue share',
}

function formatCompensation(comp: BeamRole['compensation']): string {
  const amount = (comp.amountCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: comp.currency,
    minimumFractionDigits: 0,
  })
  const label = COMP_MODEL_LABELS[comp.model] ?? comp.model
  return comp.model === 'stipend' ? `${amount}/mo — ${label}` : `${amount}/hr — ${label}`
}

// ── Skeleton mock roles shown when API is unavailable ────────────────────────
const FALLBACK_ROLES: BeamRole[] = [
  {
    id: 'demo-1',
    title: 'Fleet Technician Apprentice',
    description:
      'Hands-on vehicle maintenance on ReadyAimGo fleet. Work alongside certified technicians performing weekly inspections, fluid checks, tire monitoring, and diagnostic scans. Earn while you learn under BEAM supervision.',
    responsibilities: [
      'Weekly vehicle inspections (oil, coolant, brake, tire)',
      'Log service records in BEAM digital system',
      'Shadow lead technician on repair tasks',
    ],
    skillsRequired: ['Basic automotive interest', 'Reliable transportation', 'Smartphone'],
    skillsPreferred: ['UWM or MATC enrollment', 'Prior shop experience'],
    track: 'apprentice',
    city: 'Milwaukee',
    hoursPerWeek: 10,
    durationWeeks: 16,
    status: 'open',
    beamVisible: true,
    vehicleTypes: ['suv', 'box_truck'],
    openSlots: 4,
    filledSlots: 0,
    compensation: { model: 'hourly', amountCents: 1400, currency: 'USD', notes: 'Funded by RAG fleet contract' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Lead Fleet Technician',
    description:
      'Lead weekly maintenance sessions on the RAG vehicle fleet. Supervise apprentice cohort members, sign off on service logs, and deliver the monthly written fleet health report.',
    responsibilities: [
      'Run weekly service sessions',
      'Supervise and mentor 2–4 apprentices',
      'Compile monthly fleet health report',
    ],
    skillsRequired: ['ASE certification or equivalent', 'Valid driver license', '2+ years shop experience'],
    skillsPreferred: ['Fleet maintenance background'],
    track: 'technician',
    city: 'Milwaukee',
    hoursPerWeek: 20,
    durationWeeks: 26,
    status: 'open',
    beamVisible: true,
    vehicleTypes: ['suv', 'box_truck'],
    openSlots: 2,
    filledSlots: 0,
    compensation: { model: 'hourly', amountCents: 2200, currency: 'USD', notes: '$22/hr + performance bonus' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Cohort Lead — Milwaukee Fleet',
    description:
      'Manage day-to-day operations of the BEAM Transportation Milwaukee cohort. Own the schedule, coordinate with RAG, handle participant check-ins, and represent BEAM at client meetings.',
    responsibilities: [
      'Own weekly service schedule',
      'Manage cohort assignments and attendance',
      'Represent BEAM in RAG client meetings',
    ],
    skillsRequired: ['Strong organizational skills', 'Prior team leadership', 'Automotive background'],
    skillsPreferred: ['NGO or workforce development experience'],
    track: 'cohort_lead',
    city: 'Milwaukee',
    hoursPerWeek: 30,
    durationWeeks: 52,
    status: 'forming',
    beamVisible: true,
    vehicleTypes: ['suv', 'box_truck', 'van'],
    openSlots: 1,
    filledSlots: 0,
    compensation: { model: 'stipend', amountCents: 160000, currency: 'USD', notes: 'Path to full-time at 12 months' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// ── Application form state ───────────────────────────────────────────────────
type FormState = {
  applicantName: string
  applicantEmail: string
  applicantCity: string
  phone: string
  bio: string
  experience: string
  availability: string
  currentlyEnrolled: boolean
  institution: string
}

const EMPTY_FORM: FormState = {
  applicantName: '',
  applicantEmail: '',
  applicantCity: '',
  phone: '',
  bio: '',
  experience: '',
  availability: '',
  currentlyEnrolled: false,
  institution: '',
}

// ── Main component ───────────────────────────────────────────────────────────
export function CohortRolesPage() {
  const [roles, setRoles] = useState<BeamRole[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRole, setSelectedRole] = useState<BeamRole | null>(null)
  const [applyingTo, setApplyingTo] = useState<BeamRole | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trackFilter, setTrackFilter] = useState<string>('all')

  useEffect(() => {
    fetch(`${RAG_API}/roles?beamVisible=true`)
      .then(r => r.json())
      .then(data => {
        setRoles(Array.isArray(data.roles) && data.roles.length > 0 ? data.roles : FALLBACK_ROLES)
      })
      .catch(() => setRoles(FALLBACK_ROLES))
      .finally(() => setLoading(false))
  }, [])

  const filtered = trackFilter === 'all' ? roles : roles.filter(r => r.track === trackFilter)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!applyingTo) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${RAG_API}/cohort-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          roleId: applyingTo.id,
          roleTitle: applyingTo.title,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')
      setSubmitted(true)
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const field = (key: keyof FormState) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  })

  // ── Detail modal ─────────────────────────────────────────────────────────
  if (selectedRole && !applyingTo) {
    const r = selectedRole
    const trackColor = TRACK_COLORS[r.track] ?? '#fff'
    const comp = formatCompensation(r.compensation)
    return (
      <div style={styles.page}>
        <div style={styles.topbar}>
          <button style={styles.backBtn} onClick={() => setSelectedRole(null)}>← BACK</button>
          <span style={styles.topbarRight}>transport.beamthinktank.space</span>
        </div>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ ...styles.trackBadge, background: trackColor + '20', color: trackColor, border: `1px solid ${trackColor}40` }}>
              {TRACK_LABELS[r.track]}
            </span>
            <span style={{ ...styles.statusBadge, background: STATUS_COLORS[r.status] + '20', color: STATUS_COLORS[r.status] }}>
              {STATUS_LABELS[r.status] ?? r.status.toUpperCase()}
            </span>
          </div>
          <h1 style={styles.roleDetailTitle}>{r.title}</h1>
          <p style={styles.roleMeta}>{r.city.toUpperCase()} · {r.hoursPerWeek}HRS/WK · {r.durationWeeks} WEEKS</p>

          <div style={styles.compBox}>
            <span style={styles.compLabel}>COMPENSATION</span>
            <span style={styles.compValue}>{comp}</span>
            {r.compensation.notes && <span style={styles.compNote}>{r.compensation.notes}</span>}
          </div>

          <p style={styles.descText}>{r.description}</p>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>WHAT YOU'LL DO</div>
            {r.responsibilities.map((resp, i) => (
              <div key={i} style={styles.listRow}><span style={styles.bullet}>▸</span>{resp}</div>
            ))}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>REQUIRED</div>
            {r.skillsRequired.map((s, i) => (
              <div key={i} style={styles.listRow}><span style={styles.bullet}>▸</span>{s}</div>
            ))}
          </div>

          {r.skillsPreferred.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>PREFERRED (NOT REQUIRED)</div>
              {r.skillsPreferred.map((s, i) => (
                <div key={i} style={{ ...styles.listRow, opacity: 0.6 }}><span style={styles.bullet}>◦</span>{s}</div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 32 }}>
            <button
              style={styles.applyBtn}
              disabled={r.status === 'filled'}
              onClick={() => { setApplyingTo(r); setSubmitted(false) }}
            >
              {r.status === 'filled' ? 'POSITION FILLED' : '+ APPLY FOR THIS ROLE'}
            </button>
          </div>

          <div style={styles.slotsRow}>
            <span style={{ color: '#22c55e' }}>{r.openSlots - r.filledSlots} open slot{r.openSlots - r.filledSlots !== 1 ? 's' : ''}</span>
            <span style={{ color: 'rgba(255,255,255,.3)' }}> of {r.openSlots} total</span>
          </div>
        </div>
      </div>
    )
  }

  // ── Application form ─────────────────────────────────────────────────────
  if (applyingTo) {
    return (
      <div style={styles.page}>
        <div style={styles.topbar}>
          <button style={styles.backBtn} onClick={() => { setApplyingTo(null); setSubmitted(false) }}>← BACK</button>
          <span style={styles.topbarRight}>transport.beamthinktank.space</span>
        </div>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 20px' }}>
          {submitted ? (
            <div style={styles.successBox}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>APPLICATION RECEIVED</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
                The BEAM Transportation team will contact you at <strong>{form.applicantEmail || 'your email'}</strong> within 3 business days.
              </div>
              <button style={{ ...styles.applyBtn, marginTop: 24 }} onClick={() => { setApplyingTo(null); setSubmitted(false) }}>
                VIEW MORE ROLES
              </button>
            </div>
          ) : (
            <>
              <h1 style={styles.roleDetailTitle}>Apply: {applyingTo.title}</h1>
              <p style={styles.roleMeta}>{applyingTo.city.toUpperCase()} · {TRACK_LABELS[applyingTo.track]}</p>

              <form onSubmit={handleSubmit} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={styles.formRow}>
                  <label style={styles.label}>Full name *</label>
                  <input style={styles.input} required placeholder="Your full name" {...field('applicantName')} />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.label}>Email *</label>
                  <input style={styles.input} type="email" required placeholder="you@email.com" {...field('applicantEmail')} />
                </div>
                <div style={styles.twoCol}>
                  <div style={styles.formRow}>
                    <label style={styles.label}>Your city *</label>
                    <input style={styles.input} required placeholder="Milwaukee" {...field('applicantCity')} />
                  </div>
                  <div style={styles.formRow}>
                    <label style={styles.label}>Phone (optional)</label>
                    <input style={styles.input} type="tel" placeholder="(414) 555-0100" {...field('phone')} />
                  </div>
                </div>
                <div style={styles.formRow}>
                  <label style={styles.label}>Tell us about yourself *</label>
                  <textarea
                    style={{ ...styles.input, height: 90, resize: 'vertical' }}
                    required
                    placeholder="Who are you, what brings you to BEAM, what you're hoping to build..."
                    {...field('bio')}
                  />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.label}>Relevant experience *</label>
                  <textarea
                    style={{ ...styles.input, height: 80, resize: 'vertical' }}
                    required
                    placeholder="Any automotive, mechanical, or leadership experience — formal or informal..."
                    {...field('experience')}
                  />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.label}>Availability *</label>
                  <input
                    style={styles.input}
                    required
                    placeholder="e.g. Tuesday and Thursday mornings, or Saturdays"
                    {...field('availability')}
                  />
                </div>
                <div style={styles.formRow}>
                  <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.currentlyEnrolled}
                      onChange={e => setForm(f => ({ ...f, currentlyEnrolled: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: '#a78bfa' }}
                    />
                    I am currently enrolled at UWM or MATC
                  </label>
                  {form.currentlyEnrolled && (
                    <input
                      style={{ ...styles.input, marginTop: 8 }}
                      placeholder="Institution and program (e.g. MATC Automotive Technology)"
                      {...field('institution')}
                    />
                  )}
                </div>

                {error && <div style={styles.errorBox}>{error}</div>}

                <button type="submit" style={styles.applyBtn} disabled={submitting}>
                  {submitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
                </button>

                <p style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', textAlign: 'center', letterSpacing: '.08em' }}>
                  Your information is shared only with the BEAM Transportation team.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Role browser (main view) ──────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <span style={styles.topbarLeft}>BEAM TRANSPORTATION</span>
        <span style={styles.topbarRight}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', marginRight: 6 }} />
          {roles.filter(r => r.status === 'open' || r.status === 'forming').length} roles open
        </span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>
        <h1 style={styles.heroTitle}>COHORT</h1>
        <p style={styles.heroSub}>EARN WHILE YOU LEARN · BEAM-SUPERVISED · REAL CLIENTS · REAL FLEET</p>

        {/* Narrative */}
        <div style={styles.narrativeBox}>
          <div style={styles.narrativeTitle}>HOW IT WORKS</div>
          <div style={styles.narrativeGrid}>
            <div style={styles.narrativeStep}>
              <span style={styles.stepNum}>01</span>
              <span style={styles.stepText}>You select a role and apply below. No experience required for apprentice track.</span>
            </div>
            <div style={styles.narrativeStep}>
              <span style={styles.stepNum}>02</span>
              <span style={styles.stepText}>BEAM Transportation reviews your application and places you in a cohort.</span>
            </div>
            <div style={styles.narrativeStep}>
              <span style={styles.stepNum}>03</span>
              <span style={styles.stepText}>Your cohort maintains real vehicles for ReadyAimGo clients across Milwaukee and beyond.</span>
            </div>
            <div style={styles.narrativeStep}>
              <span style={styles.stepNum}>04</span>
              <span style={styles.stepText}>The service contract pays the NGO. The NGO pays you. Every session is documented as portfolio evidence.</span>
            </div>
          </div>
        </div>

        {/* Compensation overview */}
        <div style={styles.compOverviewGrid}>
          {[
            { track: 'apprentice', label: 'Apprentice', rate: '$12–15/hr', note: 'Learn the work. Log the hours.', color: '#22c55e' },
            { track: 'technician', label: 'Technician', rate: '$18–22/hr', note: 'Lead sessions. Mentor others.', color: '#f59e0b' },
            { track: 'cohort_lead', label: 'Cohort Lead', rate: '$1,200–1,600/mo', note: 'Run the operation.', color: '#a78bfa' },
          ].map(t => (
            <div
              key={t.track}
              style={{ ...styles.compCard, borderColor: t.color + '30', cursor: 'pointer' }}
              onClick={() => setTrackFilter(trackFilter === t.track ? 'all' : t.track)}
            >
              <div style={{ fontSize: 10, letterSpacing: '.15em', color: t.color, fontWeight: 700, marginBottom: 4 }}>{t.label.toUpperCase()}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-.01em' }}>{t.rate}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{t.note}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {[['all', 'ALL ROLES'], ['apprentice', 'APPRENTICE'], ['technician', 'TECHNICIAN'], ['cohort_lead', 'COHORT LEAD']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTrackFilter(key)}
              style={{
                ...styles.filterTab,
                background: trackFilter === key ? '#fff' : 'transparent',
                color: trackFilter === key ? '#000' : 'rgba(255,255,255,.4)',
                borderColor: trackFilter === key ? '#fff' : 'rgba(255,255,255,.15)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Role grid */}
        {loading ? (
          <div style={styles.empty}>LOADING ROLES...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>NO ROLES MATCH</div>
        ) : (
          <div style={styles.roleGrid}>
            {filtered.map(role => (
              <RoleCard key={role.id} role={role} onSelect={() => setSelectedRole(role)} onApply={() => { setApplyingTo(role); setSubmitted(false) }} />
            ))}
          </div>
        )}

        <div style={styles.footerBar}>
          <span>BEAM TRANSPORTATION NGO · MILWAUKEE, WI</span>
          <span>readyaimgo.biz/fleet →</span>
        </div>
      </div>
    </div>
  )
}

// ── Role card ────────────────────────────────────────────────────────────────
function RoleCard({ role: r, onSelect, onApply }: { role: BeamRole; onSelect: () => void; onApply: () => void }) {
  const trackColor = TRACK_COLORS[r.track] ?? '#fff'
  const statusColor = STATUS_COLORS[r.status] ?? '#888'
  const isFilled = r.status === 'filled'

  return (
    <div
      style={{
        ...styles.roleCard,
        opacity: isFilled ? 0.55 : 1,
        borderColor: isFilled ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.15)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{ ...styles.trackBadge, background: trackColor + '15', color: trackColor, border: `1px solid ${trackColor}30` }}>
          {TRACK_LABELS[r.track]}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', color: statusColor }}>
          {STATUS_LABELS[r.status] ?? r.status.toUpperCase()}
        </span>
      </div>

      <div style={styles.cardTitle}>{r.title}</div>
      <div style={styles.cardMeta}>{r.city.toUpperCase()} · {r.hoursPerWeek}HRS/WK · {r.durationWeeks} WKS</div>

      <p style={styles.cardDesc}>{r.description.slice(0, 120)}{r.description.length > 120 ? '...' : ''}</p>

      <div style={styles.cardComp}>{formatCompensation(r.compensation)}</div>

      <div style={{ ...styles.slotsRow, marginBottom: 12 }}>
        <span style={{ color: statusColor }}>{r.openSlots - r.filledSlots} slot{r.openSlots - r.filledSlots !== 1 ? 's' : ''} open</span>
        <span style={{ color: 'rgba(255,255,255,.2)' }}> of {r.openSlots}</span>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button style={styles.detailBtn} onClick={onSelect}>DETAILS</button>
        <button style={styles.applyBtnSm} disabled={isFilled} onClick={onApply}>
          {isFilled ? 'FILLED' : '+ APPLY'}
        </button>
      </div>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0e1117', color: '#fff', fontFamily: "'Courier New', monospace" },
  topbar: { background: '#0e1117', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, letterSpacing: '.15em', color: 'rgba(255,255,255,.3)' },
  topbarLeft: { color: 'rgba(255,255,255,.55)' },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 4 },
  backBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.6)', fontSize: 10, letterSpacing: '.15em', padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' },
  heroTitle: { fontSize: 52, fontWeight: 900, fontStyle: 'italic', letterSpacing: '-.02em', lineHeight: 1, color: '#fff', fontFamily: 'Arial Black,Impact,sans-serif', marginBottom: 6 },
  heroSub: { fontSize: 11, letterSpacing: '.18em', color: 'rgba(255,255,255,.3)', marginBottom: 28 },
  narrativeBox: { background: '#141922', border: '1px solid rgba(255,255,255,.1)', padding: 20, marginBottom: 20 },
  narrativeTitle: { fontSize: 10, letterSpacing: '.2em', color: 'rgba(255,255,255,.4)', marginBottom: 14, fontWeight: 700 },
  narrativeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 },
  narrativeStep: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  stepNum: { fontSize: 20, fontWeight: 900, color: 'rgba(255,255,255,.15)', lineHeight: 1, flexShrink: 0 },
  stepText: { fontSize: 12, color: 'rgba(255,255,255,.6)', lineHeight: 1.6 },
  compOverviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 20 },
  compCard: { background: '#141922', border: '1px solid', padding: 14, cursor: 'pointer' },
  filterTab: { padding: '6px 12px', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', border: '1px solid', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .1s' },
  roleGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, marginTop: 4 },
  roleCard: { background: '#141922', border: '1px solid', padding: 16, display: 'flex', flexDirection: 'column' },
  trackBadge: { fontSize: 9, fontWeight: 700, letterSpacing: '.12em', padding: '2px 7px' },
  statusBadge: { fontSize: 9, fontWeight: 700, letterSpacing: '.15em', padding: '2px 7px' },
  cardTitle: { fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: '-.01em', marginBottom: 3 },
  cardMeta: { fontSize: 10, letterSpacing: '.1em', color: 'rgba(255,255,255,.35)', marginBottom: 8 },
  cardDesc: { fontSize: 11, color: 'rgba(255,255,255,.5)', lineHeight: 1.55, marginBottom: 8 },
  cardComp: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.75)', marginBottom: 6 },
  slotsRow: { fontSize: 10, letterSpacing: '.08em' },
  detailBtn: { flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', background: 'transparent', border: '1px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontFamily: 'inherit' },
  applyBtnSm: { flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 700, letterSpacing: '.12em', background: '#e85d04', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
  applyBtn: { padding: '12px 28px', fontSize: 11, fontWeight: 900, letterSpacing: '.18em', background: '#e85d04', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' },
  roleDetailTitle: { fontSize: 32, fontWeight: 900, fontStyle: 'italic', fontFamily: 'Arial Black,Impact,sans-serif', marginBottom: 4, letterSpacing: '-.02em' },
  roleMeta: { fontSize: 11, letterSpacing: '.15em', color: 'rgba(255,255,255,.35)', marginBottom: 16 },
  compBox: { background: '#141922', border: '1px solid rgba(255,255,255,.1)', padding: '12px 16px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  compLabel: { fontSize: 9, letterSpacing: '.2em', color: 'rgba(255,255,255,.4)', fontWeight: 700 },
  compValue: { fontSize: 14, fontWeight: 700, color: '#fff' },
  compNote: { fontSize: 11, color: 'rgba(255,255,255,.4)' },
  descText: { fontSize: 13, color: 'rgba(255,255,255,.65)', lineHeight: 1.7, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 9, letterSpacing: '.2em', color: 'rgba(255,255,255,.35)', fontWeight: 700, marginBottom: 10 },
  listRow: { display: 'flex', gap: 8, fontSize: 12, color: 'rgba(255,255,255,.7)', lineHeight: 1.6, marginBottom: 4 },
  bullet: { color: '#e85d04', flexShrink: 0 },
  formRow: { display: 'flex', flexDirection: 'column', gap: 6 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { fontSize: 10, letterSpacing: '.15em', color: 'rgba(255,255,255,.5)', fontWeight: 700 },
  input: { background: '#141922', border: '1px solid rgba(255,255,255,.15)', color: '#fff', fontSize: 13, padding: '10px 12px', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' } as React.CSSProperties,
  errorBox: { background: '#7f1d1d', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', fontSize: 12 },
  successBox: { background: '#141922', border: '1px solid rgba(34,197,94,.3)', padding: 32, textAlign: 'center' },
  empty: { color: 'rgba(255,255,255,.3)', fontSize: 12, letterSpacing: '.18em', textAlign: 'center', padding: '48px 0' },
  footerBar: { marginTop: 48, borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 10, letterSpacing: '.15em', color: 'rgba(255,255,255,.2)' },
}
