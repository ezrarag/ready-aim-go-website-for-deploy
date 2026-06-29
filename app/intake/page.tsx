import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

type ServiceSlug = "space" | "nexus" | "motion" | "cohort"

type PageProps = {
  searchParams: Promise<{ service?: string }>
}

const SERVICE_CONFIG: Record<
  ServiceSlug,
  {
    name: string
    price: string
    planId: string
    tagline: string
  }
> = {
  space: {
    name: "Space Network",
    price: "$100/mo",
    planId: "space_100",
    tagline: "Retail, storage, and meeting space with 24-hour access.",
  },
  nexus: {
    name: "Nexus",
    price: "$50/mo",
    planId: "nexus_50",
    tagline: "Web and app hosting, creative team, and business device.",
  },
  motion: {
    name: "Motion Network",
    price: "$100/mo",
    planId: "motion_100",
    tagline: "Fractional fleet logistics — rides, delivery, and supply runs.",
  },
  cohort: {
    name: "Cohort Network",
    price: "$100/mo",
    planId: "cohort_100",
    tagline: "Fractional access to four pre-trained BEAM specialist tracks.",
  },
}

function isServiceSlug(value: string): value is ServiceSlug {
  return value in SERVICE_CONFIG
}

function buildCheckoutUrl(planId: string) {
  return `https://clients.readyaimgo.biz/auth?redirectTo=/checkout&plan=${encodeURIComponent(planId)}`
}

export default async function IntakePage({ searchParams }: PageProps) {
  const params = await searchParams
  const serviceParam = typeof params.service === "string" ? params.service.trim().toLowerCase() : ""

  if (!serviceParam || !isServiceSlug(serviceParam)) {
    redirect("/services")
  }

  const service = SERVICE_CONFIG[serviceParam]
  const checkoutUrl = buildCheckoutUrl(service.planId)

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.22),transparent_34%),linear-gradient(135deg,rgba(49,68,109,0.82),rgba(17,24,39,1))]" />
      <div className="relative flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-10">
        <Link
          href="/services"
          className="inline-flex w-fit items-center gap-2 rounded-md border border-white/12 bg-white/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white/72 transition hover:border-orange-200/40 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Services
        </Link>

        <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center py-12">
          <section className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="overflow-hidden rounded-[0.75rem] border border-white/12 bg-[#31446d]/55 p-6 shadow-[0_32px_90px_-55px_rgba(15,23,42,0.9)] backdrop-blur-sm sm:p-8 lg:p-10">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.34em] text-orange-200/80">
                ReadyAimGo intake
              </p>
              <h1 className="mt-5 text-5xl font-black uppercase italic leading-[0.88] tracking-[0.05em] text-white sm:text-7xl">
                {service.name}
              </h1>
              <div className="mt-6 inline-flex items-center rounded-[0.5rem] border border-orange-300/30 bg-orange-300/10 px-4 py-3">
                <span className="text-sm font-bold uppercase tracking-[0.2em] text-orange-100">
                  {service.price}
                </span>
              </div>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/76">
                {service.tagline}
              </p>
            </div>

            <div className="rounded-[0.75rem] border border-white/12 bg-black/45 p-6 backdrop-blur-sm sm:p-8">
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.32em] text-white/50">
                Subscription access
              </p>
              <h2 className="mt-3 text-3xl font-black uppercase italic tracking-[0.04em] text-white sm:text-4xl">
                Choose your path
              </h2>
              <div className="mt-8 grid gap-3">
                <a
                  href={checkoutUrl}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-orange-500 px-5 py-3 text-center text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  Start →
                </a>

                <a
                  href={checkoutUrl}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md border border-orange-400/40 bg-transparent px-5 py-3 text-center text-sm font-black uppercase tracking-[0.2em] text-orange-300 transition hover:bg-orange-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  Sign in first →
                </a>
              </div>
              <p className="mt-5 text-sm text-white/52">
                Already have an account? Sign in first — you&apos;ll land directly at checkout.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
