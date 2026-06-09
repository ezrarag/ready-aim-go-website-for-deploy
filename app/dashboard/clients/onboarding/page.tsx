import { redirect } from "next/navigation"

export default function ClientOnboardingRedirectPage() {
  redirect("/dashboard?view=people")
}
