import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Support | ReadyAimGo",
  description: "ReadyAimGo support and contact information.",
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 prose prose-neutral dark:prose-invert">
        <h1 className="text-3xl font-bold mb-6">Support</h1>
        <p className="text-lg mb-8">Need help with ReadyAimGo?</p>

        <h2 className="text-xl font-semibold mt-8 mb-2">Contact</h2>
        <ul className="list-none pl-0 space-y-1">
          <li>
            <strong>Email:</strong>{" "}
            <a href="mailto:ezra@readyaimgo.biz" className="text-primary underline">ezra@readyaimgo.biz</a>
          </li>
          <li>
            <strong>Response time:</strong> Typically within 1–2 business days
          </li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">Common requests</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Account access / sign-in issues (including phone verification)</li>
          <li>Updating profile or business information</li>
          <li>Deleting an account or requesting data export</li>
          <li>Reporting abuse or suspicious activity</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-2">Security &amp; abuse</h2>
        <p>
          If you believe an account is being misused or you received an unexpected verification prompt, email{" "}
          <a href="mailto:ezra@readyaimgo.biz" className="text-primary underline">ezra@readyaimgo.biz</a>
          {" "}with:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>The email/phone used (if known)</li>
          <li>Time and date of the issue</li>
          <li>Any screenshots (optional)</li>
        </ul>
      </article>
    </div>
  )
}
