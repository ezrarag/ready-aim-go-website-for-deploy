import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Globe, 
  Smartphone, 
  Building2, 
  Truck, 
  Scale,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Plus,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { RoleExtractionModal } from './role-extraction-modal';

interface BusinessAsset {
  type: 'business_plan' | 'website' | 'app' | 'real_estate' | 'transportation' | 'legal_filing';
  name: string;
  value: string;
  status: 'completed' | 'pending' | 'not_started';
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface FirstTimeUserPopupProps {
  open: boolean;
  onClose: () => void;
  onComplete: (assets: BusinessAsset[]) => void;
  initialAssets?: BusinessAsset[];
}

export function FirstTimeUserPopup({ open, onClose, onComplete, initialAssets }: FirstTimeUserPopupProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [businessAssets, setBusinessAssets] = useState<BusinessAsset[]>(initialAssets || [
    {
      type: 'business_plan',
      name: 'Business Plan',
      value: '',
      status: 'not_started',
      description: 'Upload your business plan document for AI analysis',
      icon: <FileText className="w-5 h-5" />,
      color: 'text-red-500'
    },
    {
      type: 'website',
      name: 'Business Website',
      value: '',
      status: 'not_started',
      description: 'Enter your business website URL',
      icon: <Globe className="w-5 h-5" />,
      color: 'text-orange-500'
    },
    {
      type: 'app',
      name: 'Business App',
      value: '',
      status: 'not_started',
      description: 'Provide a link to your business app',
      icon: <Smartphone className="w-5 h-5" />,
      color: 'text-blue-500'
    },
    {
      type: 'real_estate',
      name: 'Real Estate Portal',
      value: '',
      status: 'not_started',
      description: 'Connect your real estate listings or portal',
      icon: <Building2 className="w-5 h-5" />,
      color: 'text-green-500'
    },
    {
      type: 'transportation',
      name: 'Transportation Network',
      value: '',
      status: 'not_started',
      description: 'Link your transportation or logistics network',
      icon: <Truck className="w-5 h-5" />,
      color: 'text-purple-500'
    },
    {
      type: 'legal_filing',
      name: 'Legal Filing System',
      value: '',
      status: 'not_started',
      description: 'Connect your legal documents and filing system',
      icon: <Scale className="w-5 h-5" />,
      color: 'text-yellow-500'
    }
  ]);

  const [businessPlanFile, setBusinessPlanFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [businessPlanText, setBusinessPlanText] = useState<string>('');
  const [showRoleExtraction, setShowRoleExtraction] = useState(false);

  // Update business assets when initialAssets changes
  useEffect(() => {
    if (initialAssets) {
      setBusinessAssets(initialAssets);
    }
  }, [initialAssets]);

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

  const handleAssetUpdate = (type: string, value: string) => {
    setBusinessAssets(prev => prev.map(asset => 
      asset.type === type 
        ? { ...asset, value, status: value ? 'completed' : 'pending' }
        : asset
    ));
  };

  const handleBusinessPlanUpload = async () => {
    if (!businessPlanFile) {
      toast.error('Please upload a business plan first.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Read the file content
      const text = await businessPlanFile.text();
      setBusinessPlanText(text);
      
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

      // Simulate file upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update business assets
      handleAssetUpdate('business_plan', businessPlanFile.name);
      setIsUploading(false);
      toast.success('Business plan uploaded and analyzed!');
      
      // Show role extraction option
      toast.success('Click "Extract Roles" to analyze job positions from your business plan!');
    } catch (error) {
      toast.error('Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  const handleComplete = () => {
    const completedAssets = businessAssets.filter(asset => asset.status === 'completed');
    if (completedAssets.length === 0) {
      toast.error('Please complete at least one business asset to continue.');
      return;
    }
    
    onComplete(businessAssets);
    onClose();
  };

  const getProgressPercentage = () => {
    const completed = businessAssets.filter(asset => asset.status === 'completed').length;
    return (completed / businessAssets.length) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'not_started': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      case 'not_started': return <Plus className="w-4 h-4" />;
      default: return <Plus className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-900 border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Welcome to ReadyAimGo!
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Let's set up your business profile. Complete the following sections to get started.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-neutral-400">Setup Progress</span>
            <span className="text-sm text-white">{Math.round(getProgressPercentage())}% Complete</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>

        {/* Business Assets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businessAssets.map((asset, index) => (
            <Card 
              key={asset.type}
              className={`bg-neutral-800 border-neutral-700 hover:border-orange-500/50 transition-all duration-300 cursor-pointer ${
                asset.status === 'completed' ? 'border-green-500/50' : ''
              }`}
              onClick={() => setCurrentStep(index)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`${asset.color}`}>
                      {asset.icon}
                    </div>
                    <div>
                      <CardTitle className="text-white text-sm">{asset.name}</CardTitle>
                      <p className="text-xs text-neutral-400">{asset.description}</p>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(asset.status)}`}></div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {asset.status === 'completed' ? (
                  <div className="flex items-center gap-2 text-green-500 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span className="truncate">{asset.value}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-neutral-400 text-sm">
                    <Plus className="w-4 h-4" />
                    <span>Click to add</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Asset Detail Modal */}
        {currentStep >= 0 && currentStep < businessAssets.length && (
          <div className="mt-6 p-4 bg-neutral-800 rounded border border-neutral-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`${businessAssets[currentStep].color}`}>
                  {businessAssets[currentStep].icon}
                </div>
                <div>
                  <h3 className="text-white font-medium">{businessAssets[currentStep].name}</h3>
                  <p className="text-sm text-neutral-400">{businessAssets[currentStep].description}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(-1)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {businessAssets[currentStep].type === 'business_plan' ? (
              /* Business Plan Upload */
              <div className="space-y-4">
                <div 
                  className="group border-2 border-dashed border-neutral-600 rounded-lg p-6 text-center transition-all duration-200 hover:border-neutral-500 hover:bg-neutral-800/50"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-blue-500', 'bg-blue-500/10');
                    const dragOverText = e.currentTarget.querySelector('#drag-over-text') as HTMLElement;
                    if (dragOverText) dragOverText.classList.add('opacity-100');
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-blue-500', 'bg-blue-500/10');
                    const dragOverText = e.currentTarget.querySelector('#drag-over-text') as HTMLElement;
                    if (dragOverText) dragOverText.classList.add('opacity-100');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    // Only remove the class if we're actually leaving the drop zone
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      e.currentTarget.classList.remove('border-blue-500', 'bg-blue-500/10');
                      const dragOverText = e.currentTarget.querySelector('#drag-over-text') as HTMLElement;
                      if (dragOverText) dragOverText.classList.remove('opacity-100');
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-500/10');
                    const dragOverText = e.currentTarget.querySelector('#drag-over-text') as HTMLElement;
                    if (dragOverText) dragOverText.classList.remove('opacity-100');
                    
                    const files = Array.from(e.dataTransfer.files);
                    if (files.length > 0) {
                      const file = files[0];
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
                  }}
                >
                  <Upload className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
                  <p className="text-white mb-2">Upload your business plan document</p>
                  <p className="text-sm text-neutral-400 mb-4">
                    Supported formats: PDF, Word, Text (Max 10MB)
                  </p>
                  <p className="text-xs text-neutral-500 mb-4">
                    Drag and drop your file here, or click to browse
                  </p>
                  <div className="text-xs text-blue-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    Drop your file here to upload
                  </div>
                  <div className="text-xs text-green-400 opacity-0 transition-opacity duration-200" id="drag-over-text">
                    Release to upload
                  </div>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="business-plan-upload"
                  />
                  <Label htmlFor="business-plan-upload" className="cursor-pointer">
                    <Button 
                      type="button"
                      variant="outline" 
                      className="border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                      onClick={() => document.getElementById('business-plan-upload')?.click()}
                    >
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
                  <div className="space-y-2">
                    <Button
                      onClick={handleBusinessPlanUpload}
                      disabled={isUploading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Business Plan
                        </>
                      )}
                    </Button>
                    
                    {businessPlanText && (
                      <Button
                        onClick={() => setShowRoleExtraction(true)}
                        variant="outline"
                        className="w-full border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Extract Job Roles
                      </Button>
                    )}
                  </div>
                )}

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">Uploading file...</span>
                      <span className="text-white">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}
              </div>
            ) : (
              /* URL/Text Input */
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`asset-${businessAssets[currentStep].type}`} className="text-white">
                    {businessAssets[currentStep].name} URL/Link
                  </Label>
                  <Input
                    id={`asset-${businessAssets[currentStep].type}`}
                    type="url"
                    placeholder={`Enter your ${businessAssets[currentStep].name.toLowerCase()} URL`}
                    value={businessAssets[currentStep].value}
                    onChange={(e) => handleAssetUpdate(businessAssets[currentStep].type, e.target.value)}
                    className="bg-neutral-700 border-neutral-600 text-white"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAssetUpdate(businessAssets[currentStep].type, 'https://example.com')}
                    variant="outline"
                    className="border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                  >
                    Add Example
                  </Button>
                  <Button
                    onClick={() => handleAssetUpdate(businessAssets[currentStep].type, '')}
                    variant="outline"
                    className="border-neutral-600 text-neutral-300 hover:bg-neutral-700"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-neutral-700">
          <div className="text-sm text-neutral-400">
            {businessAssets.filter(asset => asset.status === 'completed').length} of {businessAssets.length} completed
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-neutral-700 text-neutral-300"
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleComplete}
              disabled={businessAssets.filter(asset => asset.status === 'completed').length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Complete Setup
            </Button>
          </div>
        </div>
      </DialogContent>
      
      {/* Role Extraction Modal */}
      <RoleExtractionModal
        open={showRoleExtraction}
        onClose={() => setShowRoleExtraction(false)}
        onComplete={(roles) => {
          console.log('Extracted roles:', roles);
          toast.success(`Successfully extracted ${roles.length} job roles from your business plan!`);
          setShowRoleExtraction(false);
        }}
        businessPlanText={businessPlanText}
        fileName={businessPlanFile?.name}
      />
    </Dialog>
  );
} 