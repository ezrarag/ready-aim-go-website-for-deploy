# Environment Variables Setup Guide

## Overview

This guide will help you set up all the necessary environment variables for the Ready Aim Go project. The application uses multiple third-party services that require API keys and configuration.

## Quick Start

1. Copy `env.example` to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Replace the placeholder values in `.env.local` with your actual API keys and configuration.

## Required Environment Variables

### 🔥 Critical (Required for basic functionality)

#### Supabase Configuration
- **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Your Supabase anonymous key
- **SUPABASE_SERVICE_ROLE_KEY**: Your Supabase service role key

**How to get these:**
1. Go to your Supabase dashboard
2. Navigate to Settings → API
3. Copy the Project URL and anon/public key
4. For the service role key, use the `service_role` key (keep this secret!)

#### Application Configuration
- **NEXT_PUBLIC_APP_URL**: Your application's base URL (e.g., `http://localhost:3000` for development)

### 💳 Payment Processing (Required for subscriptions)

#### Stripe Configuration
- **STRIPE_SECRET_KEY**: Your Stripe secret key
- **STRIPE_WEBHOOK_SECRET**: Your Stripe webhook secret
- **STRIPE_PRICE_ID**: Your Stripe price ID for subscriptions

**How to get these:**
1. Go to your Stripe dashboard
2. Navigate to Developers → API keys
3. Copy the secret key (starts with `sk_test_` for test mode)
4. Create a webhook endpoint and copy the signing secret
5. Create a product/price in Stripe and copy the price ID

### 🤖 AI Features (Required for intake analysis)

#### OpenAI Configuration
- **OPENAI_API_KEY**: Your OpenAI API key

**How to get this:**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys
3. Create a new API key

### 📱 Notifications (Optional but recommended)

#### Push Notifications
- **NEXT_PUBLIC_VAPID_KEY**: Your VAPID public key

**How to get this:**
1. Generate VAPID keys using a tool like [web-push-certs](https://web-push-codelab.glitch.me/)
2. Use the public key for this variable

#### Apple Business Chat
- **APPLE_BUSINESS_ID**: Your Apple Business Chat business ID
- **APPLE_TEAM_ID**: Your Apple Business Chat team ID
- **APPLE_KEY_ID**: Your Apple Business Chat key ID
- **APPLE_BUSINESS_CHAT_TOKEN**: Your Apple Business Chat token
- **NEXT_PUBLIC_APPLE_BUSINESS_ID**: Your Apple Business Chat public business ID

**How to get these:**
1. Set up Apple Business Chat in your Apple Developer account
2. Configure your business chat integration
3. Copy the relevant IDs and tokens

### 🔗 Integrations (Optional)

#### Slack Integration
- **SLACK_BOT_TOKEN**: Your Slack bot token

**How to get this:**
1. Create a Slack app in your workspace
2. Add bot token scopes
3. Copy the bot token (starts with `xoxb-`)

#### GitHub Integration
- **GITHUB_TOKEN**: Your GitHub personal access token

**How to get this:**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with appropriate scopes
3. Copy the token

## Environment Variable Categories

### Public Variables (Client-side)
Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_VAPID_KEY`
- `NEXT_PUBLIC_APPLE_BUSINESS_ID`

### Private Variables (Server-side only)
These are only available on the server and should never be exposed:
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `SLACK_BOT_TOKEN`
- `GITHUB_TOKEN`
- All Apple Business Chat tokens

## Development vs Production

### Development
For local development, you can use test keys and localhost URLs:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
```

### Production
For production, use live keys and your actual domain:
```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
STRIPE_SECRET_KEY=sk_live_...
```

## Security Best Practices

1. **Never commit `.env.local` to version control**
2. **Use different keys for development and production**
3. **Rotate keys regularly**
4. **Use environment-specific files**:
   - `.env.local` for local development
   - `.env.production` for production builds
   - Environment variables in your hosting platform

## Troubleshooting

### Common Issues

1. **"Environment variable not found"**
   - Make sure you've created `.env.local` (not `.env`)
   - Restart your development server after adding variables

2. **"Invalid API key"**
   - Double-check your API keys
   - Ensure you're using the correct environment (test vs live)

3. **"CORS errors"**
   - Verify your `NEXT_PUBLIC_APP_URL` is correct
   - Check your Supabase CORS settings

### Verification

To verify your environment variables are loaded correctly:

1. Check the browser console for any missing `NEXT_PUBLIC_` variables
2. Check the server logs for any missing server-side variables
3. Test each integration individually

## Next Steps

After setting up your environment variables:

1. Run the database setup script (see `DATABASE_SETUP.md`)
2. Start your development server: `npm run dev`
3. Test the application functionality
4. Deploy to your hosting platform and configure production environment variables

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all required variables are set
3. Check the application logs for specific error messages
4. Refer to the individual service documentation for API key setup 