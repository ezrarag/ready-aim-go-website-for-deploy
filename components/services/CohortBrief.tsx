"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { dmMono, syne } from "./service-fonts"

const stats = [["15", "Clients"], ["$1.5K", "Gross"], ["$900", "Stipend pool"], ["5", "Task credits / client"]]
const tracks = ["Tech Track - web dev, app builds, data, AI integration", "Creative Track - photo, video, brand, content", "Forge / Architecture Track - property renovation, smart access, builds", "Logistics Track - route coordination, supply chain, delivery management", "Full-Stack / Cross-Track - combined sprints and mini project teams", "Earn-While-You-Use - sweat equity ledger and BEAM FCU supplement"]
const economics = [["Participant Stipend Pool", "$60/mo", "Paid sprint capacity"], ["Training & R&D Hub", "$25/mo", "ABLE-based training"], ["Workspace Management", "$10/mo", "Coordination and access"], ["Talent Architect", "$5/mo", "5% commission"]]
const bundles = [["Nexus + Cohort", "$120/mo", "Save $30"], ["Motion + Cohort", "$165/mo", "Save $35"], ["Space + Cohort", "$160/mo", "Save $40"], ["Nexus + Motion + Space", "$199/mo", "Save $51"], ["Full Stack all four", "$275/mo", "Save $75"], ["Nexus + Cohort + Space", "$199/mo", "Save $51"]]

