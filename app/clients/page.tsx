"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ExternalLink, 
  Calendar, 
  DollarSign, 
  GitBranch, 
  Mail, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users
} from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
  brands: string[];
  status: 'active' | 'inactive' | 'onboarding';
  lastActivity: string;
  pulseSummary?: string;
  deployStatus?: 'live' | 'building' | 'error';
  deployUrl?: string;
  stripeStatus?: 'connected' | 'pending' | 'error';
  revenue?: number;
  meetings?: number;
  emails?: number;
}

interface PulseData {
  summary: string;
  priorities: string[];
  risks: string[];
  finance: string[];
  meetings: string[];
  actions: Array<{
    action: string;
    owner: string;
    priority: 'high' | 'medium' | 'low';
    timeline: string;
  }>;
  byProject: Array<{
    name: string;
    highlights: string[];
    nextAction?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  totalEvents: number;
  lastUpdated: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [pulseData, setPulseData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  useEffect(() => {
    fetchClientsData();
  }, []);

  const fetchClientsData = async () => {
    try {
      setLoading(true);
      
      // Fetch Pulse data
      const pulseResponse = await fetch('/api/pulse');
      if (pulseResponse.ok) {
        const pulse = await pulseResponse.json();
        setPulseData(pulse);
      }

      // Mock client data - in production, this would come from your database
      const mockClients: Client[] = [
        {
          id: 'serenity',
          name: 'Serenity Wellness',
          brands: ['Serenity Spa', 'Serenity Retreat'],
          status: 'active',
          lastActivity: '2 hours ago',
          pulseSummary: 'Menu update deployed, 3 new bookings this week',
          deployStatus: 'live',
          deployUrl: 'https://serenity-wellness.vercel.app',
          stripeStatus: 'connected',
          revenue: 12500,
          meetings: 2,
          emails: 8
        },
        {
          id: 'sweet-freak',
          name: 'Sweet Freak Bakery',
          brands: ['Sweet Freak', 'Sweet Freak Catering'],
          status: 'active',
          lastActivity: '1 hour ago',
          pulseSummary: 'Instagram integration live, payment processing optimized',
          deployStatus: 'live',
          deployUrl: 'https://sweet-freak.vercel.app',
          stripeStatus: 'connected',
          revenue: 8900,
          meetings: 1,
          emails: 5
        },
        {
          id: 'femi',
          name: 'Femi Leasing',
          brands: ['Femi Properties', 'Femi Management'],
          status: 'active',
          lastActivity: '30 minutes ago',
          pulseSummary: 'Stripe webhook fixed, investor portal updated',
          deployStatus: 'live',
          deployUrl: 'https://femi-leasing.vercel.app',
          stripeStatus: 'connected',
          revenue: 45000,
          meetings: 3,
          emails: 12
        },
        {
          id: 'jennalyn',
          name: 'Jennalyn Research',
          brands: ['NeuroTech Labs', 'Jennalyn Consulting'],
          status: 'onboarding',
          lastActivity: '1 day ago',
          pulseSummary: 'Neuroscience collaboration proposal received',
          deployStatus: 'building',
          deployUrl: 'https://jennalyn-research.vercel.app',
          stripeStatus: 'pending',
          revenue: 0,
          meetings: 1,
          emails: 3
        }
      ];

      setClients(mockClients);
    } catch (error) {
      console.error('Error fetching clients data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'onboarding': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDeployStatusIcon = (status: string) => {
    switch (status) {
      case 'live': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'building': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStripeStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Portfolio</h1>
          <p className="text-gray-600">C-Suite-as-a-Service dashboard for all your brands</p>
        </div>

        {/* Executive Summary */}
        {pulseData && (
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{pulseData.summary}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Top Priorities</h4>
                  <ul className="space-y-1">
                    {pulseData.priorities.slice(0, 3).map((priority, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        {priority}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Finance Highlights</h4>
                  <ul className="space-y-1">
                    {pulseData.finance.slice(0, 3).map((item, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <DollarSign className="h-3 w-3 mt-1 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Risks & Blockers</h4>
                  <ul className="space-y-1">
                    {pulseData.risks.slice(0, 3).map((risk, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 mt-1 flex-shrink-0 text-red-500" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {client.brands.map((brand, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {brand}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Badge className={getStatusColor(client.status)}>
                    {client.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Pulse Summary */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Latest Activity</h4>
                  <p className="text-sm text-gray-600">{client.pulseSummary}</p>
                  <p className="text-xs text-gray-500 mt-1">{client.lastActivity}</p>
                </div>

                {/* Status Indicators */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Deploy Status</span>
                    <div className="flex items-center gap-2">
                      {getDeployStatusIcon(client.deployStatus || 'building')}
                      <span className="text-sm font-medium">{client.deployStatus}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Stripe Status</span>
                    <div className="flex items-center gap-2">
                      {getStripeStatusIcon(client.stripeStatus || 'pending')}
                      <span className="text-sm font-medium">{client.stripeStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      ${client.revenue?.toLocaleString() || '0'}
                    </div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {client.meetings}
                    </div>
                    <div className="text-xs text-gray-500">Meetings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">
                      {client.emails}
                    </div>
                    <div className="text-xs text-gray-500">Emails</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSelectedClient(client.id)}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  {client.deployUrl && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      asChild
                    >
                      <Link href={client.deployUrl} target="_blank">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Client Detail Modal */}
        {selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {clients.find(c => c.id === selectedClient)?.name} - Command Center
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedClient(null)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Filtered Pulse Feed */}
                  <div>
                    <h3 className="font-semibold mb-3">Project Activity</h3>
                    <div className="space-y-2">
                      {pulseData?.byProject
                        .filter(project => 
                          clients.find(c => c.id === selectedClient)?.brands
                            .some(brand => brand.toLowerCase().includes(project.name.toLowerCase()))
                        )
                        .map((project, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{project.name}</h4>
                              <Badge className={getStatusColor(project.priority)}>
                                {project.priority}
                              </Badge>
                            </div>
                            <ul className="space-y-1">
                              {project.highlights.map((highlight, idx) => (
                                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                  {highlight}
                                </li>
                              ))}
                            </ul>
                            {project.nextAction && (
                              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                <strong>Next:</strong> {project.nextAction}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h3 className="font-semibold mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-1" />
                        Email Brief
                      </Button>
                      <Button variant="outline" size="sm">
                        <Calendar className="h-4 w-4 mr-1" />
                        Schedule Meeting
                      </Button>
                      <Button variant="outline" size="sm">
                        <GitBranch className="h-4 w-4 mr-1" />
                        View Repo
                      </Button>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open Deploy
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
