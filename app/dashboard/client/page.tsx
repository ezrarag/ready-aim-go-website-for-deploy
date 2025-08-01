"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
  DollarSign,
  Star,
  Bell,
  ChevronRight,
  Monitor,
  Settings,
  Shield,
  Target,
  RefreshCw,
  Activity,
  BarChart3,
  MessageSquare,
  LogOut,
  User,
  CreditCard,
  Globe,
  FileText,
  Calendar,
  Percent,
  MapPin,
  MoreHorizontal,
  XCircle,
  AlertTriangle,
  Eye,
  Download,
  Share,
  X,
  Truck,
} from "lucide-react"
import { NewProjectModal } from "@/components/new-project-modal"
import { RolesManager } from "@/components/roles-manager"
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUserWithRole } from "@/hooks/use-user-with-role";
import { useClientStats } from "@/hooks/use-client-stats";
import { useOperators } from "@/hooks/use-operators";
import { useClientProjects } from "@/hooks/use-client-projects";
import { useClientData } from "@/hooks/use-client-data";
import { useCommissionRate } from "@/hooks/use-commission-rate";
import { useRevenueData } from "@/hooks/use-revenue-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { CommissionRateModal } from "@/components/commission-rate-modal";
import { WebsiteCardModal } from "@/components/website-card-modal";

