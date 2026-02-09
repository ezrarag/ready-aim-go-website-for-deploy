import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | ReadyAimGo",
  description: "ReadyAimGo Terms of Service – access to and use of our websites, client portals, and related services.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 prose prose-neutral dark:prose-invert">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Effective date: February 8, 2025
          <br />
          Company/Brand: ReadyAimGo (&quot;ReadyAimGo&quot;, &quot;we&quot;, &quot;us&quot;)
        </p>

        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of ReadyAimGo&apos;s websites, client portals, and related services (the &quot;Services&quot;). By using the Services, you agree to these Terms.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">1) Who we are</h2>
        <p>
          ReadyAimGo provides subscription-based operational support and shared tools. The Services may include website operations, payments tooling, admin workflows, and shared asset coordination, depending on your plan.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">2) Accounts and authentication</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>You may need an account to use certain features.</li>
          <li>If phone verification is enabled, we may use Firebase Authentication and anti-abuse mechanisms (e.g., reCAPTCHA) to verify sign-in.</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">3) Acceptable use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Use the Services for unlawful, harmful, or fraudulent activity</li>
          <li>Attempt to bypass security or abuse authentication/verification</li>
          <li>Interfere with or disrupt the Services</li>
          <li>Upload malware or attempt unauthorized access to systems or data</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">4) Client/third-party links</h2>
        <p>
          The Services may link to client websites, app stores, or third-party services. ReadyAimGo is not responsible for third-party content or policies.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">5) Subscriptions, fees, and billing (if applicable)</h2>
        <p>If you purchase a subscription:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Fees, billing cadence, and scope are described at sign-up or in your agreement.</li>
          <li>Taxes may apply.</li>
          <li>We may change pricing or plan features with notice, where permitted.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">6) Intellectual property</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>ReadyAimGo and its licensors own the Services, branding, and underlying technology.</li>
          <li>You retain ownership of content you provide, but you grant us a limited license to host/process it as needed to provide the Services.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">7) Termination</h2>
        <p>We may suspend or terminate access if:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>You violate these Terms</li>
          <li>We must do so for legal or security reasons</li>
        </ul>
        <p>You may stop using the Services at any time.</p>

        <h2 className="text-xl font-semibold mt-8 mb-2">8) Disclaimers</h2>
        <p>
          The Services are provided &quot;as is&quot; and &quot;as available.&quot; We do not guarantee uninterrupted or error-free operation.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">9) Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, ReadyAimGo will not be liable for indirect, incidental, special, consequential, or punitive damages, or any loss of profits or data.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">10) Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. We will update the effective date above when changes are made.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">11) Contact</h2>
        <p>Questions?</p>
        <p>
          Email: <a href="mailto:ezra@readyaimgo.biz" className="text-primary underline">ezra@readyaimgo.biz</a>
          <br />
          Support: <a href="https://readyaimgo.biz/support" className="text-primary underline" target="_blank" rel="noopener noreferrer">https://readyaimgo.biz/support</a>
        </p>
      </article>
    </div>
  )
}
