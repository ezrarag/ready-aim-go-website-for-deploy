import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Dashboard | Readyaimgo.biz',
  description: 'Your executive cockpit for managing all client operations, AI Pulse insights, and business intelligence.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

