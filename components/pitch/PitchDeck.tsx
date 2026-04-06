"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Lock, ChevronLeft, ChevronRight, TrendingUp,
  Truck, Shield, DollarSign, Calendar, Users, Car, AlertCircle,
} from "lucide-react"

const PITCH_PIN = process.env.NEXT_PUBLIC_PITCH_PIN || "2025"

const DISPLAY =
  '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif'

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: "green" | "amber" | "blue" | "gray" }) {
  const styles = {
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  }
  return (
    <span className={cn("inline-block text-xs font-semibold px-2.5 py-1 rounded-md mb-2", styles[color])}>
      {children}
    </span>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-xl border p-5",
      accent
        ? "border-blue-300 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-900"
        : "border-gray-200 dark:border-gray-700"
    )}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-1">
      {children}
    </p>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2" style={{ fontFamily: DISPLAY }}>
      {children}
    </h2>
  )
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
      {children}
    </p>
  )
}

function LineItem({ label, note, amount, total }: { label: string; note?: string; amount: string; total?: boolean }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-700/60 last:border-0", total && "pt-4 border-t-2 border-gray-200 dark:border-gray-600 mt-2")}>
      <div>
        <p className={cn("text-sm", total ? "font-semibold text-gray-900 dark:text-white" : "text-gray-800 dark:text-gray-200")}>{label}</p>
        {note && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{note}</p>}
      </div>
      <p className={cn("text-sm whitespace-nowrap shrink-0", total ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-900 dark:text-white")}>{amount}</p>
    </div>
  )
}

function TlItem({ date, title, body, phase }: { date: string; title: string; body: string; phase: "now" | "next" | "future" }) {
  const dotColor = { now: "bg-emerald-500", next: "bg-blue-500", future: "bg-amber-500" }
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "80px 14px 1fr" }}>
      <p className="text-xs text-gray-400 dark:text-gray-500 text-right pt-3">{date}</p>
      <div className="flex flex-col items-center">
        <div className={cn("w-3 h-3 rounded-full mt-3 shrink-0", dotColor[phase])} />
        <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-3">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

function Slide1() {
  return (
    <div>
      <SectionLabel>Slide 1 of 8 — Overview</SectionLabel>
      <H2>ReadyAimGo — family investment pitch</H2>
      <Sub>A request for startup capital to launch the RAG fleet and activate BEAM Transportation's first client contract. This is a specific, operational ask — not a concept.</Sub>
      <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
        <Metric label="Funding ask" value="$25,000" sub="Total startup capital" />
        <Metric label="Launch revenue" value="$700/mo" sub="4 vehicles @ $175 each" />
        <Metric label="Break-even fleet" value="9 vehicles" sub="~month 10–12" />
        <Metric label="12-month target" value="$2,100/mo" sub="12 vehicles in fleet" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs text-gray-400 mb-1">What ReadyAimGo is</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">A for-profit fleet and services company</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">RAG operates a fleet of branded vehicles and sells services to clients. The fleet is maintained by BEAM Transportation — a community NGO — at community rates, keeping operating costs far below commercial alternatives.</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400 mb-1">What BEAM Transportation is</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">The NGO that maintains the fleet and trains the cohort</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">BEAM is the maintenance provider. Community members and students earn credentials by working on RAG's vehicles. BEAM earns recurring contract revenue. RAG gets professional maintenance at well below market rate.</p>
        </Card>
      </div>
    </div>
  )
}

