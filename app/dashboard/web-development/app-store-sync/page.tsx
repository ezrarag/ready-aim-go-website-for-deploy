import { redirect } from "next/navigation"

export default function AppStoreSyncRedirectPage() {
  redirect("/dashboard?view=workspaces")
}
