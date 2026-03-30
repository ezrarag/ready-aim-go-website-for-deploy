"use client"

import { useState, useEffect } from "react"

type VehicleStatus = "available" | "in-use" | "maintenance" | "coming-soon"
type VehicleType = "suv" | "box_truck" | "van" | "bus" | "aircraft"

interface FleetVehicle {
  id: string
  name: string
  make: string
  model: string
  year: number
  type: VehicleType
  status: VehicleStatus
  city: string
  seats?: number
  cargoCapacity?: string
  fuelType: string
  tier: "starter" | "flex" | "pro" | "enterprise"
  monthlyRate: number
  imageUrl?: string
  beamAssigned: boolean
  description?: string
}

const MOCK_VEHICLES: FleetVehicle[] = [
  {
    id: "v1",
    name: "LYRIQ EV",
    make: "Cadillac",
    model: "LYRIQ",
    year: 2024,
    type: "suv",
    status: "available",
    city: "Milwaukee",
    seats: 5,
    fuelType: "Electric",
    tier: "pro",
    monthlyRate: 999,
    beamAssigned: true,
    description: "Flagship EV SUV. 326mi range. Premium client transport.",
  },
  {
    id: "v2",
    name: "Transit 350 HD",
    make: "Ford",
    model: "Transit",
    year: 2023,
    type: "box_truck",
    status: "available",
    city: "Milwaukee",
    cargoCapacity: "1,600 lbs",
    fuelType: "Diesel",
    tier: "flex",
    monthlyRate: 599,
    beamAssigned: true,
    description: "High-roof cargo. Product moves, equipment, last-mile.",
  },
  {
    id: "v3",
    name: "Sprinter 2500",
    make: "Mercedes-Benz",
    model: "Sprinter",
    year: 2023,
    type: "van",
    status: "coming-soon",
    city: "Chicago",
    seats: 12,
    cargoCapacity: "2,000 lbs",
    fuelType: "Diesel",
    tier: "flex",
    monthlyRate: 599,
    beamAssigned: false,
    description: "Passenger + cargo config. Chicago expansion — Phase 2.",
  },
  {
    id: "v4",
    name: "Escalade IQ",
    make: "Cadillac",
    model: "Escalade IQ",
    year: 2025,
    type: "suv",
    status: "coming-soon",
    city: "Atlanta",
    seats: 7,
    fuelType: "Electric",
    tier: "enterprise",
    monthlyRate: 0,
    beamAssigned: false,
    description: "Full-size luxury EV. 450mi range. Atlanta anchor client.",
  },
  {
    id: "v5",
    name: "Model Y LR",
    make: "Tesla",
    model: "Model Y",
    year: 2024,
    type: "suv",
    status: "in-use",
    city: "Orlando",
    seats: 5,
    fuelType: "Electric",
    tier: "starter",
    monthlyRate: 299,
    beamAssigned: true,
    description: "Efficient EV. Orlando client transport, currently deployed.",
  },
  {
    id: "v6",
    name: "Promaster 2500",
    make: "Ram",
    model: "ProMaster",
    year: 2022,
    type: "box_truck",
    status: "maintenance",
    city: "Madison",
    cargoCapacity: "1,400 lbs",
    fuelType: "Gas",
    tier: "starter",
    monthlyRate: 299,
    beamAssigned: true,
    description: "In scheduled BEAM maintenance. Back online next week.",
  },
]

const STATUS_CONFIG: Record<VehicleStatus, { label: string; className: string }> = {
  available: { label: "AVAILABLE", className: "bg-emerald-500 text-emerald-950 font-bold text-[10px] tracking-widest px-2 py-0.5" },
  "in-use": { label: "IN USE", className: "bg-amber-400 text-amber-950 font-bold text-[10px] tracking-widest px-2 py-0.5" },
  maintenance: { label: "MAINTENANCE", className: "bg-orange-500 text-orange-950 font-bold text-[10px] tracking-widest px-2 py-0.5" },
  "coming-soon": { label: "COMING SOON", className: "bg-sky-400 text-sky-950 font-bold text-[10px] tracking-widest px-2 py-0.5" },
}

const TYPE_ICON: Record<VehicleType, string> = {
  suv: "SUV",
  box_truck: "CARGO",
  van: "VAN",
  bus: "BUS",
  aircraft: "AIR",
}

const CITY_FILTERS = ["All Cities", "Milwaukee", "Chicago", "Atlanta", "Orlando", "Madison"]
const TAB_FILTERS = [
  { key: "all", label: "ALL VEHICLES" },
  { key: "available", label: "AVAILABLE" },
  { key: "in-use", label: "IN USE" },
  { key: "maintenance", label: "MAINTENANCE" },
]

