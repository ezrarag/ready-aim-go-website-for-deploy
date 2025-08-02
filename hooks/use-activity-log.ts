import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface ActivityLogItem {
  id: string;
  type: 'payment' | 'commission' | 'invoice' | 'project' | 'system' | 'user';
  title: string;
  description: string;
  amount?: number;
  created_at: string;
  metadata?: Record<string, any>;
}

export function useActivityLog(clientId?: string) {
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch from multiple sources
      const [revenueEvents, projectUpdates, systemLogs] = await Promise.all([
        // Revenue events from Stripe webhooks
        supabase
          .from('revenue_events')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Project updates
        supabase
          .from('projects')
          .select('*')
          .eq('client_id', clientId)
          .order('updated_at', { ascending: false })
          .limit(5),
        
        // System activity logs (if table exists)
        supabase
          .from('client_activity')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const activityItems: ActivityLogItem[] = [];

      // Process revenue events
      if (revenueEvents.data) {
        revenueEvents.data.forEach(event => {
          activityItems.push({
            id: `revenue_${event.id}`,
            type: 'payment',
            title: 'Payment Received',
            description: `Received $${event.amount} via ${event.payment_method || 'Stripe'}`,
            amount: event.amount,
            created_at: event.created_at,
            metadata: { event_type: event.event_type, payment_id: event.payment_id }
          });
        });
      }

      // Process project updates
      if (projectUpdates.data) {
        projectUpdates.data.forEach(project => {
          if (project.status === 'completed') {
            activityItems.push({
              id: `project_${project.id}`,
              type: 'project',
              title: 'Project Completed',
              description: `${project.title} has been completed`,
              created_at: project.updated_at,
              metadata: { project_id: project.id, budget: project.budget }
            });
          }
        });
      }

      // Process system logs
      if (systemLogs.data) {
        systemLogs.data.forEach(log => {
          activityItems.push({
            id: `system_${log.id}`,
            type: 'system',
            title: log.action || 'System Update',
            description: log.details || 'System activity recorded',
            created_at: log.created_at,
            metadata: log.metadata
          });
        });
      }

      // Sort by creation date and limit to recent items
      const sortedActivities = activityItems
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15);

      setActivities(sortedActivities);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activity log';
      setError(errorMessage);
      console.error('Error fetching activity log:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities
  };
} 