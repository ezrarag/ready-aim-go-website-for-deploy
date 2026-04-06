import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, ChevronLeft, Users, Waves } from "lucide-react"

export const metadata: Metadata = {
  title: "About | ReadyAimGo",
  description: "About ReadyAimGo and the staff pathways that connect business operations with BEAM participants.",
}

const DISPLAY_FONT = '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif'

const staffLanes = [
  {
    title: "Business Operators",
    body: "Coordinate launches, keep stories current, and translate active work into visible client momentum across the ReadyAimGo system.",
  },
  {
    title: "Field Support",
    body: "Bridge transportation, property, and operational realities so client work stays grounded in what is actually happening on the ground.",
  },
  {
    title: "BEAM Participants",
    body: "Move through participant lanes, role pathways, and transportation bridge opportunities that connect staffing to active business demand.",
  },
]

export default function AboutPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#cfd8ff] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.42),_transparent_36%),linear-gradient(135deg,_rgba(184,198,245,0.92),_rgba(160,174,230,0.88)_45%,_rgba(202,212,255,0.94))]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_24%,rgba(45,59,110,0.08)_100%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/business"
            className="inline-flex items-center gap-2 border border-white/55 bg-white/55 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-slate-800 backdrop-blur-sm transition hover:bg-white/80"
            style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Business
          </Link>

          <div className="flex items-center gap-3 border border-white/55 bg-white/65 px-4 py-3 backdrop-blur-sm">
            <div className="text-right">
              <div
                className="text-[0.6rem] font-black uppercase tracking-[0.36em] text-slate-500"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
              >
                ReadyAimGo
              </div>
              <div
                className="text-sm font-black uppercase tracking-[0.18em] text-slate-900"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
              >
                About Console
              </div>
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-10 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-start">
          <div className="space-y-10">
            <div>
              <div
                className="text-xs font-black uppercase tracking-[0.42em] text-slate-600"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
              >
                Mission Brief
              </div>
              <h1
                className="mt-4 max-w-4xl text-6xl font-black uppercase leading-[0.9] tracking-[-0.06em] text-slate-950 sm:text-7xl"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
              >
                About
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-800/88">
                ReadyAimGo is building a command layer for real operating work: client stories, transportation coordination,
                property workflows, and the staffing pathways that support all of it. The business view is meant to feel
                like a control room, but the work behind it is grounded in actual people, active lanes, and delivery systems.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <section className="border border-white/55 bg-white/58 p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.32)] backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center border border-slate-900/12 bg-slate-950/6">
                    <Waves className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <div
                      className="text-[0.62rem] font-black uppercase tracking-[0.3em] text-slate-500"
                      style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
                    >
                      About
                    </div>
                    <h2
                      className="text-2xl font-black uppercase tracking-[-0.04em] text-slate-950"
                      style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
                    >
                      Operating Model
                    </h2>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-slate-800/82">
                  The platform is organizing business operations more like a live game board: clear lanes, visible assets,
                  active sync points, and specific actions instead of disconnected admin tools.
                </p>
              </section>

              <section className="border border-white/55 bg-white/58 p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.32)] backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center border border-slate-900/12 bg-slate-950/6">
                    <Users className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <div
                      className="text-[0.62rem] font-black uppercase tracking-[0.3em] text-slate-500"
                      style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
                    >
                      About
                    </div>
                    <h2
                      className="text-2xl font-black uppercase tracking-[-0.04em] text-slate-950"
                      style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
                    >
                      Why It Exists
                    </h2>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-slate-800/82">
                  The goal is to turn fragmented business support into a visible operating environment where clients,
                  contributors, and field teams can all move through the same system with less ambiguity.
                </p>
              </section>
            </div>
          </div>

          <aside className="space-y-5">
            <section className="border border-white/65 bg-white/64 p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.32)] backdrop-blur-sm">
              <div
                className="text-[0.62rem] font-black uppercase tracking-[0.34em] text-slate-500"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
              >
                Staff
              </div>
              <h2
                className="mt-3 text-4xl font-black uppercase tracking-[-0.05em] text-slate-950"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
              >
                Staff
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-800/82">
                Staff is part of the model, but it should be explained here instead of duplicated on the business landing page.
                The live participant roster still lives in the BEAM participants area.
              </p>

              <div className="mt-6 space-y-3">
                {staffLanes.map((lane) => (
                  <div key={lane.title} className="border border-slate-900/8 bg-slate-950/5 px-4 py-4">
                    <h3
                      className="text-lg font-black uppercase tracking-[-0.03em] text-slate-950"
                      style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
                    >
                      {lane.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-800/82">{lane.body}</p>
                  </div>
                ))}
              </div>

              <Link
                href="/beam-participants"
                className="mt-6 inline-flex items-center gap-2 border border-slate-950/12 bg-slate-950/8 px-4 py-3 text-xs font-black uppercase tracking-[0.28em] text-slate-900 transition hover:bg-slate-950/12"
                style={{ fontFamily: DISPLAY_FONT, fontStyle: "italic" }}
              >
                Open Staff Directory
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}
