import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ReadyAimGo Operations | Readyaimgo.biz',
  description: 'Operations dashboard for clients, delivery areas, staff, BEAM participants, and sync health.',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
