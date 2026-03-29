"use client";

import { useState, useEffect } from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/notification-context';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Users,
  FolderKanban,
  Bell,
  TrendingUp,
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard-layout';
import { AdminMetricTile, AdminPanel } from '@/components/admin/admin-panel';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  status: 'active' | 'on-hold' | 'completed' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  status: 'active' | 'inactive' | 'onboarding';
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  projectId?: string;
  clientId?: string;
  status: 'todo' | 'in-progress' | 'blocked' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const { addNotification } = useNotifications();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Project form state
  const [projectForm, setProjectForm] = useState({
    name: '',
    clientId: '',
    status: 'pending' as Project['status'],
    priority: 'medium' as Project['priority'],
    description: '',
    dueDate: '',
  });

  // Client form state
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    status: 'onboarding' as Client['status'],
  });

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    projectId: '',
    clientId: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    dueDate: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  // Check for urgent/overdue tasks and send notifications
  useEffect(() => {
    const checkUrgentTasks = () => {
      const urgent = tasks.filter(t => 
        t.priority === 'urgent' && t.status !== 'completed'
      );
      const overdue = tasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
      );

      if (urgent.length > 0) {
        addNotification({
          title: `${urgent.length} Urgent Task${urgent.length > 1 ? 's' : ''} Need Attention`,
          description: `You have ${urgent.length} urgent task${urgent.length > 1 ? 's' : ''} that require immediate action.`,
          type: 'warning',
          category: 'projects',
          read: false,
          timestamp: new Date(),
        });
      }

      if (overdue.length > 0) {
        addNotification({
          title: `${overdue.length} Overdue Task${overdue.length > 1 ? 's' : ''}`,
          description: `You have ${overdue.length} task${overdue.length > 1 ? 's' : ''} that ${overdue.length > 1 ? 'are' : 'is'} past due date.`,
          type: 'error',
          category: 'projects',
          read: false,
          timestamp: new Date(),
        });
      }
    };

    if (tasks.length > 0) {
      checkUrgentTasks();
      // Check every 5 minutes
      const interval = setInterval(checkUrgentTasks, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [tasks, addNotification]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load clients from Firebase
      try {
        const clientsResponse = await fetch('/api/clients');
        if (clientsResponse.ok) {
          const payload = await clientsResponse.json();
          if (payload?.success && Array.isArray(payload.clients)) {
            // Map ClientDirectoryEntry to Client interface
            const mappedClients: Client[] = payload.clients.map((client: any) => ({
              id: client.id,
              name: client.name,
              email: client.email || undefined, // ClientDirectoryEntry doesn't have email, but we'll keep it optional
              status: client.status || 'onboarding',
              createdAt: client.lastActivity || new Date().toISOString(),
            }));
            setClients(mappedClients);
          }
        }
      } catch (clientError) {
        console.error('Error loading clients from Firebase:', clientError);
        toast.error('Failed to load clients from Firebase');
      }

      // Load projects and tasks from localStorage (these are admin-specific, not in Firebase)
      const savedProjects = localStorage.getItem('admin_projects');
      const savedTasks = localStorage.getItem('admin_tasks');

      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem('admin_projects', JSON.stringify(newProjects));
  };

  const saveClients = (newClients: Client[]) => {
    setClients(newClients);
    // Note: Clients are now managed in Firebase, but we keep local state for admin dashboard
    // In the future, client updates should go through the Firebase API
  };

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('admin_tasks', JSON.stringify(newTasks));
  };

  const handleSaveProject = () => {
    if (!projectForm.name || !projectForm.clientId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const client = clients.find(c => c.id === projectForm.clientId);
    const projectData: Project = {
      id: editingProject?.id || `project-${Date.now()}`,
      name: projectForm.name,
      clientId: projectForm.clientId,
      clientName: client?.name || '',
      status: projectForm.status,
      priority: projectForm.priority,
      description: projectForm.description,
      dueDate: projectForm.dueDate || undefined,
      createdAt: editingProject?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingProject) {
      const updated = projects.map(p => p.id === editingProject.id ? projectData : p);
      saveProjects(updated);
      toast.success('Project updated');
    } else {
      saveProjects([...projects, projectData]);
      toast.success('Project created');
    }

    resetProjectForm();
    setProjectDialogOpen(false);
  };

  const handleSaveClient = async () => {
    if (!clientForm.name) {
      toast.error('Please enter a client name');
      return;
    }

    // Note: Client creation/updates should go through Firebase API
    // For now, we'll update local state and refresh from Firebase
    const clientData: Client = {
      id: editingClient?.id || `client-${Date.now()}`,
      name: clientForm.name,
      email: clientForm.email || undefined,
      status: clientForm.status,
      createdAt: editingClient?.createdAt || new Date().toISOString(),
    };

    if (editingClient) {
      // Update local state temporarily
      const updated = clients.map(c => c.id === editingClient.id ? clientData : c);
      setClients(updated);
      toast.success('Client updated (local only - use clients page for Firebase updates)');
    } else {
      // Add to local state temporarily
      setClients([...clients, clientData]);
      toast.success('Client added (local only - use clients page to add to Firebase)');
    }

    resetClientForm();
    setClientDialogOpen(false);
    
    // Refresh clients from Firebase to get the latest data
    // Note: This won't include the newly added client if it wasn't added via Firebase API
    setTimeout(() => {
      loadData();
    }, 500);
  };

  const handleSaveTask = () => {
    if (!taskForm.title) {
      toast.error('Please enter a task title');
      return;
    }

    const taskData: Task = {
      id: editingTask?.id || `task-${Date.now()}`,
      title: taskForm.title,
      projectId: taskForm.projectId || undefined,
      clientId: taskForm.clientId || undefined,
      status: taskForm.status,
      priority: taskForm.priority,
      dueDate: taskForm.dueDate || undefined,
      notes: taskForm.notes || undefined,
      createdAt: editingTask?.createdAt || new Date().toISOString(),
    };

    if (editingTask) {
      const updated = tasks.map(t => t.id === editingTask.id ? taskData : t);
      saveTasks(updated);
      toast.success('Task updated');
    } else {
      saveTasks([...tasks, taskData]);
      toast.success('Task created');
    }

    resetTaskForm();
    setTaskDialogOpen(false);
  };

  const resetProjectForm = () => {
    setProjectForm({
      name: '',
      clientId: '',
      status: 'pending',
      priority: 'medium',
      description: '',
      dueDate: '',
    });
    setEditingProject(null);
  };

  const resetClientForm = () => {
    setClientForm({
      name: '',
      email: '',
      status: 'onboarding',
    });
    setEditingClient(null);
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      projectId: '',
      clientId: '',
      status: 'todo',
      priority: 'medium',
      dueDate: '',
      notes: '',
    });
    setEditingTask(null);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      clientId: project.clientId,
      status: project.status,
      priority: project.priority,
      description: project.description,
      dueDate: project.dueDate || '',
    });
    setProjectDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      email: client.email || '',
      status: client.status,
    });
    setClientDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      projectId: task.projectId || '',
      clientId: task.clientId || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || '',
      notes: task.notes || '',
    });
    setTaskDialogOpen(true);
  };

  const handleDeleteProject = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      saveProjects(projects.filter(p => p.id !== id));
      toast.success('Project deleted');
    }
  };

  const handleDeleteClient = (id: string) => {
    if (confirm('Are you sure you want to delete this client? Note: This only removes it from the admin dashboard view. To delete from Firebase, use the clients management page.')) {
      // Note: Clients are managed in Firebase, so we only update local state here
      // In production, you'd want to call a DELETE API endpoint
      setClients(clients.filter(c => c.id !== id));
      // Also delete related projects and tasks
      saveProjects(projects.filter(p => p.clientId !== id));
      saveTasks(tasks.filter(t => t.clientId !== id));
      toast.success('Client removed from admin dashboard view');
    }
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      saveTasks(tasks.filter(t => t.id !== id));
      toast.success('Task deleted');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'border border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200';
      case 'on-hold':
      case 'blocked':
        return 'border border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-200';
      case 'pending':
      case 'todo':
        return 'border border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200';
      case 'inactive':
        return 'border border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200';
      case 'in-progress':
        return 'border border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-500/20 dark:bg-violet-500/15 dark:text-violet-200';
      default:
        return 'border border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border border-red-300 bg-red-100 text-red-900 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-200';
      case 'high':
        return 'border border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-500/20 dark:bg-orange-500/15 dark:text-orange-200';
      case 'medium':
        return 'border border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-200';
      case 'low':
        return 'border border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200';
      default:
        return 'border border-zinc-300 bg-zinc-100 text-zinc-900 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'on-hold':
      case 'blocked':
        return <AlertCircle className="h-4 w-4" />;
      case 'pending':
      case 'todo':
        return <Clock className="h-4 w-4" />;
      case 'in-progress':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const urgentTasks = tasks.filter(t => 
    t.priority === 'urgent' && t.status !== 'completed'
  );
  const overdueTasks = tasks.filter(t => 
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center bg-background">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
            <p className="font-medium text-muted-foreground">Loading...</p>
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
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="mt-1 text-muted-foreground">Manage projects, clients, and track your work status</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={clientDialogOpen} onOpenChange={(open) => {
              setClientDialogOpen(open);
              if (!open) resetClientForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setClientDialogOpen(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
                  <DialogDescription>
                    Enter client information below
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="client-name">Client Name *</Label>
                    <Input
                      id="client-name"
                      value={clientForm.name}
                      onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                      placeholder="Enter client name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client-email">Email</Label>
                    <Input
                      id="client-email"
                      type="email"
                      value={clientForm.email}
                      onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client-status">Status</Label>
                    <Select
                      value={clientForm.status}
                      onValueChange={(value: Client['status']) => setClientForm({ ...clientForm, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSaveClient} className="w-full">
                    {editingClient ? 'Update Client' : 'Create Client'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={projectDialogOpen} onOpenChange={(open) => {
              setProjectDialogOpen(open);
              if (!open) resetProjectForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setProjectDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
                  <DialogDescription>
                    Create a new project and link it to a client
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="project-name">Project Name *</Label>
                    <Input
                      id="project-name"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-client">Client *</Label>
                    <Select
                      value={projectForm.clientId}
                      onValueChange={(value) => setProjectForm({ ...projectForm, clientId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="project-status">Status</Label>
                      <Select
                        value={projectForm.status}
                        onValueChange={(value: Project['status']) => setProjectForm({ ...projectForm, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="on-hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="project-priority">Priority</Label>
                      <Select
                        value={projectForm.priority}
                        onValueChange={(value: Project['priority']) => setProjectForm({ ...projectForm, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="project-due-date">Due Date</Label>
                    <Input
                      id="project-due-date"
                      type="date"
                      value={projectForm.dueDate}
                      onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-description">Description</Label>
                    <Textarea
                      id="project-description"
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                      placeholder="Enter project description"
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleSaveProject} className="w-full">
                    {editingProject ? 'Update Project' : 'Create Project'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <AdminMetricTile
            className="transition-shadow hover:shadow-lg"
            label="Total Clients"
            value={clients.length}
            valueClassName="text-2xl font-bold"
            trailing={<Users className="h-8 w-8 text-orange-500 dark:text-orange-400" />}
          />
          <AdminMetricTile
            className="transition-shadow hover:shadow-lg"
            label="Active Projects"
            value={projects.filter(p => p.status === 'active').length}
            valueClassName="text-2xl font-bold"
            trailing={<FolderKanban className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />}
          />
          <AdminMetricTile
            className="transition-shadow hover:shadow-lg"
            label="Urgent Tasks"
            value={urgentTasks.length}
            valueClassName="text-2xl font-bold"
            trailing={<Bell className="h-8 w-8 text-red-500 dark:text-red-400" />}
          />
          <AdminMetricTile
            className="transition-shadow hover:shadow-lg"
            label="Overdue Tasks"
            value={overdueTasks.length}
            valueClassName="text-2xl font-bold"
            trailing={<AlertCircle className="h-8 w-8 text-amber-500 dark:text-amber-400" />}
          />
        </div>

        {/* Tasks Section */}
        <AdminPanel className="overflow-hidden">
          <CardHeader className="border-b border-border/70 bg-muted/40 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Tasks & To-Dos</CardTitle>
                <CardDescription className="text-muted-foreground">Track what needs to be done</CardDescription>
              </div>
              <Dialog open={taskDialogOpen} onOpenChange={(open) => {
                setTaskDialogOpen(open);
                if (!open) resetTaskForm();
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setTaskDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                    <DialogDescription>
                      Create a task to track work items
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="task-title">Task Title *</Label>
                      <Input
                        id="task-title"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        placeholder="Enter task title"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="task-project">Project (Optional)</Label>
                        <Select
                          value={taskForm.projectId || "none"}
                          onValueChange={(value) => setTaskForm({ ...taskForm, projectId: value === "none" ? "" : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="task-client">Client (Optional)</Label>
                        <Select
                          value={taskForm.clientId || "none"}
                          onValueChange={(value) => setTaskForm({ ...taskForm, clientId: value === "none" ? "" : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="task-status">Status</Label>
                        <Select
                          value={taskForm.status}
                          onValueChange={(value: Task['status']) => setTaskForm({ ...taskForm, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="task-priority">Priority</Label>
                        <Select
                          value={taskForm.priority}
                          onValueChange={(value: Task['priority']) => setTaskForm({ ...taskForm, priority: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="task-due-date">Due Date</Label>
                      <Input
                        id="task-due-date"
                        type="date"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="task-notes">Notes</Label>
                      <Textarea
                        id="task-notes"
                        value={taskForm.notes}
                        onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                        placeholder="Add notes or details"
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleSaveTask} className="w-full">
                      {editingTask ? 'Update Task' : 'Create Task'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="admin-table-head hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Title</TableHead>
                  <TableHead className="font-semibold text-foreground">Project</TableHead>
                  <TableHead className="font-semibold text-foreground">Client</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground">Priority</TableHead>
                  <TableHead className="font-semibold text-foreground">Due Date</TableHead>
                  <TableHead className="font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="admin-table-empty py-8 text-center text-muted-foreground">
                      No tasks yet. Create your first task to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => {
                    const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
                    const client = task.clientId ? clients.find(c => c.id === task.clientId) : null;
                    return (
                      <TableRow key={task.id} className="admin-table-row">
                        <TableCell className="font-medium text-foreground">{task.title}</TableCell>
                        <TableCell className="text-muted-foreground">{project?.name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{client?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(task.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(task.status)}
                              {task.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                              className="hover:bg-muted/60 dark:hover:bg-white/[0.05]"
                            >
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTask(task.id)}
                              className="hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </AdminPanel>

        {/* Projects Section */}
        <AdminPanel className="overflow-hidden">
          <CardHeader className="border-b border-border/70 bg-muted/40 dark:bg-white/[0.03]">
            <CardTitle className="text-foreground">Projects</CardTitle>
            <CardDescription className="text-muted-foreground">Manage all your active projects</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="admin-table-head hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Project Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Client</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground">Priority</TableHead>
                  <TableHead className="font-semibold text-foreground">Due Date</TableHead>
                  <TableHead className="font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="admin-table-empty py-8 text-center text-muted-foreground">
                      No projects yet. Create your first project to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <TableRow key={project.id} className="admin-table-row">
                      <TableCell className="font-medium text-foreground">{project.name}</TableCell>
                      <TableCell className="text-muted-foreground">{project.clientName}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(project.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(project.status)}
                            {project.status}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(project.priority)}>
                          {project.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProject(project)}
                            className="hover:bg-muted/60 dark:hover:bg-white/[0.05]"
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProject(project.id)}
                            className="hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </AdminPanel>

        {/* Clients Section */}
        <AdminPanel className="overflow-hidden">
          <CardHeader className="border-b border-border/70 bg-muted/40 dark:bg-white/[0.03]">
            <CardTitle className="text-foreground">Clients</CardTitle>
            <CardDescription className="text-muted-foreground">Manage your client relationships</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="admin-table-head hover:bg-transparent">
                  <TableHead className="font-semibold text-foreground">Client Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Email</TableHead>
                  <TableHead className="font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-semibold text-foreground">Projects</TableHead>
                  <TableHead className="font-semibold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="admin-table-empty py-8 text-center text-muted-foreground">
                      No clients yet. Add your first client to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => {
                    const clientProjects = projects.filter(p => p.clientId === client.id);
                    return (
                      <TableRow key={client.id} className="admin-table-row">
                        <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                        <TableCell className="text-muted-foreground">{client.email || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(client.status)}>
                            {client.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{clientProjects.length}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClient(client)}
                              className="hover:bg-muted/60 dark:hover:bg-white/[0.05]"
                            >
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClient(client.id)}
                              className="hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </AdminPanel>
      </div>
    </DashboardLayout>
  );
}
