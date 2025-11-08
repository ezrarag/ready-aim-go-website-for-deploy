import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { NotificationProvider } from "@/contexts/notification-context"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] })

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${jetbrainsMono.variable}`}>
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