export function CohortBrief() {
  return (
    <main className={`${syne.variable} ${dmMono.variable} min-h-screen bg-[#EDE8FF] text-[#2D1B69]`}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:px-10">
        <BriefNav />

        <section className="relative overflow-hidden bg-[#2D1B69] px-6 py-16 text-white sm:px-10 lg:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,.35),transparent_34%),linear-gradient(135deg,rgba(74,61,170,.9),rgba(45,27,105,1))]" />
          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-[#D4A017]">Employer & Institutional Partner Proposal</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[0.95] sm:text-7xl" style={{ fontFamily: "var(--font-syne)" }}>Cohort Network</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">Fractional access to pre-trained BEAM specialist teams through task credits, institutional training, and fellowship pathways.</p>
            <div className="mt-10 grid gap-3 sm:grid-cols-4">{stats.map(([value, label]) => <Stat key={label} value={value} label={label} />)}</div>
          </div>
        </section>

        <Section eyebrow="01" title="About">
          <div className="grid gap-4 md:grid-cols-3">
            {["ABLE Lab UWM research basis with NEA grants and team-based training.", "Two-tier model connecting commercial RAG credits to BEAM Fellowship pathways.", "$100/mo = 5 task credits = 2-hour specialist sprints."].map((body) => <Card key={body}><p className="text-sm leading-7 text-slate-700">{body}</p></Card>)}
          </div>
        </Section>

        <Section eyebrow="02" title="Two-Tier Gateway Model">
          <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <Card><p className="font-mono text-xs uppercase tracking-[0.2em] text-[#0D9488]">Tier 1</p><h3 className="mt-2 text-2xl font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>RAG</h3><p className="mt-3 text-sm leading-6 text-slate-700">$100/mo, 5 credits, commercial Stripe billing.</p></Card>
            <div className="text-center font-mono text-xs uppercase tracking-[0.2em] text-[#4A3DAA]">Credits exhaust / scope expands</div>
            <Card><p className="font-mono text-xs uppercase tracking-[0.2em] text-[#0D9488]">Tier 2</p><h3 className="mt-2 text-2xl font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>BEAM Fellowship</h3><p className="mt-3 text-sm leading-6 text-slate-700">Direct 501c3 contribution, tax-deductible, supported by NEA grants.</p></Card>
          </div>
        </Section>

        <Section eyebrow="03" title="Four Participant Tracks">
          <div className="grid gap-4 md:grid-cols-2">{tracks.map((track) => <Card key={track}><p className="text-sm leading-6 text-slate-700">{track}</p></Card>)}</div>
        </Section>

        <Section eyebrow="04" title="Economics">
          <DataTable rows={economics} />
        </Section>

        <Section eyebrow="05" title="Earn-While-You-Use Equity Model">
          <Timeline items={["Client Sprint: billed 2 hrs", "Participant Extra Hours: voluntary ledger log", "BEAM Supplement: NEA grants + university fellowships + BEAM FCU"]} />
        </Section>

        <Section eyebrow="06" title="Comparison">
          <DataTable rows={[["Upwork / Fiverr", "$300-1,200/mo", "Freelancer marketplace"], ["Staffing agency", "$800-2,500/mo", "Higher minimums"], ["University internship", "$0-200/mo", "Low accountability"], ["Internal part-time", "$1,500-3,000/mo", "Payroll commitment"], ["Cohort Network", "$100/mo", "5 accountable task credits"]]} />
        </Section>

        <Section eyebrow="07" title="Combined Package Options">
          <div className="grid gap-4 md:grid-cols-3">{bundles.map(([name, price, save]) => <div key={name} className={`border p-5 shadow-[0_18px_50px_-35px_rgba(45,27,105,.45)] ${name === "Full Stack all four" ? "border-[#D4A017] bg-[#D4A017]/15" : "border-[#2D1B69]/10 bg-white"}`}><h3 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>{name}</h3><p className="mt-3 font-mono text-lg text-[#4A3DAA]">{price}</p><p className="mt-2 text-sm text-slate-700">{save}</p></div>)}</div>
          <Card><p className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-[#0D9488]">Unified RAG Credits</p><p className="mt-3 text-sm leading-6 text-slate-700">Future state: one credit wallet across Nexus, Motion, Space, and Cohort usage.</p></Card>
        </Section>

        <Section eyebrow="08" title="Launch Actions">
          <Timeline items={["Sign 15 clients", "UWM ABLE partnership", "Recruit 3-5 track leads", "Launch Work Ledger"]} />
        </Section>

        <Footer />
      </div>
    </main>
  )
}

function BriefNav() {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link href="/services" className="inline-flex items-center gap-2 font-mono text-sm font-medium text-[#2D1B69] hover:text-[#4A3DAA]"><ArrowLeft className="h-4 w-4" /> All Services</Link><button onClick={() => window.print()} className="inline-flex items-center gap-2 border border-[#2D1B69]/15 bg-white px-4 py-2 font-mono text-sm font-medium shadow-sm hover:bg-[#E0F5F4]"><Printer className="h-4 w-4" /> Print / Save as PDF</button></div>
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="border border-white/20 bg-white/10 p-5"><div className="font-mono text-2xl font-medium text-[#D4A017]">{value}</div><div className="mt-2 text-sm text-white/70">{label}</div></div>
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="border-b border-[#2D1B69]/10 py-10"><p className="font-mono text-xs uppercase tracking-[0.28em] text-[#0D9488]">Section {eyebrow}</p><h2 className="mt-2 text-4xl font-extrabold sm:text-5xl" style={{ fontFamily: "var(--font-syne)" }}>{title}</h2><div className="mt-6 space-y-4">{children}</div></section>
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="border border-[#2D1B69]/10 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(45,27,105,.45)]">{children}</div>
}

function DataTable({ rows }: { rows: string[][] }) {
  return <div className="overflow-x-auto"><table className="w-full border-collapse bg-white text-sm"><thead className="bg-[#2D1B69] text-white"><tr><th className="p-3 text-left">Line Item</th><th className="p-3 text-left">Cost</th><th className="p-3 text-left">Note</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]} className={row[0] === "Participant Stipend Pool" || row[0] === "Cohort Network" ? "border-b bg-[#E0F5F4]" : "border-b"}><td className="p-3 font-bold">{row[0]}</td><td className="p-3 font-mono">{row[1]}</td><td className="p-3">{row[2]}</td></tr>)}</tbody></table></div>
}

function Timeline({ items }: { items: string[] }) {
  return <div className="grid gap-3 md:grid-cols-4">{items.map((item, index) => <div key={item} className="border border-[#2D1B69]/10 bg-white p-5"><div className="font-mono text-sm text-[#0D9488]">0{index + 1}</div><p className="mt-3 text-sm leading-6">{item}</p></div>)}</div>
}

function Footer() {
  return <footer className="py-8 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">readyaimgo | Cohort Network · Ezra Hauga · ezra@beamthink.institute</footer>
}
