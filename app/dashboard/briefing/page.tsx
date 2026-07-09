import DashboardLayout from "@/components/dashboard-layout"
import { DailyBriefingCard } from "@/components/admin/daily-briefing-card"

export default function DashboardBriefingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Daily Window
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Daily briefing</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Windowed command readout for the current work block, calendar pressure, and open-loop check.
          </p>
        </div>

        <DailyBriefingCard />
      </div>
    </DashboardLayout>
  )
}
