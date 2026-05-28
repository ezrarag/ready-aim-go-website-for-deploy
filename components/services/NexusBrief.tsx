"use client"

import Link from "next/link"
import { ArrowLeft, Printer } from "lucide-react"
import { dmMono, dmSerifDisplay } from "./service-fonts"

const stats = [
  ["15", "Pilot clients"],
  ["$750", "Monthly gross"],
  ["$25", "Hardware reserve / client"],
]

const services = [
  ["Web / App Hosting", "Public site, client portal, analytics, and managed deployment layer."],
  ["Creative Team", "1.5 hours per quarter for content, creative refreshes, and launch assets."],
  ["Hardware Lease", "Dedicated Apple or Android device reserve attached to each client account."],
  ["Client Architect", "A named operator translating business needs into recurring delivery."],
]

const economics = [
  ["Tech & Hosting", "$5.00/mo", "Internal platform cost"],
  ["Creative Team", "$15.00/mo", "1.5 hrs/qtr"],
  ["Hardware Lease", "$25.00/mo", "Vendor-facing reserve"],
  ["Client Architect", "$2.50/mo", "5% commission"],
]

const vendorOptions = [
  ["Option A", "Institutional Lease", "$20/device/mo target for predictable device access."],
  ["Option B", "Bulk Purchase Program", "Refurbished devices purchased sequentially as demand grows."],
  ["Option C", "Revenue-Backed Credit Line", "Stripe subscription data used as collateral for device financing."],
  ["Option D", "Distributor Partnership", "Follett for Apple and Android distributors for institutional pricing."],
]

export function NexusBrief() {
  return (
    <main className={`${dmSerifDisplay.variable} ${dmMono.variable} min-h-screen bg-[#F8F6F0] text-[#0A0A0A]`}>
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:px-10">
        <BriefNav />

        <section className="relative overflow-hidden bg-[#0A0A0A] px-6 py-16 text-[#F8F6F0] sm:px-10 lg:px-14">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(201,145,26,.28)_1px,transparent_1px),linear-gradient(90deg,rgba(201,145,26,.28)_1px,transparent_1px)] [background-size:34px_34px]" />
          <div className="relative">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-[#C9911A]">Vendor Partnership Proposal</p>
            <h1 className="mt-5 max-w-4xl text-5xl leading-[0.95] sm:text-7xl" style={{ fontFamily: "var(--font-dm-serif)" }}>
              readyaimgo | Nexus Ecosystem
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              A $50/month client subscription bundling web/app infrastructure, creative support, and a dedicated device path.
            </p>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {stats.map(([value, label]) => (
                <div key={label} className="border border-[#C9911A]/45 bg-white/5 p-5">
                  <div className="font-mono text-3xl font-medium text-[#C9911A]">{value}</div>
                  <div className="mt-2 text-sm text-white/70">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Section eyebrow="01" title="About">
          <div className="grid gap-4 md:grid-cols-2">
            {services.map(([title, body]) => (
              <Card key={title}>
                <h3 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)" }}>{title}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{body}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section eyebrow="02" title="Economics">
          <Table rows={economics} highlight="Hardware Lease" />
          <div className="mt-5 border-l-4 border-[#C9911A] bg-[#C9911A]/10 p-5">
            <p className="font-mono text-sm font-medium uppercase tracking-[0.18em] text-[#8a620f]">Total client value</p>
            <p className="mt-2 text-3xl" style={{ fontFamily: "var(--font-dm-serif)" }}>$200+/mo</p>
          </div>
        </Section>

        <Section eyebrow="03" title="Fulfillment">
          <Timeline items={["Day 1 intake: client goals, assets, and system setup.", "Day 15 creative unlock: first creative sprint becomes available.", "Day 30 hardware ships: device reserve converts into client hardware path."]} />
        </Section>

        <Section eyebrow="04" title="Proposal">
          <div className="grid gap-4 md:grid-cols-2">
            {vendorOptions.map(([option, title, body]) => (
              <Card key={option}>
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#C9911A]">{option}</p>
                <h3 className="mt-2 text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-700">{body}</p>
              </Card>
            ))}
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse bg-white text-sm">
              <thead className="bg-[#0A0A0A] text-white">
                <tr><th className="p-3 text-left">Clients</th><th className="p-3 text-left">Device Demand</th></tr>
              </thead>
              <tbody>{[["15", "Pilot inventory"], ["40", "First pooled lease"], ["100", "Managed distributor path"], ["250+", "Institutional device program"]].map((row) => <tr key={row[0]} className="border-b"><td className="p-3 font-mono">{row[0]}</td><td className="p-3">{row[1]}</td></tr>)}</tbody>
            </table>
          </div>
        </Section>

        <Section eyebrow="05" title="SOW / Enterprise">
          <Card>
            <h3 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)" }}>Together For Homes example</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-700">
              Larger SOW work can sit beside the monthly subscription using a milestone payment model: M1 deposit, M2 build, and M3 launch/final.
            </p>
          </Card>
        </Section>

        <Section eyebrow="06" title="Next Steps">
          <Timeline items={["NDA call", "Revenue verification", "Pilot agreement", "Quarterly review"]} />
        </Section>

        <Footer label="readyaimgo · Nexus Ecosystem · Ezra Hauga · ezra@beamthink.institute" />
      </div>
    </main>
  )
}

function BriefNav() {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <Link href="/services" className="inline-flex items-center gap-2 font-mono text-sm font-medium text-[#0A0A0A] hover:text-[#C9911A]">
        <ArrowLeft className="h-4 w-4" /> All Services
      </Link>
      <button onClick={() => window.print()} className="inline-flex items-center gap-2 border border-[#0A0A0A]/15 bg-white px-4 py-2 font-mono text-sm font-medium shadow-sm hover:bg-[#C9911A]/10">
        <Printer className="h-4 w-4" /> Print / Save as PDF
      </button>
    </div>
  )
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="border-b border-[#0A0A0A]/10 py-10"><p className="font-mono text-xs uppercase tracking-[0.28em] text-[#C9911A]">Section {eyebrow}</p><h2 className="mt-2 text-4xl" style={{ fontFamily: "var(--font-dm-serif)" }}>{title}</h2><div className="mt-6">{children}</div></section>
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="border border-[#0A0A0A]/10 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(10,10,10,.45)]">{children}</div>
}

function Table({ rows, highlight }: { rows: string[][]; highlight: string }) {
  return <div className="overflow-x-auto"><table className="w-full border-collapse bg-white text-sm"><thead className="bg-[#0A0A0A] text-white"><tr><th className="p-3 text-left">Line Item</th><th className="p-3 text-left">Cost</th><th className="p-3 text-left">Note</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]} className={`border-b ${row[0] === highlight ? "bg-[#C9911A]/15" : ""}`}><td className="p-3 font-bold">{row[0]}</td><td className="p-3 font-mono">{row[1]}</td><td className="p-3">{row[2]}</td></tr>)}</tbody></table></div>
}

function Timeline({ items }: { items: string[] }) {
  return <div className="grid gap-3 md:grid-cols-3">{items.map((item, index) => <div key={item} className="border border-[#0A0A0A]/10 bg-white p-5"><div className="font-mono text-sm text-[#C9911A]">0{index + 1}</div><p className="mt-3 text-sm leading-6">{item}</p></div>)}</div>
}

function Footer({ label }: { label: string }) {
  return <footer className="py-8 font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">{label}</footer>
}