function Slide2() {
  return (
    <div>
      <SectionLabel>Slide 2 of 8 — The problem</SectionLabel>
      <H2>The gap this fills</H2>
      <Sub>Two problems that feed each other — and one model that solves both simultaneously.</Sub>
      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <Card>
          <Badge color="amber">Problem 1 — for businesses</Badge>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Fleet maintenance is expensive and unreliable</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Commercial shops charge $400–$600 per vehicle per month for fleet maintenance. Small businesses overpay or defer maintenance until something breaks. There is no affordable, professional, recurring option in Milwaukee.</p>
        </Card>
        <Card>
          <Badge color="amber">Problem 2 — for the community</Badge>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Young people need real work, not training programs</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Eric graduated high school with no clear path. There are programs, but no actual jobs doing real work on real vehicles for real clients. Credentials without deliverables don't build careers. Milwaukee has the talent — it lacks the structure.</p>
        </Card>
      </div>
      <Card accent>
        <Badge color="green">The solution</Badge>
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">BEAM maintains RAG's fleet at $175/vehicle/month — less than half the commercial rate</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">RAG saves money. BEAM earns contract revenue. Cohort participants do real maintenance, log every session, and build documented portfolios. Eric's mom's auto parts store supplies the parts — keeping money local at every step of the chain.</p>
      </Card>
    </div>
  )
}

