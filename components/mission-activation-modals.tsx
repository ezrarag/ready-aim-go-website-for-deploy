import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Globe, 
  Monitor, 
  BarChart3, 
  MapPin, 
  Truck, 
  FileText,
  Brain,
  Target,
  Zap,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Users,
  Settings
} from 'lucide-react';

interface MissionModalProps {
  open: boolean;
  onClose: () => void;
  systemType: 'website' | 'app' | 'business_plan' | 'real_estate' | 'transportation' | 'filing_system';
}

export function WebsiteMissionModal({ open, onClose }: MissionModalProps) {
  const [formData, setFormData] = useState({
    domain: '',
    purpose: '',
    targetAudience: '',
    features: '',
    budget: '',
    timeline: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Submit to Supabase
    console.log('Website mission:', formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <Globe className="w-6 h-6 text-orange-500" />
            Activate Website System
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Launch your website mission with AI-powered optimization
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="domain" className="text-sm text-neutral-300">Domain/URL</Label>
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => setFormData({...formData, domain: e.target.value})}
                placeholder="yourdomain.com"
                className="bg-neutral-800 border-neutral-600 text-white mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="purpose" className="text-sm text-neutral-300">Website Purpose</Label>
              <Select value={formData.purpose} onValueChange={(value) => setFormData({...formData, purpose: value})}>
                <SelectTrigger className="bg-neutral-800 border-neutral-600 text-white mt-1">
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portfolio">Portfolio</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
                  <SelectItem value="blog">Blog</SelectItem>
                  <SelectItem value="landing">Landing Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="targetAudience" className="text-sm text-neutral-300">Target Audience</Label>
            <Input
              id="targetAudience"
              value={formData.targetAudience}
              onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
              placeholder="Who is your target audience?"
              className="bg-neutral-800 border-neutral-600 text-white mt-1"
            />
          </div>

          <div>
            <Label htmlFor="features" className="text-sm text-neutral-300">Key Features Needed</Label>
            <Textarea
              id="features"
              value={formData.features}
              onChange={(e) => setFormData({...formData, features: e.target.value})}
              placeholder="List the main features you need..."
              className="bg-neutral-800 border-neutral-600 text-white mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget" className="text-sm text-neutral-300">Budget Range</Label>
              <Select value={formData.budget} onValueChange={(value) => setFormData({...formData, budget: value})}>
                <SelectTrigger className="bg-neutral-800 border-neutral-600 text-white mt-1">
                  <SelectValue placeholder="Select budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">$500 - $1,500</SelectItem>
                  <SelectItem value="standard">$1,500 - $5,000</SelectItem>
                  <SelectItem value="premium">$5,000 - $15,000</SelectItem>
                  <SelectItem value="enterprise">$15,000+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timeline" className="text-sm text-neutral-300">Timeline</Label>
              <Select value={formData.timeline} onValueChange={(value) => setFormData({...formData, timeline: value})}>
                <SelectTrigger className="bg-neutral-800 border-neutral-600 text-white mt-1">
                  <SelectValue placeholder="Select timeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">1-2 weeks</SelectItem>
                  <SelectItem value="standard">3-4 weeks</SelectItem>
                  <SelectItem value="flexible">1-2 months</SelectItem>
                  <SelectItem value="long-term">3+ months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-neutral-600 text-neutral-300">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
              <Zap className="w-4 h-4 mr-2" />
              Launch Mission
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AppMissionModal({ open, onClose }: MissionModalProps) {
  const [formData, setFormData] = useState({
    appName: '',
    platform: '',
    category: '',
    features: '',
    targetUsers: '',
    monetization: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('App mission:', formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <Monitor className="w-6 h-6 text-blue-500" />
            Activate App Development
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Launch your app development mission with AI assistance
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="appName" className="text-sm text-neutral-300">App Name</Label>
            <Input
              id="appName"
              value={formData.appName}
              onChange={(e) => setFormData({...formData, appName: e.target.value})}
              placeholder="My Awesome App"
              className="bg-neutral-800 border-neutral-600 text-white mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platform" className="text-sm text-neutral-300">Platform</Label>
              <Select value={formData.platform} onValueChange={(value) => setFormData({...formData, platform: value})}>
                <SelectTrigger className="bg-neutral-800 border-neutral-600 text-white mt-1">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ios">iOS</SelectItem>
                  <SelectItem value="android">Android</SelectItem>
                  <SelectItem value="cross-platform">Cross-Platform</SelectItem>
                  <SelectItem value="web-app">Web App</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category" className="text-sm text-neutral-300">App Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger className="bg-neutral-800 border-neutral-600 text-white mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="utility">Utility</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="features" className="text-sm text-neutral-300">Key Features</Label>
            <Textarea
              id="features"
              value={formData.features}
              onChange={(e) => setFormData({...formData, features: e.target.value})}
              placeholder="Describe the main features of your app..."
              className="bg-neutral-800 border-neutral-600 text-white mt-1"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetUsers" className="text-sm text-neutral-300">Target Users</Label>
              <Input
                id="targetUsers"
                value={formData.targetUsers}
                onChange={(e) => setFormData({...formData, targetUsers: e.target.value})}
                placeholder="Who will use this app?"
                className="bg-neutral-800 border-neutral-600 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="monetization" className="text-sm text-neutral-300">Monetization</Label>
              <Select value={formData.monetization} onValueChange={(value) => setFormData({...formData, monetization: value})}>
                <SelectTrigger className="bg-neutral-800 border-neutral-600 text-white mt-1">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Paid App</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="ads">Ad-Supported</SelectItem>
                  <SelectItem value="freemium">Freemium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-neutral-600 text-neutral-300">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              <Zap className="w-4 h-4 mr-2" />
              Launch Mission
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BusinessPlanMissionModal({ open, onClose }: MissionModalProps) {
  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    model: '',
    targetMarket: '',
    goals: '',
    challenges: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Business plan mission:', formData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-red-500" />
            Activate Business Plan AI
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Create your AI-powered business strategy and planning system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="businessName" className="text-sm text-neutral-300">Business Name</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => setFormData({...formData, businessName: e.target.value})}
              placeholder="Your Business Name"
              className="bg-neutral-800 border-neutral-600 text-white mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="industry" className="text-sm text-neutral-300">Industry</Label>
              <Select value={formData.industry} onValueChange={(value) => setFormData({...formData, industry: value})}>
                <SelectTrigger className="bg-neutral-800 border-neutral-600 text-white mt-1">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="model" className="text-sm text-neutral-300">Business Model</Label>
              <Select value={formData.model} onValueChange={(value) => setFormData({...formData, model: value})}>
                <SelectTrigger className="bg-neutral-800 border-neutral-600 text-white mt-1">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="b2b">B2B</SelectItem>
                  <SelectItem value="b2c">B2C</SelectItem>
                  <SelectItem value="marketplace">Marketplace</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="franchise">Franchise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="targetMarket" className="text-sm text-neutral-300">Target Market</Label>
            <Input
              id="targetMarket"
              value={formData.targetMarket}
              onChange={(e) => setFormData({...formData, targetMarket: e.target.value})}
              placeholder="Describe your target market..."
              className="bg-neutral-800 border-neutral-600 text-white mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="goals" className="text-sm text-neutral-300">Business Goals</Label>
              <Textarea
                id="goals"
                value={formData.goals}
                onChange={(e) => setFormData({...formData, goals: e.target.value})}
                placeholder="What are your main business goals?"
                className="bg-neutral-800 border-neutral-600 text-white mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="challenges" className="text-sm text-neutral-300">Key Challenges</Label>
              <Textarea
                id="challenges"
                value={formData.challenges}
                onChange={(e) => setFormData({...formData, challenges: e.target.value})}
                placeholder="What challenges are you facing?"
                className="bg-neutral-800 border-neutral-600 text-white mt-1"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-neutral-600 text-neutral-300">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white">
              <Brain className="w-4 h-4 mr-2" />
              Launch AI Strategy
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Placeholder modals for other systems
export function RealEstateMissionModal({ open, onClose }: MissionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <MapPin className="w-6 h-6 text-green-500" />
            Real Estate Portal Mission
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Real estate portal activation coming soon...
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-8">
          <MapPin className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-neutral-400">Real Estate Portal mission system will be implemented soon.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TransportationMissionModal({ open, onClose }: MissionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <Truck className="w-6 h-6 text-purple-500" />
            Transportation Network Mission
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Transportation network activation coming soon...
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-8">
          <Truck className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <p className="text-neutral-400">Transportation Network mission system will be implemented soon.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FilingSystemMissionModal({ open, onClose }: MissionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <FileText className="w-6 h-6 text-yellow-500" />
            Legal Filing System Mission
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Legal filing system activation coming soon...
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-8">
          <FileText className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <p className="text-neutral-400">Legal Filing System mission system will be implemented soon.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 