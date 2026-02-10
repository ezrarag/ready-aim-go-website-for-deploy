"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  MoreHorizontal,
  Edit,
  Trash2,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DashboardLayout from '@/components/dashboard-layout';
import type { ClientDirectoryEntry, ClientStatus, DeployStatus, StripeStatus } from '@/lib/client-directory';

type Client = ClientDirectoryEntry;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', storyId: '' });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    storyId: '',
    brands: [] as string[],
    status: 'onboarding' as ClientStatus,
    deployStatus: 'building' as DeployStatus,
    deployUrl: '',
    stripeStatus: 'pending' as StripeStatus,
    revenue: 0,
    meetings: 0,
    emails: 0,
    commits: 0,
    lastActivity: '',
    pulseSummary: '',
    websiteUrl: '',
    appUrl: '',
    appStoreUrl: '',
    rdUrl: '',
    housingUrl: '',
    transportationUrl: '',
    insuranceUrl: '',
    storyVideoUrl: '',
    isNewStory: false,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    fetchClientsData();
  }, []);

  useEffect(() => {
    filterClients();
  }, [searchTerm, clients]);

  const fetchClientsData = async () => {
    try {
      setLoading(true);
      
      const clientsResponse = await fetch('/api/clients');
      if (clientsResponse.ok) {
        const payload = await clientsResponse.json();
        if (payload?.success && Array.isArray(payload.clients)) {
          setClients(payload.clients as Client[]);
        }
      }
    } catch (error) {
      console.error('Error fetching clients data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async () => {
    const name = addForm.name.trim();
    const storyId = addForm.storyId.trim();
    if (!name || !storyId) return;
    setAddSubmitting(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, storyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create client');
      setAddClientOpen(false);
      setAddForm({ name: '', storyId: '' });
      await fetchClientsData();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to create client');
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setEditForm({
      name: client.name,
      storyId: client.storyId,
      brands: client.brands || [],
      status: client.status,
      deployStatus: client.deployStatus,
      deployUrl: client.deployUrl || '',
      stripeStatus: client.stripeStatus,
      revenue: client.revenue || 0,
      meetings: client.meetings || 0,
      emails: client.emails || 0,
      commits: client.commits || 0,
      lastActivity: client.lastActivity || '',
      pulseSummary: client.pulseSummary || '',
      websiteUrl: client.websiteUrl || '',
      appUrl: client.appUrl || '',
      appStoreUrl: client.appStoreUrl || '',
      rdUrl: client.rdUrl || '',
      housingUrl: client.housingUrl || '',
      transportationUrl: client.transportationUrl || '',
      insuranceUrl: client.insuranceUrl || '',
      storyVideoUrl: client.storyVideoUrl || '',
      isNewStory: client.isNewStory || false,
    });
    setEditClientOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(editingClient.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          storyId: editForm.storyId.trim(),
          brands: editForm.brands,
          status: editForm.status,
          deployStatus: editForm.deployStatus,
          deployUrl: editForm.deployUrl.trim() || undefined,
          stripeStatus: editForm.stripeStatus,
          revenue: editForm.revenue,
          meetings: editForm.meetings,
          emails: editForm.emails,
          commits: editForm.commits,
          lastActivity: editForm.lastActivity.trim() || new Date().toISOString(),
          pulseSummary: editForm.pulseSummary.trim() || undefined,
          websiteUrl: editForm.websiteUrl.trim() || undefined,
          appUrl: editForm.appUrl.trim() || undefined,
          appStoreUrl: editForm.appStoreUrl.trim() || undefined,
          rdUrl: editForm.rdUrl.trim() || undefined,
          housingUrl: editForm.housingUrl.trim() || undefined,
          transportationUrl: editForm.transportationUrl.trim() || undefined,
          insuranceUrl: editForm.insuranceUrl.trim() || undefined,
          storyVideoUrl: editForm.storyVideoUrl.trim() || undefined,
          isNewStory: editForm.isNewStory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update client');
      setEditClientOpen(false);
      setEditingClient(null);
      await fetchClientsData();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Failed to update client');
    } finally {
      setEditSubmitting(false);
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
      case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-400/30';
      case 'inactive': return 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-500/20 dark:text-zinc-200 dark:border-zinc-400/30';
      case 'onboarding': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-400/30';
      default: return 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-500/20 dark:text-zinc-200 dark:border-zinc-400/30';
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
            <div className="mb-2 h-8 w-64 rounded bg-muted"></div>
            <div className="h-4 w-96 rounded bg-muted"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="animate-pulse">
                    <div className="mb-2 h-6 w-32 rounded bg-muted"></div>
                    <div className="h-4 w-24 rounded bg-muted"></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 w-full rounded bg-muted"></div>
                    <div className="h-4 w-3/4 rounded bg-muted"></div>
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
            <h1 className="text-2xl font-bold text-foreground">Client Management</h1>
            <p className="text-muted-foreground">Monitor all client projects, deployments, and communications</p>
          </div>
          <Button onClick={() => setAddClientOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    <span className="text-sm text-muted-foreground">Deploy Status</span>
                    <div className="flex items-center gap-2">
                      {getDeployStatusIcon(client.deployStatus)}
                      <span className="text-sm font-medium">{client.deployStatus}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stripe Status</span>
                    <div className="flex items-center gap-2">
                      {getStripeStatusIcon(client.stripeStatus)}
                      <span className="text-sm font-medium">{client.stripeStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 border-t border-border pt-2">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      ${client.revenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {client.commits}
                    </div>
                    <div className="text-xs text-muted-foreground">Commits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">
                      {client.meetings}
                    </div>
                    <div className="text-xs text-muted-foreground">Meetings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-orange-600">
                      {client.emails}
                    </div>
                    <div className="text-xs text-muted-foreground">Emails</div>
                  </div>
                </div>

                {/* Last Activity */}
                <div className="text-sm text-muted-foreground">
                  <strong>Last Activity:</strong> {client.lastActivity}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/dashboard/clients/${client.id}`}>View Details</Link>
                  </Button>
                  {client.deployUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={client.deployUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClient(client)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Client
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/clients/${client.id}`}>
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      {client.deployUrl && (
                        <DropdownMenuItem asChild>
                          <a href={client.deployUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Deploy URL
                          </a>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold text-foreground">{clients.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                  <p className="text-2xl font-bold text-foreground">
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
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
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
                  <p className="text-sm font-medium text-muted-foreground">Total Commits</p>
                  <p className="text-2xl font-bold text-foreground">
                    {clients.reduce((sum, c) => sum + c.commits, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="add-name">Name *</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Client name"
              />
            </div>
            <div>
              <Label htmlFor="add-storyId">Story ID *</Label>
              <Input
                id="add-storyId"
                value={addForm.storyId}
                onChange={(e) => setAddForm((f) => ({ ...f, storyId: e.target.value }))}
                placeholder="e.g. femileasing"
              />
              <p className="text-xs text-muted-foreground mt-1">Used in roster and story (URL-friendly id).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddClientOpen(false)}>Cancel</Button>
            <Button onClick={handleAddClient} disabled={!addForm.name.trim() || !addForm.storyId.trim() || addSubmitting}>
              {addSubmitting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editClientOpen} onOpenChange={setEditClientOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information in Firebase
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Client name"
                />
              </div>
              <div>
                <Label htmlFor="edit-storyId">Story ID *</Label>
                <Input
                  id="edit-storyId"
                  value={editForm.storyId}
                  onChange={(e) => setEditForm({ ...editForm, storyId: e.target.value })}
                  placeholder="e.g. femileasing"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-brands">Brands (comma-separated)</Label>
              <Input
                id="edit-brands"
                value={editForm.brands.join(', ')}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  brands: e.target.value.split(',').map(b => b.trim()).filter(Boolean)
                })}
                placeholder="Brand 1, Brand 2, Brand 3"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value: ClientStatus) => setEditForm({ ...editForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-deployStatus">Deploy Status</Label>
                <Select
                  value={editForm.deployStatus}
                  onValueChange={(value: DeployStatus) => setEditForm({ ...editForm, deployStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="building">Building</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-stripeStatus">Stripe Status</Label>
                <Select
                  value={editForm.stripeStatus}
                  onValueChange={(value: StripeStatus) => setEditForm({ ...editForm, stripeStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-deployUrl">Deploy URL</Label>
              <Input
                id="edit-deployUrl"
                type="url"
                value={editForm.deployUrl}
                onChange={(e) => setEditForm({ ...editForm, deployUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-websiteUrl">Website URL</Label>
                <Input
                  id="edit-websiteUrl"
                  type="url"
                  value={editForm.websiteUrl}
                  onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="edit-appUrl">App URL</Label>
                <Input
                  id="edit-appUrl"
                  type="url"
                  value={editForm.appUrl}
                  onChange={(e) => setEditForm({ ...editForm, appUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-appStoreUrl">App Store URL</Label>
              <Input
                id="edit-appStoreUrl"
                type="url"
                value={editForm.appStoreUrl}
                onChange={(e) => setEditForm({ ...editForm, appStoreUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-rdUrl">R/D URL</Label>
                <Input
                  id="edit-rdUrl"
                  type="url"
                  value={editForm.rdUrl}
                  onChange={(e) => setEditForm({ ...editForm, rdUrl: e.target.value })}
                  placeholder="https://... (shows R/D card when set)"
                />
              </div>
              <div>
                <Label htmlFor="edit-housingUrl">Housing URL</Label>
                <Input
                  id="edit-housingUrl"
                  type="url"
                  value={editForm.housingUrl}
                  onChange={(e) => setEditForm({ ...editForm, housingUrl: e.target.value })}
                  placeholder="https://... (shows Housing card when set)"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-transportationUrl">Transportation URL</Label>
                <Input
                  id="edit-transportationUrl"
                  type="url"
                  value={editForm.transportationUrl}
                  onChange={(e) => setEditForm({ ...editForm, transportationUrl: e.target.value })}
                  placeholder="https://... (shows Transportation card when set)"
                />
              </div>
              <div>
                <Label htmlFor="edit-insuranceUrl">Insurance URL</Label>
                <Input
                  id="edit-insuranceUrl"
                  type="url"
                  value={editForm.insuranceUrl}
                  onChange={(e) => setEditForm({ ...editForm, insuranceUrl: e.target.value })}
                  placeholder="https://... (shows Insurance card when set)"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-storyVideoUrl">Story Video URL</Label>
              <Input
                id="edit-storyVideoUrl"
                type="url"
                value={editForm.storyVideoUrl}
                onChange={(e) => setEditForm({ ...editForm, storyVideoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="edit-revenue">Revenue</Label>
                <Input
                  id="edit-revenue"
                  type="number"
                  value={editForm.revenue}
                  onChange={(e) => setEditForm({ ...editForm, revenue: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-meetings">Meetings</Label>
                <Input
                  id="edit-meetings"
                  type="number"
                  value={editForm.meetings}
                  onChange={(e) => setEditForm({ ...editForm, meetings: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-emails">Emails</Label>
                <Input
                  id="edit-emails"
                  type="number"
                  value={editForm.emails}
                  onChange={(e) => setEditForm({ ...editForm, emails: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-commits">Commits</Label>
                <Input
                  id="edit-commits"
                  type="number"
                  value={editForm.commits}
                  onChange={(e) => setEditForm({ ...editForm, commits: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-lastActivity">Last Activity</Label>
              <Input
                id="edit-lastActivity"
                type="datetime-local"
                value={(() => {
                  if (!editForm.lastActivity) return '';
                  const d = new Date(editForm.lastActivity);
                  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
                })()}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  lastActivity: e.target.value ? new Date(e.target.value).toISOString() : ''
                })}
              />
            </div>

            <div>
              <Label htmlFor="edit-pulseSummary">Pulse Summary</Label>
              <Textarea
                id="edit-pulseSummary"
                value={editForm.pulseSummary}
                onChange={(e) => setEditForm({ ...editForm, pulseSummary: e.target.value })}
                placeholder="Summary of recent activity..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isNewStory"
                checked={editForm.isNewStory}
                onChange={(e) => setEditForm({ ...editForm, isNewStory: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-isNewStory" className="cursor-pointer">
                Is New Story
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClientOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={!editForm.name.trim() || !editForm.storyId.trim() || editSubmitting}
            >
              {editSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
