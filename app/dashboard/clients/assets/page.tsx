import { redirect } from "next/navigation"

export default function ClientAssetsRedirectPage() {
  redirect("/dashboard?view=workspaces")
}
