import * as React from "react"

import { Card, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function AdminPanel({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card className={cn("admin-panel", className)} {...props} />
}

export function AdminPanelTitle({ className, ...props }: React.ComponentProps<typeof CardTitle>) {
  return <CardTitle className={cn("admin-panel-title", className)} {...props} />
}

export function AdminPanelInset({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("admin-panel-inset rounded-xl border p-4", className)} {...props} />
}

type AdminMetricTileProps = React.HTMLAttributes<HTMLDivElement> & {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
  labelClassName?: string
  trailing?: React.ReactNode
  valueClassName?: string
}

export function AdminMetricTile({
  label,
  value,
  hint,
  className,
  labelClassName,
  trailing,
  valueClassName,
  ...props
}: AdminMetricTileProps) {
  return (
    <AdminPanelInset className={cn("space-y-2", className)} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className={cn("text-sm text-muted-foreground", labelClassName)}>{label}</p>
          <div className={cn("text-3xl font-semibold text-foreground", valueClassName)}>{value}</div>
          {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
    </AdminPanelInset>
  )
}