function ClientDashboardContent() {
  const { session, loading, error } = useUserWithRole();
  const { stats: clientStats, loading: statsLoading, error: statsError } = useClientStats(session?.user?.id);
  const { operators, loading: operatorsLoading, error: operatorsError } = useOperators();
  const { projects: clientProjects, loading: projectsLoading, error: projectsError } = useClientProjects(session?.user?.id);
  const { website: clientWebsite, loading: websiteLoading, error: websiteError } = useClientData(session?.user?.id);
  const { commissionRate, loading: commissionLoading, error: commissionError, updateCommissionRate } = useCommissionRate(session?.user?.id);
  const { revenueData, loading: revenueLoading, error: revenueError } = useRevenueData(session?.user?.id);
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewMissionModal, setShowNewMissionModal] = useState(false);
  const [showNewOperatorModal, setShowNewOperatorModal] = useState(false);
  const [todos, setTodos] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [operatorFilters, setOperatorFilters] = useState({
    type: "",
    status: "",
    search: ""
  });
  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      type: "ai",
      sender: "AI ASSISTANT",
      content: "Welcome to your encrypted communication channel. I'm monitoring your business systems and can assist with website analysis, legal compliance, and strategic planning. How can I help today?",
      timestamp: new Date(),
    },
    {
      id: 2,
      type: "system",
      sender: "SYSTEM ALERT",
      content: "⚠️ Website ezrahaugabrooks.com: SEO score improved to 85/100. Consider updating meta descriptions for better search visibility.",
      timestamp: new Date(),
    },
    {
      id: 3,
      type: "legal",
      sender: "LEGAL MONITOR",
      content: "📋 Business registration renewal due in 45 days. State filing requirements updated for 2025.",
      timestamp: new Date(),
    },
  ]);

  // Financial Dashboard State
  const [clientPlan, setClientPlan] = useState({
    mode: "revenue_share", // or "subscription"
    subscription_active: false,
    revenue_share_threshold: 5000,
    revenue_to_date: 2700,
  });

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWebsiteModal, setShowWebsiteModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Commission Rate Modal State
  const [showCommissionModal, setShowCommissionModal] = useState(false);

  // Dynamic business assets data - will be fetched from Supabase
  const [businessAssets, setBusinessAssets] = useState([
    {
      id: 1,
      name: "ezrahaugabrooks.com", // Will be updated dynamically
      type: "website",
      status: "live",
      revenue: 2500,
      foot_traffic: 1500, // Changed from commission
      ownership: "8%",
      revenue_health: 85,
      is_active: true, // Only website is active for this client
    },
    {
      id: 2,
      name: "Portfolio App",
      type: "app",
      status: "inactive",
      revenue: 0,
      foot_traffic: 0,
      ownership: "0%",
      revenue_health: 0,
      is_active: false,
    },
    {
      id: 3,
      name: "Business Plan",
      type: "business_plan", // Changed from communications
      status: "inactive",
      revenue: 0,
      foot_traffic: 0,
      ownership: "0%",
      revenue_health: 0,
      is_active: false,
    },
    {
      id: 4,
      name: "Real Estate Portal",
      type: "real_estate",
      status: "inactive",
      revenue: 0,
      foot_traffic: 0,
      ownership: "0%",
      revenue_health: 0,
      is_active: false,
    },
    {
      id: 5,
      name: "Transportation Network",
      type: "transportation",
      status: "inactive",
      revenue: 0,
      foot_traffic: 0,
      ownership: "0%",
      revenue_health: 0,
      is_active: false,
    },
    {
      id: 6,
      name: "Legal Filing System",
      type: "filing_system",
      status: "inactive",
      revenue: 0,
      foot_traffic: 0,
      ownership: "0%",
      revenue_health: 0,
      is_active: false,
    },
  ]);

  // Mock data for development - will be replaced with real Supabase data
  const mockActivity = [
    { id: "1", action: "Project Completed", details: "Website redesign finished", created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), project_title: "Website Redesign" },
    { id: "2", action: "Payment Received", details: "Invoice #1234 paid", created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), project_title: "SEO Optimization" },
    { id: "3", action: "New Project Started", details: "Content strategy initiated", created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), project_title: "Content Strategy" },
  ];

  // Sign out handler
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      } else {
        // Redirect to home page after successful sign out
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    async function fetchTodos() {
      if (!session?.user) return;
      const clientId = session.user.id;
      let query = supabase
        .from('client_todos')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (statusFilter) query = query.eq('status', statusFilter);
      const { data } = await query;
      if (data) setTodos(data);
    }
    fetchTodos();
  }, [session?.user, statusFilter]);

  const handleEdit = (todo: any) => {
    setEditingTodo(todo.id);
    setEditText(todo.title);
  };

  const handleEditSave = async (todo: any) => {
    await supabase.from('client_todos').update({ title: editText }).eq('id', todo.id);
    setEditingTodo(null);
    setEditText("");
    // Refresh todos
    if (!session?.user) return;
    const clientId = session.user.id;
    let query = supabase
      .from('client_todos')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (statusFilter) query = query.eq('status', statusFilter);
    const { data } = await query;
    if (data) setTodos(data);
  };

  const handleStatusChange = async (todo: any, newStatus: string) => {
    await supabase.from('client_todos').update({ status: newStatus }).eq('id', todo.id);
    // Refresh todos
    if (!session?.user) return;
    const clientId = session.user.id;
    let query = supabase
      .from('client_todos')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (statusFilter) query = query.eq('status', statusFilter);
    const { data } = await query;
    if (data) setTodos(data);
  };

  const stats = clientStats;
  const recentProjects = clientStats.recentProjects;
  const activity = mockActivity;



  const payments = [
    { id: 1, type: 'subscription', amount: 99, due_date: '2024-01-15', status: 'paid' },
    { id: 2, type: 'project', amount: 2500, due_date: '2024-01-20', status: 'pending' },
    { id: 3, type: 'subscription', amount: 99, due_date: '2024-02-15', status: 'upcoming' },
  ];

  const enhancedActivity = [
    ...activity,
    // Add asset-related activities
    { id: 'asset-1', action: 'Website Revenue', details: 'ezrahaugabrooks.com generated $2,500', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), project_title: 'ezrahaugabrooks.com' },
    { id: 'asset-2', action: 'Commission Earned', details: 'ReadyAimGo earned $250 (10%) from website sales', created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), project_title: 'ezrahaugabrooks.com' },
    { id: 'payment-1', action: 'Payment Due', details: 'Project payment of $2,500 due in 5 days', created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), project_title: 'Portfolio Website' },
  ];

  const getTodoStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-600 text-white"
      case "in-progress":
        return "bg-blue-600 text-white"
      case "review":
        return "bg-yellow-600 text-white"
      case "open":
        return "bg-neutral-600 text-white"
      default:
        return "bg-neutral-600 text-white"
    }
  }

  const getTodoStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "in-progress":
        return <Clock className="h-4 w-4" />
      case "review":
        return <AlertCircle className="h-4 w-4" />
      case "open":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const renderOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
      {/* Agent Allocation */}
      <Card className="bg-neutral-800 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">AGENT ALLOCATION</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{stats.activeProjects}</div>
              <div className="text-xs text-neutral-400 font-mono">ACTIVE FIELD</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{stats.completedProjects}</div>
              <div className="text-xs text-neutral-400 font-mono">COMPLETED</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{Math.round(stats.averageRating * 100)}</div>
              <div className="text-xs text-neutral-400 font-mono">SUCCESS RATE</div>
            </div>
          </div>
          <div className="space-y-2">
            {recentProjects.map((project, index) => (
              <div key={project.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${project.status === 'completed' ? 'bg-green-500' : project.status === 'in-progress' ? 'bg-blue-500' : 'bg-neutral-500'}`}></div>
                <span className="text-sm text-neutral-300 font-mono">{project.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card className="bg-neutral-800 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">ACTIVITY LOG</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-orange-500"></div>
            <div className="space-y-4 ml-6">
              {enhancedActivity.slice(0, 6).map((item, index) => (
                <div key={item.id} className="relative">
                  <div className="text-xs text-neutral-500 font-mono">
                    {new Date(item.created_at).toLocaleDateString('en-GB')} {new Date(item.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm text-neutral-300">
                    <span className="text-orange-500 font-mono">
                      {item.action.includes('Revenue') ? '💰' : 
                       item.action.includes('Commission') ? '📈' : 
                       item.action.includes('Payment') ? '💳' : 'Agent'} {item.action}
                    </span>
                    {item.details && (
                      <span>: <span className="font-semibold">{item.details}</span></span>
                    )}
                    {item.project_title && !item.details && (
                      <span> completed mission in <span className="font-semibold">{item.project_title}</span></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Encrypted Chat Activity */}
      <Card className="bg-neutral-800 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">ENCRYPTED CHAT ACTIVITY</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-4">
            <div className="w-16 h-16 border-2 border-orange-500 rounded-full mx-auto flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="text-neutral-500"># {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC</div>
            <div className="text-green-500">> [AGT:{session?.full_name?.replace(' ', '').toLowerCase() || 'agent'}] ::: INIT >></div>
            <div className="text-neutral-400">^^^ loading secure channel</div>
            <div className="text-blue-500">> CH#2 | {Math.random().toString().slice(2, 15)} ...xR3</div>
            <div className="text-green-500">> KEY LOCKED</div>
            <div className="text-neutral-300">> MSG >> "...mission override initiated ... awaiting delta node clearance"</div>
          </div>
        </CardContent>
      </Card>

      {/* Mission Activity Overview */}
      <Card className="bg-neutral-800 border-neutral-700 cursor-pointer hover:border-orange-500/50 transition-colors" onClick={() => setActiveSection("operators")}>
        <CardHeader>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">MISSION ACTIVITY OVERVIEW</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Website Completion */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Website Completion</span>
                <span className="text-white font-mono">75%</span>
              </div>
              <div className="h-8 bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: '75%' }}></div>
              </div>
            </div>
            
            {/* Agent Allocation */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Agent Allocation</span>
                <span className="text-white font-mono">3/5</span>
              </div>
              <div className="h-8 bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-300" style={{ width: '60%' }}></div>
              </div>
            </div>
            
            {/* Subscription Usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Subscription Usage</span>
                <span className="text-white font-mono">$35/$50</span>
              </div>
              <div className="h-8 bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: '70%' }}></div>
              </div>
            </div>
            
            {/* Mission Objectives */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Mission Objectives</span>
                <span className="text-white font-mono">60%</span>
              </div>
              <div className="h-8 bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-neutral-400 font-mono text-center">
            Click to view detailed operations
          </div>
        </CardContent>
      </Card>

      {/* Mission Information */}
      <Card className="bg-neutral-800 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">MISSION INFORMATION</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-neutral-400 font-mono mb-2">SUCCESSFUL MISSIONS</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-neutral-300">High Risk Mission {stats.activeProjects}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-neutral-300">Medium Risk Mission {stats.completedProjects}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-neutral-300">Low Risk Mission {Math.round(stats.averageRating * 100)}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-400 font-mono mb-2">FAILED MISSIONS</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-neutral-300">High Risk Mission 0</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Encrypted Chat Activity Center */}
      <Card className="bg-neutral-800 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">ENCRYPTED CHAT ACTIVITY CENTER</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Chat Window */}
            <div className="h-64 bg-neutral-900 border border-neutral-700 rounded-lg p-4 overflow-y-auto">
              <div className="space-y-3">
                {chatHistory.map((message) => (
                  <div key={message.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      message.type === 'ai' ? 'bg-green-500' :
                      message.type === 'system' ? 'bg-orange-500' :
                      message.type === 'legal' ? 'bg-blue-500' :
                      message.type === 'user' ? 'bg-purple-500' : 'bg-neutral-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="text-xs text-neutral-400 font-mono">{message.sender}</div>
                      <div className="text-sm text-neutral-300 bg-neutral-800 p-2 rounded">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <Input 
                placeholder="Type your message..." 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-1 bg-neutral-700 border-neutral-600 text-neutral-300 placeholder-neutral-400"
              />
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </form>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600"
                onClick={() => setActiveSection("operators")}
              >
                <Globe className="h-4 w-4 mr-2" />
                Analyze Website
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600"
              >
                <FileText className="h-4 w-4 mr-2" />
                Legal Check
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProjects = () => (
    <div className="p-6">
      <Card className="bg-neutral-800 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">MISSION CONTROL</CardTitle>
          <CardDescription className="text-neutral-400">Manage and track all your tactical operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search missions..."
                  className="pl-10 pr-4 py-2 bg-neutral-700 border border-neutral-600 rounded text-neutral-300 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <Button variant="outline" size="sm" className="bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            <Button onClick={() => setShowNewMissionModal(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              New Mission
            </Button>
          </div>

          <div className="text-center py-12 text-neutral-500">
            <Clock className="h-12 w-12 mx-auto mb-4" />
            <p className="font-mono">Mission management interface would be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTodos = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider">BUSINESS SYSTEMS MONITOR</h1>
          <p className="text-sm text-neutral-400">Infrastructure health and performance monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">System Scan</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">Maintenance Mode</Button>
        </div>
      </div>

      {/* System Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">SYSTEMS ONLINE</p>
                <p className="text-2xl font-bold text-white font-mono">4/5</p>
              </div>
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">REVENUE STREAMS</p>
                <p className="text-2xl font-bold text-green-500 font-mono">3</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">COMMISSION RATE</p>
                <p className="text-2xl font-bold text-orange-500 font-mono">10%</p>
              </div>
              <Percent className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">PAYMENTS DUE</p>
                <p className="text-2xl font-bold text-yellow-500 font-mono">2</p>
              </div>
              <CreditCard className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Systems Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Website Systems */}
        {businessAssets.map((asset) => (
          <Card
            key={asset.id}
            className="bg-neutral-900 border-neutral-700 hover:border-orange-500/50 transition-colors cursor-pointer"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-6 h-6 text-orange-500" />
                  <div>
                    <CardTitle className="text-sm font-bold text-white tracking-wider">{asset.name}</CardTitle>
                    <p className="text-xs text-neutral-400">{asset.type.toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <Badge className={asset.status === 'live' ? 'bg-green-600' : 'bg-yellow-600'}>
                    {asset.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">REVENUE HEALTH</span>
                <span className={`text-sm font-bold font-mono ${asset.revenue > 0 ? 'text-green-500' : 'text-neutral-400'}`}>
                  ${asset.revenue.toLocaleString()}
                </span>
              </div>
              <Progress value={asset.revenue > 0 ? 100 : 0} className="h-2" />

              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-neutral-400 mb-1">REVENUE</div>
                  <div className="text-white font-mono">${asset.revenue}</div>
                  <div className="w-full bg-neutral-800 rounded-full h-1 mt-1">
                    <div
                      className="bg-green-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${asset.revenue > 0 ? 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="text-neutral-400 mb-1">FOOT TRAFFIC</div>
                  <div className="text-white font-mono">{asset.foot_traffic.toLocaleString()}</div>
                  <div className="w-full bg-neutral-800 rounded-full h-1 mt-1">
                    <div
                      className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${asset.foot_traffic > 0 ? 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="text-neutral-400 mb-1">RATE</div>
                  <div className="text-white font-mono">{asset.foot_traffic > 0 ? '10%' : '0%'}</div>
                  <div className="w-full bg-neutral-800 rounded-full h-1 mt-1">
                    <div
                      className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${asset.foot_traffic > 0 ? 10 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-neutral-400">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-white">{asset.status}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="text-white">{asset.type}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Payment Systems */}
        {payments.map((payment) => (
          <Card
            key={payment.id}
            className="bg-neutral-900 border-neutral-700 hover:border-orange-500/50 transition-colors cursor-pointer"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-orange-500" />
                  <div>
                    <CardTitle className="text-sm font-bold text-white tracking-wider">
                      {payment.type === 'subscription' ? 'MONTHLY SUBSCRIPTION' : 'PROJECT PAYMENT'}
                    </CardTitle>
                    <p className="text-xs text-neutral-400">PAYMENT SYSTEM</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <Badge className={
                    payment.status === 'paid' ? 'bg-green-600' : 
                    payment.status === 'pending' ? 'bg-yellow-600' : 'bg-blue-600'
                  }>
                    {payment.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">PAYMENT HEALTH</span>
                <span className={`text-sm font-bold font-mono ${
                  payment.status === 'paid' ? 'text-green-500' : 
                  payment.status === 'pending' ? 'text-yellow-500' : 'text-blue-500'
                }`}>
                  ${payment.amount}
                </span>
              </div>
              <Progress value={payment.status === 'paid' ? 100 : payment.status === 'pending' ? 50 : 0} className="h-2" />

              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-neutral-400 mb-1">AMOUNT</div>
                  <div className="text-white font-mono">${payment.amount}</div>
                  <div className="w-full bg-neutral-800 rounded-full h-1 mt-1">
                    <div
                      className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="text-neutral-400 mb-1">STATUS</div>
                  <div className="text-white font-mono">{payment.status}</div>
                  <div className="w-full bg-neutral-800 rounded-full h-1 mt-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-300 ${
                        payment.status === 'paid' ? 'bg-green-500' : 
                        payment.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${payment.status === 'paid' ? 100 : payment.status === 'pending' ? 50 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="text-neutral-400 mb-1">DUE DATE</div>
                  <div className="text-white font-mono">{new Date(payment.due_date).toLocaleDateString()}</div>
                  <div className="w-full bg-neutral-800 rounded-full h-1 mt-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-neutral-400">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="text-white">{payment.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due:</span>
                  <span className="text-white">{new Date(payment.due_date).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Commission System */}
        <Card className="bg-neutral-900 border-neutral-700 hover:border-orange-500/50 transition-colors cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Percent className="w-6 h-6 text-orange-500" />
                <div>
                  <CardTitle className="text-sm font-bold text-white tracking-wider">COMMISSION SYSTEM</CardTitle>
                  <p className="text-xs text-neutral-400">REVENUE SHARING</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <Badge className="bg-green-600">ACTIVE</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">FOOT TRAFFIC HEALTH</span>
              <span className="text-sm font-bold font-mono text-orange-500">
                {businessAssets.reduce((sum, asset) => sum + asset.foot_traffic, 0).toLocaleString()}
              </span>
            </div>
            <Progress value={100} className="h-2" />

            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-neutral-400 mb-1">TOTAL REV</div>
                <div className="text-white font-mono">${businessAssets.reduce((sum, asset) => sum + asset.revenue, 0).toLocaleString()}</div>
                <div className="w-full bg-neutral-800 rounded-full h-1 mt-1">
                  <div
                    className="bg-green-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="text-neutral-400 mb-1">FOOT TRAFFIC</div>
                <div className="text-white font-mono">{businessAssets.reduce((sum, asset) => sum + asset.foot_traffic, 0).toLocaleString()}</div>
                <div className="w-full bg-neutral-800 rounded-full h-1 mt-1">
                  <div
                    className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: '100%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="text-neutral-400 mb-1">RATE</div>
                <div className="text-white font-mono">10%</div>
                <div className="w-full bg-neutral-800 rounded-full h-1 mt-1">
                  <div
                    className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: '10%' }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="space-y-1 text-xs text-neutral-400">
              <div className="flex justify-between">
                <span>Rate:</span>
                <span className="text-white">10% Standard</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-white">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAgentNetwork = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider">AGENT NETWORK</h1>
          <p className="text-sm text-neutral-400">Manage and monitor field operatives</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">Deploy Agent</Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search agents..."
                className="pl-10 bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">ACTIVE AGENTS</p>
                <p className="text-2xl font-bold text-white font-mono">847</p>
              </div>
              <Shield className="w-8 h-8 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">COMPROMISED</p>
                <p className="text-2xl font-bold text-red-500 font-mono">3</p>
              </div>
              <Shield className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">IN TRAINING</p>
                <p className="text-2xl font-bold text-orange-500 font-mono">23</p>
              </div>
              <Shield className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent List */}
      <Card className="bg-neutral-900 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider">AGENT ROSTER</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-400 tracking-wider">AGENT ID</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-400 tracking-wider">CODENAME</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-400 tracking-wider">STATUS</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-400 tracking-wider">LOCATION</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-400 tracking-wider">LAST SEEN</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-400 tracking-wider">MISSIONS</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-400 tracking-wider">RISK</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-neutral-400 tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    id: "G-078W",
                    name: "VENGEFUL SPIRIT",
                    status: "active",
                    location: "Berlin",
                    lastSeen: "2 min ago",
                    missions: 47,
                    risk: "high",
                  },
                  {
                    id: "G-079X",
                    name: "OBSIDIAN SENTINEL",
                    status: "standby",
                    location: "Tokyo",
                    lastSeen: "15 min ago",
                    missions: 32,
                    risk: "medium",
                  },
                  {
                    id: "G-080Y",
                    name: "GHOSTLY FURY",
                    status: "active",
                    location: "Cairo",
                    lastSeen: "1 min ago",
                    missions: 63,
                    risk: "high",
                  },
                  {
                    id: "G-081Z",
                    name: "CURSED REVENANT",
                    status: "compromised",
                    location: "Moscow",
                    lastSeen: "3 hours ago",
                    missions: 28,
                    risk: "critical",
                  },
                  {
                    id: "G-082A",
                    name: "VENOMOUS SHADE",
                    status: "active",
                    location: "London",
                    lastSeen: "5 min ago",
                    missions: 41,
                    risk: "medium",
                  },
                  {
                    id: "G-083B",
                    name: "MYSTIC ENIGMA",
                    status: "training",
                    location: "Base Alpha",
                    lastSeen: "1 day ago",
                    missions: 12,
                    risk: "low",
                  },
                ].map((agent, index) => (
                  <tr
                    key={agent.id}
                    className={`border-b border-neutral-800 hover:bg-neutral-700 transition-colors cursor-pointer ${
                      index % 2 === 0 ? "bg-neutral-900" : "bg-neutral-850"
                    }`}
                  >
                    <td className="py-3 px-4 text-sm text-white font-mono">{agent.id}</td>
                    <td className="py-3 px-4 text-sm text-white">{agent.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            agent.status === "active"
                              ? "bg-white"
                              : agent.status === "standby"
                                ? "bg-neutral-500"
                                : agent.status === "training"
                                  ? "bg-orange-500"
                                  : "bg-red-500"
                          }`}
                        ></div>
                        <span className="text-xs text-neutral-300 uppercase tracking-wider">{agent.status}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-neutral-400" />
                        <span className="text-sm text-neutral-300">{agent.location}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span className="text-sm text-neutral-300 font-mono">{agent.lastSeen}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-white font-mono">{agent.missions}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2 py-1 rounded uppercase tracking-wider ${
                          agent.risk === "critical"
                            ? "bg-red-500/20 text-red-500"
                            : agent.risk === "high"
                              ? "bg-orange-500/20 text-orange-500"
                              : agent.risk === "medium"
                                ? "bg-neutral-500/20 text-neutral-300"
                                : "bg-white/20 text-white"
                        }`}
                      >
                        {agent.risk}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-orange-500">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Operations data
  const operations = [
    {
      id: "OP-OMEGA-001",
      name: "SHADOW PROTOCOL",
      status: "active",
      priority: "critical",
      location: "Eastern Europe",
      agents: 5,
      progress: 75,
      startDate: "2025-06-15",
      estimatedCompletion: "2025-06-30",
      description: "Track high-value target in Eastern Europe",
      objectives: ["Locate target", "Establish surveillance", "Extract intelligence"],
    },
    {
      id: "OP-DELTA-002",
      name: "GHOST FIRE",
      status: "planning",
      priority: "high",
      location: "Seoul",
      agents: 3,
      progress: 25,
      startDate: "2025-06-20",
      estimatedCompletion: "2025-07-05",
      description: "Infiltrate cybercrime network in Seoul",
      objectives: ["Penetrate network", "Gather evidence", "Identify key players"],
    },
    {
      id: "OP-SIERRA-003",
      name: "NIGHT STALKER",
      status: "completed",
      priority: "medium",
      location: "Berlin",
      agents: 2,
      progress: 100,
      startDate: "2025-05-28",
      estimatedCompletion: "2025-06-12",
      description: "Monitor rogue agent communications in Berlin",
      objectives: ["Intercept communications", "Decode messages", "Report findings"],
    },
    {
      id: "OP-ALPHA-004",
      name: "CRIMSON TIDE",
      status: "active",
      priority: "high",
      location: "Cairo",
      agents: 4,
      progress: 60,
      startDate: "2025-06-10",
      estimatedCompletion: "2025-06-25",
      description: "Support covert extraction in South America",
      objectives: ["Secure extraction point", "Neutralize threats", "Extract asset"],
    },
    {
      id: "OP-BRAVO-005",
      name: "SILENT BLADE",
      status: "compromised",
      priority: "critical",
      location: "Moscow",
      agents: 6,
      progress: 40,
      startDate: "2025-06-05",
      estimatedCompletion: "2025-06-20",
      description: "Monitor rogue agent communications in Berlin",
      objectives: ["Assess compromise", "Extract personnel", "Damage control"],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-white/20 text-white"
      case "planning":
        return "bg-orange-500/20 text-orange-500"
      case "completed":
        return "bg-white/20 text-white"
      case "compromised":
        return "bg-red-500/20 text-red-500"
      default:
        return "bg-neutral-500/20 text-neutral-300"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-500/20 text-red-500"
      case "high":
        return "bg-orange-500/20 text-orange-500"
      case "medium":
        return "bg-neutral-500/20 text-neutral-300"
      case "low":
        return "bg-white/20 text-white"
      default:
        return "bg-neutral-500/20 text-neutral-300"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Target className="w-4 h-4" />
      case "planning":
        return <Clock className="w-4 h-4" />
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "compromised":
        return <XCircle className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: "user",
      sender: "YOU",
      content: chatMessage,
      timestamp: new Date(),
    };

    setChatHistory(prev => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        type: "ai",
        sender: "AI ASSISTANT",
        content: `I understand you're asking about "${chatMessage}". Let me analyze your business systems and provide strategic insights.`,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, aiResponse]);
    }, 1000);

    setChatMessage("");
  };

  const renderOperations = () => {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wider">OPERATIONS CENTER</h1>
            <p className="text-sm text-neutral-400">Mission planning and execution oversight</p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">New Operation</Button>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">Mission Brief</Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-neutral-900 border-neutral-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-400 tracking-wider">ACTIVE OPS</p>
                  <p className="text-2xl font-bold text-white font-mono">23</p>
                </div>
                <Target className="w-8 h-8 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-400 tracking-wider">COMPLETED</p>
                  <p className="text-2xl font-bold text-white font-mono">156</p>
                </div>
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-400 tracking-wider">COMPROMISED</p>
                  <p className="text-2xl font-bold text-red-500 font-mono">2</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-neutral-900 border-neutral-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-neutral-400 tracking-wider">SUCCESS RATE</p>
                  <p className="text-2xl font-bold text-white font-mono">94%</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Operations List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {operations.map((operation) => (
            <Card
              key={operation.id}
              className="bg-neutral-900 border-neutral-700 hover:border-orange-500/50 transition-colors cursor-pointer"
              onClick={() => setSelectedOperation(operation)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-white tracking-wider">{operation.name}</CardTitle>
                    <p className="text-xs text-neutral-400 font-mono">{operation.id}</p>
                  </div>
                  <div className="flex items-center gap-2">{getStatusIcon(operation.status)}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Badge className={getStatusColor(operation.status)}>{operation.status.toUpperCase()}</Badge>
                  <Badge className={getPriorityColor(operation.priority)}>{operation.priority.toUpperCase()}</Badge>
                </div>

                <p className="text-sm text-neutral-300">{operation.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <MapPin className="w-3 h-3" />
                    <span>{operation.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Users className="w-3 h-3" />
                    <span>{operation.agents} agents assigned</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Clock className="w-3 h-3" />
                    <span>Est. completion: {operation.estimatedCompletion}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Progress</span>
                    <span className="text-white font-mono">{operation.progress}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${operation.progress}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Operation Detail Modal */}
        {selectedOperation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="bg-neutral-900 border-neutral-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-white tracking-wider">{selectedOperation.name}</CardTitle>
                  <p className="text-sm text-neutral-400 font-mono">{selectedOperation.id}</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedOperation(null)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">OPERATION STATUS</h3>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(selectedOperation.status)}>
                          {selectedOperation.status.toUpperCase()}
                        </Badge>
                        <Badge className={getPriorityColor(selectedOperation.priority)}>
                          {selectedOperation.priority.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">MISSION DETAILS</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Location:</span>
                          <span className="text-white">{selectedOperation.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Agents:</span>
                          <span className="text-white font-mono">{selectedOperation.agents}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Start Date:</span>
                          <span className="text-white font-mono">{selectedOperation.startDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Est. Completion:</span>
                          <span className="text-white font-mono">{selectedOperation.estimatedCompletion}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">PROGRESS</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">Completion</span>
                          <span className="text-white font-mono">{selectedOperation.progress}%</span>
                        </div>
                        <div className="w-full bg-neutral-800 rounded-full h-3">
                          <div
                            className="bg-orange-500 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${selectedOperation.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">OBJECTIVES</h3>
                      <div className="space-y-2">
                        {selectedOperation.objectives.map((objective, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-neutral-300">{objective}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-neutral-300 tracking-wider mb-2">DESCRIPTION</h3>
                  <p className="text-sm text-neutral-300">{selectedOperation.description}</p>
                </div>

                <div className="flex gap-2 pt-4 border-t border-neutral-700">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white">Update Status</Button>
                  <Button
                    variant="outline"
                    className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 bg-transparent"
                  >
                    View Reports
                  </Button>
                  <Button
                    variant="outline"
                    className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 bg-transparent"
                  >
                    Assign Agents
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const renderOperators = () => {
    const filteredOperators = operators.filter(operator => {
      const matchesType = !operatorFilters.type || operator.type_name === operatorFilters.type;
      const matchesStatus = !operatorFilters.status || operator.status === operatorFilters.status;
      const matchesSearch = !operatorFilters.search || 
        operator.name.toLowerCase().includes(operatorFilters.search.toLowerCase()) ||
        operator.email.toLowerCase().includes(operatorFilters.search.toLowerCase());
      
      return matchesType && matchesStatus && matchesSearch;
    });

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'available': return 'bg-green-600';
        case 'busy': return 'bg-orange-600';
        case 'offline': return 'bg-neutral-600';
        case 'on_leave': return 'bg-blue-600';
        default: return 'bg-neutral-600';
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case 'available': return <CheckCircle className="w-4 h-4 text-green-500" />;
        case 'busy': return <Clock className="w-4 h-4 text-orange-500" />;
        case 'offline': return <XCircle className="w-4 h-4 text-neutral-500" />;
        case 'on_leave': return <User className="w-4 h-4 text-blue-500" />;
        default: return <User className="w-4 h-4 text-neutral-500" />;
      }
    };

    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wider">OPERATORS CENTER</h1>
            <p className="text-sm text-neutral-400">Agent network management and allocation</p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setShowNewOperatorModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Operator
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search operators..."
            value={operatorFilters.search}
            onChange={(e) => setOperatorFilters({...operatorFilters, search: e.target.value})}
            className="bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400"
          />
          <Select value={operatorFilters.type || "all"} onValueChange={(value) => setOperatorFilters({...operatorFilters, type: value === "all" ? "" : value})}>
            <SelectTrigger className="bg-neutral-800 border-neutral-600 text-white">
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Web Developer">Web Developer</SelectItem>
                <SelectItem value="Creative Operator">Creative Operator</SelectItem>
                <SelectItem value="Property Manager">Property Manager</SelectItem>
                <SelectItem value="Driver / Pilot">Driver / Pilot</SelectItem>
                <SelectItem value="Community Builder">Community Builder</SelectItem>
              </SelectContent>
            </SelectTrigger>
          </Select>
          <Select value={operatorFilters.status || "all"} onValueChange={(value) => setOperatorFilters({...operatorFilters, status: value === "all" ? "" : value})}>
            <SelectTrigger className="bg-neutral-800 border-neutral-600 text-white">
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </SelectTrigger>
          </Select>
        </div>

        {/* Operators Grid */}
        {operatorsLoading ? (
          <div className="text-center py-12 text-neutral-500">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin" />
            <p className="font-mono">Loading operators...</p>
          </div>
        ) : operatorsError ? (
          <div className="text-center py-12 text-red-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <p className="font-mono">Error loading operators</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOperators.map((operator) => (
              <Card
                key={operator.id}
                className="bg-neutral-900 border-neutral-700 hover:border-orange-500/50 transition-colors cursor-pointer"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={operator.avatar_url} />
                        <AvatarFallback className="bg-neutral-700 text-neutral-300">
                          {operator.name.split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-sm font-bold text-white">{operator.name}</CardTitle>
                        <p className="text-xs text-neutral-400">{operator.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(operator.status)}
                      <Badge className={getStatusColor(operator.status)}>
                        {operator.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Badge 
                      className="text-white" 
                      style={{ backgroundColor: operator.color }}
                    >
                      {operator.type_name}
                    </Badge>
                    <Badge className="bg-neutral-700 text-neutral-300">
                      {Math.round(operator.efficiency_rating * 100)}% Efficiency
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Capacity Utilization</span>
                      <span className="text-white font-mono">{operator.current_allocation_percentage}%</span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${operator.current_allocation_percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Hourly Capacity: {operator.hourly_capacity}h</span>
                    <span>Rating: {operator.efficiency_rating.toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredOperators.length === 0 && !operatorsLoading && (
          <div className="text-center py-12 text-neutral-500">
            <Users className="h-12 w-12 mx-auto mb-4" />
            <p className="font-mono">No operators found</p>
          </div>
        )}
      </div>
    );
  };

  // New Mission Modal Component
  function NewMissionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [missionData, setMissionData] = useState({
      title: "",
      classification: "TOP SECRET",
      threatLevel: "HIGH",
      sourceType: "SIGINT",
      location: "Eastern Europe",
      date: new Date().toISOString().split('T')[0],
      status: "VERIFIED",
      tags: ["cybercrime", "international", "financial"],
      threatAssessment: 85,
      executiveSummary: "Detailed analysis of emerging cybercrime syndicate operating across multiple jurisdictions"
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Handle mission creation logic here
      onClose();
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl bg-[#222222] border-neutral-700 text-white">
          <DialogHeader className="text-center">
            <div className="flex justify-between items-start mb-4">
              <div>
                <DialogTitle className="text-2xl font-bold text-white tracking-wider">CYBERCRIME NETWORK ANALYSIS</DialogTitle>
                <p className="text-sm text-neutral-400 font-mono">INT-2025-001</p>
              </div>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Classification */}
            <div>
              <h3 className="text-sm font-bold text-neutral-300 mb-2 tracking-wider">CLASSIFICATION</h3>
              <div className="flex gap-2">
                <Badge className="bg-red-600 text-white px-3 py-1">TOP SECRET</Badge>
                <Badge className="bg-orange-600 text-white px-3 py-1">THREAT: HIGH</Badge>
              </div>
            </div>

            {/* Source Details */}
            <div>
              <h3 className="text-sm font-bold text-neutral-300 mb-2 tracking-wider">SOURCE DETAILS</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-400">Source Type:</span>
                  <span className="text-white ml-2">SIGINT</span>
                </div>
                <div>
                  <span className="text-neutral-400">Location:</span>
                  <span className="text-white ml-2">Eastern Europe</span>
                </div>
                <div>
                  <span className="text-neutral-400">Date:</span>
                  <span className="text-white ml-2">2025-06-17</span>
                </div>
                <div>
                  <span className="text-neutral-400">Status:</span>
                  <Badge className="bg-green-600 text-white ml-2 px-2 py-0.5 text-xs">VERIFIED</Badge>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-sm font-bold text-neutral-300 mb-2 tracking-wider">TAGS</h3>
              <div className="flex gap-2">
                {["cybercrime", "international", "financial"].map((tag) => (
                  <Badge key={tag} className="bg-neutral-700 text-neutral-300 px-3 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Threat Assessment */}
            <div>
              <h3 className="text-sm font-bold text-neutral-300 mb-2 tracking-wider">THREAT ASSESSMENT</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-400">Threat Level</span>
                  <span className="text-orange-500 font-bold">HIGH</span>
                </div>
                <div className="w-full bg-neutral-700 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            <div>
              <h3 className="text-sm font-bold text-neutral-300 mb-2 tracking-wider">EXECUTIVE SUMMARY</h3>
              <textarea
                className="w-full bg-neutral-800 border border-neutral-600 rounded p-3 text-white text-sm"
                rows={3}
                placeholder="Detailed analysis of emerging cybercrime syndicate operating across multiple jurisdictions"
                value={missionData.executiveSummary}
                onChange={(e) => setMissionData({...missionData, executiveSummary: e.target.value})}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white flex-1">
                <Eye className="h-4 w-4 mr-2" />
                View Full Report
              </Button>
              <Button type="button" variant="outline" className="border-neutral-600 text-white hover:bg-neutral-700 flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button type="button" variant="outline" className="border-neutral-600 text-white hover:bg-neutral-700 flex-1">
                <Share className="h-4 w-4 mr-2" />
                Share Intel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Subscription Payment Modal Component
  function SubscriptionPaymentModal({ 
    open, 
    onClose, 
    onPayment, 
    loading 
  }: { 
    open: boolean; 
    onClose: () => void; 
    onPayment: () => Promise<void>;
    loading: boolean;
  }) {
    const [email, setEmail] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [cvv, setCvv] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onPayment();
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-orange-500" />
              Upgrade to Subscription
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Unlock full access to dedicated agents and operators with our monthly subscription plan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-neutral-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="bg-neutral-800 border-neutral-600 text-white placeholder:text-neutral-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="card" className="text-sm font-medium text-neutral-300">
                  Card Number
                </Label>
                <Input
                  id="card"
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="1234 5678 9012 3456"
                  className="bg-neutral-800 border-neutral-600 text-white placeholder:text-neutral-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry" className="text-sm font-medium text-neutral-300">
                    Expiry Date
                  </Label>
                  <Input
                    id="expiry"
                    type="text"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    placeholder="MM/YY"
                    className="bg-neutral-800 border-neutral-600 text-white placeholder:text-neutral-500"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cvv" className="text-sm font-medium text-neutral-300">
                    CVV
                  </Label>
                  <Input
                    id="cvv"
                    type="text"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="123"
                    className="bg-neutral-800 border-neutral-600 text-white placeholder:text-neutral-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-neutral-400">Monthly Subscription</span>
                <span className="text-lg font-bold text-white">$50.00</span>
              </div>
              <div className="text-xs text-neutral-500">
                • Full access to dedicated agents and operators<br />
                • Priority support and faster response times<br />
                • Advanced analytics and reporting<br />
                • Cancel anytime
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-transparent border-neutral-600 text-neutral-300 hover:bg-neutral-800"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay $50.00
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Create New Operator Modal Component
  function CreateNewOperatorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [operatorData, setOperatorData] = useState({
      name: "",
      email: "",
      avatar_url: "",
      status: "available",
      type_id: "",
      efficiency_rating: 1.0,
      capacity_override: null
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Handle operator creation logic here
      console.log("Creating operator:", operatorData);
      onClose();
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-neutral-800 border-neutral-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Create New Operator</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Add a new operator to your network
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Name</label>
              <Input
                value={operatorData.name}
                onChange={(e) => setOperatorData({...operatorData, name: e.target.value})}
                className="bg-neutral-700 border-neutral-600 text-white"
                placeholder="Operator name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Email</label>
              <Input
                type="email"
                value={operatorData.email}
                onChange={(e) => setOperatorData({...operatorData, email: e.target.value})}
                className="bg-neutral-700 border-neutral-600 text-white"
                placeholder="operator@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Avatar URL</label>
              <Input
                value={operatorData.avatar_url}
                onChange={(e) => setOperatorData({...operatorData, avatar_url: e.target.value})}
                className="bg-neutral-700 border-neutral-600 text-white"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Status</label>
              <Select value={operatorData.status} onValueChange={(value) => setOperatorData({...operatorData, status: value})}>
                <SelectTrigger className="bg-neutral-700 border-neutral-600 text-white">
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </SelectTrigger>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Operator Type</label>
              <Select value={operatorData.type_id} onValueChange={(value) => setOperatorData({...operatorData, type_id: value})}>
                <SelectTrigger className="bg-neutral-700 border-neutral-600 text-white">
                  <SelectContent>
                    <SelectItem value="web-developer">Web Developer</SelectItem>
                    <SelectItem value="creative-operator">Creative Operator</SelectItem>
                    <SelectItem value="property-manager">Property Manager</SelectItem>
                    <SelectItem value="driver-pilot">Driver / Pilot</SelectItem>
                    <SelectItem value="community-builder">Community Builder</SelectItem>
                  </SelectContent>
                </SelectTrigger>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">Efficiency Rating</label>
              <Input
                type="number"
                step="0.1"
                min="0.8"
                max="1.2"
                value={operatorData.efficiency_rating}
                onChange={(e) => setOperatorData({...operatorData, efficiency_rating: parseFloat(e.target.value)})}
                className="bg-neutral-700 border-neutral-600 text-white"
                placeholder="1.0"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white flex-1">
                Create Operator
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="border-neutral-600 text-white hover:bg-neutral-700 flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Toggle between subscription and revenue share modes
  const togglePaymentMode = () => {
    if (clientPlan.mode === "revenue_share") {
      // Show payment modal for subscription upgrade
      setShowPaymentModal(true);
    } else {
      // Switch back to revenue share (no payment needed)
      setClientPlan(prev => ({
        ...prev,
        mode: "revenue_share",
        subscription_active: false,
      }));
    }
  };

  // Handle subscription payment
  const handleSubscriptionPayment = async () => {
    setPaymentLoading(true);
    try {
      // TODO: Integrate with Stripe API
      // const response = await fetch('/api/stripe/create-checkout-session', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     priceId: 'price_subscription_monthly',
      //     successUrl: `${window.location.origin}/dashboard/client?success=true`,
      //     cancelUrl: `${window.location.origin}/dashboard/client?canceled=true`,
      //   }),
      // });
      // const { url } = await response.json();
      // window.location.href = url;

      // For now, simulate successful payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setClientPlan(prev => ({
        ...prev,
        mode: "subscription",
        subscription_active: true,
      }));
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

              // Update website name dynamically when clientWebsite changes
            useEffect(() => {
              if (!websiteLoading && clientWebsite) {
                setBusinessAssets(prev => prev.map(asset => 
                  asset.type === 'website' 
                    ? { ...asset, name: clientWebsite.name, status: clientWebsite.status }
                    : asset
                ));
              }
            }, [clientWebsite, websiteLoading]);

  // Calculate financial metrics
  const totalRevenue = businessAssets.reduce((sum, asset) => sum + asset.revenue, 0);
  const totalCommission = businessAssets.reduce((sum, asset) => sum + (asset.foot_traffic * 0.1), 0); // 10% of foot traffic as commission
  const revenueRemaining = clientPlan.revenue_share_threshold - revenueData.total_revenue;
  const systemsOnline = businessAssets.filter(asset => asset.is_active).length;
  const paymentsDue = businessAssets.filter(asset => asset.revenue > 0 && asset.foot_traffic > 0).length;

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-center">
          <div className="text-red-500 text-lg font-mono mb-4">ERROR LOADING DASHBOARD</div>
          <div className="text-neutral-400 text-sm font-mono">{error}</div>
        </div>
      </div>
    );
  }

  // Only render dashboard after data is loaded (client-only)
  if (loading || statsLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-neutral-400 text-lg font-mono">INITIALIZING DASHBOARD...</div>
      </div>
    );
  }

  const renderFinancialDashboard = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wider">TACTICAL ORDERS</h1>
          <p className="text-sm text-neutral-400">Financial systems and revenue management</p>
          {clientPlan.mode === "revenue_share" && (
            <Badge className="bg-orange-600 text-white mt-2">
              REV SHARE MODE ACTIVE
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={togglePaymentMode}
          >
            {clientPlan.mode === "subscription" ? "Switch to Rev Share" : "Switch to Subscription"}
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">Maintenance Mode</Button>
        </div>
      </div>

      {/* Financial Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">SYSTEMS ONLINE</p>
                <p className="text-2xl font-bold text-white font-mono">{systemsOnline}/{businessAssets.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">
                  {clientPlan.mode === "subscription" ? "MONTHLY REVENUE" : "REVENUE TO DATE"}
                </p>
                <p className="text-2xl font-bold text-green-500 font-mono">
                  ${revenueLoading ? "..." : (clientPlan.mode === "subscription" ? revenueData.monthly_revenue : revenueData.total_revenue).toLocaleString()}
                </p>
                {revenueData.last_payment_date && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Last: {new Date(revenueData.last_payment_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="bg-neutral-900 border-neutral-700 hover:border-orange-500/50 transition-colors cursor-pointer"
          onClick={() => clientPlan.mode === "revenue_share" && setShowCommissionModal(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">
                  {clientPlan.mode === "subscription" ? "SUBSCRIPTION" : "COMMISSION RATE"}
                </p>
                <p className="text-2xl font-bold text-orange-500 font-mono">
                  {clientPlan.mode === "subscription" ? "$50" : `${commissionRate.toFixed(1)}%`}
                </p>
              </div>
              <Percent className="w-8 h-8 text-orange-500" />
            </div>
            {clientPlan.mode === "revenue_share" && (
              <div className="text-xs text-neutral-500 mt-2">
                Click to adjust rate
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`${clientPlan.mode === "subscription" ? "bg-neutral-900 border-neutral-700" : "bg-neutral-900/50 border-neutral-700/50 backdrop-blur-sm"} transition-all duration-300`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-neutral-400 tracking-wider">
                  BALANCE
                </p>
                <p className={`text-2xl font-bold font-mono ${clientPlan.mode === "subscription" ? "text-yellow-500" : "text-neutral-500"}`}>
                  {clientPlan.mode === "subscription" ? `$${Math.max(50 - totalCommission, 0)}` : "LOCKED"}
                </p>
                {clientPlan.mode === "subscription" && (
                  <p className="text-xs text-neutral-500 mt-1">
                    ${totalCommission.toLocaleString()} used
                  </p>
                )}
              </div>
              <CreditCard className={`w-8 h-8 ${clientPlan.mode === "subscription" ? "text-yellow-500" : "text-neutral-500"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Share Threshold Progress (only in rev share mode and when client has revenue) */}
      {clientPlan.mode === "revenue_share" && revenueData.has_revenue && (
        <Card className="bg-neutral-900 border-neutral-700">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Quarterly Distribution Progress</h3>
                <Badge className="bg-blue-600 text-white">
                  ${revenueData.total_revenue.toLocaleString()} / ${clientPlan.revenue_share_threshold.toLocaleString()}
                </Badge>
              </div>
              <div className="w-full bg-neutral-700 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((revenueData.total_revenue / clientPlan.revenue_share_threshold) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-neutral-400">
                ${revenueRemaining.toLocaleString()} remaining until next quarterly distribution
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Blurred placeholder when no revenue yet */}
      {clientPlan.mode === "revenue_share" && !revenueData.has_revenue && (
        <Card className="bg-neutral-900/30 border-neutral-700/30 backdrop-blur-sm opacity-60">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white/60">Quarterly Distribution Progress</h3>
                <Badge className="bg-neutral-600 text-white/60">
                  $0 / ${clientPlan.revenue_share_threshold.toLocaleString()}
                </Badge>
              </div>
              <div className="w-full bg-neutral-700/50 rounded-full h-3">
                <div className="bg-neutral-500 h-3 rounded-full" style={{ width: '0%' }}></div>
              </div>
              <p className="text-sm text-neutral-500">
                Start earning to see your progress
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business Assets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {businessAssets.map((asset) => (
                      <Card
              key={asset.id}
              className={`${
                asset.is_active 
                  ? "bg-neutral-900 border-neutral-700 hover:border-orange-500/50" 
                  : "bg-neutral-900/30 border-neutral-700/30 backdrop-blur-sm opacity-60 hover:opacity-80"
              } transition-all duration-300 cursor-pointer relative group`}
              onClick={() => {
                if (asset.is_active && asset.type === 'website') {
                  setShowWebsiteModal(true);
                } else if (!asset.is_active) {
                  setShowNewMissionModal(true);
                }
              }}
            >
            {!asset.is_active && (
              <>
                {/* Large Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-lg">
                  <div className="text-center">
                    {asset.type === 'website' && <Globe className="w-24 h-24 text-orange-500/60 mx-auto mb-4" />}
                    {asset.type === 'app' && <Monitor className="w-24 h-24 text-blue-500/60 mx-auto mb-4" />}
                    {asset.type === 'business_plan' && <BarChart3 className="w-24 h-24 text-red-500/60 mx-auto mb-4" />}
                    {asset.type === 'real_estate' && <MapPin className="w-24 h-24 text-green-500/60 mx-auto mb-4" />}
                    {asset.type === 'transportation' && <Truck className="w-24 h-24 text-purple-500/60 mx-auto mb-4" />}
                    {asset.type === 'filing_system' && <FileText className="w-24 h-24 text-yellow-500/60 mx-auto mb-4" />}
                    <p className="text-sm text-neutral-400 font-mono">INACTIVE</p>
                  </div>
                </div>
                
                {/* Hover Button */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    New Mission
                  </Button>
                </div>
              </>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {asset.type === 'website' && <Globe className="w-6 h-6 text-orange-500" />}
                  {asset.type === 'app' && <Monitor className="w-6 h-6 text-blue-500" />}
                  {asset.type === 'business_plan' && <BarChart3 className="w-6 h-6 text-red-500" />}
                  {asset.type === 'real_estate' && <MapPin className="w-6 h-6 text-green-500" />}
                  {asset.type === 'transportation' && <Truck className="w-6 h-6 text-purple-500" />}
                  {asset.type === 'filing_system' && <FileText className="w-6 h-6 text-yellow-500" />}
                  <div>
                    <CardTitle className={`text-sm font-bold tracking-wider ${asset.is_active ? 'text-white' : 'text-neutral-400'}`}>
                      {asset.name}
                    </CardTitle>
                    <p className="text-xs text-neutral-400">{asset.type.replace('_', ' ').toUpperCase()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {asset.is_active ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-neutral-500" />
                  )}
                  <Badge className={
                    asset.is_active 
                      ? (asset.status === 'live' ? 'bg-green-600' : 'bg-yellow-600')
                      : 'bg-neutral-600'
                  }>
                    {asset.is_active ? asset.status.toUpperCase() : 'INACTIVE'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">REVENUE HEALTH</span>
                <span className={`text-sm font-bold font-mono ${asset.revenue > 0 ? 'text-green-500' : 'text-neutral-400'}`}>
                  ${asset.revenue.toLocaleString()}
                </span>
              </div>
              <Progress value={asset.revenue_health} className="h-2" />

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-neutral-400 mb-1">REVENUE</div>
                  <div className="text-white font-mono">${asset.revenue}</div>
                </div>
                <div>
                  <div className="text-neutral-400 mb-1">FOOT TRAFFIC</div>
                  <div className="text-white font-mono">{asset.foot_traffic.toLocaleString()}</div>
                </div>
              </div>

              {clientPlan.mode === "revenue_share" && asset.ownership && asset.is_active && (
                <div className="border-t border-neutral-700 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">NETWORK OWNERSHIP</span>
                    <span className="text-orange-500 font-mono">{asset.ownership}</span>
                  </div>
                </div>
              )}

              <div className="w-full bg-neutral-800 rounded-full h-1">
                <div
                  className="bg-green-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${asset.revenue_health}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-neutral-900">
      {/* Sidebar */}
      <div
        className={`${sidebarCollapsed ? "w-16" : "w-70"} bg-neutral-900 border-r border-neutral-700 transition-all duration-300 fixed md:relative z-50 md:z-auto h-full md:h-auto ${!sidebarCollapsed ? "md:block" : ""}`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            <div className={`${sidebarCollapsed ? "hidden" : "block"}`}>
              <h1 className="text-orange-500 font-bold text-lg tracking-wider font-mono">READY AIM GO</h1>
              <p className="text-neutral-500 text-xs font-mono">v2.1.7 CLASSIFIED</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-neutral-400 hover:text-orange-500"
            >
              <ChevronRight
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${sidebarCollapsed ? "" : "rotate-180"}`}
              />
            </Button>
          </div>

          <nav className="space-y-2">
            {[
              { id: "overview", icon: Monitor, label: "COMMAND CENTER" },
              { id: "projects", icon: Target, label: "MISSIONS" },
              { id: "roles", icon: Users, label: "AGENT NETWORK", disabled: clientPlan.mode === "revenue_share" },
              { id: "operators", icon: Shield, label: "OPERATORS", disabled: clientPlan.mode === "revenue_share" },
              { id: "marketplace", icon: TrendingUp, label: "MARKETPLACE" },
              { id: "financial", icon: DollarSign, label: "TACTICAL ORDERS" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => !item.disabled && setActiveSection(item.id)}
                disabled={item.disabled}
                className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${
                  activeSection === item.id
                    ? "bg-orange-500 text-white"
                    : item.disabled
                    ? "text-neutral-600 cursor-not-allowed opacity-50"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <item.icon className="w-5 h-5 md:w-5 md:h-5 sm:w-6 sm:h-6" />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium font-mono">
                    {item.label}
                    {item.disabled && " (LOCKED)"}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <div className="mt-8 p-4 bg-neutral-800 border border-neutral-700 rounded">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-white font-mono">SYSTEM ONLINE</span>
              </div>
              <div className="text-xs text-neutral-500 font-mono">
                <div>UPTIME: 72:14:33</div>
                <div>AGENTS: {stats.activeProjects} ACTIVE</div>
                <div>MISSIONS: {stats.completedProjects} ONGOING</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {!sidebarCollapsed && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarCollapsed(true)} />
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${!sidebarCollapsed ? "md:ml-0" : ""}`}>
        {/* Top Toolbar */}
        <div className="h-16 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="text-sm text-neutral-400 font-mono">
              TACTICAL COMMAND / <span className="text-orange-500">{session?.full_name?.toUpperCase() || session?.email?.toUpperCase() || 'AGENT'}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-neutral-500 font-mono">LAST UPDATE: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UTC</div>
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-orange-500">
              <Bell className="w-4 h-4" />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-orange-500">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto">
                  <Avatar>
                    <AvatarImage src={session?.avatar_url || "/placeholder.svg"} alt="Client avatar" />
                    <AvatarFallback className="bg-neutral-700 text-neutral-300">
                      {session?.full_name ? session.full_name.split(" ").map((n: string) => n[0]).join("") : "C"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-neutral-800 border-neutral-700">
                <DropdownMenuItem className="text-neutral-300 hover:bg-neutral-700">
                  <User className="h-4 w-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-neutral-300 hover:bg-neutral-700">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing & Payments
                </DropdownMenuItem>
                <DropdownMenuItem className="text-neutral-300 hover:bg-neutral-700">
                  <Globe className="h-4 w-4 mr-2" />
                  My Websites
                </DropdownMenuItem>
                <DropdownMenuItem className="text-neutral-300 hover:bg-neutral-700">
                  <FileText className="h-4 w-4 mr-2" />
                  Documents
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-neutral-700" />
                <DropdownMenuItem className="text-neutral-300 hover:bg-neutral-700" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto">
          {activeSection === "overview" && renderOverview()}
          {activeSection === "projects" && renderProjects()}
          {activeSection === "roles" && renderAgentNetwork()}
          {activeSection === "operators" && renderOperators()}
          {activeSection === "marketplace" && (
            <div className="p-6">
              <Card className="bg-neutral-800 border-neutral-700">
                <CardHeader>
                  <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">MARKETPLACE</CardTitle>
                  <CardDescription className="text-neutral-400">Discover and purchase creative services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-neutral-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                    <p className="font-mono">Marketplace interface would be implemented here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {activeSection === "financial" && renderFinancialDashboard()}
        </div>
      </div>

      {/* New Project Modal */}
      <NewProjectModal open={showNewProjectModal} onOpenChange={setShowNewProjectModal} />
      {/* New Mission Modal */}
      <NewMissionModal open={showNewMissionModal} onClose={() => setShowNewMissionModal(false)} />
      {/* Create New Operator Modal */}
      <CreateNewOperatorModal open={showNewOperatorModal} onClose={() => setShowNewOperatorModal(false)} />
      {/* Subscription Payment Modal */}
      <SubscriptionPaymentModal 
        open={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)}
        onPayment={handleSubscriptionPayment}
        loading={paymentLoading}
      />
      
      {/* Commission Rate Modal */}
      <CommissionRateModal
        open={showCommissionModal}
        onClose={() => setShowCommissionModal(false)}
        currentRate={commissionRate}
        onRateChange={updateCommissionRate}
      />
      
      {/* Website Card Modal */}
      <WebsiteCardModal
        open={showWebsiteModal}
        onClose={() => setShowWebsiteModal(false)}
        websiteInfo={{
          name: clientWebsite?.name || "Website",
          url: clientWebsite?.url || "#",
          status: clientWebsite?.status || "active",
          adminUrl: clientWebsite?.url ? `${clientWebsite.url}/admin` : undefined,
          techStack: clientWebsite?.techStack || ["React", "Next.js", "TypeScript", "Tailwind CSS", "Supabase"],
          githubRepo: clientWebsite?.githubRepo || "https://github.com/client/website",
          traffic: {
            monthlyVisitors: 15000,
            growthRate: 12,
            topSources: ["Google", "Direct", "Social Media"]
          },
          performance: {
            loadTime: 1.2,
            uptime: 99.8,
            seoScore: 85
          },
          revenue: {
            current: revenueData.total_revenue,
            previous: revenueData.total_revenue * 0.9,
            growth: 10
          }
        }}
        clientPlan={clientPlan}
      />
    </div>
  );
}

export default function ClientDashboard() {
  // Ensure dashboard is only rendered on the client
  return (
    <ClientDashboardContent />
  );
}
