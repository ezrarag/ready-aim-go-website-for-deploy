import { redirect } from "next/navigation"

import { decodeRouteParam } from "@/lib/route-params"

export default async function ClientDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dashboard?view=clients&clientId=${encodeURIComponent(decodeRouteParam(id))}`)
}
