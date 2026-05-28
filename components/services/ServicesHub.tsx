"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, Boxes, Building2, Car, Users } from "lucide-react"

const services = [
  {
    name: "Nexus",
    subtitle: "Web · App · Creative · Hardware",
    price: "$50/mo",
    href: "/services/nexus",
    description:
      "A lightweight operating subscription for hosted web/app presence, creative support, and client-ready hardware.",
    icon: Boxes,
    accent: "text-[#C9911A]",
  },
  {
    name: "Motion Network",
    subtitle: "Rides · Delivery · Fleet",
    price: "$100/mo",
    href: "/services/motion",
    description:
      "Fractional logistics credits for rides, deliveries, routing, and BEAM driver-backed fleet coordination.",
    icon: Car,
    accent: "text-[#1A4A8A]",
  },
  {
    name: "Space Network",
    subtitle: "Meeting rooms · Pop-ups · Studio",
    price: "$100/mo",
    href: "/services/space",
    description:
      "Aggregated workspace demand for meeting rooms, pop-up storefronts, studios, and desk access.",
    icon: Building2,
    accent: "text-[#2D5A3D]",
  },
  {
    name: "Cohort Network",
    subtitle: "Specialist teams · BEAM workforce",
    price: "$100/mo",
    href: "/services/cohort",
    description:
      "Task credits for pre-trained BEAM specialist teams across tech, creative, logistics, and forge tracks.",
    icon: Users,
    accent: "text-[#4A3DAA]",
  },
]

export function ServicesHub() {
  return (
    <main className="min-h-screen bg-[#f7f4ec] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-950/10 pb-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">ReadyAimGo</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Services</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
              Four subscription service areas powering the readyaimgo ecosystem.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border border-slate-950/15 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to readyaimgo.biz
          </Link>
        </header>

        <section className="grid gap-5 py-10 md:grid-cols-2">
          {services.map((service) => {
            const Icon = service.icon

            return (
              <Link
                key={service.href}
                href={service.href}
                className="group border border-slate-950/10 bg-white p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:border-slate-950/25"
              >
                <div className="flex items-start justify-between gap-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center border border-slate-950/10 bg-slate-950/[0.03]">
                      <Icon className={`h-6 w-6 ${service.accent}`} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{service.name}</h2>
                      <p className="mt-1 text-sm font-semibold text-slate-600">{service.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="mt-2 h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-900" />
                </div>
                <p className="mt-5 text-3xl font-black">{service.price}</p>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-700">{service.description}</p>
              </Link>
            )
          })}
        </section>

        <footer className="mt-auto border-t border-slate-950/10 py-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            Back to readyaimgo.biz
          </Link>
        </footer>
      </div>
    </main>
  )
}
