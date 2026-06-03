import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  Handshake,
  Repeat2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Partner With ReadyAimGo",
  description:
    "Partner with ReadyAimGo across the Space Network, business referrals, and BEAM workforce pathways.",
}

const partnerTypes = [
  {
    label: "Space Network partners",
    icon: Building2,
    bring:
      "Hotels, BIDs, CDCs, university facilities, and space owners bring rooms, storefronts, studios, desks, or underused capacity.",
    get:
      "ReadyAimGo brings paying members before asking for a lease, turning available space into credit redemptions and measurable demand.",
    href: "/services/space",
    cta: "Explore Space",
  },
  {
    label: "Business referral partners",
    icon: Handshake,
    bring:
      "MKE Black, community organizations, and anchor institutions refer member businesses that need Nexus, Motion, or Cohort subscriptions.",
    get:
      "When referred businesses subscribe, a recurring percentage of subscription revenue comes back to the referring organization.",
    href: "/intake?type=referral",
    cta: "Start Referring",
  },
  {
    label: "BEAM workforce partners",
    icon: GraduationCap,
    bring:
      "Employers, training institutions, and CDFIs bring hiring demand, technical pathways, capital access, or cohort-aligned instruction.",
    get:
      "Partners connect with BEAM graduates, shape career pathways, and strengthen the workforce pipeline behind ReadyAimGo operations.",
    href: "/beam",
    cta: "Meet BEAM",
  },
]

const referralSteps = [
  {
    step: "01",
    title: "Partner refers a business",
    body:
      "A partner introduces a business that is ready for a ReadyAimGo operating subscription.",
  },
  {
    step: "02",
    title: "Business subscribes",
    body:
      "The business starts with Nexus, Motion, Cohort, or another eligible ReadyAimGo service.",
  },
  {
    step: "03",
    title: "Partner earns recurring revenue",
    body:
      "The referring organization shares in subscription revenue for the value it helped create.",
  },
]

const acquisitionPaths = [
  {
    timing: "Now",
    title: "Hotel blocks",
    body:
      "Activate available rooms and meeting areas through Space Network credits before a lease conversation.",
  },
  {
    timing: "6 months",
    title: "BID storefront",
    body:
      "Convert district storefront capacity into member-accessible workspace, retail, and programming nodes.",
  },
  {
    timing: "18 months",
    title: "University master-lease",
    body:
      "Build toward larger campus-aligned facilities once demand, usage, and partner economics are proven.",
  },
]

export default function PartnerPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#111827] text-white">
      <section className="relative">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(49,68,109,0.94),rgba(17,24,39,1)_58%,rgba(8,12,22,1))]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-35" />

        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <Badge className="border border-orange-200/30 bg-orange-300/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.26em] text-orange-100 hover:bg-orange-300/10">
            Partner Network
          </Badge>
          <div className="mt-8 max-w-5xl">
            <h1 className="text-5xl font-black uppercase italic leading-[0.88] tracking-[0.05em] text-white sm:text-7xl lg:text-8xl">
              Build with ReadyAimGo
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/76 sm:text-xl">
              ReadyAimGo is a platform, not just an agency. Partners bring
              space, relationships, training, hiring pathways, and local trust;
              RAG turns that capacity into subscribed services, operating
              credits, and shared value.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-3">
          {partnerTypes.map((partner) => {
            const Icon = partner.icon

            return (
              <article
                key={partner.label}
                className="flex min-h-[28rem] flex-col rounded-[0.75rem] border border-white/12 bg-[#2f416a]/72 p-5 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.95)] backdrop-blur-sm sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.64rem] font-bold uppercase tracking-[0.3em] text-white/50">
                      Partner Type
                    </p>
                    <h2 className="mt-3 text-2xl font-black uppercase italic tracking-[0.04em] text-white">
                      {partner.label}
                    </h2>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.5rem] border border-orange-200/25 bg-orange-300/10 text-orange-100">
                    <Icon className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-8 grid gap-4">
                  <div>
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-orange-100">
                      What they bring
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/74">
                      {partner.bring}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-orange-100">
                      What they get
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/74">
                      {partner.get}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-8">
                  <Button
                    asChild
                    className="w-full bg-white text-[#223255] hover:bg-orange-100"
                  >
                    <Link href={partner.href}>
                      {partner.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="rounded-[0.75rem] border border-white/12 bg-black/20 p-5 sm:p-7 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-[0.5rem] border border-orange-200/25 bg-orange-300/10 text-orange-100">
                <Repeat2 className="h-6 w-6" />
              </div>
              <p className="mt-5 text-[0.64rem] font-bold uppercase tracking-[0.32em] text-white/50">
                Referral Revenue
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase italic tracking-[0.04em] text-white sm:text-4xl">
                How referral revenue works
              </h2>
              <p className="mt-4 text-sm leading-6 text-white/68">
                This is recurring partner revenue tied to subscribed service
                value, not a one-time finder&apos;s fee.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex text-sm font-black uppercase tracking-[0.18em] text-orange-100 underline-offset-4 hover:underline"
              >
                Revenue share &mdash; contact us for terms
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {referralSteps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-[0.65rem] border border-white/10 bg-[#31446d]/58 p-4"
                >
                  <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-orange-100">
                    {item.step}
                  </p>
                  <h3 className="mt-5 text-lg font-black uppercase italic tracking-[0.03em] text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/68">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          <div className="rounded-[0.75rem] border border-white/12 bg-[#2f416a]/72 p-5 sm:p-7 lg:p-8">
            <Badge className="border border-orange-200/30 bg-orange-300/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.26em] text-orange-100 hover:bg-orange-300/10">
              Featured Partner Slot
            </Badge>
            <h2 className="mt-6 text-3xl font-black uppercase italic tracking-[0.04em] text-white sm:text-4xl">
              Space Network acquisition path
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/70">
              Space partners can start with capacity RAG can activate quickly,
              then graduate into larger facility commitments as member usage and
              economics are proven.
            </p>
            <Button
              asChild
              variant="outline"
              className="mt-7 border-white/16 bg-white/[0.06] text-white hover:bg-white hover:text-[#223255]"
            >
              <Link href="/services/space">
                View Space Network
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-[0.75rem] border border-white/12 bg-black/20 p-5 sm:p-7 lg:p-8">
            <div className="grid gap-4">
              {acquisitionPaths.map((path, index) => (
                <div
                  key={path.title}
                  className="grid gap-4 rounded-[0.65rem] border border-white/10 bg-[#31446d]/58 p-4 sm:grid-cols-[8rem_1fr]"
                >
                  <div>
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-white/45">
                      Path {index + 1}
                    </p>
                    <p className="mt-2 font-mono text-sm font-black uppercase tracking-[0.18em] text-orange-100">
                      {path.timing}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-[0.03em] text-white">
                      {path.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/68">
                      {path.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 lg:px-10 lg:pb-20">
        <div className="rounded-[0.75rem] border border-orange-200/24 bg-orange-300/10 p-6 sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-[0.5rem] border border-orange-200/25 bg-black/20 text-orange-100">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <h2 className="mt-5 text-3xl font-black uppercase italic tracking-[0.04em] text-white sm:text-4xl">
              Ready to partner?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Pick the partner lane that matches your capacity, relationships,
              or workforce goals.
            </p>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-0">
            <Button asChild className="bg-white text-[#223255] hover:bg-orange-100">
              <Link href="/intake?type=space-partner">
                Become a Space partner
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/16 bg-transparent text-white hover:bg-white hover:text-[#223255]"
            >
              <Link href="/intake?type=referral">Refer businesses</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
