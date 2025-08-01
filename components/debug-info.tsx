// Debug component to show integration status
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getServiceConfig } from '@/lib/config/services';

interface DebugInfoProps {
  githubUrl?: string;
  slackChannel?: string;
}

export function DebugInfo({ githubUrl, slackChannel }: DebugInfoProps) {
  const config = getServiceConfig();
  
  const githubTokenStatus = config.github?.token ? 'Configured' : 'Not configured';
  const slackTokenStatus = config.slack?.token ? 'Configured' : 'Not configured';
  
  return (
    <Card className="bg-neutral-800 border-neutral-700">
      <CardHeader>
        <CardTitle className="text-white">Debug Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-neutral-300 mb-2">GitHub Integration</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Token Status:</span>
                <Badge className={config.github?.token ? 'bg-green-600' : 'bg-red-600'}>
                  {githubTokenStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Repository URL:</span>
                <span className="text-neutral-300">{githubUrl || 'Not set'}</span>
              </div>
              {config.github?.token && (
                <div className="text-green-400 text-xs">
                  ✅ GitHub API ready
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-neutral-300 mb-2">Slack Integration</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Token Status:</span>
                <Badge className={config.slack?.token ? 'bg-green-600' : 'bg-red-600'}>
                  {slackTokenStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Channel:</span>
                <span className="text-neutral-300">{slackChannel || 'Not set'}</span>
              </div>
              {config.slack?.token && (
                <div className="text-green-400 text-xs">
                  ✅ Slack API ready
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-xs text-neutral-500">
          <p>Check browser console for detailed logs about API calls.</p>
          <p>GitHub searches for: filename:TODO.md</p>
          <p>Slack sends to: {slackChannel || '#client-missions'}</p>
        </div>
      </CardContent>
    </Card>
  );
} 