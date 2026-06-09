import { redirect } from "next/navigation"

export default function AdminServicesRedirectPage() {
  redirect("/dashboard?view=billing")
}
