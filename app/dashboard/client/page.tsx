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
} from "lucide-react"
import { NewProjectModal } from "@/components/new-project-modal"
import { RolesManager } from "@/components/roles-manager"
import { MockUserProvider, useMockUser } from "@/components/MockUserProvider";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ui/theme-toggle";

function ClientDashboardContent() {
  const { mockUserId, userData, toggleUser, currentUser, loading } = useMockUser();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [todos, setTodos] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");

  useEffect(() => {
    if (!userData) return;
    async function fetchTodos() {
      if (!userData) return;
      const clientId = (userData as any).id || userData.email;
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
  }, [userData, statusFilter]);

  const handleEdit = (todo: any) => {
    setEditingTodo(todo.id);
    setEditText(todo.title);
  };

  const handleEditSave = async (todo: any) => {
    await supabase.from('client_todos').update({ title: editText }).eq('id', todo.id);
    setEditingTodo(null);
    setEditText("");
    // Refresh todos
    if (!userData) return;
    const clientId = (userData as any).id || userData.email;
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
    if (!userData) return;
    const clientId = (userData as any).id || userData.email;
    let query = supabase
      .from('client_todos')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (statusFilter) query = query.eq('status', statusFilter);
    const { data } = await query;
    if (data) setTodos(data);
  };

  // Only render dashboard after data is loaded (client-only)
  if (loading || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-neutral-400 text-lg font-mono">INITIALIZING DASHBOARD...</div>
      </div>
    );
  }

  const stats = userData.stats;
  const recentProjects = userData.projects.slice(0, 3);
  const activity = userData.activity;

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
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
              {activity.slice(0, 4).map((item, index) => (
                <div key={item.id} className="relative">
                  <div className="text-xs text-neutral-500 font-mono">
                    {new Date(item.created_at).toLocaleDateString('en-GB')} {new Date(item.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-sm text-neutral-300">
                    <span className="text-orange-500 font-mono">Agent {item.action}</span>
                    {item.project_title && (
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
            <div className="text-green-500">> [AGT:{currentUser.name.replace(' ', '').toLowerCase()}] ::: INIT >></div>
            <div className="text-neutral-400">^^^ loading secure channel</div>
            <div className="text-blue-500">> CH#2 | {Math.random().toString().slice(2, 15)} ...xR3</div>
            <div className="text-green-500">> KEY LOCKED</div>
            <div className="text-neutral-300">> MSG >> "...mission override initiated ... awaiting delta node clearance"</div>
          </div>
        </CardContent>
      </Card>

      {/* Mission Activity Overview */}
      <Card className="bg-neutral-800 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">MISSION ACTIVITY OVERVIEW</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-end justify-between gap-1">
            {[65, 78, 82, 75, 88, 92, 85, 90].map((value, index) => (
              <div key={index} className="flex-1 bg-orange-500" style={{ height: `${value}%` }}></div>
            ))}
          </div>
          <div className="mt-4 text-xs text-neutral-400 font-mono">
            <div className="flex justify-between">
              <span>300</span>
              <span>400</span>
              <span>500</span>
            </div>
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

      {/* Quick Actions */}
      <Card className="bg-neutral-800 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">QUICK ACTIONS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="h-16 flex-col space-y-2 bg-neutral-700 hover:bg-neutral-600 border-neutral-600"
              variant="outline"
              onClick={() => setShowNewProjectModal(true)}
            >
              <Plus className="h-5 w-5 text-orange-500" />
              <span className="text-xs font-mono text-neutral-300">NEW MISSION</span>
            </Button>
            <Button className="h-16 flex-col space-y-2 bg-neutral-700 hover:bg-neutral-600 border-neutral-600" variant="outline">
              <Search className="h-5 w-5 text-orange-500" />
              <span className="text-xs font-mono text-neutral-300">FIND AGENTS</span>
            </Button>
            <Button className="h-16 flex-col space-y-2 bg-neutral-700 hover:bg-neutral-600 border-neutral-600" variant="outline">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <span className="text-xs font-mono text-neutral-300">ANALYTICS</span>
            </Button>
            <Button className="h-16 flex-col space-y-2 bg-neutral-700 hover:bg-neutral-600 border-neutral-600" variant="outline">
              <Star className="h-5 w-5 text-orange-500" />
              <span className="text-xs font-mono text-neutral-300">RATE WORK</span>
            </Button>
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
            <Button onClick={() => setShowNewProjectModal(true)} className="bg-orange-600 hover:bg-orange-700">
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
    <div className="p-6">
      <Card className="bg-neutral-800 border-neutral-700">
        <CardHeader>
          <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">TACTICAL ORDERS</CardTitle>
          <CardDescription className="text-neutral-400">Tasks and requests for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-neutral-700 border-neutral-600 text-neutral-300">
                <span>{statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : "All Statuses"}</span>
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-neutral-700">
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {todos.length === 0 ? (
            <div className="text-neutral-500 font-mono">No tactical orders found.</div>
          ) : (
            <ul className="space-y-2">
              {todos.map((todo) => (
                <li key={todo.id} className="flex items-center gap-4 border-b border-neutral-700 py-2">
                  {editingTodo === todo.id ? (
                    <>
                      <Input
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="flex-1 bg-neutral-700 border-neutral-600 text-neutral-300"
                      />
                      <Button size="sm" onClick={() => handleEditSave(todo)} className="bg-orange-600 hover:bg-orange-700">Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingTodo(null)} className="bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600">Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 cursor-pointer text-neutral-300 font-mono" onClick={() => handleEdit(todo)}>{todo.title}</span>
                      <Select
                        value={todo.status}
                        onValueChange={val => handleStatusChange(todo, val)}
                      >
                        <SelectTrigger className="w-36 bg-neutral-700 border-neutral-600 text-neutral-300">
                          <span>{todo.status.charAt(0).toUpperCase() + todo.status.slice(1)}</span>
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-neutral-700">
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(todo)} className="bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600">Edit</Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
              { id: "roles", icon: Users, label: "AGENT NETWORK" },
              { id: "operators", icon: Shield, label: "OPERATORS" },
              { id: "marketplace", icon: TrendingUp, label: "MARKETPLACE" },
              { id: "todos", icon: Activity, label: "TACTICAL ORDERS" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded transition-colors ${
                  activeSection === item.id
                    ? "bg-orange-500 text-white"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                <item.icon className="w-5 h-5 md:w-5 md:h-5 sm:w-6 sm:h-6" />
                {!sidebarCollapsed && <span className="text-sm font-medium font-mono">{item.label}</span>}
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
              TACTICAL COMMAND / <span className="text-orange-500">{activeSection.toUpperCase()}</span>
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
            <Button variant="outline" size="sm" onClick={toggleUser} className="bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600">
              Switch User ({currentUser.name})
            </Button>
            <Avatar>
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-neutral-700 text-neutral-300">
                {(() => { const parts: string[] = currentUser.name.split(" "); return parts.map((n: string) => n[0]).join(""); })()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto">
          {activeSection === "overview" && renderOverview()}
          {activeSection === "projects" && renderProjects()}
          {activeSection === "roles" && <div className="p-6"><RolesManager /></div>}
          {activeSection === "operators" && (
            <div className="p-6">
              <Card className="bg-neutral-800 border-neutral-700">
                <CardHeader>
                  <CardTitle className="text-orange-500 font-mono text-sm tracking-wider">YOUR OPERATORS</CardTitle>
                  <CardDescription className="text-neutral-400">Manage relationships with your creative operators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-neutral-500">
                    <Users className="h-12 w-12 mx-auto mb-4" />
                    <p className="font-mono">Operator management interface would be implemented here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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
          {activeSection === "todos" && renderTodos()}
        </div>
      </div>

      {/* New Project Modal */}
      <NewProjectModal open={showNewProjectModal} onOpenChange={setShowNewProjectModal} />
    </div>
  );
}

export default function ClientDashboard() {
  // Ensure dashboard is only rendered on the client
  return (
    <MockUserProvider>
      <ClientDashboardContent />
    </MockUserProvider>
  );
}
