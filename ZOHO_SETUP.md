# Zoho Integration Setup Guide

This guide will help you set up Zoho Mail and Calendar integration with the AI Pulse system.

## Prerequisites

1. A Zoho account with Mail and Calendar access
2. Access to Zoho API Console (https://api-console.zoho.com/)

## Step 1: Create Zoho OAuth Application

1. Go to [Zoho API Console](https://api-console.zoho.com/)
2. Click **"Add Client"** or **"Create Client"**
3. Select **"Server-based Applications"**
4. Fill in the application details:
   - **Client Name**: ReadyAimGo Pulse
   - **Homepage URL**: `https://your-domain.com` (or your app URL)
   - **Authorized Redirect URIs**: 
     - `https://your-domain.com/auth/zoho/callback` (for production)
     - `http://localhost:3000/auth/zoho/callback` (for development)
5. **Scopes** - Select the following scopes:
   - `ZohoMail.messages.READ` - Read emails
   - `ZohoMail.messages.CREATE` - Send emails (optional)
   - `ZohoCalendar.calendar.READ` - Read calendar events
   - `ZohoCalendar.calendar.CREATE` - Create calendar events (optional)
6. Click **"Create"**
7. Copy the **Client ID** and **Client Secret**

## Step 2: Generate Refresh Token

### Option A: Using Zoho OAuth Playground (Recommended)

1. Go to [Zoho OAuth Playground](https://accounts.zoho.com/oauthplayground/)
2. Select your application from the dropdown
3. Select the scopes mentioned above
4. Click **"Generate Code"**
5. Copy the generated code
6. Click **"Generate Access Token"**
7. Copy the **Refresh Token** (this is what you need for long-term access)

### Option B: Using OAuth Flow in Your App

1. Construct the authorization URL with correct scopes:
   ```
   https://accounts.zoho.com/oauth/v2/auth?scope=ZohoMail.messages.READ,ZohoMail.folders.READ,ZohoMail.accounts.READ,ZohoCalendar.events.READ&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=https://readyaimgo.biz/api/pulse/zoho-callback
   ```
   
   **Note**: If your Zoho account is not US-based, use the appropriate domain:
   - **EU**: `https://accounts.zoho.eu/oauth/v2/auth?scope=...`
   - **IN**: `https://accounts.zoho.in/oauth/v2/auth?scope=...`
   - **AU**: `https://accounts.zoho.com.au/oauth/v2/auth?scope=...`
2. Visit the URL in your browser
3. Authorize the application
4. You'll be redirected to your callback URL with a `code` parameter
5. Exchange the code for tokens:
   ```bash
   curl -X POST https://accounts.zoho.com/oauth/v2/token \
     -d "grant_type=authorization_code" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=YOUR_REDIRECT_URI" \
     -d "code=CODE_FROM_CALLBACK"
   ```
6. Save the `refresh_token` from the response

## Step 3: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Zoho OAuth credentials
ZOHO_CLIENT_ID=your_zoho_client_id_here
ZOHO_CLIENT_SECRET=your_zoho_client_secret_here
ZOHO_REFRESH_TOKEN=your_zoho_refresh_token_here

# Optional: Custom account and calendar IDs
# ZOHO_ACCOUNT_ID=me  # Default: 'me' for primary account
# ZOHO_CALENDAR_ID=primary  # Default: 'primary' calendar
```

## Step 4: Verify Zoho Data Center

⚠️ **Important**: Zoho uses different API endpoints based on your data center:

- **US**: `https://mail.zoho.com` and `https://calendar.zoho.com`
- **EU**: `https://mail.zoho.eu` and `https://calendar.zoho.eu`
- **IN**: `https://mail.zoho.in` and `https://calendar.zoho.in`
- **AU**: `https://mail.zoho.com.au` and `https://calendar.zoho.com.au`

If you're using a non-US data center, you may need to update the API endpoints in:
- `app/api/pulse/zoho-mail/route.ts`
- `app/api/pulse/zoho-calendar/route.ts`

Update the base URLs in these files to match your data center.

## Step 5: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/dashboard/settings` and check if Zoho credentials show as "configured"

3. Test the API endpoints:
   - `/api/pulse/zoho-mail` - Should return recent emails
   - `/api/pulse/zoho-calendar` - Should return upcoming calendar events

4. Check the main Pulse feed at `/api/pulse` - Zoho events should appear alongside other sources

## Troubleshooting

### "Failed to refresh Zoho token"
- Verify your refresh token is correct
- Check that your client ID and secret match
- Ensure the refresh token hasn't expired (regenerate if needed)

### "Zoho OAuth not configured"
- Verify all environment variables are set in `.env.local`
- Restart your development server after adding environment variables

### "Zoho Mail API error" or "Zoho Calendar API error"
- Check your data center and update API endpoints if needed
- Verify your account has Mail/Calendar access enabled
- Check that the required scopes were granted during OAuth
- Review the API response error message in server logs

### API Returns Empty Results
- Verify your account has emails/calendar events
- Check that the account ID matches your Zoho account
- Try using a different calendar ID if you have multiple calendars

## API Endpoints Created

- `GET /api/pulse/zoho-mail` - Fetches recent emails from Zoho Mail
- `GET /api/pulse/zoho-calendar` - Fetches upcoming events from Zoho Calendar
- `GET /api/pulse` - Main Pulse endpoint (includes Zoho data)

## Next Steps

Once Zoho is configured, the AI Pulse system will automatically:
- Fetch emails from Zoho Mail (unread and recent)
- Fetch calendar events from Zoho Calendar (next 7 days)
- Include Zoho data in AI-powered summaries
- Categorize events by project/client
- Provide priority assessments and action recommendations

The system will process Zoho data alongside Gmail, Google Calendar, GitHub, Vercel, Slack, and Stripe data to give you a comprehensive view of your operations.


