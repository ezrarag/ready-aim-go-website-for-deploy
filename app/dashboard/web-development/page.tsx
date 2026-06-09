import { redirect } from "next/navigation"

export default function WebDevelopmentRedirectPage() {
  redirect("/dashboard?view=workspaces")
}
