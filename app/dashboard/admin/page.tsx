"use client"

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, Shield, Users, CheckCircle, XCircle, AlertCircle, Plus, UserPlus, 
  Globe, BarChart3, MessageSquare, FileText, ExternalLink, Import, 
  Activity, Bot, Slack, Github, Zap, RefreshCw, MoreHorizontal
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Client {
  id: string;
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  website_url?: string;
  github_repo?: string;
  slack_channel?: string;
  traffic_data?: {
    monthly_visitors?: number;
    page_views?: number;
    bounce_rate?: number;
  };
}

interface ClientTodo {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TodoMeItem {
  id: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'completed';
  created_at: string;
}

interface SlackMessage {
  id: string;
  text: string;
  user: string;
  timestamp: string;
  channel: string;
}

const statusOptions = [
  { value: "pending", label: "Pending", icon: AlertCircle },
  { value: "in_progress", label: "In Progress", icon: Loader2 },
  { value: "completed", label: "Completed", icon: CheckCircle },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
];

export default function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [todos, setTodos] = useState<ClientTodo[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [syncing, setSyncing] = useState<string | null>(null);
  
  // Add Client Modal State
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClient, setNewClient] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    website_url: "",
    github_repo: "",
    slack_channel: "",
  });
  const [addingClient, setAddingClient] = useState(false);

  // Advanced Features State
  const [todoMeItems, setTodoMeItems] = useState<TodoMeItem[]>([]);
  const [slackMessages, setSlackMessages] = useState<SlackMessage[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [syncingData, setSyncingData] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          toast.error("Authentication required", {
            description: "Please sign in to access the admin dashboard.",
          });
          router.push('/login?redirect=/dashboard/admin');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile || profile.role !== 'admin') {
          toast.error("Access Denied", {
            description: "You don't have admin privileges to access this page.",
          });
          router.push('/dashboard?error=access_denied');
          return;
        }

        setIsAdmin(true);
        toast.success("Welcome to Admin Dashboard", {
          description: "You have successfully accessed the admin panel.",
        });
      } catch (error) {
        console.error("Auth check error:", error);
        toast.error("Authentication Error", {
          description: "There was an error verifying your credentials.",
        });
        router.push('/login?redirect=/dashboard/admin');
      } finally {
        setLoading(false);
      }
    }
    checkAdmin();
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;
    async function fetchClients() {
      try {
        setLoading(true);
        console.log("🔍 Fetching clients from unified mapping...");
        
        // Use the unified project_client_mapping view
        const { data, error } = await supabase
          .from('project_client_mapping')
          .select('*');
        
        console.log("📊 Unified mapping result:", { data, error });
        
        if (error) {
          console.error("❌ Error fetching unified data:", error);
          
          // Fallback to basic clients table if view doesn't exist
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('clients')
            .select('id, company_name, contact_name, contact_email');
          
          if (fallbackError) {
            console.error("❌ Fallback also failed:", fallbackError);
            // Use mock data
            setClients([
              {
                id: 'demo-1',
                company_name: 'Demo Client 1',
                contact_name: 'Demo Contact 1',
                contact_email: 'demo1@example.com',
              },
              {
                id: 'demo-2', 
                company_name: 'Demo Client 2',
                contact_name: 'Demo Contact 2',
                contact_email: 'demo2@example.com',
              }
            ]);
            toast.info("Using demo data - database schema needs updating");
            return;
          }
          
          if (fallbackData) {
            setClients(fallbackData);
            toast.success(`Loaded ${fallbackData.length} clients (fallback mode)`);
          }
        } else if (data) {
          // Transform unified data to client format
          const uniqueClients = data.reduce((acc: any[], item: any) => {
            const existingClient = acc.find(c => c.id === item.client_table_id);
            if (!existingClient && item.client_table_id) {
              acc.push({
                id: item.client_table_id,
                company_name: item.company_name || item.client_name,
                contact_name: item.contact_name || item.client_name,
                contact_email: item.contact_email || item.client_email,
                website_url: item.website_url,
                github_repo: item.github_repo,
                slack_channel: item.slack_channel,
                traffic_data: item.traffic_data,
                project_id: item.project_id,
                project_title: item.project_title,
              });
            }
            return acc;
          }, []);
          
          setClients(uniqueClients);
          toast.success(`Loaded ${uniqueClients.length} clients with projects`);
        } else {
          setClients([]);
          toast.info("No clients found");
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast.error("Failed to load clients", {
          description: "There was an error loading the client list. Please check your database connection.",
        });
        setClients([]);
      } finally {
        setLoading(false);
      }
    }
    fetchClients();
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedClient) return;
    async function fetchTodos() {
      try {
        setLoading(true);
        let query = supabase
          .from('client_todos')
          .select('*')
          .eq('client_id', selectedClient)
          .order('created_at', { ascending: false });
        
        if (statusFilter && statusFilter !== "all") {
          query = query.eq('status', statusFilter);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        if (data) setTodos(data);
        toast.success(`Loaded ${data?.length || 0} todos for selected client`);
      } catch (error) {
        console.error("Error fetching todos:", error);
        toast.error("Failed to load todos", {
          description: "There was an error loading the todo list.",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchTodos();
  }, [selectedClient, statusFilter]);

  // Filter clients in sidebar
  const filteredClients = clientFilter
    ? clients.filter((c) =>
        (c.company_name || c.contact_name || c.contact_email || c.id)
          .toLowerCase()
          .includes(clientFilter.toLowerCase())
      )
    : clients;

  const handleEdit = (todo: ClientTodo) => {
    setEditingTodo(todo.id);
    setEditText(todo.title);
  };

  const handleEditSave = async (todo: ClientTodo) => {
    try {
      const { error } = await supabase.from('client_todos').update({ title: editText }).eq('id', todo.id);
      if (error) throw error;
      
      setEditingTodo(null);
      setEditText("");
      
      // Refresh todos
      const { data } = await supabase
        .from('client_todos')
        .select('*')
        .eq('client_id', selectedClient)
        .order('created_at', { ascending: false });
      if (data) setTodos(data);
      
      toast.success("Todo updated successfully");
    } catch (error) {
      console.error("Error updating todo:", error);
      toast.error("Failed to update todo", {
        description: "There was an error saving your changes.",
      });
    }
  };

  const handleStatusChange = async (todo: ClientTodo, newStatus: string) => {
    try {
      const { error } = await supabase.from('client_todos').update({ status: newStatus }).eq('id', todo.id);
      if (error) throw error;
      
      // Refresh todos
      const { data } = await supabase
        .from('client_todos')
        .select('*')
        .eq('client_id', selectedClient)
        .order('created_at', { ascending: false });
      if (data) setTodos(data);
      
      toast.success("Status updated successfully");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status", {
        description: "There was an error updating the todo status.",
      });
    }
  };

  const handleSyncGithub = async (clientId: string) => {
    try {
      setSyncing(clientId);
      const response = await fetch('/api/github-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }
      
      // Optionally refresh todos after sync
      if (clientId === selectedClient) {
        const { data } = await supabase
          .from('client_todos')
          .select('*')
          .eq('client_id', selectedClient)
          .order('created_at', { ascending: false });
        if (data) setTodos(data);
      }
      
      toast.success("GitHub sync completed", {
        description: "Todos have been synchronized from GitHub.",
      });
    } catch (error) {
      console.error("GitHub sync error:", error);
      toast.error("GitHub sync failed", {
        description: error instanceof Error ? error.message : "There was an error syncing with GitHub.",
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleAddClient = async () => {
    try {
      setAddingClient(true);
      
      // Validate required fields
      if (!newClient.company_name && !newClient.contact_name && !newClient.contact_email) {
        toast.error("Please provide at least one identifier", {
          description: "Company name, contact name, or email is required.",
        });
        return;
      }

      // First, let's check what columns exist in the clients table
      console.log("🔍 Checking clients table structure...");
      try {
        const { data: tableInfo, error: tableError } = await supabase
          .from('clients')
          .select('*')
          .limit(0);
        
        if (tableError) {
          console.error("❌ Error checking table structure:", tableError);
          toast.error("Database connection issue", {
            description: "Unable to access the clients table. Please check your database setup.",
          });
          return;
        }
        console.log("✅ Clients table is accessible");
      } catch (tableCheckError) {
        console.error("❌ Table check failed:", tableCheckError);
        toast.error("Database connection issue", {
          description: "Unable to access the clients table. Please check your database setup.",
        });
        return;
      }

      // Create client data with all available fields
      const clientData = {
        id: crypto.randomUUID(),
        company_name: newClient.company_name || null,
        contact_name: newClient.contact_name || null,
        contact_email: newClient.contact_email || null,
        website_url: newClient.website_url || null,
        github_repo: newClient.github_repo || null,
        slack_channel: newClient.slack_channel || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("🔍 Inserting client data:", clientData);

      // Try to insert with all fields
      let insertedClient, clientError;
      try {
        const result = await supabase
          .from('clients')
          .insert([clientData])
          .select();
        
        insertedClient = result.data;
        clientError = result.error;
      } catch (supabaseError) {
        console.error("❌ Supabase operation failed:", supabaseError);
        const errorMessage = supabaseError instanceof Error ? supabaseError.message : 'Unknown error';
        throw new Error(`Supabase operation failed: ${errorMessage}`);
      }

      if (clientError) {
        console.error("❌ Error adding client:", clientError);
        console.error("❌ Error details:", {
          code: clientError.code,
          message: clientError.message,
          details: clientError.details,
          hint: clientError.hint
        });
        
        // If it's a schema error, show helpful message
        if (clientError.code === 'PGRST204' || clientError.code === '42703') {
          toast.error("Database schema needs updating", {
            description: "Please run the SQL script to add missing columns to the clients table.",
          });
          return;
        }
        
        throw clientError;
      }

      if (insertedClient && insertedClient.length > 0) {
        const newClientData = insertedClient[0];
        console.log("✅ Client created successfully:", newClientData);
        
        // Auto-create a project for the new client
        try {
          const projectTitle = newClient.company_name || newClient.contact_name || 'New Client';
          const projectDescription = `Website and digital presence for ${projectTitle}`;
          
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .insert([{
              title: `${projectTitle} Website`,
              description: projectDescription,
              live_url: newClient.website_url || `https://${projectTitle.toLowerCase().replace(/\s+/g, '')}.readyaimgo.com`,
              image_url: '/placeholder.jpg', // Default placeholder
              tags: ['Website', 'Digital', 'ReadyAimGo'],
              status: 'in-progress',
              budget: 5000, // Default budget
              client_id: newClientData.id,
            }])
            .select();

          if (projectError) {
            console.error("❌ Error creating project:", projectError);
            // Don't throw here - client was created successfully
            toast.warning("Client created but project creation failed", {
              description: "You can manually create a project later.",
            });
          } else {
            console.log("✅ Auto-created project:", projectData);
            toast.success("Client and project created successfully", {
              description: "The project will appear in the website generator portfolio.",
            });
          }
        } catch (projectError) {
          console.error("❌ Error in project creation:", projectError);
          // Client was created successfully, just log the project error
        }

        // Add new client to the list
        const clientForDisplay = {
          id: newClientData.id,
          company_name: newClient.company_name || 'New Client',
          contact_name: newClient.contact_name || 'Contact',
          contact_email: newClient.contact_email || 'client@example.com',
          website_url: newClient.website_url,
          github_repo: newClient.github_repo,
          slack_channel: newClient.slack_channel,
        };
        
        setClients(prev => [...prev, clientForDisplay]);
        
        // Reset form
        setNewClient({
          company_name: "",
          contact_name: "",
          contact_email: "",
          website_url: "",
          github_repo: "",
          slack_channel: "",
        });
        
        // Close modal
        setShowAddClientModal(false);
      }
    } catch (error) {
      console.error("❌ Error adding client:", error);
      toast.error("Failed to add client", {
        description: "There was an error creating the new client.",
      });
    } finally {
      setAddingClient(false);
    }
  };

  const handleImportPortfolioClients = async () => {
    try {
      setLoading(true);
      
      console.log("🔍 Importing demo data using unified approach...");
      
      // Use Supabase AI's import_demo_data function
      const { data: importResult, error: importError } = await supabase
        .rpc('import_demo_data');
      
      if (importError) {
        console.error("❌ Error importing demo data:", importError);
        
        // Fallback to manual import if function doesn't exist
        console.log("⚠️ Falling back to manual import...");
        
        const demoClients = [
          {
            id: crypto.randomUUID(),
            company_name: 'Femileasing',
            contact_name: 'Femileasing',
            contact_email: 'contact@femileasing.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            company_name: 'RedSquareTransport',
            contact_name: 'RedSquareTransport', 
            contact_email: 'contact@redsquaretransport.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            company_name: 'Demo User',
            contact_name: 'Demo User',
            contact_email: 'contact@demouser.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ];

        const createdClients = [];

        // Try to insert with error handling for each client
        for (const client of demoClients) {
          try {
            const { data: clientData, error: insertError } = await supabase
              .from('clients')
              .insert([client])
              .select();

            if (insertError) {
              console.error("❌ Error inserting client:", insertError);
              // If it's a duplicate key error, that's okay
              if (insertError.code !== '23505') {
                throw insertError;
              }
            } else if (clientData && clientData.length > 0) {
              createdClients.push(clientData[0]);
              
              // Auto-create project for this client
              try {
                const { error: projectError } = await supabase
                  .from('projects')
                  .insert([{
                    title: `${client.company_name} Website`,
                    description: `Professional website and digital presence for ${client.company_name}`,
                    live_url: `https://${client.company_name.toLowerCase().replace(/\s+/g, '')}.readyaimgo.com`,
                    image_url: '/placeholder.jpg',
                    tags: ['Website', 'Digital', 'ReadyAimGo', client.company_name],
                    status: 'completed',
                    budget: 5000,
                    client_id: clientData[0].id,
                  }]);

                if (projectError) {
                  console.error("❌ Error creating project for", client.company_name, ":", projectError);
                } else {
                  console.log("✅ Created project for", client.company_name);
                }
              } catch (projectError) {
                console.error("❌ Error in project creation for", client.company_name, ":", projectError);
              }
            }
          } catch (error) {
            console.error("❌ Error with client insert:", error);
            // Continue with other clients even if one fails
          }
        }
        
        toast.success("Portfolio clients and projects imported successfully", {
          description: `Imported ${createdClients.length} clients with projects. Check the website generator!`,
        });
      } else {
        console.log("✅ Import result:", importResult);
        
        toast.success("Demo data imported successfully", {
          description: `Created ${importResult?.profiles_created || 0} profiles and ${importResult?.clients_created || 0} clients with projects.`,
        });
      }
      
      // Refresh the client list
      const { data: refreshData, error: refreshError } = await supabase
        .from('project_client_mapping')
        .select('*');
      
      if (!refreshError && refreshData) {
        // Transform unified data to client format
        const uniqueClients = refreshData.reduce((acc: any[], item: any) => {
          const existingClient = acc.find(c => c.id === item.client_table_id);
          if (!existingClient && item.client_table_id) {
            acc.push({
              id: item.client_table_id,
              company_name: item.company_name || item.client_name,
              contact_name: item.contact_name || item.client_name,
              contact_email: item.contact_email || item.client_email,
              website_url: item.website_url,
              github_repo: item.github_repo,
              slack_channel: item.slack_channel,
              traffic_data: item.traffic_data,
              project_id: item.project_id,
              project_title: item.project_title,
            });
          }
          return acc;
        }, []);
        
        setClients(uniqueClients);
      }
      
    } catch (error) {
      console.error("Error importing clients:", error);
      toast.error("Failed to import portfolio clients", {
        description: "There was an error importing the demo clients. Please check your database schema.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeWithAI = async () => {
    if (!selectedClient) return;
    
    try {
      setAnalyzing(true);
      
      const client = clients.find(c => c.id === selectedClient);
      if (!client) return;

      // Analyze TODO.me items and Slack messages
      const analysisPrompt = `
        Analyze the following client data and provide strategic recommendations:
        
        Client: ${client.company_name || client.contact_name}
        Website: ${client.website_url || 'Not provided'}
        GitHub: ${client.github_repo || 'Not provided'}
        Slack: ${client.slack_channel || 'Not provided'}
        
        TODO.me Items: ${todoMeItems.map(item => `- ${item.content} (${item.priority} priority, ${item.status})`).join('\n')}
        
        Recent Slack Messages: ${slackMessages.map(msg => `- ${msg.user}: ${msg.text}`).join('\n')}
        
        Please provide:
        1. Key priorities and next steps
        2. Resource recommendations
        3. Timeline suggestions
        4. Risk assessment
      `;

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: analysisPrompt }),
      });

      if (!response.ok) throw new Error('AI analysis failed');
      
      const { analysis } = await response.json();
      setAiAnalysis(analysis);
      
      toast.success("AI analysis completed", {
        description: "Strategic recommendations have been generated.",
      });
    } catch (error) {
      console.error("AI analysis error:", error);
      toast.error("AI analysis failed", {
        description: "There was an error analyzing the client data.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSyncData = async () => {
    try {
      setSyncingData(true);
      
      console.log("🔄 Syncing projects and clients...");
      
      // Call the sync function
      const { data: syncResult, error: syncError } = await supabase
        .rpc('sync_projects_with_clients');
      
      if (syncError) {
        console.error("❌ Error syncing data:", syncError);
        toast.error("Sync failed", {
          description: "There was an error synchronizing the data.",
        });
        return;
      }
      
      console.log("✅ Sync result:", syncResult);
      
      const createdClients = syncResult?.filter((r: any) => r.action === 'created_client').length || 0;
      const createdProjects = syncResult?.filter((r: any) => r.action === 'created_project').length || 0;
      
      toast.success("Data synchronized successfully", {
        description: `Created ${createdClients} clients and ${createdProjects} projects.`,
      });
      
      // Refresh the client list
      const { data: refreshData, error: refreshError } = await supabase
        .from('project_client_mapping')
        .select('*');
      
      if (!refreshError && refreshData) {
        // Transform unified data to client format
        const uniqueClients = refreshData.reduce((acc: any[], item: any) => {
          const existingClient = acc.find(c => c.id === item.client_table_id);
          if (!existingClient && item.client_table_id) {
            acc.push({
              id: item.client_table_id,
              company_name: item.company_name || item.client_name,
              contact_name: item.contact_name || item.client_name,
              contact_email: item.contact_email || item.client_email,
              website_url: item.website_url,
              github_repo: item.github_repo,
              slack_channel: item.slack_channel,
              traffic_data: item.traffic_data,
              project_id: item.project_id,
              project_title: item.project_title,
            });
          }
          return acc;
        }, []);
        
        setClients(uniqueClients);
      }
      
    } catch (error) {
      console.error("Error syncing data:", error);
      toast.error("Sync failed", {
        description: "There was an error synchronizing the data.",
      });
    } finally {
      setSyncingData(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Logged out successfully");
      router.push('/');
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed", {
        description: "There was an error signing you out.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <XCircle className="h-12 w-12 text-red-500" />
          <h1 className="text-xl font-semibold text-red-600">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const selectedClientData = clients.find(c => c.id === selectedClient);

  return (
    <div className="flex min-h-screen bg-neutral-900">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-neutral-800 border-b border-neutral-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-orange-500" />
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-neutral-400">
              <Users className="inline h-4 w-4 mr-1" />
              {clients.length} clients
            </span>
            <Button variant="outline" onClick={handleLogout} className="border-neutral-600 text-neutral-300 hover:bg-neutral-700">
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar: Client List */}
      <aside className="fixed left-0 top-16 h-full w-72 bg-neutral-800 border-r border-neutral-700 p-4 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4 text-white">Clients</h2>
        
                {/* Action Buttons */}
                <div className="flex gap-2 mb-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="w-full border-neutral-600 text-neutral-300 hover:bg-neutral-700">
                        <MoreHorizontal className="h-4 w-4 mr-2" />
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 bg-neutral-800 border-neutral-700">
                      <DropdownMenuItem onClick={handleImportPortfolioClients} className="text-neutral-300 hover:bg-neutral-700">
                        <Import className="h-4 w-4 mr-2" />
                        Import Demo Data
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleSyncData} disabled={syncingData} className="text-neutral-300 hover:bg-neutral-700">
                        {syncingData ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Data
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-neutral-700" />
                      <DropdownMenuItem onClick={() => setShowAddClientModal(true)} className="text-neutral-300 hover:bg-neutral-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Client
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <Dialog open={showAddClientModal} onOpenChange={setShowAddClientModal}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Add New Client
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="company_name">Company Name</Label>
                        <Input
                          id="company_name"
                          placeholder="Enter company name"
                          value={newClient.company_name}
                          onChange={(e) => setNewClient(prev => ({ ...prev, company_name: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contact_name">Contact Name</Label>
                        <Input
                          id="contact_name"
                          placeholder="Enter contact person's name"
                          value={newClient.contact_name}
                          onChange={(e) => setNewClient(prev => ({ ...prev, contact_name: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contact_email">Contact Email</Label>
                        <Input
                          id="contact_email"
                          type="email"
                          placeholder="Enter contact email"
                          value={newClient.contact_email}
                          onChange={(e) => setNewClient(prev => ({ ...prev, contact_email: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="website_url">Website URL</Label>
                        <Input
                          id="website_url"
                          type="url"
                          placeholder="https://example.com"
                          value={newClient.website_url}
                          onChange={(e) => setNewClient(prev => ({ ...prev, website_url: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="github_repo">GitHub Repository</Label>
                        <Input
                          id="github_repo"
                          placeholder="username/repository"
                          value={newClient.github_repo}
                          onChange={(e) => setNewClient(prev => ({ ...prev, github_repo: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="slack_channel">Slack Channel</Label>
                        <Input
                          id="slack_channel"
                          placeholder="#channel-name"
                          value={newClient.slack_channel}
                          onChange={(e) => setNewClient(prev => ({ ...prev, slack_channel: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowAddClientModal(false)}
                        disabled={addingClient}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddClient}
                        disabled={addingClient}
                        className="flex items-center gap-2"
                      >
                        {addingClient ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Add Client
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
        
        <Input
          placeholder="Filter clients..."
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="mb-4 bg-neutral-700 border-neutral-600 text-neutral-300 placeholder-neutral-400"
        />
        <div className="space-y-2">
          {filteredClients.map((client) => (
            <div key={client.id} className="space-y-2">
              <Button
                variant={selectedClient === client.id ? "default" : "outline"}
                className={`w-full text-left justify-start ${
                  selectedClient === client.id 
                    ? "bg-orange-500 hover:bg-orange-600" 
                    : "border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                }`}
                onClick={() => setSelectedClient(client.id)}
              >
                {client.company_name || client.contact_name || client.contact_email || client.id}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="w-full bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
                onClick={() => handleSyncGithub(client.id)}
                disabled={syncing === client.id}
              >
                {syncing === client.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4 mr-2" />
                    Sync GitHub
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Panel: Client Details & Analytics */}
      <main className="ml-72 pt-16 flex-1 p-8">
        {!selectedClient ? (
          <Card className="p-8 bg-neutral-800 border-neutral-700">
            <div className="text-center">
              <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Select a Client</h3>
              <p className="text-neutral-400">Choose a client from the sidebar to view their details and analytics.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Client Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedClientData?.company_name || selectedClientData?.contact_name}
                </h2>
                <p className="text-neutral-400">{selectedClientData?.contact_email}</p>
              </div>
              <div className="flex gap-2">
                {selectedClientData?.website_url && (
                  <Button variant="outline" size="sm" asChild className="border-neutral-600 text-neutral-300 hover:bg-neutral-700">
                    <a href={selectedClientData.website_url} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                    </a>
                  </Button>
                )}
                {selectedClientData?.github_repo && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://github.com/${selectedClientData.github_repo}`} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-2" />
                      GitHub
                    </a>
                  </Button>
                )}
                {selectedClientData?.slack_channel && (
                  <Button variant="outline" size="sm">
                    <Slack className="h-4 w-4 mr-2" />
                    {selectedClientData.slack_channel}
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="todos">TODOs</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="todo-me">TODO.me</TabsTrigger>
                <TabsTrigger value="slack">Slack</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Traffic Analytics */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Traffic Analytics</h3>
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly Visitors</span>
                        <span className="font-semibold">
                          {selectedClientData?.traffic_data?.monthly_visitors || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Page Views</span>
                        <span className="font-semibold">
                          {selectedClientData?.traffic_data?.page_views || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bounce Rate</span>
                        <span className="font-semibold">
                          {selectedClientData?.traffic_data?.bounce_rate ? 
                            `${selectedClientData.traffic_data.bounce_rate}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* TODO.me Summary */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">TODO.me Items</h3>
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Items</span>
                        <span className="font-semibold">{todoMeItems.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">High Priority</span>
                        <span className="font-semibold text-red-600">
                          {todoMeItems.filter(item => item.priority === 'high').length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed</span>
                        <span className="font-semibold text-green-600">
                          {todoMeItems.filter(item => item.status === 'completed').length}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Slack Activity */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Slack Activity</h3>
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recent Messages</span>
                        <span className="font-semibold">{slackMessages.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Users</span>
                        <span className="font-semibold">
                          {new Set(slackMessages.map(msg => msg.user)).size}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Activity</span>
                        <span className="font-semibold text-sm">
                          {slackMessages.length > 0 ? 
                            new Date(slackMessages[0].timestamp).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* AI Analysis */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">AI Strategic Analysis</h3>
                    <Button 
                      onClick={handleAnalyzeWithAI}
                      disabled={analyzing}
                      className="flex items-center gap-2"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Bot className="h-4 w-4" />
                          Analyze with AI
                        </>
                      )}
                    </Button>
                  </div>
                  {aiAnalysis ? (
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                        {aiAnalysis}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      Click "Analyze with AI" to get strategic recommendations based on client data.
                    </p>
                  )}
                </Card>
              </TabsContent>

              {/* TODOs Tab */}
              <TabsContent value="todos" className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statusOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">TODOs</h2>
                  {todos.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No TODOs found for this client.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todos.map((todo) => {
                        const statusOption = statusOptions.find(opt => opt.value === todo.status);
                        const StatusIcon = statusOption?.icon || AlertCircle;
                        
                        return (
                          <div key={todo.id} className="flex items-center gap-4 p-4 border rounded-lg bg-white">
                            {editingTodo === todo.id ? (
                              <>
                                <Input
                                  value={editText}
                                  onChange={e => setEditText(e.target.value)}
                                  className="flex-1"
                                  autoFocus
                                />
                                <Button size="sm" onClick={() => handleEditSave(todo)}>
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingTodo(null)}>
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 cursor-pointer hover:text-blue-600" onClick={() => handleEdit(todo)}>
                                  {todo.title}
                                </span>
                                <div className="flex items-center gap-2">
                                  <StatusIcon className="h-4 w-4 text-gray-500" />
                                  <Select
                                    value={todo.status}
                                    onValueChange={val => handleStatusChange(todo, val)}
                                  >
                                    <SelectTrigger className="w-36">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {statusOptions.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button size="sm" variant="outline" onClick={() => handleEdit(todo)}>
                                    Edit
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Website Traffic Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedClientData?.traffic_data?.monthly_visitors || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Monthly Visitors</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedClientData?.traffic_data?.page_views || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Page Views</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {selectedClientData?.traffic_data?.bounce_rate ? 
                          `${selectedClientData.traffic_data.bounce_rate}%` : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Bounce Rate</div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* TODO.me Tab */}
              <TabsContent value="todo-me" className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">TODO.me Items</h3>
                  <div className="space-y-3">
                    {todoMeItems.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No TODO.me items found.</p>
                      </div>
                    ) : (
                      todoMeItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'default' : 'secondary'}>
                                {item.priority}
                              </Badge>
                              <Badge variant={item.status === 'completed' ? 'default' : 'outline'}>
                                {item.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </TabsContent>

              {/* Slack Tab */}
              <TabsContent value="slack" className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Slack Conversations</h3>
                  <div className="space-y-3">
                    {slackMessages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No Slack messages found.</p>
                      </div>
                    ) : (
                      slackMessages.map((message) => (
                        <div key={message.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-blue-600">{message.user}</span>
                            <span className="text-sm text-gray-500">
                              {new Date(message.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-700">{message.text}</p>
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              {message.channel}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
} 