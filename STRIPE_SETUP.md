# Stripe Integration Setup

## Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_... # Your webhook secret

# Supabase Admin Key (for webhook)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Stripe Webhook Setup

1. **Go to Stripe Dashboard** → Webhooks
2. **Add endpoint**: `https://your-domain.com/api/stripe/webhook`
3. **Select events**:
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded`
   - `charge.succeeded`
4. **Copy webhook secret** to `STRIPE_WEBHOOK_SECRET`

## Database Setup

1. **Run the revenue tracking migration**:
   ```sql
   -- Copy and paste the contents of database/create-revenue-tracking.sql
   ```

2. **Test with sample data**:
   ```sql
   -- Copy and paste the contents of database/test-revenue-data.sql
   -- Replace 'your-client-id' with your actual client ID
   ```

## How It Works

### Revenue Flow:
1. **Client makes payment** → Stripe processes payment
2. **Stripe webhook** → Sends event to `/api/stripe/webhook`
3. **Webhook handler** → Saves revenue event to `revenue_events` table
4. **Database trigger** → Automatically updates `revenue_summary` table
5. **Dashboard** → Real-time updates via Supabase subscriptions

### Revenue Display:
- **Subscription mode**: Shows monthly revenue
- **Revenue share mode**: Shows total revenue to date
- **Progress bar**: Shows progress toward quarterly threshold
- **Last payment date**: Shows when last payment was received

## Testing

1. **Add test data** using the test script
2. **Check dashboard** - revenue card should show real data
3. **Test webhook** - make a test payment in Stripe
4. **Verify real-time updates** - dashboard should update automatically

## Troubleshooting

### Common Issues:
- **Webhook not receiving events**: Check webhook URL and secret
- **Revenue not showing**: Check client_id in payment metadata
- **Database errors**: Ensure tables and functions are created
- **Real-time not working**: Check Supabase subscriptions

### Debug Steps:
1. Check browser console for errors
2. Check Stripe webhook logs
3. Check Supabase logs
4. Verify database tables exist
5. Test webhook endpoint manually 