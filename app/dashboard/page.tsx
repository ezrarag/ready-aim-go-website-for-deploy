"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  MessageSquare,
  GitBranch,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Wallet,
  BookOpen
} from 'lucide-react';
import { PulseFeed } from '@/components/pulse-feed';
import DashboardLayout from '@/components/dashboard-layout';

interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  monthlyRevenue: number;
  pendingTasks: number;
  deploySuccessRate: number;
  avgResponseTime: string;
}

interface RecentActivity {
  id: string;
  type: 'deployment' | 'payment' | 'email' | 'meeting' | 'commit';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
  client?: string;
}

interface StripeBalance {
  available: number;
  pending: number;
  currency: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeProjects: 0,
    monthlyRevenue: 0,
    pendingTasks: 0,
    deploySuccessRate: 0,
    avgResponseTime: '0h'
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [stripeBalance, setStripeBalance] = useState<StripeBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if supabase is available (client-side)
        if (typeof window !== 'undefined' && (window as any).supabase) {
          const { data: { session }, error } = await (window as any).supabase.auth.getSession();
          if (error || !session) {
            router.push('/login?redirect=/dashboard');
            return;
          }
        } else {
          // For now, allow access but log warning
          console.warn('Supabase client not available, skipping auth check');
        }
        setAuthChecked(true);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login?redirect=/dashboard');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch Pulse data for recent activity
      const pulseResponse = await fetch('/api/pulse');
      if (pulseResponse.ok) {
        const pulseData = await pulseResponse.json();
        
        // Transform Pulse data into recent activity
        const activities: RecentActivity[] = [];
        
        // Add priorities as high-priority activities
        pulseData.priorities?.slice(0, 3).forEach((priority: string, index: number) => {
          activities.push({
            id: `priority-${index}`,
            type: 'commit',
            title: 'High Priority',
            description: priority,
            timestamp: new Date().toISOString(),
            status: 'warning'
          });
        });

        // Add finance highlights
        pulseData.finance?.slice(0, 2).forEach((item: string, index: number) => {
          activities.push({
            id: `finance-${index}`,
            type: 'payment',
            title: 'Finance Update',
            description: item,
            timestamp: new Date().toISOString(),
            status: 'success'
          });
        });

        setRecentActivity(activities);
      }

      // Fetch Stripe balance
      try {
        const stripeResponse = await fetch('/api/pulse/stripe');
        if (stripeResponse.ok) {
          const stripeData = await stripeResponse.json();
          // Extract balance from Stripe data if available
          if (stripeData.balance) {
            setStripeBalance({
              available: stripeData.balance.available || 0,
              pending: stripeData.balance.pending || 0,
              currency: stripeData.balance.currency || 'usd'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching Stripe balance:', error);
      }

      // Mock stats - in production, these would come from aggregated API data
      setStats({
        totalClients: 4,
        activeProjects: 8,
        monthlyRevenue: 125430,
        pendingTasks: 12,
        deploySuccessRate: 94,
        avgResponseTime: '1.2h'
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deployment': return <GitBranch className="h-4 w-4" />;
      case 'payment': return <DollarSign className="h-4 w-4" />;
      case 'email': return <MessageSquare className="h-4 w-4" />;
      case 'meeting': return <Calendar className="h-4 w-4" />;
      case 'commit': return <GitBranch className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="text-gray-600">Your executive cockpit for managing all client operations</p>
        </div>

        {/* Morning Brief */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Morning Brief
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{stats.deploySuccessRate}%</div>
                <div className="text-sm text-blue-700">Deploy Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{stats.pendingTasks}</div>
                <div className="text-sm text-blue-700">Pending Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{stats.avgResponseTime}</div>
                <div className="text-sm text-blue-700">Avg Response Time</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Pulse Feed */}
        <PulseFeed />

        {/* Stripe Balance & BEAM Ledger */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stripe Balance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                Stripe Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stripeBalance ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Available</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(stripeBalance.available / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending</p>
                    <p className="text-xl font-semibold text-gray-700">
                      ${(stripeBalance.pending / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => router.push('/dashboard/finance')}>
                    View Finance Dashboard
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Stripe not configured</p>
                  <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
                    Configure Stripe
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BEAM Ledger Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                BEAM Ledger Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Operations</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Tasks</p>
                  <p className="text-xl font-semibold text-gray-700">{stats.pendingTasks}</p>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a href="https://beamthinktank.space" target="_blank" rel="noopener noreferrer">
                    View BEAM Portal
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <GitBranch className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">${stats.monthlyRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                  <p className="text-2xl font-bold text-gray-900">+23%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(activity.status)}
                        <span className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    {activity.client && (
                      <Badge variant="outline" className="mt-2">
                        {activity.client}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col">
                <Users className="h-6 w-6 mb-2" />
                View Clients
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <DollarSign className="h-6 w-6 mb-2" />
                Finance Report
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Calendar className="h-6 w-6 mb-2" />
                Schedule Meeting
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <MessageSquare className="h-6 w-6 mb-2" />
                Check Messages
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
