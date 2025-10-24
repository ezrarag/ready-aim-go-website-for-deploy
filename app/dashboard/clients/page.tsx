"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  ExternalLink, 
  GitBranch, 
  DollarSign, 
  Calendar, 
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard-layout';

interface Client {
  id: string;
  name: string;
  brands: string[];
  status: 'active' | 'inactive' | 'onboarding';
  lastActivity: string;
  deployStatus: 'live' | 'building' | 'error';
  deployUrl?: string;
  stripeStatus: 'connected' | 'pending' | 'error';
  revenue: number;
  meetings: number;
  emails: number;
  commits: number;
  lastDeploy?: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientsData();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchTerm, clients]);

  const fetchClientsData = async () => {
    try {
      setLoading(true);
      
      // Fetch live data from Pulse APIs
      const [githubResponse, vercelResponse, stripeResponse] = await Promise.all([
        fetch('/api/pulse/github'),
        fetch('/api/pulse/vercel'),
        fetch('/api/pulse/stripe')
      ]);

      // Mock client data - in production, this would be aggregated from the APIs above
      const mockClients: Client[] = [
        {
          id: 'serenity',
          name: 'Serenity Wellness',
          brands: ['Serenity Spa', 'Serenity Retreat'],
          status: 'active',
          lastActivity: '2 hours ago',
          deployStatus: 'live',
          deployUrl: 'https://serenity-wellness.vercel.app',
          stripeStatus: 'connected',
          revenue: 12500,
          meetings: 2,
          emails: 8,
          commits: 15,
          lastDeploy: '2 hours ago'
        },
        {
          id: 'sweet-freak',
          name: 'Sweet Freak Bakery',
          brands: ['Sweet Freak', 'Sweet Freak Catering'],
          status: 'active',
          lastActivity: '1 hour ago',
          deployStatus: 'live',
          deployUrl: 'https://sweet-freak.vercel.app',
          stripeStatus: 'connected',
          revenue: 8900,
          meetings: 1,
          emails: 5,
          commits: 23,
          lastDeploy: '1 hour ago'
        },
        {
          id: 'femi',
          name: 'Femi Leasing',
          brands: ['Femi Properties', 'Femi Management'],
          status: 'active',
          lastActivity: '30 minutes ago',
          deployStatus: 'live',
          deployUrl: 'https://femi-leasing.vercel.app',
          stripeStatus: 'connected',
          revenue: 45000,
          meetings: 3,
          emails: 12,
          commits: 8,
          lastDeploy: '30 minutes ago'
        },
        {
          id: 'jennalyn',
          name: 'Jennalyn Research',
          brands: ['NeuroTech Labs', 'Jennalyn Consulting'],
          status: 'onboarding',
          lastActivity: '1 day ago',
          deployStatus: 'building',
          deployUrl: 'https://jennalyn-research.vercel.app',
          stripeStatus: 'pending',
          revenue: 0,
          meetings: 1,
          emails: 3,
          commits: 5,
          lastDeploy: '1 day ago'
        }
      ];

      setClients(mockClients);
    } catch (error) {
      console.error('Error fetching clients data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchTerm) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.brands.some(brand => brand.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredClients(filtered);
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
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
            <p className="text-gray-600">Monitor all client projects, deployments, and communications</p>
          </div>
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search clients or brands..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
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
                {/* Status Indicators */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Deploy Status</span>
                    <div className="flex items-center gap-2">
                      {getDeployStatusIcon(client.deployStatus)}
                      <span className="text-sm font-medium">{client.deployStatus}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Stripe Status</span>
                    <div className="flex items-center gap-2">
                      {getStripeStatusIcon(client.stripeStatus)}
                      <span className="text-sm font-medium">{client.stripeStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      ${client.revenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {client.commits}
                    </div>
                    <div className="text-xs text-gray-500">Commits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">
                      {client.meetings}
                    </div>
                    <div className="text-xs text-gray-500">Meetings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-orange-600">
                      {client.emails}
                    </div>
                    <div className="text-xs text-gray-500">Emails</div>
                  </div>
                </div>

                {/* Last Activity */}
                <div className="text-sm text-gray-600">
                  <strong>Last Activity:</strong> {client.lastActivity}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Details
                  </Button>
                  {client.deployUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={client.deployUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Clients</p>
                  <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Projects</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {clients.filter(c => c.status === 'active').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${clients.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <GitBranch className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Commits</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {clients.reduce((sum, c) => sum + c.commits, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
