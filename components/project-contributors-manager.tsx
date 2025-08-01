import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, User, X, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Contributor {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  is_contributor: boolean;
}

interface ProjectContributor {
  id: string;
  contributor_id: string;
  role: string;
  contribution_percentage: number;
  attribution_order: number;
  contributor: Contributor;
}

interface ProjectContributorsManagerProps {
  projectId: string;
  onUpdate?: () => void;
}

export function ProjectContributorsManager({ projectId, onUpdate }: ProjectContributorsManagerProps) {
  const [contributors, setContributors] = useState<ProjectContributor[]>([]);
  const [availableContributors, setAvailableContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newContributor, setNewContributor] = useState({
    contributor_id: '',
    role: 'contributor',
    contribution_percentage: 100,
    attribution_order: 1
  });

  useEffect(() => {
    fetchProjectContributors();
    fetchAvailableContributors();
  }, [projectId]);

  const fetchProjectContributors = async () => {
    try {
      const { data, error } = await supabase
        .from('project_contributors')
        .select(`
          id,
          contributor_id,
          role,
          contribution_percentage,
          attribution_order,
          contributor:profiles!inner(
            id,
            full_name,
            email,
            avatar_url,
            is_contributor
          )
        `)
        .eq('project_id', projectId)
        .order('attribution_order');

      if (error) throw error;
      setContributors(data || []);
    } catch (error) {
      console.error('Error fetching project contributors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableContributors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, is_contributor')
        .eq('is_contributor', true)
        .order('full_name');

      if (error) throw error;
      setAvailableContributors(data || []);
    } catch (error) {
      console.error('Error fetching available contributors:', error);
    }
  };

  const addContributor = async () => {
    try {
      const { error } = await supabase
        .from('project_contributors')
        .insert({
          project_id: projectId,
          contributor_id: newContributor.contributor_id,
          role: newContributor.role,
          contribution_percentage: newContributor.contribution_percentage,
          attribution_order: newContributor.attribution_order
        });

      if (error) throw error;

      setShowAddDialog(false);
      setNewContributor({
        contributor_id: '',
        role: 'contributor',
        contribution_percentage: 100,
        attribution_order: 1
      });
      fetchProjectContributors();
      onUpdate?.();
    } catch (error) {
      console.error('Error adding contributor:', error);
    }
  };

  const removeContributor = async (contributorId: string) => {
    try {
      const { error } = await supabase
        .from('project_contributors')
        .delete()
        .eq('id', contributorId);

      if (error) throw error;

      fetchProjectContributors();
      onUpdate?.();
    } catch (error) {
      console.error('Error removing contributor:', error);
    }
  };

  const updateContributor = async (contributorId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('project_contributors')
        .update(updates)
        .eq('id', contributorId);

      if (error) throw error;

      fetchProjectContributors();
      onUpdate?.();
    } catch (error) {
      console.error('Error updating contributor:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading contributors...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Project Contributors</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Contributor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contributor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Contributor</label>
                <Select 
                  value={newContributor.contributor_id} 
                  onValueChange={(value) => setNewContributor({...newContributor, contributor_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contributor" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContributors
                      .filter(c => !contributors.find(pc => pc.contributor_id === c.id))
                      .map(contributor => (
                        <SelectItem key={contributor.id} value={contributor.id}>
                          {contributor.full_name} ({contributor.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Role</label>
                <Select 
                  value={newContributor.role} 
                  onValueChange={(value) => setNewContributor({...newContributor, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="developer">Developer</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="project_manager">Project Manager</SelectItem>
                    <SelectItem value="contributor">Contributor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Contribution %</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={newContributor.contribution_percentage}
                  onChange={(e) => setNewContributor({...newContributor, contribution_percentage: parseInt(e.target.value)})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Display Order</label>
                <Input
                  type="number"
                  min="1"
                  value={newContributor.attribution_order}
                  onChange={(e) => setNewContributor({...newContributor, attribution_order: parseInt(e.target.value)})}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={addContributor} className="flex-1">Add Contributor</Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {contributors.map((contributor) => (
          <Card key={contributor.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={contributor.contributor.avatar_url} />
                    <AvatarFallback>
                      {contributor.contributor.full_name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{contributor.contributor.full_name}</div>
                    <div className="text-sm text-gray-500">{contributor.contributor.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{contributor.role}</Badge>
                  <Badge variant="outline">{contributor.contribution_percentage}%</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeContributor(contributor.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {contributors.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No contributors assigned to this project</p>
          </div>
        )}
      </div>
    </div>
  );
} 