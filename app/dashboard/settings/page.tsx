"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Save,
  TestTube,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard-layout';

interface ApiKey {
  name: string;
  key: string;
  status: 'configured' | 'missing' | 'invalid';
  description: string;
  required: boolean;
}

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchApiKeyStatus();
  }, []);

  const fetchApiKeyStatus = async () => {
    try {
      setLoading(true);
      
      // Check status of each API endpoint
      const endpoints = [
        { name: 'OpenAI', key: 'OPENAI_API_KEY', endpoint: '/api/pulse', required: true },
        { name: 'GitHub', key: 'GITHUB_TOKEN', endpoint: '/api/pulse/github', required: true },
        { name: 'Vercel', key: 'VERCEL_TOKEN', endpoint: '/api/pulse/vercel', required: true },
        { name: 'Google Client ID', key: 'GOOGLE_CLIENT_ID', endpoint: '/api/pulse/gmail', required: false },
        { name: 'Google Client Secret', key: 'GOOGLE_CLIENT_SECRET', endpoint: '/api/pulse/gmail', required: false },
        { name: 'Google Refresh Token', key: 'GOOGLE_REFRESH_TOKEN', endpoint: '/api/pulse/calendar', required: false },
        { name: 'Zoho Client ID', key: 'ZOHO_CLIENT_ID', endpoint: '/api/pulse/zoho-mail', required: false },
        { name: 'Zoho Client Secret', key: 'ZOHO_CLIENT_SECRET', endpoint: '/api/pulse/zoho-mail', required: false },
        { name: 'Zoho Refresh Token', key: 'ZOHO_REFRESH_TOKEN', endpoint: '/api/pulse/zoho-calendar', required: false },
        { name: 'Slack Bot Token', key: 'SLACK_BOT_TOKEN', endpoint: '/api/pulse/slack', required: false },
        { name: 'Stripe Secret Key', key: 'STRIPE_SECRET_KEY', endpoint: '/api/pulse/stripe', required: false },
      ];

      const keyStatuses: ApiKey[] = [];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.endpoint);
          const data = await response.json();
          
          keyStatuses.push({
            name: endpoint.name,
            key: endpoint.key,
            status: data.error || data.disabled ? 'missing' : 'configured',
            description: getDescription(endpoint.name),
            required: endpoint.required
          });
        } catch (error) {
          keyStatuses.push({
            name: endpoint.name,
            key: endpoint.key,
            status: 'missing',
            description: getDescription(endpoint.name),
            required: endpoint.required
          });
        }
      }

      setApiKeys(keyStatuses);
    } catch (error) {
      console.error('Error fetching API key status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDescription = (name: string) => {
    const descriptions: Record<string, string> = {
      'OpenAI': 'Required for AI Pulse summarization and insights',
      'GitHub': 'Required for repository and commit monitoring',
      'Vercel': 'Required for deployment status and live URLs',
      'Google Client ID': 'Required for Gmail and Calendar integration',
      'Google Client Secret': 'Required for Gmail and Calendar integration',
      'Google Refresh Token': 'Required for Gmail and Calendar integration',
      'Zoho Client ID': 'Required for Zoho Mail and Calendar integration',
      'Zoho Client Secret': 'Required for Zoho Mail and Calendar integration',
      'Zoho Refresh Token': 'Required for Zoho Mail and Calendar integration',
      'Slack Bot Token': 'Required for Slack message monitoring',
      'Stripe Secret Key': 'Required for financial insights and payment monitoring'
    };
    return descriptions[name] || 'API key configuration';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'missing': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'invalid': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'configured': return 'bg-green-100 text-green-800 border-green-200';
      case 'missing': return 'bg-red-100 text-red-800 border-red-200';
      case 'invalid': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const toggleKeyVisibility = (keyName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyName]: !prev[keyName]
    }));
  };

  const testApiKey = async (keyName: string) => {
    // This would test the specific API key
    console.log(`Testing ${keyName}...`);
  };

  const saveSettings = async () => {
    setSaving(true);
    // This would save the API keys to the environment
    console.log('Saving settings...');
    setTimeout(() => {
      setSaving(false);
    }, 2000);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const configuredCount = apiKeys.filter(k => k.status === 'configured').length;
  const requiredCount = apiKeys.filter(k => k.required).length;
  const configuredRequiredCount = apiKeys.filter(k => k.required && k.status === 'configured').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings & Configuration</h1>
            <p className="text-gray-600">Manage API keys and system integrations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchApiKeyStatus}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </div>

        {/* Configuration Status */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              Configuration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{configuredCount}/{apiKeys.length}</div>
                <div className="text-sm text-blue-700">API Keys Configured</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">{configuredRequiredCount}/{requiredCount}</div>
                <div className="text-sm text-blue-700">Required Keys</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {Math.round((configuredRequiredCount / requiredCount) * 100)}%
                </div>
                <div className="text-sm text-blue-700">System Ready</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={apiKey.key} className="font-medium">
                      {apiKey.name}
                    </Label>
                    {apiKey.required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                    <Badge className={getStatusColor(apiKey.status)}>
                      {getStatusIcon(apiKey.status)}
                      {apiKey.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleKeyVisibility(apiKey.key)}
                    >
                      {showKeys[apiKey.key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testApiKey(apiKey.key)}
                    >
                      <TestTube className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Input
                  id={apiKey.key}
                  type={showKeys[apiKey.key] ? 'text' : 'password'}
                  placeholder={`Enter your ${apiKey.name}...`}
                  className="font-mono"
                />
                <p className="text-sm text-gray-600">{apiKey.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-refresh">Auto-refresh Pulse Feed</Label>
                <p className="text-sm text-gray-600">Automatically update the Pulse feed every 5 minutes</p>
              </div>
              <Switch id="auto-refresh" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications">Email Notifications</Label>
                <p className="text-sm text-gray-600">Receive email alerts for high-priority items</p>
              </div>
              <Switch id="notifications" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="data-retention">Data Retention</Label>
                <p className="text-sm text-gray-600">Keep raw event data for 30 days (configurable)</p>
              </div>
              <Switch id="data-retention" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Core Integrations</h4>
                <div className="space-y-2">
                  {apiKeys.filter(k => k.required).map((apiKey) => (
                    <div key={apiKey.key} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm font-medium">{apiKey.name}</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(apiKey.status)}
                        <span className="text-xs capitalize">{apiKey.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Optional Integrations</h4>
                <div className="space-y-2">
                  {apiKeys.filter(k => !k.required).map((apiKey) => (
                    <div key={apiKey.key} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm font-medium">{apiKey.name}</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(apiKey.status)}
                        <span className="text-xs capitalize">{apiKey.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Security Notice</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  API keys are stored securely and never exposed to the client-side. 
                  All sensitive data is encrypted in transit and at rest.
                </p>
                <p className="text-xs text-yellow-700 mt-2">
                  For production deployment, use environment variables or secure key management services.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
