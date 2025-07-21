"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Client {
  id: string;
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
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

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [todos, setTodos] = useState<ClientTodo[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile && profile.role === 'admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    }
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    async function fetchClients() {
      setLoading(true);
      const { data, error } = await supabase.from('clients').select('id, company_name, contact_name, contact_email');
      if (data) setClients(data);
      setLoading(false);
    }
    fetchClients();
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedClient) return;
    async function fetchTodos() {
      setLoading(true);
      let query = supabase
        .from('client_todos')
        .select('*')
        .eq('client_id', selectedClient)
        .order('created_at', { ascending: false });
      if (statusFilter) query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (data) setTodos(data);
      setLoading(false);
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
    await supabase.from('client_todos').update({ title: editText }).eq('id', todo.id);
    setEditingTodo(null);
    setEditText("");
    // Refresh todos
    const { data } = await supabase
      .from('client_todos')
      .select('*')
      .eq('client_id', selectedClient)
      .order('created_at', { ascending: false });
    if (data) setTodos(data);
  };

  const handleStatusChange = async (todo: ClientTodo, newStatus: string) => {
    await supabase.from('client_todos').update({ status: newStatus }).eq('id', todo.id);
    // Refresh todos
    const { data } = await supabase
      .from('client_todos')
      .select('*')
      .eq('client_id', selectedClient)
      .order('created_at', { ascending: false });
    if (data) setTodos(data);
  };

  const handleSyncGithub = async (clientId: string) => {
    await fetch('/api/github-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    });
    // Optionally refresh todos after sync
    if (clientId === selectedClient) {
      const { data } = await supabase
        .from('client_todos')
        .select('*')
        .eq('client_id', selectedClient)
        .order('created_at', { ascending: false });
      if (data) setTodos(data);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading...</div>;
  }
  if (!isAdmin) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">Access denied. Admins only.</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar: Client List */}
      <aside className="w-72 bg-white border-r p-4">
        <h2 className="text-lg font-bold mb-4">Clients</h2>
        <Input
          placeholder="Filter clients..."
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="mb-4"
        />
        <ul>
          {filteredClients.map((client) => (
            <li key={client.id}>
              <Button
                variant={selectedClient === client.id ? "default" : "outline"}
                className="w-full mb-2 text-left"
                onClick={() => setSelectedClient(client.id)}
              >
                {client.company_name || client.contact_name || client.contact_email || client.id}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="w-full mb-4"
                onClick={() => handleSyncGithub(client.id)}
              >
                Sync GitHub TODOs
              </Button>
            </li>
          ))}
        </ul>
      </aside>
      {/* Main Panel: TODOs */}
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Client TODOs</h1>
        <div className="flex items-center gap-4 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter} className="w-48">
            <option value="">All Statuses</option>
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>
        {!selectedClient ? (
          <div className="text-gray-500">Select a client to view their TODOs.</div>
        ) : (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">TODOs</h2>
            {todos.length === 0 ? (
              <div className="text-gray-500">No TODOs found for this client.</div>
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
                          className="w-36"
                        >
                          {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(todo)}>Edit</Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </main>
    </div>
  );
} 