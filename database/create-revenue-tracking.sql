-- Create revenue tracking system for Stripe integration
-- This tracks revenue from Stripe webhooks and displays in the dashboard

-- Create revenue_events table to track all revenue
CREATE TABLE IF NOT EXISTS revenue_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'stripe', -- 'stripe', 'manual', 'other'
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create revenue_summary table for quick lookups
CREATE TABLE IF NOT EXISTS revenue_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  monthly_revenue DECIMAL(10,2) DEFAULT 0,
  quarterly_revenue DECIMAL(10,2) DEFAULT 0,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_revenue_events_client_id ON revenue_events(client_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_created_at ON revenue_events(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_events_status ON revenue_events(status);
CREATE INDEX IF NOT EXISTS idx_revenue_summary_client_id ON revenue_summary(client_id);

-- Add RLS policies
ALTER TABLE revenue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_summary ENABLE ROW LEVEL SECURITY;

-- Users can view their own revenue events
CREATE POLICY "Users can view their own revenue events" ON revenue_events
FOR SELECT USING (auth.uid() = client_id);

-- Users can insert their own revenue events (for manual entries)
CREATE POLICY "Users can insert their own revenue events" ON revenue_events
FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Users can view their own revenue summary
CREATE POLICY "Users can view their own revenue summary" ON revenue_summary
FOR SELECT USING (auth.uid() = client_id);

-- Function to update revenue summary
CREATE OR REPLACE FUNCTION update_revenue_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Update revenue summary when revenue events change
  INSERT INTO revenue_summary (client_id, total_revenue, monthly_revenue, quarterly_revenue, last_payment_date, last_updated)
  SELECT 
    client_id,
    COALESCE(SUM(amount), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN amount ELSE 0 END), 0) as monthly_revenue,
    COALESCE(SUM(CASE WHEN created_at >= date_trunc('quarter', NOW()) THEN amount ELSE 0 END), 0) as quarterly_revenue,
    MAX(created_at) as last_payment_date,
    NOW() as last_updated
  FROM revenue_events 
  WHERE client_id = COALESCE(NEW.client_id, OLD.client_id)
    AND status = 'succeeded'
  GROUP BY client_id
  ON CONFLICT (client_id) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    monthly_revenue = EXCLUDED.monthly_revenue,
    quarterly_revenue = EXCLUDED.quarterly_revenue,
    last_payment_date = EXCLUDED.last_payment_date,
    last_updated = EXCLUDED.last_updated;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update revenue summary
CREATE TRIGGER update_revenue_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON revenue_events
  FOR EACH ROW
  EXECUTE FUNCTION update_revenue_summary();

-- Function to get client revenue data
CREATE OR REPLACE FUNCTION get_client_revenue(client_uuid UUID)
RETURNS TABLE (
  total_revenue DECIMAL(10,2),
  monthly_revenue DECIMAL(10,2),
  quarterly_revenue DECIMAL(10,2),
  last_payment_date TIMESTAMP WITH TIME ZONE,
  recent_events JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rs.total_revenue,
    rs.monthly_revenue,
    rs.quarterly_revenue,
    rs.last_payment_date,
    COALESCE(
      (SELECT json_agg(
        json_build_object(
          'id', re.id,
          'amount', re.amount,
          'description', re.description,
          'created_at', re.created_at,
          'status', re.status
        )
      ) FROM revenue_events re 
      WHERE re.client_id = client_uuid 
      ORDER BY re.created_at DESC 
      LIMIT 5), 
      '[]'::json
    ) as recent_events
  FROM revenue_summary rs
  WHERE rs.client_id = client_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 