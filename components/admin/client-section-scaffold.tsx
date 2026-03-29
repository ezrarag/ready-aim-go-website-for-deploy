"use client"

import { CardContent, CardHeader } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard-layout"
import { AdminPanel, AdminPanelInset, AdminPanelTitle } from "@/components/admin/admin-panel"
import { ClientSectionNav } from "@/components/admin/client-section-nav"

type ClientSectionScaffoldProps = {
  title: string
  description: string
  operationalFocus: string
  nextMoves: string[]
}

export function ClientSectionScaffold({
  title,
  description,
  operationalFocus,
  nextMoves,
}: ClientSectionScaffoldProps) {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <ClientSectionNav />

        <AdminPanel>
          <CardHeader>
            <AdminPanelTitle>Operational Focus</AdminPanelTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{operationalFocus}</p>
            <div className="grid gap-3 md:grid-cols-3">
              {nextMoves.map((item) => (
                <AdminPanelInset key={item} className="text-sm text-foreground/80">
                  {item}
                </AdminPanelInset>
              ))}
            </div>
          </CardContent>
        </AdminPanel>
      </div>
    </DashboardLayout>
  )
}
