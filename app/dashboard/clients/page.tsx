import { redirect } from "next/navigation"

export default function ClientsRedirectPage() {
  redirect("/dashboard?view=clients")
}