function Slide3() {
  const vehicles = [
    { name: "2024 Ford Transit", config: "High Roof 148\" AWD", engine: "3.5L EcoBoost V6", payload: "4,640 lbs", price: "$54,000–$62,000", dealer: "Kunes Ford Milwaukee / Boucher Ford", priority: "Buy first", color: "green" as const, purpose: "Primary RAG service van — vehicle 1 in BEAM cohort" },
    { name: "2024 Ford F-150", config: "SuperCrew 4x4", engine: "2.7L EcoBoost V6", payload: "2,238 lbs", price: "$42,000–$55,000", dealer: "Kunes Ford Milwaukee / Russ Darrow Ford", priority: "Buy first", color: "green" as const, purpose: "Crew transport and towing — all-weather Milwaukee workhorse" },
    { name: "2024 Ram ProMaster", config: "High Roof 159\" FWD", engine: "3.6L Pentastar V6", payload: "4,400 lbs", price: "$44,000–$52,000", dealer: "Russ Darrow Chrysler / Wilde East Towne", priority: "Month 2–3", color: "blue" as const, purpose: "Heavy cargo — lowest load floor in class" },
    { name: "2024 Chevy Silverado", config: "Crew Cab 4x4", engine: "3.0L Duramax Diesel", payload: "2,280 lbs", price: "$42,000–$58,000", dealer: "Russ Darrow Chevy / Bergstrom Chevy", priority: "Month 2–3", color: "blue" as const, purpose: "Cohort participant truck — connects parts supply chain" },
  ]
  return (
    <div>
      <SectionLabel>Slide 3 of 8 — The vehicles</SectionLabel>
      <H2>Exact vehicles — what, where, when</H2>
      <Sub>Four vehicles to launch. Two priority buys for immediate revenue, two following within 90 days. All sourced from Milwaukee-area dealers.</Sub>
      <div className="space-y-3 mb-5">
        {vehicles.map((v) => (
          <div key={v.name} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{v.name}</p>
                <p className="text-xs text-gray-400">{v.config}</p>
              </div>
              <Badge color={v.color}>{v.priority}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-2 sm:grid-cols-4">
              <span><span className="text-gray-400">Engine:</span> {v.engine}</span>
              <span><span className="text-gray-400">Payload:</span> {v.payload}</span>
              <span><span className="text-gray-400">Price:</span> {v.price}</span>
              <span><span className="text-gray-400">Dealer:</span> {v.dealer}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{v.purpose}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs text-gray-400 mb-1">Financing path</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">$8,000–$12,000 down per vehicle</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Most Milwaukee Ford/GM dealers offer commercial fleet financing at 6–8% APR. Family investment covers down payments on the first two. Dealer financing covers the balance. Vehicles 3 and 4 are added once revenue validates the model.</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400 mb-1">IRS Section 179</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Up to 100% of vehicle cost deductible year one</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Section 179 lets RAG deduct the full purchase price of qualifying commercial vehicles in the year of purchase. Cargo vans and trucks used for business qualify. This materially reduces the effective acquisition cost — work this into the tax return from day one.</p>
        </Card>
      </div>
    </div>
  )
}

function Slide4() {
  return (
    <div>
      <SectionLabel>Slide 4 of 8 — Who drives</SectionLabel>
      <H2>Who drives — and how they earn</H2>
      <Sub>Every driver is a named person with a defined role, compensation structure, and documented deliverable. No vague "contractors."</Sub>
      <div className="grid gap-4 sm:grid-cols-3 mb-5">
        <Card>
          <Badge color="blue">Driver 1</Badge>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Ezra Hauga — Founder</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3">Primary operator of the Transit and F-150 at launch. Sets operational standards, manages client relationships, and owns service documentation. Standard Class D Wisconsin license — sufficient for all four launch vehicles.</p>
          <p className="text-xs text-gray-400 italic">Compensation: RAG equity + founder salary once revenue covers operating costs</p>
        </Card>
        <Card>
          <Badge color="green">Driver 2</Badge>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Eric H. — Cohort participant</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3">Eric enrolled in BEAM Transportation's cohort after graduating high school. He assists on service runs, logistics, and parts sourcing — using his mom's auto parts store as the anchor supply partner. Every session is logged.</p>
          <p className="text-xs text-gray-400 italic">Compensation: CV and portfolio now → 20% cohort revenue share when contracts pay</p>
        </Card>
        <Card>
          <Badge color="amber">Drivers 3+</Badge>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">BEAM cohort members</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-3">As the fleet grows, additional cohort members are assigned — UWM and MATC students on co-requisite courses earn academic credit. Community members earn documented credentials. Each session log is portfolio evidence.</p>
          <p className="text-xs text-gray-400 italic">Compensation: Academic credit now → revenue share as fleet contract revenue scales</p>
        </Card>
      </div>
      <Card accent>
        <p className="text-xs text-gray-400 mb-1">Licensing — confirmed</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Standard driver's license covers all four launch vehicles</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Ford Transit, F-150, Ram ProMaster, and Chevrolet Silverado all fall under 10,001 lbs GVWR. A standard Class D (regular) driver's license is sufficient for all four in Wisconsin. No CDL required. The commercial insurance policy lists all operators by name — anyone with a clean MVR is covered from day one.</p>
      </Card>
    </div>
  )
}

function Slide5() {
  return (
    <div>
      <SectionLabel>Slide 5 of 8 — Insurance</SectionLabel>
      <H2>Insurance and coverage — every vehicle, every driver</H2>
      <Sub>Commercial fleet insurance is a solved problem. Here is the exact structure RAG uses from day one.</Sub>
      <div className="grid gap-4 sm:grid-cols-2 mb-5">
        <Card>
          <Badge color="green">Required coverage</Badge>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Commercial auto policy — fleet rated</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">For a 4-vehicle Milwaukee fleet expect $3,000–$5,500 per year ($250–$460/month). Covers liability (injury and property), collision, comprehensive, and uninsured motorist. All named drivers on the policy are covered from the moment the policy binds.</p>
        </Card>
        <Card>
          <Badge color="blue">Recommended providers</Badge>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Sentry Insurance, Progressive Commercial, State Farm</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Sentry Insurance is headquartered in Wisconsin — strong Milwaukee presence, competitive fleet rates. Progressive Commercial offers instant online quotes for fleets under 10 vehicles. Get three quotes before binding.</p>
        </Card>
        <Card>
          <Badge color="amber">BEAM cohort participants</Badge>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Listed as additional drivers on the commercial policy</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Cohort members who operate vehicles are listed as additional insured drivers. Each provides a motor vehicle record (MVR) to the insurer. Clean records add minimal cost. Anyone with violations is restricted to non-driving roles. Standard commercial fleet practice.</p>
        </Card>
        <Card>
          <Badge color="gray">BEAM NGO coverage</Badge>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">General liability + tools and equipment rider</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Before any vehicle work begins, BEAM Transportation needs general liability insurance ($1M–$2M) and a tools/equipment rider covering on-site maintenance work. Protects BEAM, RAG, and clients. Combined cost: $1,200–$2,400 per year.</p>
        </Card>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Commercial auto (est.)" value="$4,200/yr" sub="4-vehicle fleet" />
        <Metric label="BEAM gen. liability" value="$1,800/yr" sub="NGO coverage" />
        <Metric label="Total insurance" value="$6,000/yr" sub="$500/month blended" />
        <Metric label="Per vehicle per month" value="$125" sub="Blended average" />
      </div>
    </div>
  )
}

function Slide6() {
  const [fleet, setFleet] = useState(4)

  const rev = fleet * 175
  const loans = Math.min(fleet, 4) * 800
  const ins = Math.round(350 + fleet * 30)
  const fuel = Math.round(150 + fleet * 60)
  const beamContract = fleet * 175
  const cost = loans + ins + fuel + beamContract + 150
  const net = rev - cost

  const milestones = [
    { month: "Month 1", event: "Launch", vehicles: "2 (Transit + F-150)", revenue: "$350", status: "Ramping", color: "amber" as const },
    { month: "Month 2–3", event: "ProMaster + Silverado", vehicles: "4", revenue: "$700", status: "Building", color: "amber" as const },
    { month: "Month 4–6", event: "First external client", vehicles: "4–6", revenue: "$700–$1,050", status: "Growing", color: "blue" as const },
    { month: "Month 7–9", event: "Eric's mom anchor partner", vehicles: "6–9", revenue: "$1,050–$1,575", status: "Near break-even", color: "blue" as const },
    { month: "Month 10–12", event: "Break-even + surplus", vehicles: "9–12", revenue: "$1,575–$2,100", status: "Profitable", color: "green" as const },
  ]

  return (
    <div>
      <SectionLabel>Slide 6 of 8 — Financials</SectionLabel>
      <H2>The numbers — revenue, costs, and break-even</H2>
      <Sub>Drag the slider to model fleet growth. Revenue is $175/vehicle/month from the BEAM maintenance contract.</Sub>

      <div className="flex items-center gap-3 mb-5 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4">
        <label className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Fleet size</label>
        <input type="range" min={1} max={20} value={fleet} step={1}
          onChange={(e) => setFleet(Number(e.target.value))}
          className="flex-1 accent-blue-600" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[80px]">
          {fleet} vehicle{fleet !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Metric label="Monthly revenue" value={`$${rev.toLocaleString()}`} sub="@$175/vehicle" />
        <Metric label="Monthly costs (est.)" value={`$${cost.toLocaleString()}`} sub="Insurance + loans + fuel" />
        <div className={cn("rounded-lg p-4", net >= 0 ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-red-50 dark:bg-red-900/20")}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly net</p>
          <p className={cn("text-2xl font-semibold", net >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
            {net >= 0 ? "+" : "-"}${Math.abs(net).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">Closes as fleet grows</p>
        </div>
      </div>

      <div className="overflow-x-auto mb-5">
        <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              {["Month", "Milestone", "Vehicles", "Revenue", "Status"].map((h) => (
                <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {milestones.map((m) => (
              <tr key={m.month} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{m.month}</td>
                <td className="py-3 px-3 text-gray-900 dark:text-white">{m.event}</td>
                <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{m.vehicles}</td>
                <td className="py-3 px-3 text-gray-900 dark:text-white font-medium">{m.revenue}</td>
                <td className="py-3 px-3"><Badge color={m.color}>{m.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card>
        <p className="text-xs text-gray-400 mb-3">Monthly cost structure at 4-vehicle launch</p>
        <LineItem label="Commercial auto insurance" note="4 vehicles on fleet policy" amount="$350" />
        <LineItem label="Vehicle loan payments (2 vehicles @ ~$800/mo)" note="Transit and F-150 — vehicles 3+4 added from revenue" amount="$1,600" />
        <LineItem label="Fuel — Milwaukee area operations" note="~1,200 miles/month across fleet" amount="$400" />
        <LineItem label="BEAM maintenance contract" note="$175/vehicle — cost to RAG, revenue to BEAM" amount="$700" />
        <LineItem label="Operating miscellaneous" note="Parking, tolls, admin" amount="$150" />
        <LineItem label="Total monthly costs at launch" amount="~$3,200" total />
      </Card>
    </div>
  )
}

function Slide7() {
  return (
    <div>
      <SectionLabel>Slide 7 of 8 — The ask</SectionLabel>
      <H2>The funding ask</H2>
      <Sub>Specific amounts, specific uses, specific return structure. No vagueness.</Sub>

      <div className="border-2 border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-5">
        <p className="text-xs font-semibold tracking-widest uppercase text-blue-600 dark:text-blue-400 mb-2">Total family investment requested</p>
        <p className="text-4xl font-semibold text-gray-900 dark:text-white mb-2">$25,000</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Covers vehicle down payments, insurance setup, BEAM NGO filing, vehicle upfit, and 90-day operating runway while revenue ramps</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-5">
        <Card>
          <Badge color="blue">Structure option A</Badge>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Convertible note</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">$25,000 lent to ReadyAimGo LLC at 5% simple annual interest. After 24 months converts to 10% equity in RAG or repaid in full — investor's choice. Monthly repayment of $500 begins when MRR exceeds $2,000. No complicated terms needed for a family deal.</p>
        </Card>
        <Card accent>
          <Badge color="green">Structure option B — simpler</Badge>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Revenue share</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">$25,000 invested in exchange for 8% of RAG gross revenue until $37,500 is returned (1.5× return), then the obligation ends cleanly. Investor gets paid first from every dollar. Defined exit, no equity entanglement, easy to explain to everyone.</p>
        </Card>
      </div>

      <Card>
        <p className="text-xs text-gray-400 mb-3">Exact use of funds</p>
        <LineItem label="Vehicle down payments — 2 vehicles × $8,000" note="Ford Transit + F-150 from Milwaukee dealers — dealer financing covers the rest at 6–8% APR" amount="$16,000" />
        <LineItem label="Commercial insurance setup" note="Progressive Commercial or Sentry — first month or annual down required to bind" amount="$2,500" />
        <LineItem label="BEAM Transportation NGO filing + legal" note="Wisconsin Articles of Incorporation, EIN, bylaws, fiscal sponsor or 501(c)(3) filing" amount="$1,500" />
        <LineItem label="Vehicle upfit — shelving, RAG branding, basic tool kit" note="Transit interior shelving + livery wrap, tool kit for service runs" amount="$2,500" />
        <LineItem label="90-day operating reserve" note="Fuel and miscellaneous while first client contracts ramp to steady revenue" amount="$2,500" />
        <LineItem label="Total" amount="$25,000" total />
      </Card>
    </div>
  )
}

function Slide8() {
  return (
    <div>
      <SectionLabel>Slide 8 of 8 — Timeline</SectionLabel>
      <H2>What happens when — the 12-month plan</H2>
      <Sub>From investment to operational fleet to self-sustaining revenue. Every milestone is specific and measurable.</Sub>
      <div>
        <TlItem phase="now" date="Week 1–2" title="Legal and insurance setup" body="File BEAM Transportation NGO in Wisconsin. Bind commercial auto policy with Sentry or Progressive. Get EIN. Open RAG business bank account. Confirm all drivers on the policy." />
        <TlItem phase="now" date="Week 2–4" title="Vehicle acquisition — Transit + F-150" body="Purchase from Milwaukee dealers using down payment from family investment. Apply Section 179 strategy. Add both to commercial policy. Upfit Transit with shelving and RAG branding." />
        <TlItem phase="now" date="Week 3–5" title="First client meeting — Eric's mom's auto parts store" body="Present the anchor partner MOU. RAG signs as first BEAM fleet client. Eric enrolls as cohort participant. Parts sourcing relationship established — local supply chain goes live." />
        <TlItem phase="next" date="Month 2" title="First BEAM service session logged" body="BEAM cohort performs first weekly maintenance on RAG fleet. Service record logged in BEAM dashboard. Eric's first portfolio entry created. RAG receives first monthly fleet health report." />
        <TlItem phase="next" date="Month 2–3" title="ProMaster + Silverado added" body="Acquire vehicles 3 and 4 once revenue from first two vehicles validates the model. Fleet at 4 vehicles, $700/month from BEAM contract, cohort team expanded." />
        <TlItem phase="next" date="Month 3–4" title="VC414 pitch via Jordan" body="Jordan introduces RAG to VC414. Pitch includes BEAM fleet contract as operational evidence. ClearTrace presented as second BEAM ecosystem company — BEAM becomes a dealflow narrative." />
        <TlItem phase="future" date="Month 4–6" title="First external fleet client signed" body="A second Milwaukee business signs a BEAM fleet maintenance contract at $175/vehicle/month. Revenue rises above RAG's self-service level. BEAM Transportation begins generating income beyond its first client." />
        <TlItem phase="future" date="Month 10–12" title="Break-even + first cohort revenue share paid" body="9+ vehicles in fleet. $1,575+/month revenue. Operating costs covered. 20% of contract revenue distributed to cohort participants. Eric receives first payment. Family loan repayment begins at $500/month." />
      </div>
    </div>
  )
}

const SLIDES = [
  { id: "overview", label: "Overview", icon: TrendingUp, component: Slide1 },
  { id: "problem", label: "The problem", icon: AlertCircle, component: Slide2 },
  { id: "vehicles", label: "Vehicles", icon: Car, component: Slide3 },
  { id: "drivers", label: "Who drives", icon: Users, component: Slide4 },
  { id: "insurance", label: "Insurance", icon: Shield, component: Slide5 },
  { id: "financials", label: "Financials", icon: DollarSign, component: Slide6 },
  { id: "ask", label: "The ask", icon: Truck, component: Slide7 },
  { id: "timeline", label: "Timeline", icon: Calendar, component: Slide8 },
]

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin === PITCH_PIN) {
      onUnlock()
    } else {
      setError(true)
      setPin("")
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center">
              <Lock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-1" style={{ fontFamily: DISPLAY }}>
            ReadyAimGo Investment Pitch
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            Enter the access code to view this deck
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Access code"
              autoFocus
              className={cn(
                "w-full border rounded-xl px-4 py-3 text-center text-lg tracking-widest outline-none transition",
                "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white",
                error
                  ? "border-red-400 dark:border-red-600"
                  : "border-gray-200 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-500"
              )}
            />
            {error && (
              <p className="text-xs text-red-500 text-center">Incorrect code — try again</p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold transition"
            >
              View Pitch Deck
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function PitchDeck() {
  const [unlocked, setUnlocked] = useState(false)
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)

  const goTo = useCallback((index: number) => {
    setDirection(index > current ? 1 : -1)
    setCurrent(index)
  }, [current])

  const prev = () => current > 0 && goTo(current - 1)
  const next = () => current < SLIDES.length - 1 && goTo(current + 1)

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />

  const SlideComponent = SLIDES[current].component

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-orange-500">ReadyAimGo</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: DISPLAY }}>
              Investment Pitch — Family Round
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {current + 1} / {SLIDES.length}
            </span>
            <button onClick={prev} disabled={current === 0}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={next} disabled={current === SLIDES.length - 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Tab nav */}
        <div className="max-w-5xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {SLIDES.map((s, i) => {
            const Icon = s.icon
            return (
              <button key={s.id} onClick={() => goTo(i)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition shrink-0",
                  i === current
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}>
                <Icon className="w-3 h-3" />
                {s.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${((current + 1) / SLIDES.length) * 100}%` }}
        />
      </div>

      {/* Slide content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <SlideComponent />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav */}
      <div className="max-w-5xl mx-auto px-4 pb-10 flex items-center justify-between">
        <button onClick={prev} disabled={current === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={cn("w-2 h-2 rounded-full transition", i === current ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700")} />
          ))}
        </div>
        <button onClick={next} disabled={current === SLIDES.length - 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
