"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CLIENT_SECTION_ITEMS } from "@/lib/admin-navigation"

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard/clients") {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function ClientSectionNav() {
  const pathname = usePathname()

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-2 rounded-xl border border-border bg-card/70 p-2">
        {CLIENT_SECTION_ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-orange-500 text-white"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
