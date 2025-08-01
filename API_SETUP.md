# API Setup Guide

This guide helps you configure the necessary API tokens to enable real Slack and GitHub integration.

## 🔧 **GitHub API Setup**

### **Error**: `GitHub API error: 401`
This error occurs because the GitHub token is either missing, invalid, or expired.

### **Solution**:

1. **Create a GitHub Personal Access Token**:
   - Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Give it a name like "ReadyAimGo TODO.me Integration"
   - Select scopes:
     - `repo` (for private repositories)
     - `read:user` (for user information)
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again)

2. **Add to Environment Variables**:
   ```bash
   # Add to your .env.local file
   NEXT_PUBLIC_GITHUB_TOKEN=ghp_your_github_token_here
   ```

3. **Restart your development server**:
   ```bash
   npm run dev
   ```

### **What this enables**:
- ✅ Real TODO.md file fetching from GitHub repositories
- ✅ Live parsing of TODO items with priority and status
- ✅ Author and date extraction from TODO comments
- ✅ File path display for each TODO item

---

## 🔧 **Supabase Edge Functions Setup**

### **Error**: `FunctionsFetchError: Failed to send a request to the Edge Function`
This error occurs because the Edge Function is not deployed or not accessible.

### **Solution**:

1. **Deploy the Edge Function** (if not already done):
   ```bash
   # In your Supabase dashboard, go to Edge Functions
   # Deploy the revenue-metrics function
   ```

2. **Check Edge Function Status**:
   - Go to your Supabase dashboard
   - Navigate to Edge Functions
   - Ensure `revenue-metrics` is deployed and active

3. **Alternative**: The system will automatically fall back to mock data if the Edge Function is unavailable.

---

## 🔧 **Slack API Setup** (Optional)

### **To enable real Slack integration**:

1. **Create a Slack App**:
   - Go to [Slack API Apps](https://api.slack.com/apps)
   - Click "Create New App" → "From scratch"
   - Name it "ReadyAimGo Dashboard"
   - Select your workspace

2. **Configure Bot Token Scopes**:
   - Go to "OAuth & Permissions"
   - Add these scopes:
     - `chat:write` (send messages)
     - `channels:read` (read channel info)
     - `channels:history` (read message history)
   - Install the app to your workspace
   - Copy the "Bot User OAuth Token"

3. **Add to Environment Variables**:
   ```bash
   # Add to your .env.local file
   NEXT_PUBLIC_SLACK_TOKEN=xoxb_your_slack_bot_token_here
   NEXT_PUBLIC_SLACK_DEFAULT_CHANNEL=#client-missions
   ```

4. **Invite the bot to your channels**:
   - In Slack, invite `@your-bot-name` to the channels you want to use
   - Example: `/invite @readyaimgo-bot`

---

## 🔧 **Environment Variables Summary**

Add these to your `.env.local` file:

```bash
# GitHub Integration
NEXT_PUBLIC_GITHUB_TOKEN=ghp_your_github_token_here

# Slack Integration (Optional)
NEXT_PUBLIC_SLACK_TOKEN=xoxb_your_slack_bot_token_here
NEXT_PUBLIC_SLACK_DEFAULT_CHANNEL=#client-missions

# Existing Supabase and Stripe configs...
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

---

## 🔧 **Testing the Integration**

### **GitHub Integration**:
1. Open the website modal in the dashboard
2. Look for the "Live" badge next to "TODO.md - Developer Tasks"
3. If you see TODO items, the integration is working
4. If you see "No TODO.md files found", check that your repository has TODO.md files

### **Slack Integration**:
1. Open the AI Chat tab in the website modal
2. Look for the "Connected" badge next to "AI Assistant Chat"
3. Try sending a message or using the "Send to Design Team" button
4. Check your Slack channels for the messages

### **Revenue Data**:
1. The system will automatically fall back to mock data if the Edge Function fails
2. No configuration needed - it will work with or without the Edge Function

---

## 🔧 **Troubleshooting**

### **GitHub 401 Error**:
- ✅ Check that your token is valid and not expired
- ✅ Ensure the token has the correct scopes
- ✅ Verify the repository URL is correct
- ✅ Check that the repository has TODO.md files

### **Slack Connection Issues**:
- ✅ Verify the bot token is correct
- ✅ Ensure the bot is invited to the channels
- ✅ Check that the bot has the required permissions
- ✅ Verify the channel name format (#channel-name)

### **Edge Function Errors**:
- ✅ The system will automatically use fallback data
- ✅ No action required - the dashboard will still work
- ✅ Check Supabase dashboard for Edge Function status

---

## 🎯 **Current Status**

After adding the tokens:

- **GitHub Integration**: ✅ **LIVE** - Will fetch real TODO.me files
- **Slack Integration**: ✅ **LIVE** - Will send real messages to Slack
- **Revenue Data**: ✅ **FALLBACK** - Uses mock data when Edge Function unavailable
- **Error Handling**: ✅ **ROBUST** - Graceful fallbacks for all services

The system is designed to work with or without these tokens, providing a smooth experience in all scenarios! 🚀 