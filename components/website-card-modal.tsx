import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useGitHubTodoMe } from '@/lib/services/github-service';
import { useSlackChat } from '@/lib/services/slack-service';
import { 
  Globe, 
  Github, 
  ExternalLink, 
  MessageSquare, 
  Target, 
  Users, 
  TrendingUp, 
  Code, 
  Zap,
  Send,
  Plus,
  LogIn,
  FileText,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';

interface WebsiteInfo {
  name: string;
  url: string;
  status: string;
  techStack: string[];
  githubRepo: string;
  adminUrl?: string; // New field for admin login
  traffic: {
    monthlyVisitors: number;
    growthRate: number;
    topSources: string[];
  };
  performance: {
    loadTime: number;
    uptime: number;
    seoScore: number;
  };
  revenue: {
    current: number;
    previous: number;
    growth: number;
  };
}

import { TodoItem } from '@/lib/services/github-service';

interface WebsiteCardModalProps {
  open: boolean;
  onClose: () => void;
  websiteInfo: WebsiteInfo | null;
  clientPlan: {
    mode: string;
    revenue_share_threshold: number;
  };
}

export function WebsiteCardModal({ open, onClose, websiteInfo, clientPlan }: WebsiteCardModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [chatMessage, setChatMessage] = useState('');

  // Use GitHub service to fetch TODO.me content
  const { todoItems, loading: loadingTodos, error: todoError, isConfigured: githubConfigured } = useGitHubTodoMe(
    activeTab === 'overview' ? websiteInfo?.githubRepo : undefined
  );

  // Use Slack service for real chat integration
  const { 
    messages: chatHistory, 
    loading: slackLoading, 
    error: slackError, 
    isConnected: slackConnected,
    sendMessage,
    sendToBackgroundAgents
  } = useSlackChat('#client-missions');

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    // Send message to Slack
    sendMessage(chatMessage);
    setChatMessage('');
  };

  const handleSendToBackgroundAgents = (message: string, missionType?: string) => {
    sendToBackgroundAgents(message, missionType);
  };

  const handleNewMission = () => {
    onClose();
  };

  const handleClientLogin = () => {
    const adminUrl = websiteInfo?.adminUrl || `${websiteInfo?.url}/admin`;
    window.open(adminUrl, '_blank');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600';
      case 'in-progress': return 'bg-blue-600';
      case 'pending': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  if (!websiteInfo) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-900 border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-orange-500" />
            {websiteInfo.name}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Website analytics, performance metrics, and mission management
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-neutral-800 border-neutral-700">
            <TabsTrigger value="overview" className="text-neutral-300 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-neutral-300 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="missions" className="text-neutral-300 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Missions
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-neutral-300 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              AI Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Website Status */}
            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-orange-500" />
                  Website Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Status</span>
                  <Badge className={websiteInfo.status === 'live' ? 'bg-green-600' : 'bg-yellow-600'}>
                    {websiteInfo.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">URL</span>
                  <a href={websiteInfo.url} target="_blank" rel="noopener noreferrer" 
                     className="text-orange-500 hover:text-orange-400 flex items-center gap-1">
                    {websiteInfo.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Client Login Section */}
            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-green-500" />
                  Client Login
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Admin Panel</span>
                  <Button 
                    onClick={handleClientLogin}
                    variant="outline" 
                    size="sm"
                    className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white"
                  >
                    <LogIn className="w-3 h-3 mr-1" />
                    Login to Admin
                  </Button>
                </div>
                <div className="text-xs text-neutral-500">
                  Access your website's admin panel to manage content, orders, and settings
                </div>
                <div className="bg-neutral-900 p-3 rounded border border-neutral-700">
                  <div className="flex items-center gap-2 text-sm text-neutral-300">
                    <User className="w-3 h-3" />
                    <span>Admin URL:</span>
                    <a 
                      href={websiteInfo.adminUrl || `${websiteInfo.url}/admin`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-500 hover:text-green-400"
                    >
                      {websiteInfo.adminUrl || `${websiteInfo.url}/admin`}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tech Stack */}
            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-blue-500" />
                  Tech Stack
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {websiteInfo.techStack.map((tech, index) => (
                    <Badge key={index} variant="secondary" className="bg-neutral-700 text-neutral-300">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* GitHub Integration with TODO.me */}
            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Github className="w-4 h-4 text-white" />
                  GitHub Repository & TODO.me
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Repository</span>
                  <a href={websiteInfo.githubRepo} target="_blank" rel="noopener noreferrer" 
                     className="text-orange-500 hover:text-orange-400 flex items-center gap-1">
                    View on GitHub
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                {/* TODO.me Content */}
                <div className="bg-neutral-900 p-3 rounded border border-neutral-700">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-white">TODO.md - Developer Tasks</span>
                    {loadingTodos && <span className="text-xs text-neutral-500">Loading...</span>}
                    {githubConfigured && (
                      <Badge className="bg-green-600 text-white text-xs">Live</Badge>
                    )}
                    {!githubConfigured && (
                      <Badge className="bg-yellow-600 text-white text-xs">Mock</Badge>
                    )}
                  </div>
                  
                  {loadingTodos && (
                    <div className="text-sm text-neutral-500 text-center py-4">
                      Loading TODO items from GitHub...
                    </div>
                  )}
                  
                  {!loadingTodos && todoItems.length > 0 && (
                    <div className="space-y-3">
                      {todoItems.map((todo) => (
                        <div key={todo.id} className="flex items-start gap-3 p-2 bg-neutral-800 rounded border border-neutral-700">
                          <div className={`w-2 h-2 rounded-full mt-2 ${getPriorityColor(todo.priority)}`}></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm text-neutral-300">{todo.content}</span>
                              <Badge className={`text-xs ${getStatusColor(todo.status)}`}>
                                {todo.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-neutral-500">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                @{todo.author}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {todo.date}
                              </span>
                              {todo.file && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {todo.file}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!loadingTodos && todoError && (
                    <div className="text-sm text-red-500 text-center py-4">
                      Error loading TODO items: {todoError}
                    </div>
                  )}
                  
                  {!loadingTodos && !todoError && todoItems.length === 0 && !githubConfigured && (
                    <div className="text-sm text-neutral-500 text-center py-4">
                      No TODO items found. Add a GitHub token to fetch real TODO.md files.
                    </div>
                  )}
                  
                  {!loadingTodos && !todoError && todoItems.length === 0 && githubConfigured && (
                    <div className="text-sm text-neutral-500 text-center py-4">
                      No TODO.md files found in this repository
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Traffic Analytics */}
            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Traffic Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{websiteInfo.traffic.monthlyVisitors.toLocaleString()}</p>
                    <p className="text-xs text-neutral-400">Monthly Visitors</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">+{websiteInfo.traffic.growthRate}%</p>
                    <p className="text-xs text-neutral-400">Growth Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-500">{websiteInfo.traffic.topSources.length}</p>
                    <p className="text-xs text-neutral-400">Traffic Sources</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-neutral-400 mb-2">Top Traffic Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {websiteInfo.traffic.topSources.map((source, index) => (
                      <Badge key={index} variant="outline" className="border-neutral-600 text-neutral-300">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Load Time</span>
                      <span className="text-white">{websiteInfo.performance.loadTime}s</span>
                    </div>
                    <Progress value={100 - (websiteInfo.performance.loadTime / 3) * 100} className="mt-1" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Uptime</span>
                      <span className="text-white">{websiteInfo.performance.uptime}%</span>
                    </div>
                    <Progress value={websiteInfo.performance.uptime} className="mt-1" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">SEO Score</span>
                      <span className="text-white">{websiteInfo.performance.seoScore}/100</span>
                    </div>
                    <Progress value={websiteInfo.performance.seoScore} className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Comparison */}
            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Revenue Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">${websiteInfo.revenue.current.toLocaleString()}</p>
                    <p className="text-xs text-neutral-400">Current Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">+{websiteInfo.revenue.growth}%</p>
                    <p className="text-xs text-neutral-400">vs Previous</p>
                  </div>
                </div>
                <div className="bg-neutral-900 p-3 rounded border border-neutral-700">
                  <p className="text-sm text-neutral-400 mb-2">Business Plan Comparison:</p>
                  <div className="space-y-2 text-xs text-neutral-300">
                    <div className="flex justify-between">
                      <span>Target Revenue:</span>
                      <span className="text-orange-500">$50,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Progress:</span>
                      <span className="text-green-500">{Math.round((websiteInfo.revenue.current / 50000) * 100)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="missions" className="space-y-6">
            {/* Mission Management */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Website Missions</h3>
              <Button onClick={handleNewMission} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                New Mission
              </Button>
            </div>

            <div className="space-y-4">
              <Card className="bg-neutral-800 border-neutral-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-500" />
                      <span className="text-white font-medium">Update Website Design</span>
                    </div>
                    <Badge className="bg-yellow-600">IN PROGRESS</Badge>
                  </div>
                  <p className="text-sm text-neutral-400 mb-3">
                    Modernize the website design to improve user experience and conversion rates
                  </p>
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span>Priority: High</span>
                    <span>Due: 2025-01-15</span>
                    <span>Assigned: Design Team</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-neutral-800 border-neutral-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-500" />
                      <span className="text-white font-medium">Add Payment Integration</span>
                    </div>
                    <Badge className="bg-green-600">COMPLETED</Badge>
                  </div>
                  <p className="text-sm text-neutral-400 mb-3">
                    Integrate Stripe payment processing for seamless transactions
                  </p>
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span>Priority: Critical</span>
                    <span>Completed: 2025-01-10</span>
                    <span>Assigned: Dev Team</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Agent Network & Operators (Greyed out for rev share) */}
            {clientPlan.mode === "revenue_share" && (
              <Card className="bg-neutral-800/50 border-neutral-700/50 opacity-60">
                <CardHeader>
                  <CardTitle className="text-neutral-400 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Agent Network & Operators
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-500">
                    Agent network and operators allocation is disabled in revenue share mode.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            {/* AI Chat Interface */}
            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  AI Assistant Chat
                  {slackConnected && (
                    <Badge className="bg-green-600 text-white text-xs">Connected</Badge>
                  )}
                  {!slackConnected && (
                    <Badge className="bg-yellow-600 text-white text-xs">Mock Mode</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {slackError && (
                  <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700 rounded text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Slack Error: {slackError}</span>
                  </div>
                )}
                
                <div className="h-64 overflow-y-auto space-y-3 p-3 bg-neutral-900 rounded border border-neutral-700">
                  {slackLoading && (
                    <div className="text-center text-neutral-500 text-sm">
                      Loading chat history...
                    </div>
                  )}
                  
                  {chatHistory.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs p-3 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-orange-600 text-white'
                            : message.type === 'ai'
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-700 text-neutral-300'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                          {message.user && ` • ${message.user}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder={slackConnected ? "Ask about your website performance..." : "Mock mode - messages won't be sent"}
                    className="flex-1 bg-neutral-700 border-neutral-600 text-white"
                    disabled={slackLoading}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={slackLoading}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSendToBackgroundAgents("Update website design for better UX", "design")}
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white"
                    disabled={slackLoading}
                  >
                    Send to Design Team
                  </Button>
                  <Button
                    onClick={() => handleSendToBackgroundAgents("Optimize payment integration", "development")}
                    variant="outline"
                    size="sm"
                    className="border-blue-600 text-blue-500 hover:bg-blue-600 hover:text-white"
                    disabled={slackLoading}
                  >
                    Send to Dev Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 