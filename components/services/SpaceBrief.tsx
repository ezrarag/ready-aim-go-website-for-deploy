"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { dmMono, playfairDisplay } from "./service-fonts"

const stats = [["15", "Clients"], ["$1.5K", "Gross"], ["$750", "Property reserve"], ["12", "Credits / client"]]
const economics = [["Property Reserve Fund", "$50/mo", "For partner/vendor"], ["Operations & Utilities", "$35/mo", "Access, setup, basic operations"], ["Platform Integration", "$10/mo", "Booking and client management"], ["Acquisition Architect", "$5/mo", "Partner development"]]
const orgs = ["Sherman Phoenix - 28K sq ft adaptive reuse", "VIA CDC - Near Southside CDC", "Riverworks Business Hub - BID-backed matchmaking", "MiSA Mitchell Street Arts - nonprofit makerspace", "Voces de la Frontera - mission-driven HQ anchor", "UWM / Academic Institutions - master-lease + student workforce"]
const paths = [["Path 1 (Immediate)", "Hospitality Block", "Hotel mid-week inventory"], ["Path 2 (6 months)", "BID/NID Master-Lease", "Storefront with BEAM renovation"], ["Path 3 (12-18 months)", "University Master-Lease", "Adaptive reuse and BEAM workforce track"]]

