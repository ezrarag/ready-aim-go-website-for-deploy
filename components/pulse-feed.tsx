"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Brain, Clock, AlertCircle, CheckCircle, Info, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PulseProject {
  name: string;
  highlights: string[];
  nextAction?: string;
  priority: 'high' | 'medium' | 'low';
}

interface PulseData {
  summary: string;
  priorities: string[];
  risks: string[];
  finance: string[];
  meetings: string[];
  actions: Array<{
    action: string;
    owner: string;
    priority: 'high' | 'medium' | 'low';
    timeline: string;
  }>;
  byProject: PulseProject[];
  totalEvents: number;
  lastUpdated: string;
  error?: string;
}

const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200'
};

const priorityIcons = {
  high: AlertCircle,
  medium: Clock,
  low: CheckCircle
};

export function PulseFeed() {
  const [pulseData, setPulseData] = useState<PulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchPulseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/pulse');
      const data = await response.json();
      
      if (response.ok) {
        setPulseData(data);
        setLastRefresh(new Date());
      } else {
        setError(data.error || 'Failed to fetch Pulse data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPulseData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchPulseData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading && !pulseData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Pulse Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading AI insights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Pulse Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <span className="ml-2">{error}</span>
          </div>
          <Button onClick={fetchPulseData} variant="outline" className="w-full mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!pulseData) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Pulse Feed
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {pulseData.totalEvents} events
            </Badge>
            <Button
              onClick={fetchPulseData}
              variant="ghost"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Last updated: {formatTimeAgo(pulseData.lastUpdated)}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Summary */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Executive Summary</h4>
              <p className="text-sm text-blue-800 mt-1">{pulseData.summary}</p>
            </div>
          </div>
        </div>

        {/* Top Priorities */}
        {pulseData.priorities && pulseData.priorities.length > 0 && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Top Priorities</h4>
                <ul className="mt-2 space-y-1">
                  {pulseData.priorities.slice(0, 5).map((priority, index) => (
                    <li key={index} className="text-sm text-red-800 flex items-start gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                      {priority}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Finance Highlights */}
        {pulseData.finance && pulseData.finance.length > 0 && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">Finance Highlights</h4>
                <ul className="mt-2 space-y-1">
                  {pulseData.finance.slice(0, 3).map((item, index) => (
                    <li key={index} className="text-sm text-green-800 flex items-start gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Risks & Blockers */}
        {pulseData.risks && pulseData.risks.length > 0 && (
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Risks & Blockers</h4>
                <ul className="mt-2 space-y-1">
                  {pulseData.risks.slice(0, 3).map((risk, index) => (
                    <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Actions */}
        {pulseData.actions && pulseData.actions.length > 0 && (
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">Suggested Actions</h4>
                <div className="mt-2 space-y-2">
                  {pulseData.actions.slice(0, 3).map((action, index) => (
                    <div key={index} className="text-sm text-purple-800">
                      <div className="font-medium">{action.action}</div>
                      <div className="text-xs text-purple-600 mt-1">
                        Owner: {action.owner} • Timeline: {action.timeline}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects */}
        <AnimatePresence>
          {pulseData.byProject.map((project, index) => {
            const PriorityIcon = priorityIcons[project.priority];
            
            return (
              <motion.div
                key={project.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        <Badge className={priorityColors[project.priority]}>
                          <PriorityIcon className="h-3 w-3 mr-1" />
                          {project.priority}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Highlights */}
                    <div className="space-y-2 mb-4">
                      {project.highlights.map((highlight, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{highlight}</p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Next Action */}
                    {project.nextAction && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-start gap-2">
                          <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-amber-800">Next Action</p>
                            <p className="text-sm text-amber-700">{project.nextAction}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {pulseData.byProject.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity detected</p>
            <p className="text-sm">AI Pulse is monitoring your data sources...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
