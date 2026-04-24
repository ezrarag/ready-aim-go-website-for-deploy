/**
 * /benefit/[slug] — RAG Employer Benefit Partner Portal
 *
 * A white-label landing page for any employer benefit RAG is piloting.
 * The slug maps to a config object below. Add new benefit partners here.
 *
 * Current partners:
 *   /benefit/hroshi       — Maia's Bitcoin employer benefit (Hroshi)
 *   /benefit/wellness     — (placeholder for future wellness benefit)
 *
 * To add a new partner: add an entry to BENEFIT_CONFIGS below.
 * The page, steps, and CTA all update automatically.
 */

import { notFound } from "next/navigation";
import Link from "next/link";

// ── Partner config — add new benefit partners here ───────────────────────────

type BenefitStep = {
  number: string;
  title: string;
  description: string;
};

type BenefitConfig = {
  slug: string;
  partnerName: string;
  partnerUrl: string;
  tagline: string;
  headline: string;
  subheadline: string;
  whatItIs: string;
  employerValue: string[];
  employeeValue: string[];
  pilotPricing: string;
  pilotNote: string;
  steps: BenefitStep[];
  ctaLabel: string;
  ctaUrl: string;
  builtByRAG: boolean;
  accentColor: string; // Tailwind color class stem e.g. "amber" "teal" "purple"
};

const BENEFIT_CONFIGS: Record<string, BenefitConfig> = {
  hroshi: {
    slug: "hroshi",
    partnerName: "Hroshi",
    partnerUrl: "https://hroshi.com",
    tagline: "Employee Bitcoin Benefit",
    headline: "Give your employees a Bitcoin benefit — without buying a single coin yourself.",
    subheadline:
      "Hroshi is an employer-sponsored, education-first Bitcoin benefit. Your company funds the pilot. Hroshi handles onboarding, education, and activation. A regulated partner handles custody.",
    whatItIs:
      "Hroshi sits between your HR team and your employees. You define the pilot — how many employees, what contribution level, when to start. Hroshi runs the education program, tracks completion, and hands off to a regulated Bitcoin custodian when employees are ready. You get a monthly report. Your employees get a new financial asset and financial literacy they didn't have before.",
    employerValue: [
      "Differentiated benefit your competitors don't offer",
      "No Bitcoin custody or compliance burden on your team",
      "Monthly reporting: who enrolled, who completed education, who activated",
      "Controlled pilot — you define the cohort and contribution rules",
      "Positions your company as forward-thinking on financial wellness",
    ],
    employeeValue: [
      "Education-first: learn before any Bitcoin is involved",
      "Optional participation — no pressure",
      "Non-custodial setup — employees control their own account",
      "Guided onboarding through the iOS app",
      "Financial literacy that applies beyond Bitcoin",
    ],
    pilotPricing: "$200–500 / month",
    pilotNote: "For 3–5 employees. Pricing confirmed directly with Hroshi.",
    steps: [
      {
        number: "01",
        title: "Employer signs pilot agreement",
        description:
          "You define the cohort size, contribution parameters, and start date. Hroshi sends the pilot agreement. ReadyAimGo facilitates the introduction.",
      },
      {
        number: "02",
        title: "Monthly pilot fee remitted",
        description:
          "Your company pays the monthly pilot fee directly to Hroshi via their secure checkout. No setup fee. Cancel with 30 days notice.",
      },
      {
        number: "03",
        title: "Employees receive app invitation",
        description:
          "Each employee gets an invite to the Hroshi iOS app. Participation is optional. The onboarding is self-guided and takes about 15 minutes.",
      },
      {
        number: "04",
        title: "Education modules completed",
        description:
          "Employees work through Bitcoin education checkpoints at their own pace. Hroshi tracks completion. Employers see aggregate progress — not individual employee data.",
      },
      {
        number: "05",
        title: "Bitcoin benefit activates",
        description:
          "Employees who complete education are enrolled with Hroshi's regulated custody partner. The monthly contribution begins. Employees control their own account.",
      },
      {
        number: "06",
        title: "Employer receives monthly report",
        description:
          "You receive a clean summary: enrollment rate, education completion, activation status, and any blockers. No surprises.",
      },
    ],
    ctaLabel: "Start a Hroshi pilot",
    ctaUrl: "https://hroshi.com/employers",
    builtByRAG: true,
    accentColor: "amber",
  },

  // ── Add future benefit partners below ──────────────────────────────────────
  // wellness: {
  //   slug: "wellness",
  //   partnerName: "...",
  //   ...
  // },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return Object.keys(BENEFIT_CONFIGS).map((slug) => ({ slug }));
}

