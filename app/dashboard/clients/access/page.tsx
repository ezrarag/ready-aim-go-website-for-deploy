import { redirect } from "next/navigation"

export default function ClientAccessRedirectPage() {
  redirect("/dashboard?view=people")
}