export function SpaceBrief() {
  return (
    <main className={`${playfairDisplay.variable} ${dmMono.variable} min-h-screen bg-[#F8F5F0] text-[#1A3A2A]`}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:px-10">
        <BriefNav />

        <section className="relative overflow-hidden bg-[#1A3A2A] px-6 py-16 text-white sm:px-10 lg:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(202,138,26,.34),transparent_35%),linear-gradient(135deg,rgba(45,90,61,.92),rgba(26,58,42,1))]" />
          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-[#FEF3DC]">Property & Institutional Partnership Proposal</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-bold leading-[1] sm:text-7xl" style={{ fontFamily: "var(--font-playfair)" }}>readyaimgo | Space Network</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">Tenants aggregated before signing the lease, with credits that convert flexible space into recurring demand.</p>
            <div className="mt-10 grid gap-3 sm:grid-cols-4">{stats.map(([value, label]) => <Stat key={label} value={value} label={label} />)}</div>
          </div>
        </section>

        <Section eyebrow="Credit Strip" title="Space Credits">
          <div className="grid gap-3 md:grid-cols-3">{["12 credits/mo", "2 hrs/credit", "$750 property reserve/mo"].map((item) => <Card key={item}><p className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-[#CA8A1A]">{item}</p></Card>)}</div>
        </Section>

        <Section eyebrow="01" title="About">
          <Card><p className="text-sm leading-7 text-slate-700">Space Network aggregates member demand before committing to leases, blocks, or partner inventory. Clients receive predictable workspace access while partners see reserved demand before capacity is activated.</p></Card>
        </Section>

        <Section eyebrow="02" title="Economics">
          <DataTable rows={economics} />
        </Section>

        <Section eyebrow="03" title="Milwaukee Landscape">
          <div className="grid gap-4 md:grid-cols-2">{orgs.map((org) => <Card key={org}><p className="text-sm leading-6 text-slate-700">{org}</p></Card>)}</div>
        </Section>

        <Section eyebrow="04" title="Three Acquisition Paths">
          <div className="grid gap-4 md:grid-cols-3">{paths.map(([phase, title, body]) => <Card key={phase}><p className="font-mono text-xs uppercase tracking-[0.22em] text-[#CA8A1A]">{phase}</p><h3 className="mt-2 text-2xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>{title}</h3><p className="mt-3 text-sm leading-6 text-slate-700">{body}</p></Card>)}</div>
        </Section>

        <Section eyebrow="05" title="Partner Framework">
          <Card>
            <blockquote className="border-l-4 border-[#CA8A1A] pl-5 text-lg leading-8 text-[#1A3A2A]">
              We bring paying tenants before we ask for permanent space; partners bring capacity, access, and local trust.
            </blockquote>
          </Card>
          <div className="mt-4 grid gap-4 md:grid-cols-4">{["What you bring", "What partner brings", "Protection", "Revenue split"].map((item) => <Card key={item}><h3 className="text-xl font-bold" style={{ fontFamily: "var(--font-playfair)" }}>{item}</h3><p className="mt-3 text-sm leading-6 text-slate-700">Clear responsibilities and a shared path from pilot capacity into repeatable bookings.</p></Card>)}</div>
        </Section>

        <Section eyebrow="06" title="Demand Distribution">
          <div className="overflow-x-auto"><table className="w-full border-collapse bg-white text-sm"><thead className="bg-[#1A3A2A] text-white"><tr><th className="p-3 text-left">Usage Type</th><th className="p-3 text-left">Inventory Protection</th></tr></thead><tbody>{["Pop-up storefront", "Meeting room", "Studio", "Co-work desk"].map((item) => <tr key={item} className="border-b"><td className="p-3 font-bold">{item}</td><td className="p-3">Credit allocation spreads demand so no space type carries dead inventory alone.</td></tr>)}</tbody></table></div>
        </Section>

        <Section eyebrow="07" title="Comparison">
          <DataTable rows={[["WeWork", "$300-600/mo", "Desk focused"], ["Commercial lease", "$1,500-5,000/mo", "Long commitment"], ["Peerspace", "$200-800/mo", "Ad hoc booking"], ["Hotel ad hoc", "$150-400/booking", "Event by event"], ["Space Network", "$100/mo", "12 flexible credits"]]} />
        </Section>

        <Section eyebrow="08" title="Action Items">
          <Timeline items={["Demand grid", "Hotel pitch", "BID alignment", "Partner MOU"]} />
        </Section>

        <Footer />
      </div>
    </main>
  )
}

function BriefNav() {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link href="/services" className="inline-flex items-center gap-2 font-mono text-sm font-medium text-[#1A3A2A] hover:text-[#CA8A1A]"><ArrowLeft className="h-4 w-4" /> All Services</Link><button onClick={() => window.print()} className="inline-flex items-center gap-2 border border-[#1A3A2A]/15 bg-white px-4 py-2 font-mono text-sm font-medium shadow-sm hover:bg-[#FEF3DC]"><Printer className="h-4 w-4" /> Print / Save as PDF</button></div>
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="border border-white/20 bg-white/10 p-5"><div className="font-mono text-2xl font-medium text-[#FEF3DC]">{value}</div><div className="mt-2 text-sm text-white/70">{label}</div></div>
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="border-b border-[#1A3A2A]/10 py-10"><p className="font-mono text-xs uppercase tracking-[0.28em] text-[#CA8A1A]">Section {eyebrow}</p><h2 className="mt-2 text-4xl font-bold sm:text-5xl" style={{ fontFamily: "var(--font-playfair)" }}>{title}</h2><div className="mt-6">{children}</div></section>
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="border border-[#1A3A2A]/10 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(26,58,42,.45)]">{children}</div>
}

function DataTable({ rows }: { rows: string[][] }) {
  return <div className="overflow-x-auto"><table className="w-full border-collapse bg-white text-sm"><thead className="bg-[#1A3A2A] text-white"><tr><th className="p-3 text-left">Line Item</th><th className="p-3 text-left">Cost</th><th className="p-3 text-left">Note</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]} className={row[0] === "Property Reserve Fund" || row[0] === "Space Network" ? "border-b bg-[#FEF3DC]" : "border-b"}><td className="p-3 font-bold">{row[0]}</td><td className="p-3 font-mono">{row[1]}</td><td className="p-3">{row[2]}</td></tr>)}</tbody></table></div>
}

function Timeline({ items }: { items: string[] }) {
  return <div className="grid gap-3 md:grid-cols-4">{items.map((item, index) => <div key={item} className="border border-[#1A3A2A]/10 bg-white p-5"><div className="font-mono text-sm text-[#CA8A1A]">0{index + 1}</div><p className="mt-3 text-sm leading-6">{item}</p></div>)}</div>
}

function Footer() {
  return <footer className="py-8 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">readyaimgo | Space Network · Ezra Hauga · ezra@beamthink.institute</footer>
}