export default function BenefitPartnerPage({
  params,
}: {
  params: { slug: string };
}) {
  const config = BENEFIT_CONFIGS[params.slug];
  if (!config) notFound();

  const accent = config.accentColor; // e.g. "amber"

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-${accent}-50 to-${accent}-100`}>
        <div className="max-w-4xl mx-auto">
          <p className={`text-sm font-semibold uppercase tracking-widest text-${accent}-700 mb-4`}>
            ReadyAimGo × {config.partnerName} — {config.tagline}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-6">
            {config.headline}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl leading-relaxed mb-10">
            {config.subheadline}
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href={config.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 bg-${accent}-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-${accent}-700 transition-colors`}
            >
              {config.ctaLabel} →
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-8 py-4 rounded-full font-semibold text-lg hover:border-gray-400 transition-colors"
            >
              Talk to ReadyAimGo first
            </Link>
          </div>
        </div>
      </section>

      {/* ── What it is ────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">What {config.partnerName} actually is</h2>
          <p className="text-lg text-gray-600 leading-relaxed">{config.whatItIs}</p>
        </div>
      </section>

      {/* ── Value props: employer + employee ──────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">What everyone gets</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className={`bg-white border border-${accent}-100 rounded-2xl p-7`}>
              <p className={`text-xs font-bold uppercase tracking-widest text-${accent}-600 mb-4`}>For the employer</p>
              <ul className="space-y-3">
                {config.employerValue.map((item) => (
                  <li key={item} className="flex gap-3 text-gray-700">
                    <span className={`text-${accent}-500 font-bold mt-0.5 shrink-0`}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">For the employee</p>
              <ul className="space-y-3">
                {config.employeeValue.map((item) => (
                  <li key={item} className="flex gap-3 text-gray-700">
                    <span className="text-gray-400 font-bold mt-0.5 shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Step-by-step flow ──────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">How the pilot works</h2>
          <p className="text-center text-gray-500 mb-12">From handshake to active benefit — six steps.</p>
          <div className="space-y-6">
            {config.steps.map((step, i) => (
              <div key={step.number} className="flex gap-6 items-start">
                <div className={`shrink-0 w-12 h-12 rounded-full bg-${accent}-100 flex items-center justify-center`}>
                  <span className={`text-sm font-bold text-${accent}-700`}>{step.number}</span>
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Pilot pricing</p>
          <p className={`text-5xl font-bold text-${accent}-600 mb-3`}>{config.pilotPricing}</p>
          <p className="text-gray-500 mb-8">{config.pilotNote}</p>
          <a
            href={config.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 bg-${accent}-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-${accent}-700 transition-colors`}
          >
            {config.ctaLabel} →
          </a>
          <p className="mt-4 text-sm text-gray-400">
            Or{" "}
            <Link href="/contact" className="underline hover:text-gray-600">
              contact ReadyAimGo
            </Link>{" "}
            — we'll make the introduction.
          </p>
        </div>
      </section>

      {/* ── Built by RAG attribution ───────────────────────────────────────── */}
      {config.builtByRAG && (
        <section className="py-10 px-4 sm:px-6 lg:px-8 border-t border-gray-100">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Platform built by</p>
              <Link href="/" className="font-bold text-gray-900 text-lg hover:text-gray-600 transition-colors">
                ReadyAimGo
              </Link>
              <p className="text-sm text-gray-500 mt-0.5">
                Web + app development for community-focused businesses.
              </p>
            </div>
            <a
              href={config.partnerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Visit {config.partnerName} →
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
