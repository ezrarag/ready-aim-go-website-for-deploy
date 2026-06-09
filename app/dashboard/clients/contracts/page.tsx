import { redirect } from "next/navigation"

export default function ClientContractsRedirectPage() {
  redirect("/dashboard?view=billing")
}
