import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Users, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  X,
  Globe,
  Building2,
  DollarSign,
  Scale,
  TrendingUp,
  MessageSquare,
  UserCheck,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

interface ExtractedRole {
  title: string;
  category: string;
  selected: boolean;
}

interface RoleExtractionModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (roles: ExtractedRole[]) => void;
  businessPlanText?: string;
  fileName?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Marketing': <TrendingUp className="w-4 h-4" />,
  'Engineering': <Globe className="w-4 h-4" />,
  'Operations': <Building2 className="w-4 h-4" />,
  'Finance': <DollarSign className="w-4 h-4" />,
  'Legal': <Scale className="w-4 h-4" />,
  'Sales': <TrendingUp className="w-4 h-4" />,
  'Customer Support': <MessageSquare className="w-4 h-4" />,
  'Management': <UserCheck className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  'Marketing': 'bg-blue-500',
  'Engineering': 'bg-green-500',
  'Operations': 'bg-orange-500',
  'Finance': 'bg-purple-500',
  'Legal': <Scale className="w-4 h-4" />,
  'Sales': <TrendingUp className="w-4 h-4" />,
  'Customer Support': <MessageSquare className="w-4 h-4" />,
  'Management': <UserCheck className="w-4 h-4" />,
};

export function RoleExtractionModal({ open, onClose, onComplete, businessPlanText, fileName }: RoleExtractionModalProps) {
  const [extractedRoles, setExtractedRoles] = useState<Record<string, string[]>>({});
  const [selectedRoles, setSelectedRoles] = useState<ExtractedRole[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const extractRoles = async () => {
    if (!businessPlanText) {
      toast.error('No business plan text provided');
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    try {
      const response = await fetch('/api/parse-business-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: businessPlanText,
          fileName: fileName || 'business-plan'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract roles');
      }

      const data = await response.json();
      
      if (data.success && data.roles) {
        setExtractedRoles(data.roles);
        
        // Convert to selected roles format
        const roles: ExtractedRole[] = [];
        Object.entries(data.roles).forEach(([category, roleList]) => {
          if (Array.isArray(roleList)) {
            roleList.forEach(roleTitle => {
              roles.push({
                title: roleTitle,
                category,
                selected: false
              });
            });
          }
        });
        
        setSelectedRoles(roles);
        toast.success(`Extracted ${roles.length} roles from business plan`);
      } else {
        throw new Error(data.error || 'Failed to extract roles');
      }
    } catch (error) {
      console.error('Error extracting roles:', error);
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract roles');
      toast.error('Failed to extract roles from business plan');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleRoleSelection = (roleTitle: string) => {
    setSelectedRoles(prev => 
      prev.map(role => 
        role.title === roleTitle 
          ? { ...role, selected: !role.selected }
          : role
      )
    );
  };

  const selectAllInCategory = (category: string, select: boolean) => {
    setSelectedRoles(prev => 
      prev.map(role => 
        role.category === category 
          ? { ...role, selected: select }
          : role
      )
    );
  };

  const selectAllRoles = (select: boolean) => {
    setSelectedRoles(prev => 
      prev.map(role => ({ ...role, selected: select }))
    );
  };

  const publishSelectedRoles = async () => {
    const selected = selectedRoles.filter(role => role.selected);
    
    if (selected.length === 0) {
      toast.error('Please select at least one role to publish');
      return;
    }

    setIsPublishing(true);

    try {
      // Save roles to Supabase
      const response = await fetch('/api/roles/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roles: selected,
          businessId: null // Will be set from user's business data
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish roles');
      }

      const data = await response.json();
      
      if (data.success) {
        onComplete(selected);
        toast.success(data.message);
        onClose();
      } else {
        throw new Error(data.error || 'Failed to publish roles');
      }
    } catch (error) {
      console.error('Error publishing roles:', error);
      toast.error('Failed to publish roles to marketplace');
    } finally {
      setIsPublishing(false);
    }
  };

  const getSelectedCount = () => selectedRoles.filter(role => role.selected).length;
  const getTotalCount = () => selectedRoles.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-900 border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Business Plan Role Extraction
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Extract and select job roles from your business plan to publish to the marketplace.
          </DialogDescription>
        </DialogHeader>

        {!extractedRoles || Object.keys(extractedRoles).length === 0 ? (
          /* Initial State - Extract Roles */
          <div className="space-y-6">
            <Card className="bg-neutral-800 border-neutral-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Business Plan Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{fileName || 'Business Plan'}</p>
                    <p className="text-sm text-neutral-400">
                      {businessPlanText ? `${businessPlanText.length} characters` : 'No text available'}
                    </p>
                  </div>
                  <Button
                    onClick={extractRoles}
                    disabled={isExtracting || !businessPlanText}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Extract Roles
                      </>
                    )}
                  </Button>
                </div>

                {extractionError && (
                  <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700 rounded text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{extractionError}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Role Selection State */
          <div className="space-y-6">
            {/* Header with stats */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Select Roles to Publish</h3>
                <p className="text-sm text-neutral-400">
                  {getSelectedCount()} of {getTotalCount()} roles selected
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectAllRoles(true)}
                  className="border-neutral-600 text-neutral-300"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectAllRoles(false)}
                  className="border-neutral-600 text-neutral-300"
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Selection Progress</span>
                <span className="text-white">{Math.round((getSelectedCount() / getTotalCount()) * 100)}%</span>
              </div>
              <Progress value={(getSelectedCount() / getTotalCount()) * 100} className="h-2" />
            </div>

            {/* Role categories */}
            <div className="space-y-4">
              {Object.entries(extractedRoles).map(([category, roles]) => {
                const categoryRoles = selectedRoles.filter(role => role.category === category);
                const selectedInCategory = categoryRoles.filter(role => role.selected).length;
                
                return (
                  <Card key={category} className="bg-neutral-800 border-neutral-700">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-blue-500">
                            {categoryIcons[category] || <Users className="w-4 h-4" />}
                          </div>
                          <div>
                            <CardTitle className="text-white text-sm">{category}</CardTitle>
                            <p className="text-xs text-neutral-400">
                              {selectedInCategory} of {categoryRoles.length} selected
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => selectAllInCategory(category, true)}
                            className="text-xs text-neutral-400 hover:text-white"
                          >
                            All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => selectAllInCategory(category, false)}
                            className="text-xs text-neutral-400 hover:text-white"
                          >
                            None
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryRoles.map((role) => (
                          <div key={role.title} className="flex items-center space-x-2">
                            <Checkbox
                              id={role.title}
                              checked={role.selected}
                              onCheckedChange={() => toggleRoleSelection(role.title)}
                            />
                            <label
                              htmlFor={role.title}
                              className="text-sm text-neutral-300 cursor-pointer hover:text-white"
                            >
                              {role.title}
                            </label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-neutral-700">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-neutral-700 text-neutral-300"
              >
                Cancel
              </Button>
              <Button
                onClick={publishSelectedRoles}
                disabled={getSelectedCount() === 0 || isPublishing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish {getSelectedCount()} Roles
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 