export function PublicFleetPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [activeCity, setActiveCity] = useState("All Cities")
  const [search, setSearch] = useState("")
  const [vehicles, setVehicles] = useState<FleetVehicle[]>(MOCK_VEHICLES)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // In production: fetch from /api/fleet
    // fetch('/api/fleet').then(r => r.json()).then(setVehicles)
    setLoading(false)
  }, [])

  const filtered = vehicles.filter((v) => {
    const tabMatch = activeTab === "all" || v.status === activeTab
    const cityMatch = activeCity === "All Cities" || v.city === activeCity
    const searchMatch =
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.make.toLowerCase().includes(search.toLowerCase()) ||
      v.city.toLowerCase().includes(search.toLowerCase())
    return tabMatch && cityMatch && searchMatch
  })

  return (
    <div className="min-h-screen bg-[#0e1117] text-white font-mono">
      {/* Top bar */}
      <div className="border-b border-white/10 bg-[#0e1117]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-xs tracking-widest uppercase">ReadyAimGo</span>
            <span className="text-white/20">/</span>
            <span className="text-white/80 text-xs tracking-widest uppercase">Fleet</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            {vehicles.filter((v) => v.status === "available").length} available now
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Hero heading — Overwatch BROWSE style */}
        <div className="mb-8">
          <h1
            className="text-6xl font-black italic tracking-tight leading-none mb-1"
            style={{ fontFamily: "'Arial Black', 'Impact', sans-serif", letterSpacing: "-0.02em" }}
          >
            FLEET
          </h1>
          <p className="text-white/40 text-sm tracking-wider">
            BEAM-maintained · multi-city · subscription access
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {/* Tab filters */}
          <div className="flex gap-1">
            {TAB_FILTERS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-xs font-bold tracking-widest transition-colors border ${
                  activeTab === tab.key
                    ? "bg-white text-black border-white"
                    : "bg-transparent text-white/50 border-white/20 hover:border-white/40 hover:text-white/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 sm:ml-auto">
            {/* City filter */}
            <select
              value={activeCity}
              onChange={(e) => setActiveCity(e.target.value)}
              className="bg-[#1a1f2e] border border-white/20 text-white/70 text-xs px-3 py-2 tracking-wider focus:outline-none focus:border-white/40"
            >
              {CITY_FILTERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Search */}
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#1a1f2e] border border-white/20 text-white text-xs px-3 py-2 w-40 placeholder:text-white/30 focus:outline-none focus:border-white/50"
            />

            {/* CTA */}
            <a
              href="/contact"
              className="bg-[#e85d04] hover:bg-[#f87333] text-white text-xs font-black tracking-widest px-5 py-2 flex items-center gap-2 transition-colors"
            >
              <span className="text-base leading-none">+</span> REQUEST
            </a>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-white/30 text-sm tracking-widest text-center py-24">LOADING FLEET...</div>
        ) : filtered.length === 0 ? (
          <div className="text-white/30 text-sm tracking-widest text-center py-24">NO VEHICLES MATCH</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        )}

        {/* Footer note */}
        <div className="mt-16 border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-4 text-[11px] text-white/25 tracking-widest">
          <span>BEAM TRANSPORTATION · COHORT MAINTAINED</span>
          <span>transport.beamthinktank.space</span>
        </div>
      </div>
    </div>
  )
}

function VehicleCard({ vehicle: v }: { vehicle: FleetVehicle }) {
  const status = STATUS_CONFIG[v.status]
  const isLocked = v.status === "coming-soon" || v.status === "in-use"

  return (
    <div
      className={`relative border flex flex-col transition-all duration-150 group ${
        v.status === "available"
          ? "border-white/20 bg-[#141922] hover:border-white/50 hover:bg-[#1a2030] cursor-pointer"
          : "border-white/10 bg-[#0f1318] opacity-80"
      }`}
    >
      {/* Vehicle image or placeholder */}
      <div className="relative h-40 bg-[#0a0d14] overflow-hidden flex items-center justify-center">
        {v.imageUrl ? (
          <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-20">
            <div
              className="text-5xl font-black italic tracking-tighter"
              style={{ fontFamily: "'Arial Black', Impact, sans-serif" }}
            >
              {TYPE_ICON[v.type]}
            </div>
            <div className="text-xs tracking-widest">{v.year}</div>
          </div>
        )}

        {/* Status badge — top right, Overwatch-style */}
        <div className="absolute top-2 right-2">
          <span className={status.className}>
            {status.label}
          </span>
        </div>

        {/* BEAM badge — top left */}
        {v.beamAssigned && (
          <div className="absolute top-2 left-2">
            <span className="bg-purple-600/80 text-purple-100 font-bold text-[10px] tracking-widest px-2 py-0.5">
              BEAM
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Name + make */}
        <div>
          <div className="text-white font-black tracking-tight text-base leading-tight">{v.name}</div>
          <div className="text-white/40 text-xs tracking-wider mt-0.5">
            {v.make} {v.model} — {v.city.toUpperCase()}
          </div>
        </div>

        {/* Description */}
        {v.description && (
          <p className="text-white/50 text-xs leading-relaxed">{v.description}</p>
        )}

        {/* Specs row */}
        <div className="flex gap-3 text-[11px] text-white/30 tracking-widest">
          <span>{v.type.replace("_", " ").toUpperCase()}</span>
          <span>·</span>
          <span>{v.fuelType.toUpperCase()}</span>
          {v.seats && <><span>·</span><span>{v.seats}P</span></>}
          {v.cargoCapacity && <><span>·</span><span>{v.cargoCapacity}</span></>}
        </div>

        {/* Footer: tier + rate + author-style row */}
        <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30 tracking-widest uppercase">TIER</span>
            <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">{v.tier}</span>
          </div>
          <div className="text-right">
            {v.monthlyRate > 0 ? (
              <span className="text-white/80 text-xs font-bold">
                from ${v.monthlyRate.toLocaleString()}
                <span className="text-white/30 font-normal">/mo</span>
              </span>
            ) : (
              <span className="text-white/30 text-xs">contact for pricing</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
