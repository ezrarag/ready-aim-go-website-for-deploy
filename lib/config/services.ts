// Service configuration for external APIs
// This file manages API keys and tokens for Slack, GitHub, and other services

export interface ServiceConfig {
  slack?: {
    token?: string;
    webhookUrl?: string;
    defaultChannel?: string;
  };
  github?: {
    token?: string;
    apiVersion?: string;
  };
  stripe?: {
    publishableKey?: string;
    secretKey?: string;
    webhookSecret?: string;
  };
}

// Get configuration from environment variables
export function getServiceConfig(): ServiceConfig {
  return {
    slack: {
      token: process.env.NEXT_PUBLIC_SLACK_TOKEN,
      webhookUrl: process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL,
      defaultChannel: process.env.NEXT_PUBLIC_SLACK_DEFAULT_CHANNEL || '#client-missions'
    },
    github: {
      token: process.env.NEXT_PUBLIC_GITHUB_TOKEN,
      apiVersion: '2022-11-28'
    },
    stripe: {
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    }
  };
}

// Initialize services with configuration
export function initializeServices() {
  const config = getServiceConfig();
  
  // Log configuration status (without exposing tokens)
  console.log('Service Configuration Status:');
  console.log('- Slack:', config.slack?.token ? 'Configured' : 'Not configured');
  console.log('- GitHub:', config.github?.token ? 'Configured' : 'Not configured');
  console.log('- Stripe:', config.stripe?.publishableKey ? 'Configured' : 'Not configured');
  
  return config;
} 