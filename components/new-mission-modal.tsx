"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Users, 
  Target, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  X,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface NewMissionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (missionData: any) => void;
}

interface PositionAnalysis {
  position: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedSalary: number;
  skills: string[];
  responsibilities: string[];
}

export function NewMissionModal({ open, onClose, onSubmit }: NewMissionModalProps) {
  const [activeTab, setActiveTab] = useState<'mission' | 'business-plan'>('mission');
  const [missionData, setMissionData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    budget: 0,
    dueDate: ''
  });
  
  // Business plan upload state
  const [businessPlanFile, setBusinessPlanFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [positionAnalysis, setPositionAnalysis] = useState<PositionAnalysis[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload a PDF, Word document, or text file.');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Please upload a file smaller than 10MB.');
        return;
      }
      
      setBusinessPlanFile(file);
      toast.success('Business plan uploaded successfully!');
    }
  };

  const handleBusinessPlanAnalysis = async () => {
    if (!businessPlanFile) {
      toast.error('Please upload a business plan first.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const uploadInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(uploadInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      // Simulate file upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsUploading(false);
      setIsAnalyzing(true);
      
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock analysis results
      const mockAnalysis: PositionAnalysis[] = [
        {
          position: 'Chief Executive Officer (CEO)',
          description: 'Strategic leadership and overall business direction',
          priority: 'high',
          estimatedSalary: 150000,
          skills: ['Strategic Planning', 'Leadership', 'Business Development', 'Financial Management'],
          responsibilities: [
            'Develop and execute business strategy',
            'Lead company growth and expansion',
            'Manage key stakeholder relationships',
            'Oversee financial performance'
          ]
        },
        {
          position: 'Chief Financial Officer (CFO)',
          description: 'Financial planning, analysis, and reporting',
          priority: 'high',
          estimatedSalary: 120000,
          skills: ['Financial Analysis', 'Budgeting', 'Risk Management', 'Compliance'],
          responsibilities: [
            'Develop financial strategies',
            'Manage budgets and forecasts',
            'Ensure regulatory compliance',
            'Oversee financial operations'
          ]
        },
        {
          position: 'Marketing Director',
          description: 'Brand development and customer acquisition',
          priority: 'medium',
          estimatedSalary: 85000,
          skills: ['Digital Marketing', 'Brand Management', 'Market Research', 'Campaign Strategy'],
          responsibilities: [
            'Develop marketing strategies',
            'Manage brand identity',
            'Oversee customer acquisition',
            'Analyze market trends'
          ]
        },
        {
          position: 'Operations Manager',
          description: 'Day-to-day business operations and efficiency',
          priority: 'medium',
          estimatedSalary: 75000,
          skills: ['Process Optimization', 'Team Management', 'Project Management', 'Quality Control'],
          responsibilities: [
            'Optimize business processes',
            'Manage operational teams',
            'Ensure quality standards',
            'Improve efficiency'
          ]
        },
        {
          position: 'Sales Manager',
          description: 'Revenue generation and customer relationships',
          priority: 'medium',
          estimatedSalary: 70000,
          skills: ['Sales Strategy', 'Customer Relationship Management', 'Negotiation', 'Team Leadership'],
          responsibilities: [
            'Develop sales strategies',
            'Manage sales team',
            'Build customer relationships',
            'Drive revenue growth'
          ]
        }
      ];

      setPositionAnalysis(mockAnalysis);
      setAnalysisComplete(true);
      setIsAnalyzing(false);
      
      toast.success('Business plan analysis complete!');
    } catch (error) {
      toast.error('Analysis failed. Please try again.');
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const handleMissionSubmit = () => {
    if (!missionData.title || !missionData.description || !missionData.category) {
      toast.error('Please fill in all required fields.');
      return;
    }

    onSubmit?.(missionData);
    onClose();
    setMissionData({
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      budget: 0,
      dueDate: ''
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-900 border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" />
            {activeTab === 'mission' ? 'Create New Mission' : 'Business Plan Analysis'}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            {activeTab === 'mission' 
              ? 'Create a new mission to achieve your business objectives'
              : 'Upload your business plan for AI analysis of required positions'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'mission' ? 'default' : 'outline'}
            onClick={() => setActiveTab('mission')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Target className="w-4 h-4 mr-2" />
            New Mission
          </Button>
          <Button
            variant={activeTab === 'business-plan' ? 'default' : 'outline'}
            onClick={() => setActiveTab('business-plan')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <FileText className="w-4 h-4 mr-2" />
            Business Plan Analysis
          </Button>
        </div>

        {activeTab === 'mission' ? (
          /* Mission Creation Form */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title" className="text-white">Mission Title</Label>
                <Input
                  id="title"
                  value={missionData.title}
                  onChange={(e) => setMissionData({ ...missionData, title: e.target.value })}
                  placeholder="Enter mission title"
                  className="bg-neutral-800 border-neutral-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="category" className="text-white">Category</Label>
                <Select value={missionData.category} onValueChange={(value) => setMissionData({ ...missionData, category: value })}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    <SelectItem value="website">Website Development</SelectItem>
                    <SelectItem value="app">App Development</SelectItem>
                    <SelectItem value="marketing">Marketing Campaign</SelectItem>
                    <SelectItem value="business">Business Strategy</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-white">Description</Label>
              <Textarea
                id="description"
                value={missionData.description}
                onChange={(e) => setMissionData({ ...missionData, description: e.target.value })}
                placeholder="Describe your mission objectives and requirements"
                className="bg-neutral-800 border-neutral-700 text-white min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="priority" className="text-white">Priority</Label>
                <Select value={missionData.priority} onValueChange={(value) => setMissionData({ ...missionData, priority: value })}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="budget" className="text-white">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={missionData.budget}
                  onChange={(e) => setMissionData({ ...missionData, budget: Number(e.target.value) })}
                  placeholder="0"
                  className="bg-neutral-800 border-neutral-700 text-white"
                />
              </div>
              <div>
                <Label htmlFor="dueDate" className="text-white">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={missionData.dueDate}
                  onChange={(e) => setMissionData({ ...missionData, dueDate: e.target.value })}
                  className="bg-neutral-800 border-neutral-700 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} className="border-neutral-700 text-neutral-300">
                Cancel
              </Button>
              <Button onClick={handleMissionSubmit} className="bg-orange-600 hover:bg-orange-700">
                Create Mission
              </Button>
            </div>
          </div>
        ) : (
          /* Business Plan Analysis */
          <div className="space-y-6">
            {!analysisComplete ? (
              <>
                {/* File Upload Section */}
                <Card className="bg-neutral-800 border-neutral-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Upload className="w-5 h-5 text-blue-500" />
                      Upload Business Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-neutral-600 rounded-lg p-6 text-center">
                      <Upload className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
                      <p className="text-white mb-2">Upload your business plan document</p>
                      <p className="text-sm text-neutral-400 mb-4">
                        Supported formats: PDF, Word, Text (Max 10MB)
                      </p>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="business-plan-upload"
                      />
                      <Label htmlFor="business-plan-upload" className="cursor-pointer">
                        <Button variant="outline" className="border-neutral-600 text-neutral-300 hover:bg-neutral-700">
                          Choose File
                        </Button>
                      </Label>
                    </div>

                    {businessPlanFile && (
                      <div className="flex items-center justify-between p-3 bg-neutral-900 rounded border border-neutral-700">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="text-white">{businessPlanFile.name}</span>
                          <span className="text-xs text-neutral-400">
                            ({(businessPlanFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setBusinessPlanFile(null)}
                          className="text-neutral-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {businessPlanFile && (
                      <Button
                        onClick={handleBusinessPlanAnalysis}
                        disabled={isUploading || isAnalyzing}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {isUploading || isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {isUploading ? 'Uploading...' : 'Analyzing...'}
                          </>
                        ) : (
                          <>
                            <Target className="w-4 h-4 mr-2" />
                            Analyze Business Plan
                          </>
                        )}
                      </Button>
                    )}

                    {(isUploading || isAnalyzing) && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">
                            {isUploading ? 'Uploading file...' : 'AI analyzing business plan...'}
                          </span>
                          <span className="text-white">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              /* Analysis Results */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Required Positions Analysis</h3>
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Analysis Complete
                  </Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {positionAnalysis.map((position, index) => (
                    <Card key={index} className="bg-neutral-800 border-neutral-700">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-white text-lg">{position.position}</CardTitle>
                            <p className="text-neutral-400 text-sm mt-1">{position.description}</p>
                          </div>
                          <Badge className={`${getPriorityColor(position.priority)} text-white`}>
                            {position.priority.toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-neutral-400">Estimated Salary</span>
                          <span className="text-lg font-bold text-green-500">
                            ${position.estimatedSalary.toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-white mb-2">Required Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {position.skills.map((skill, skillIndex) => (
                              <Badge key={skillIndex} variant="outline" className="border-neutral-600 text-neutral-300">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-white mb-2">Key Responsibilities</h4>
                          <ul className="space-y-1">
                            {position.responsibilities.map((responsibility, respIndex) => (
                              <li key={respIndex} className="text-sm text-neutral-400 flex items-start gap-2">
                                <span className="text-orange-500 mt-1">•</span>
                                {responsibility}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAnalysisComplete(false);
                      setPositionAnalysis([]);
                      setBusinessPlanFile(null);
                    }}
                    className="border-neutral-700 text-neutral-300"
                  >
                    New Analysis
                  </Button>
                  <Button
                    onClick={() => {
                      // Convert analysis to mission
                      const missionData = {
                        title: 'Hire Required Positions',
                        description: `Based on business plan analysis, hire the following positions: ${positionAnalysis.map(p => p.position).join(', ')}`,
                        category: 'business',
                        priority: 'high',
                        budget: positionAnalysis.reduce((sum, p) => sum + p.estimatedSalary, 0),
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      };
                      onSubmit?.(missionData);
                      onClose();
                    }}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Create Hiring Mission
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 