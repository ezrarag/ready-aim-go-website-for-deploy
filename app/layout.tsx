import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { NotificationProvider } from "@/contexts/notification-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ReadyAimGo - Connect. Operate. Succeed.",
  description:
    "The premier platform connecting operators to a centralized logistics and business management system powered by BEAM technology.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NotificationProvider>
          {children}
          <Toaster />
        </NotificationProvider>
      </body>
    </html>
  )
}
