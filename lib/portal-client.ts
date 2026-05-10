/**
 * Client-side helper for calling the portal API with Firebase ID token auth.
 *
 * Usage:
 *   const { data } = await portalFetch("/api/portal/projects")
 *
 * Throws PortalAuthError (status 401) when the server considers the session
 * revoked or unauthenticated — callers should redirect to /no-access.
 */

import { getClientAuth } from "@/lib/firebase-client"

export class PortalAuthError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = "PortalAuthError"
  }
}

/**
 * Fetch a portal API endpoint, automatically attaching the current user's
 * Firebase ID token as a Bearer token. Throws PortalAuthError on 401/403.
 */
export async function portalFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const auth = getClientAuth()
  const token = await auth?.currentUser?.getIdToken()

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
    "Content-Type": "application/json",
  }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(input, { ...init, headers })

  if (res.status === 401 || res.status === 403) {
    // Signal to the caller that the session is invalid or revoked.
    throw new PortalAuthError(res.status, `Portal auth failed: ${res.status}`)
  }

  return res
}

/**
 * Convenience wrapper that parses JSON and returns the `data` field.
 * Throws PortalAuthError on auth failure, Error on other non-ok responses.
 */
export async function portalGet<T = unknown>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = params
    ? `${path}?${new URLSearchParams(params).toString()}`
    : path
  const res = await portalFetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      (body as { error?: string }).error ?? `Portal API error: ${res.status}`
    )
  }
  const body = (await res.json()) as { data?: T }
  return body.data as T
}
