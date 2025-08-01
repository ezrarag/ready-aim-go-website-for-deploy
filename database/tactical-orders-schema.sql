-- Tactical Orders and Business Systems Schema
-- This schema integrates with existing tables and adds new functionality

-- 1. Business Assets Table (Websites, Apps, etc.)
CREATE TABLE IF NOT EXISTS public.business_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('website', 'app', 'platform', 'service')),
  url TEXT,
  status TEXT NOT NULL DEFAULT 'development' CHECK (status IN ('development', 'live', 'maintenance', 'archived')),
  revenue DECIMAL(10,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  commission_earned DECIMAL(10,2) DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  seo_score INTEGER DEFAULT 0 CHECK (seo_score >= 0 AND seo_score <= 100),
  last_analyzed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Payment Tracking Table
CREATE TABLE IF NOT EXISTS public.payment_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'project', 'commission', 'one_time')),
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  stripe_payment_intent_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Mission Objectives Table
CREATE TABLE IF NOT EXISTS public.mission_objectives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('website', 'seo', 'legal', 'marketing', 'development', 'maintenance')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  estimated_hours INTEGER DEFAULT 0,
  actual_hours INTEGER DEFAULT 0,
  assigned_agents INTEGER DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. AI Chat Conversations Table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'ai', 'system_alert', 'legal_monitor')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Agent Allocations Table
CREATE TABLE IF NOT EXISTS public.agent_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'standby', 'training', 'compromised')),
  location TEXT,
  missions_completed INTEGER DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  assigned_objectives TEXT[],
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Business System Health Table
CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  system_type TEXT NOT NULL CHECK (system_type IN ('website', 'payment', 'commission', 'legal', 'seo')),
  health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'warning', 'maintenance', 'offline')),
  metrics JSONB DEFAULT '{}',
  last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_assets_client_id ON public.business_assets(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_client_id ON public.payment_tracking(client_id);
CREATE INDEX IF NOT EXISTS idx_mission_objectives_client_id ON public.mission_objectives(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_client_id ON public.ai_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_agent_allocations_client_id ON public.agent_allocations(client_id);
CREATE INDEX IF NOT EXISTS idx_system_health_client_id ON public.system_health(client_id);

-- RLS Policies
ALTER TABLE public.business_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Client access policies
CREATE POLICY "Clients can view their own business assets" ON public.business_assets
  FOR SELECT USING (client_id IN (
    SELECT id FROM public.clients WHERE id = client_id
  ));

CREATE POLICY "Clients can view their own payment tracking" ON public.payment_tracking
  FOR SELECT USING (client_id IN (
    SELECT id FROM public.clients WHERE id = client_id
  ));

CREATE POLICY "Clients can view their own mission objectives" ON public.mission_objectives
  FOR SELECT USING (client_id IN (
    SELECT id FROM public.clients WHERE id = client_id
  ));

CREATE POLICY "Clients can view their own AI conversations" ON public.ai_conversations
  FOR SELECT USING (client_id IN (
    SELECT id FROM public.clients WHERE id = client_id
  ));

CREATE POLICY "Clients can insert their own AI conversations" ON public.ai_conversations
  FOR INSERT WITH CHECK (client_id IN (
    SELECT id FROM public.clients WHERE id = client_id
  ));

CREATE POLICY "Clients can view their own agent allocations" ON public.agent_allocations
  FOR SELECT USING (client_id IN (
    SELECT id FROM public.clients WHERE id = client_id
  ));

CREATE POLICY "Clients can view their own system health" ON public.system_health
  FOR SELECT USING (client_id IN (
    SELECT id FROM public.clients WHERE id = client_id
  ));

-- Functions for data aggregation
CREATE OR REPLACE FUNCTION get_client_business_overview(client_uuid UUID)
RETURNS TABLE(
  total_revenue DECIMAL,
  total_commission DECIMAL,
  active_assets INTEGER,
  completion_rate DECIMAL,
  subscription_usage DECIMAL,
  mission_completion DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(ba.revenue), 0) as total_revenue,
    COALESCE(SUM(ba.commission_earned), 0) as total_commission,
    COUNT(CASE WHEN ba.status = 'live' THEN 1 END) as active_assets,
    COALESCE(AVG(ba.completion_percentage), 0) as completion_rate,
    COALESCE(
      (SELECT SUM(amount) FROM public.payment_tracking 
       WHERE client_id = client_uuid AND type = 'subscription' AND status = 'paid'), 0
    ) as subscription_usage,
    COALESCE(AVG(mo.completion_percentage), 0) as mission_completion
  FROM public.business_assets ba
  LEFT JOIN public.mission_objectives mo ON ba.client_id = mo.client_id
  WHERE ba.client_id = client_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update business asset completion based on AI analysis
CREATE OR REPLACE FUNCTION update_asset_completion(
  asset_uuid UUID,
  new_completion INTEGER,
  new_seo_score INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.business_assets 
  SET 
    completion_percentage = new_completion,
    seo_score = COALESCE(new_seo_score, seo_score),
    last_analyzed = NOW(),
    updated_at = NOW()
  WHERE id = asset_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log AI conversation
CREATE OR REPLACE FUNCTION log_ai_conversation(
  client_uuid UUID,
  session_id TEXT,
  message_type TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  INSERT INTO public.ai_conversations (client_id, session_id, message_type, content, metadata)
  VALUES (client_uuid, session_id, message_type, content, metadata)
  RETURNING id INTO conversation_id;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.business_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payment_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.mission_objectives TO authenticated;
GRANT SELECT, INSERT ON public.ai_conversations TO authenticated;
GRANT SELECT ON public.agent_allocations TO authenticated;
GRANT SELECT ON public.system_health TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_business_overview(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_asset_completion(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_ai_conversation(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated; 