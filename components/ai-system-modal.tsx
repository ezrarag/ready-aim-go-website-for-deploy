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
  Brain, 
  Globe, 
  Monitor, 
  BarChart3, 
  MapPin, 
  Truck, 
  FileText,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  Target,
  Zap,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface AISystemModalProps {
  open: boolean;
  onClose: () => void;
  systemType: 'website' | 'app' | 'business_plan' | 'real_estate' | 'transportation' | 'filing_system';
  systemName: string;
  currentData?: any;
}

interface AIAnalysis {
  status: 'analyzing' | 'complete' | 'error';
  insights: string[];
  recommendations: string[];
  metrics: {
    performance: number;
    optimization: number;
    growth: number;
  };
}

export function AISystemModal({ open, onClose, systemType, systemName, currentData }: AISystemModalProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState('');

  const systemConfigs = {
    website: {
      icon: Globe,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      title: 'Website AI Analysis',
      description: 'AI-powered website optimization and performance analysis',
      capabilities: [
        'SEO optimization recommendations',
        'Performance analysis and speed improvements',
        'User experience optimization',
        'Content strategy suggestions',
        'Conversion rate optimization'
      ]
    },
    app: {
      icon: Monitor,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      title: 'App Development AI',
      description: 'AI-assisted app development and optimization',
      capabilities: [
        'Code review and optimization',
        'Feature recommendation engine',
        'User interface improvements',
        'Performance monitoring',
        'Security analysis'
      ]
    },
    business_plan: {
      icon: BarChart3,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      title: 'Business Plan AI',
      description: 'AI-powered business strategy and planning',
      capabilities: [
        'Market analysis and insights',
        'Revenue model optimization',
        'Competitive analysis',
        'Growth strategy planning',
        'Risk assessment and mitigation'
      ]
    },
    real_estate: {
      icon: MapPin,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      title: 'Real Estate AI',
      description: 'AI-driven real estate market analysis',
      capabilities: [
        'Market trend analysis',
        'Property valuation insights',
        'Investment opportunity identification',
        'Portfolio optimization',
        'Risk assessment'
      ]
    },
    transportation: {
      icon: Truck,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      title: 'Transportation AI',
      description: 'AI-powered logistics and transportation optimization',
      capabilities: [
        'Route optimization',
        'Fleet management insights',
        'Cost analysis and reduction',
        'Performance monitoring',
        'Predictive maintenance'
      ]
    },
    filing_system: {
      icon: FileText,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      title: 'Legal Filing AI',
      description: 'AI-assisted legal document management',
      capabilities: [
        'Document analysis and review',
        'Compliance monitoring',
        'Risk assessment',
        'Process automation',
        'Legal research assistance'
      ]
    }
  };

  const config = systemConfigs[systemType];
  const IconComponent = config.icon;

  const runAIAnalysis = async () => {
    setLoading(true);
    setAnalysis({
      status: 'analyzing',
      insights: [],
      recommendations: [],
      metrics: { performance: 0, optimization: 0, growth: 0 }
    });

    // Simulate AI analysis
    setTimeout(() => {
      setAnalysis({
        status: 'complete',
        insights: [
          `${systemName} shows strong potential for optimization`,
          'User engagement metrics indicate room for improvement',
          'Performance bottlenecks identified in key areas',
          'Market opportunities detected for expansion'
        ],
        recommendations: [
          'Implement advanced analytics tracking',
          'Optimize user experience flow',
          'Enhance security protocols',
          'Expand feature set based on user feedback'
        ],
        metrics: {
          performance: 75,
          optimization: 82,
          growth: 68
        }
      });
      setLoading(false);
    }, 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-neutral-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <IconComponent className={`w-6 h-6 ${config.color}`} />
            </div>
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Capabilities */}
          <Card className="bg-neutral-800 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-orange-500" />
                AI Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {config.capabilities.map((capability, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-neutral-300">{capability}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis Section */}
          <Card className="bg-neutral-800 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button 
                  onClick={runAIAnalysis}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Run AI Analysis
                    </>
                  )}
                </Button>
                <Button variant="outline" className="border-neutral-600 text-neutral-300">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Ask AI Question
                </Button>
              </div>

              {analysis && (
                <div className="space-y-4">
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-500">{analysis.metrics.performance}%</div>
                      <div className="text-xs text-neutral-400">Performance</div>
                      <Progress value={analysis.metrics.performance} className="h-2 mt-2" />
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">{analysis.metrics.optimization}%</div>
                      <div className="text-xs text-neutral-400">Optimization</div>
                      <Progress value={analysis.metrics.optimization} className="h-2 mt-2" />
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-500">{analysis.metrics.growth}%</div>
                      <div className="text-xs text-neutral-400">Growth</div>
                      <Progress value={analysis.metrics.growth} className="h-2 mt-2" />
                    </div>
                  </div>

                  {/* Insights */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      AI Insights
                    </h4>
                    <div className="space-y-2">
                      {analysis.insights.map((insight, index) => (
                        <div key={index} className="text-sm text-neutral-300 bg-neutral-700 p-3 rounded">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-500" />
                      AI Recommendations
                    </h4>
                    <div className="space-y-2">
                      {analysis.recommendations.map((rec, index) => (
                        <div key={index} className="text-sm text-neutral-300 bg-neutral-700 p-3 rounded">
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Input */}
          <Card className="bg-neutral-800 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white">Ask AI Assistant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="ai-input" className="text-sm text-neutral-300">
                  What would you like to know about {systemName}?
                </Label>
                <Textarea
                  id="ai-input"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask about optimization, performance, or strategy..."
                  className="bg-neutral-700 border-neutral-600 text-white placeholder:text-neutral-500 mt-2"
                  rows={3}
                />
              </div>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                <Brain className="w-4 h-4 mr-2" />
                Ask AI
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="border-neutral-600 text-neutral-300">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 