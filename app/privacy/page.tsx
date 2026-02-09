import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | ReadyAimGo",
  description: "ReadyAimGo Privacy Policy – how we collect, use, and share information.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 prose prose-neutral dark:prose-invert">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Effective date: February 8, 2025
          <br />
          Company/Brand: ReadyAimGo (&quot;ReadyAimGo&quot;, &quot;we&quot;, &quot;us&quot;)
        </p>

        <p>
          ReadyAimGo provides subscription-based operations support (&quot;C-Suite-as-a-Service&quot;), which may include website tools, client portals, and communication features (the &quot;Services&quot;). This Privacy Policy explains how we collect, use, and share information when you use our Services.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">1) Information we collect</h2>

        <h3 className="text-lg font-medium mt-4 mb-1">Information you provide</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Contact info (name, email, phone number)</li>
          <li>Account info (login identifiers, profile details)</li>
          <li>Messages/content you submit through forms, chats, or uploads (if applicable)</li>
        </ul>

        <h3 className="text-lg font-medium mt-4 mb-1">Information collected automatically</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Usage data (pages viewed, actions taken, approximate location, device/browser type)</li>
          <li>Log data (IP address, timestamps, referring pages)</li>
        </ul>

        <h3 className="text-lg font-medium mt-4 mb-1">Phone number authentication (Firebase)</h3>
        <p>
          If you sign in using phone verification, we process:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your phone number</li>
          <li>Verification-related metadata needed to prevent abuse and complete authentication</li>
        </ul>
        <p>
          We use Firebase Authentication and may use Google reCAPTCHA or similar anti-abuse measures as part of phone verification.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">2) How we use information</h2>
        <p>We use information to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide and operate the Services (including authentication and account access)</li>
          <li>Verify identity and prevent fraud/abuse</li>
          <li>Communicate with you about your account or requests</li>
          <li>Improve reliability, performance, and user experience</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">3) How we share information</h2>
        <p>We do not sell your personal information.</p>
        <p>We may share information with:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Service providers who help us operate the Services (e.g., hosting, analytics, authentication)</li>
          <li>Firebase/Google for authentication and platform functionality</li>
          <li>Legal or safety requests, when required by law or to protect rights and security</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">4) Data retention</h2>
        <p>
          We retain personal information only as long as needed to:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide the Services</li>
          <li>Meet legal, accounting, or security requirements</li>
        </ul>
        <p>You can request deletion (see &quot;Your choices&quot;).</p>

        <h2 className="text-xl font-semibold mt-8 mb-2">5) Your choices</h2>
        <p>You may request to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Access, correct, or delete your personal information</li>
          <li>Update your account details</li>
        </ul>
        <p>
          Email us at{" "}
          <a href="mailto:support@readyaimgo.biz" className="text-primary underline">support@readyaimgo.biz</a>
          {" "}or{" "}
          <a href="mailto:ezra@readyaimgo.biz" className="text-primary underline">ezra@readyaimgo.biz</a>
          {" "}with your request.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">6) Security</h2>
        <p>
          We use reasonable administrative, technical, and physical safeguards designed to protect information. No system is 100% secure.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">7) Children&apos;s privacy</h2>
        <p>
          Our Services are not directed to children under 13, and we do not knowingly collect personal information from children.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">8) International users</h2>
        <p>
          If you access the Services from outside the United States, you understand information may be processed in the United States or other locations where our providers operate.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">9) Contact</h2>
        <p>Questions about this Privacy Policy? Contact:</p>
        <p>
          Email: <a href="mailto:ezra@readyaimgo.biz" className="text-primary underline">ezra@readyaimgo.biz</a>
          <br />
          Support: <a href="https://readyaimgo.biz/support" className="text-primary underline" target="_blank" rel="noopener noreferrer">https://readyaimgo.biz/support</a>
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-2">10) Updates</h2>
        <p>
          We may update this policy from time to time. We will update the effective date above when changes are made.
        </p>
      </article>
    </div>
  )
}
