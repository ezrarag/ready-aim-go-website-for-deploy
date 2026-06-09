import { redirect } from "next/navigation"

export default function VercelSyncRedirectPage() {
  redirect("/dashboard?view=workspaces")
}
