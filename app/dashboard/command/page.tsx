import { redirect } from "next/navigation"

export default function CommandRedirectPage() {
  redirect("/dashboard?view=tasks")
}
