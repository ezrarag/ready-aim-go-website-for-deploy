"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { bebasNeue, dmMono } from "./service-fonts"

const stats = [["20", "Pilot clients"], ["$2K", "Monthly gross"], ["$900", "Fleet reserve / mo"], ["60 days", "Pre-launch"]]
const economics = [["Fleet Asset Fund", "$45/mo", "For vendor"], ["Labor & Fuel Pool", "$40/mo", "Drivers, fuel, dispatch"], ["Platform Maintenance", "$10/mo", "Scheduling and routing"], ["Logistics Architect", "$5/mo", "5% commission"]]
const acquisition = ["Floor plan partnership", "Corporate lease", "Turo block", "Family network MOUs"]
const demand = ["Commercial B2B anchor routes", "Family rental network", "Logistics overflow", "SOW enterprise clients"]

export function MotionBrief() {
  return (
    <main className={`${bebasNeue.variable} ${dmMono.variable} min-h-screen bg-[#E8F0FE] text-[#0D1B3E]`}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:px-10">
        <BriefNav />

        <section className="relative overflow-hidden bg-[#0D1B3E] px-6 py-16 text-white sm:px-10 lg:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,160,23,.32),transparent_34%),linear-gradient(135deg,rgba(26,74,138,.92),rgba(13,27,62,1))]" />
          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-[#D4A017]">Fleet & Vendor Partnership Proposal</p>
            <h1 className="mt-5 text-7xl leading-[0.82] tracking-normal sm:text-9xl" style={{ fontFamily: "var(--font-bebas)" }}>Motion Network</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              Fractional fleet logistics for rides, delivery, scheduling, and route density powered by BEAM drivers.
            </p>
            <div className="mt-10 grid gap-3 sm:grid-cols-4">
              {stats.map(([value, label]) => <Stat key={label} value={value} label={label} />)}
            </div>
          </div>
        </section>

        <Section eyebrow="Credit System" title="4 monthly motion credits">
          <div className="grid gap-3 md:grid-cols-4">
            {["4 credits/mo", "15-mile radius/credit", "60-day window", "$0 client liability"].map((item) => <Card key={item}><p className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-[#1A4A8A]">{item}</p></Card>)}
          </div>
        </Section>

        <Section eyebrow="01" title="About">
          <div className="grid gap-4 md:grid-cols-3">
            {["Fractional fleet access for businesses that need movement without vehicle ownership.", "BEAM drivers convert route demand into staffed execution and recurring transport capacity.", "Motion Credits define usage clearly so clients can plan rides, delivery, and overflow work."].map((body) => <Card key={body}><p className="text-sm leading-7 text-slate-700">{body}</p></Card>)}
          </div>
        </Section>

        <Section eyebrow="02" title="Economics">
          <DataTable rows={economics} />
        </Section>

        <Section eyebrow="03" title="Floor Plan Arbitrage">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <Card>
              <h3 className="text-4xl tracking-normal" style={{ fontFamily: "var(--font-bebas)" }}>Dealer Problem</h3>
              <p className="mt-4 text-sm leading-7 text-slate-700">$7/day floor plan cost, 88 days average sit time, and $616 bleeding per vehicle before a sale.</p>
            </Card>
            <Card>
              <blockquote className="border-l-4 border-[#D4A017] pl-5 text-lg leading-8 text-[#0D1B3E]">
                Put idle inventory into a paid subscription logistics network before it ages out on the lot.
              </blockquote>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {acquisition.map((item) => <p key={item} className="border border-[#1A4A8A]/15 bg-[#E8F0FE] p-3 font-mono text-xs uppercase tracking-[0.18em]">{item}</p>)}
              </div>
            </Card>
          </div>
        </Section>

        <Section eyebrow="04" title="Demand Mapping">
          <div className="grid gap-4 md:grid-cols-4">
            {demand.map((item) => <Card key={item}><h3 className="text-3xl tracking-normal" style={{ fontFamily: "var(--font-bebas)" }}>{item}</h3><p className="mt-3 text-sm leading-6 text-slate-700">Mapped against route density so no vehicle drives empty.</p></Card>)}
          </div>
        </Section>

        <Section eyebrow="05" title="60-Day Timeline">
          <Timeline items={["Day 1 intake", "Day 1-30 route grid", "Day 30 pool hits $4K", "Day 60 launch", "Day 60+ recurring"]} />
        </Section>

        <Section eyebrow="06" title="Proposal Table">
          <div className="overflow-x-auto"><table className="w-full border-collapse bg-white text-sm"><thead className="bg-[#0D1B3E] text-white"><tr><th className="p-3 text-left">Stage</th><th className="p-3 text-left">Vehicle Demand</th><th className="p-3 text-left">Annual Value</th></tr></thead><tbody>{[["Pilot", "1-2 vehicles", "$24K"], ["Phase 2", "4-6 vehicles", "$72K"], ["Scale", "10-15 vehicles", "$180K"], ["Multi-city", "25+ vehicles", "$500K+"]].map((row) => <tr key={row[0]} className="border-b"><td className="p-3 font-bold">{row[0]}</td><td className="p-3">{row[1]}</td><td className="p-3 font-mono">{row[2]}</td></tr>)}</tbody></table></div>
        </Section>

        <Section eyebrow="07" title="Action Items">
          <Timeline items={["Route density map", "One-page dealer proposal", "Family MOUs", "Commercial insurance quote"]} />
        </Section>

        <Footer />
      </div>
    </main>
  )
}

function BriefNav() {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link href="/services" className="inline-flex items-center gap-2 font-mono text-sm font-medium text-[#0D1B3E] hover:text-[#1A4A8A]"><ArrowLeft className="h-4 w-4" /> All Services</Link><button onClick={() => window.print()} className="inline-flex items-center gap-2 border border-[#0D1B3E]/15 bg-white px-4 py-2 font-mono text-sm font-medium shadow-sm hover:bg-[#D4A017]/10"><Printer className="h-4 w-4" /> Print / Save as PDF</button></div>
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="border border-white/20 bg-white/10 p-5"><div className="font-mono text-2xl font-medium text-[#D4A017]">{value}</div><div className="mt-2 text-sm text-white/70">{label}</div></div>
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="border-b border-[#0D1B3E]/10 py-10"><p className="font-mono text-xs uppercase tracking-[0.28em] text-[#1A4A8A]">Section {eyebrow}</p><h2 className="mt-2 text-5xl tracking-normal" style={{ fontFamily: "var(--font-bebas)" }}>{title}</h2><div className="mt-6">{children}</div></section>
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="border border-[#0D1B3E]/10 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(13,27,62,.45)]">{children}</div>
}

function DataTable({ rows }: { rows: string[][] }) {
  return <div className="overflow-x-auto"><table className="w-full border-collapse bg-white text-sm"><thead className="bg-[#0D1B3E] text-white"><tr><th className="p-3 text-left">Line Item</th><th className="p-3 text-left">Cost</th><th className="p-3 text-left">Note</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]} className={row[0] === "Fleet Asset Fund" ? "border-b bg-[#D4A017]/15" : "border-b"}><td className="p-3 font-bold">{row[0]}</td><td className="p-3 font-mono">{row[1]}</td><td className="p-3">{row[2]}</td></tr>)}</tbody></table></div>
}

function Timeline({ items }: { items: string[] }) {
  return <div className="grid gap-3 md:grid-cols-5">{items.map((item, index) => <div key={item} className="border border-[#0D1B3E]/10 bg-white p-5"><div className="font-mono text-sm text-[#1A4A8A]">{String(index + 1).padStart(2, "0")}</div><p className="mt-3 text-sm leading-6">{item}</p></div>)}</div>
}

function Footer() {
  return <footer className="py-8 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">readyaimgo | Motion Network · Ezra Hauga · ezra@beamthink.institute</footer>
}
