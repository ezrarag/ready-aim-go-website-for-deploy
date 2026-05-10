import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { NotificationProvider } from "@/contexts/notification-context"
import { ThemeProvider } from "@/components/theme-provider"
import {
  formatRagDevtoolsFirebaseConfigValidation,
  getRagDevtoolsFirebaseConfigValidation,
  hasRagDevtoolsFirebaseConfig,
  logRagDevtoolsFirebaseConfigValidation,
  ragDevtoolsFirebaseConfig,
} from "@/lib/devtools/publicConfig"

const inter = Inter({ subsets: ["latin"] })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })

export const metadata: Metadata = {
  title: "ReadyAimGo - C-Suite-as-a-Service Platform",
  description:
    "C-Suite-as-a-Service platform that centralizes communication, deployments, calendars, email, and operations with AI-powered insights. Transform your business operations with ReadyAimGo Pulse.",
  keywords: ["C-Suite-as-a-Service", "business operations", "AI Pulse", "executive dashboard", "automation", "operations management"],
  openGraph: {
    title: "ReadyAimGo - C-Suite-as-a-Service Platform",
    description: "C-Suite-as-a-Service platform that centralizes communication, deployments, calendars, email, and operations with AI-powered insights.",
    type: "website",
    url: "https://readyaimgo.biz",
    siteName: "ReadyAimGo",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReadyAimGo - C-Suite-as-a-Service Platform",
    description: "C-Suite-as-a-Service platform that centralizes communication, deployments, calendars, email, and operations with AI-powered insights.",
  },
  generator: 'v0.dev'
}

function escapeScriptJson(value: unknown) {
  return (JSON.stringify(value) ?? "null").replace(/</g, "\\u003c")
}

function createRagDevtoolsBridgeScript() {
  const validation = getRagDevtoolsFirebaseConfigValidation()
  const warning = validation.isValid ? "" : formatRagDevtoolsFirebaseConfigValidation(validation)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  return `
(() => {
  const config = ${escapeScriptJson(hasRagDevtoolsFirebaseConfig() ? ragDevtoolsFirebaseConfig : null)};
  const appUrl = ${escapeScriptJson(appUrl && appUrl !== "undefined" ? appUrl : "")};
  const validationWarning = ${escapeScriptJson(warning)};

  if (validationWarning && !window.__RAG_FIREBASE_ENV_LOGGED_CLIENT__) {
    window.__RAG_FIREBASE_ENV_LOGGED_CLIENT__ = true;
    console.error("[RAG Firebase Env][client] " + validationWarning);
  }

  const sync = () => {
    window.__RAG_PAGE_DEBUG__ = {
      siteSlug: "readyaimgo",
      displayName: "Ready Aim Go",
      domain: window.location.hostname,
      origin: window.location.origin,
      appUrl: appUrl || null,
      pathname: window.location.pathname,
      search: window.location.search,
      checklistCollection: "devChecklists",
      devtoolsProjectId: config?.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID || null,
      entryChannel: "readyaimgo-devtools",
      googleDriveFolderSwitcherEnabled: true,
    };
    window.__RAG_DEVTOOLS_CONFIG__ = config ? { ...config } : null;
  };

  sync();

  if (window.__RAG_DEVTOOLS_BRIDGE_INSTALLED__) {
    return;
  }

  window.__RAG_DEVTOOLS_BRIDGE_INSTALLED__ = true;
  const push = window.history.pushState.bind(window.history);
  const replace = window.history.replaceState.bind(window.history);

  window.history.pushState = (...args) => {
    push(...args);
    sync();
  };
  window.history.replaceState = (...args) => {
    replace(...args);
    sync();
  };
  window.addEventListener("popstate", sync);
  window.addEventListener("hashchange", sync);
})();
`
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (process.env.NODE_ENV === "development") {
    logRagDevtoolsFirebaseConfigValidation("server")
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${jetbrainsMono.variable}`}>
        {process.env.NODE_ENV === "development" ? (
          <script
            id="rag-devtools-bridge"
            dangerouslySetInnerHTML={{ __html: createRagDevtoolsBridgeScript() }}
          />
        ) : null}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NotificationProvider>
            {children}
            <Toaster />
            <Sonner />
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
