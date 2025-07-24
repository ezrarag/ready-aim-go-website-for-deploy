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
} from "lucide-react"
import { NewProjectModal } from "@/components/new-project-modal"
import { RolesManager } from "@/components/roles-manager"
import { MockUserProvider, useMockUser } from "@/components/MockUserProvider";
import { supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";

function ClientDashboardContent() {
  const { mockUserId, userData, toggleUser, currentUser, loading } = useMockUser();
  const [activeTab, setActiveTab] = useState("overview");
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 text-lg">Loading dashboard...</div>
      </div>
    );
  }

  const stats = userData.stats;
  const recentProjects = userData.projects.slice(0, 3); // Show 3 most recent
  const activity = userData.activity;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "review":
        return "bg-yellow-100 text-yellow-800"
      case "open":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">ReadyAimGo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={toggleUser}>
                Switch User ({currentUser.name})
              </Button>
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button onClick={() => setShowNewProjectModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
              <Avatar>
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>{(() => { const parts: string[] = currentUser.name.split(" "); return parts.map((n: string) => n[0]).join(""); })()}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {userData.name}!</h2>
          <p className="text-gray-600">Here's what's happening with your creative projects.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Projects</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeProjects}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.completedProjects}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invested</p>
                  <p className="text-3xl font-bold text-gray-900">${stats.totalSpent.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.averageRating}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Star className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="operators">Operators</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="todos">TODOs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Projects */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Projects</CardTitle>
                  <CardDescription>Your latest creative projects and their progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentProjects.map((project) => (
                      <div key={project.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-gray-900">{project.title}</h4>
                            <Badge className={getStatusColor(project.status)}>
                              {getStatusIcon(project.status)}
                              <span className="ml-1 capitalize">{project.status.replace("-", " ")}</span>
                            </Badge>
                          </div>

                          {project.operator && (
                            <div className="flex items-center space-x-2 mb-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={project.operator.avatar || "/placeholder.svg"} />
                                <AvatarFallback>
                                  {project.operator.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-600">{project.operator.name}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex-1 mr-4">
                              <Progress value={project.progress} className="h-2" />
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>{project.progress}% complete</span>
                                <span>Due {project.deadline}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                ${project.budget.toLocaleString()}
                              </div>
                            </div>
                          </div>
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
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      className="h-20 flex-col space-y-2"
                      variant="outline"
                      onClick={() => setShowNewProjectModal(true)}
                    >
                      <Plus className="h-6 w-6" />
                      <span>New Project</span>
                    </Button>
                    <Button className="h-20 flex-col space-y-2" variant="outline">
                      <Search className="h-6 w-6" />
                      <span>Find Operators</span>
                    </Button>
                    <Button className="h-20 flex-col space-y-2" variant="outline">
                      <TrendingUp className="h-6 w-6" />
                      <span>View Analytics</span>
                    </Button>
                    <Button className="h-20 flex-col space-y-2" variant="outline">
                      <Star className="h-6 w-6" />
                      <span>Rate Work</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from your projects and operators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activity.length === 0 ? (
                    <div className="text-gray-500 text-sm">No recent activity.</div>
                  ) : (
                    activity.map((item) => (
                      <div key={item.id} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{item.action}</span>
                            {item.project_title && (
                              <span> on <span className="font-semibold">{item.project_title}</span></span>
                            )}
                            {item.details && <span>: {item.details}</span>}
                          </p>
                          <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <CardTitle>All Projects</CardTitle>
                <CardDescription>Manage and track all your creative projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search projects..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                  <Button onClick={() => setShowNewProjectModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </div>

                <div className="text-center py-12 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4" />
                  <p>Project management interface would be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles">
            <RolesManager />
          </TabsContent>

          <TabsContent value="operators">
            <Card>
              <CardHeader>
                <CardTitle>Your Operators</CardTitle>
                <CardDescription>Manage relationships with your creative operators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>Operator management interface would be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="marketplace">
            <Card>
              <CardHeader>
                <CardTitle>Marketplace</CardTitle>
                <CardDescription>Discover and purchase creative services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                  <p>Marketplace interface would be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="todos">
            <Card>
              <CardHeader>
                <CardTitle>Your TODOs</CardTitle>
                <CardDescription>Tasks and requests for your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <span>{statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : "All Statuses"}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {todos.length === 0 ? (
                  <div className="text-gray-500">No TODOs found.</div>
                ) : (
                  <ul className="space-y-2">
                    {todos.map((todo) => (
                      <li key={todo.id} className="flex items-center gap-4 border-b py-2">
                        {editingTodo === todo.id ? (
                          <>
                            <Input
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={() => handleEditSave(todo)}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingTodo(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 cursor-pointer" onClick={() => handleEdit(todo)}>{todo.title}</span>
                            <Select
                              value={todo.status}
                              onValueChange={val => handleStatusChange(todo, val)}
                            >
                              <SelectTrigger className="w-36">
                                <span>{todo.status.charAt(0).toUpperCase() + todo.status.slice(1)}</span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(todo)}>Edit</Button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
