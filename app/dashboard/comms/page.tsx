"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageSquare, 
  Mail, 
  Users, 
  Clock,
  Search,
  Filter,
  Reply,
  Archive,
  Star,
  AlertCircle,
  CheckCircle,
  Send
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard-layout';

interface Communication {
  id: string;
  type: 'email' | 'slack';
  source: string;
  subject: string;
  content: string;
  timestamp: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  client?: string;
  priority: 'high' | 'medium' | 'low';
  sender: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function CommunicationsPage() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [filteredComms, setFilteredComms] = useState<Communication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'email' | 'slack'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunicationsData();
  }, []);

  useEffect(() => {
    filterCommunications();
  }, [searchTerm, selectedType, communications]);

  const fetchCommunicationsData = async () => {
    try {
      setLoading(true);
      
      // Fetch communications from Pulse APIs
      const [gmailResponse, slackResponse] = await Promise.all([
        fetch('/api/pulse/gmail'),
        fetch('/api/pulse/slack')
      ]);

      const comms: Communication[] = [];

      // Process Gmail data
      if (gmailResponse.ok) {
        const gmailData = await gmailResponse.json();
        const emailComms = gmailData.events?.map((event: any) => ({
          id: event.data.messageId,
          type: 'email' as const,
          source: 'Gmail',
          subject: event.data.subject,
          content: event.data.snippet,
          timestamp: event.timestamp,
          status: event.data.isUnread ? 'unread' as const : 'read' as const,
          client: event.project || 'General',
          priority: 'medium' as const,
          sender: {
            name: event.data.from.split('<')[0].trim() || event.data.from,
            email: event.data.from,
          }
        })) || [];
        comms.push(...emailComms);
      }

      // Process Slack data
      if (slackResponse.ok) {
        const slackData = await slackResponse.json();
        const slackComms = slackData.events?.map((event: any) => ({
          id: event.data.messageId || event.data.timestamp,
          type: 'slack' as const,
          source: `Slack #${event.data.channel}`,
          subject: `Message in #${event.data.channel}`,
          content: event.data.text,
          timestamp: event.timestamp,
          status: 'read' as const,
          client: event.project || 'General',
          priority: 'low' as const,
          sender: {
            name: event.data.user || 'Unknown User',
            email: `${event.data.user}@slack`,
          }
        })) || [];
        comms.push(...slackComms);
      }

      // Sort by timestamp (most recent first)
      comms.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setCommunications(comms);

    } catch (error) {
      console.error('Error fetching communications data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCommunications = () => {
    let filtered = communications;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(comm => comm.type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(comm =>
        comm.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.sender.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.client?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredComms(filtered);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unread': return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case 'read': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'replied': return <Reply className="h-4 w-4 text-purple-600" />;
      case 'archived': return <Archive className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4 text-blue-600" />;
      case 'slack': return <MessageSquare className="h-4 w-4 text-purple-600" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-600" />;
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
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const unreadCount = communications.filter(c => c.status === 'unread').length;
  const emailCount = communications.filter(c => c.type === 'email').length;
  const slackCount = communications.filter(c => c.type === 'slack').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Communications Center</h1>
            <p className="text-gray-600">Monitor all client communications across email and Slack</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </div>
        </div>

        {/* Communication Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Messages</p>
                  <p className="text-2xl font-bold text-gray-900">{communications.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unread</p>
                  <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Mail className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Emails</p>
                  <p className="text-2xl font-bold text-gray-900">{emailCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Slack Messages</p>
                  <p className="text-2xl font-bold text-gray-900">{slackCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search messages, senders, or clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('all')}
                >
                  All
                </Button>
                <Button
                  variant={selectedType === 'email' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('email')}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
                <Button
                  variant={selectedType === 'slack' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('slack')}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Slack
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Communications List */}
        <div className="space-y-4">
          {filteredComms.length > 0 ? (
            filteredComms.map((comm) => (
              <Card key={comm.id} className={`hover:shadow-md transition-shadow ${
                comm.status === 'unread' ? 'border-l-4 border-l-blue-500' : ''
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`p-2 rounded-full ${
                        comm.type === 'email' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        {getTypeIcon(comm.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 truncate">
                            {comm.subject}
                          </h4>
                          <Badge className={getPriorityColor(comm.priority)}>
                            {comm.priority}
                          </Badge>
                          {comm.client && (
                            <Badge variant="outline" className="text-xs">
                              {comm.client}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          From: {comm.sender.name} ({comm.source})
                        </p>
                        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                          {comm.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{new Date(comm.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span className="capitalize">{comm.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {getStatusIcon(comm.status)}
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Reply className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No communications found</h3>
                <p className="text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms' : 'No messages available at the moment'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col">
                <Mail className="h-6 w-6 mb-2" />
                Compose Email
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <MessageSquare className="h-6 w-6 mb-2" />
                Slack Message
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Reply className="h-6 w-6 mb-2" />
                Reply All
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Archive className="h-6 w-6 mb-2" />
                Archive All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
