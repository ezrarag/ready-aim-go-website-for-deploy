"use client"

import { useEffect, useState } from "react"
import { hasRagDevtoolsFirebaseConfig, ragDevtoolsFirebaseConfig } from "@/lib/devtools/publicConfig"

type RagDevtoolsWindow = Window &
  typeof globalThis & {
    __RAG_DEVTOOLS_CONFIG__?: Record<string, string> | null
    __RAG_PAGE_DEBUG__?: Record<string, unknown> | null
  }

function readLocationState() {
  if (typeof window === "undefined") {
    return { pathname: "", search: "" }
  }
  return { pathname: window.location.pathname, search: window.location.search }
}

function resolveAppUrl() {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim()
  return u && u !== "undefined" ? u : ""
}

/**
 * Development-only: exposes public Firebase env to the Ready Aim Go devtools extension via
 * window.__RAG_DEVTOOLS_CONFIG__ (same keys as NEXT_PUBLIC_* after Next inlines them).
 * Chrome extensions cannot read `.env.local` from disk; the running app is the source of truth.
 */
export default function RagDevtoolsBridge() {
  const [locationState, setLocationState] = useState(readLocationState)
  const appUrl = resolveAppUrl()

  useEffect(() => {
    const sync = () => setLocationState(readLocationState())
    sync()

    const push = window.history.pushState.bind(window.history)
    const rep = window.history.replaceState.bind(window.history)
    window.history.pushState = (...a) => {
      push(...a)
      sync()
    }
    window.history.replaceState = (...a) => {
      rep(...a)
      sync()
    }
    window.addEventListener("popstate", sync)
    window.addEventListener("hashchange", sync)
    return () => {
      window.history.pushState = push
      window.history.replaceState = rep
      window.removeEventListener("popstate", sync)
      window.removeEventListener("hashchange", sync)
    }
  }, [])

  useEffect(() => {
    const w = window as RagDevtoolsWindow
    w.__RAG_PAGE_DEBUG__ = {
      siteSlug: "readyaimgo",
      displayName: "Ready Aim Go",
      domain: window.location.hostname,
      origin: window.location.origin,
      appUrl: appUrl || null,
      pathname: locationState.pathname,
      search: locationState.search,
      checklistCollection: "devChecklists",
      devtoolsProjectId: ragDevtoolsFirebaseConfig.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID || null,
      entryChannel: "readyaimgo-devtools",
      googleDriveFolderSwitcherEnabled: true,
    }
    w.__RAG_DEVTOOLS_CONFIG__ = hasRagDevtoolsFirebaseConfig() ? { ...ragDevtoolsFirebaseConfig } : null
  }, [locationState.pathname, locationState.search, appUrl])

  return null
}
