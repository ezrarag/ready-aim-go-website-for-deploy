-- Create missions table with all categories
CREATE TABLE IF NOT EXISTS missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('website', 'app', 'business_plan', 'real_estate', 'transportation', 'legal_filing')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  budget DECIMAL(10,2),
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  assigned_operator_id UUID REFERENCES operators(id),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_missions_client_id ON missions(client_id);
CREATE INDEX IF NOT EXISTS idx_missions_category ON missions(category);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_priority ON missions(priority);
CREATE INDEX IF NOT EXISTS idx_missions_assigned_operator ON missions(assigned_operator_id);

-- Create RLS policies
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

-- Policy for clients to see their own missions
CREATE POLICY "Clients can view their own missions" ON missions
  FOR SELECT USING (auth.uid() = client_id);

-- Policy for clients to insert their own missions
CREATE POLICY "Clients can insert their own missions" ON missions
  FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Policy for clients to update their own missions
CREATE POLICY "Clients can update their own missions" ON missions
  FOR UPDATE USING (auth.uid() = client_id);

-- Policy for clients to delete their own missions
CREATE POLICY "Clients can delete their own missions" ON missions
  FOR DELETE USING (auth.uid() = client_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_missions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_missions_updated_at
  BEFORE UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION update_missions_updated_at();

-- Create function to calculate mission progress
CREATE OR REPLACE FUNCTION calculate_mission_progress(mission_id UUID)
RETURNS INTEGER AS $$
DECLARE
  progress INTEGER;
BEGIN
  SELECT COALESCE(
    CASE 
      WHEN status = 'completed' THEN 100
      WHEN status = 'in_progress' THEN 50
      WHEN status = 'pending' THEN 0
      ELSE 0
    END, 0
  ) INTO progress
  FROM missions
  WHERE id = mission_id;
  
  RETURN progress;
END;
$$ LANGUAGE plpgsql;

-- Create view for mission statistics
CREATE OR REPLACE VIEW mission_stats AS
SELECT 
  client_id,
  COUNT(*) as total_missions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_missions,
  COUNT(*) FILTER (WHERE status = 'in_progress') as active_missions,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_missions,
  AVG(progress_percentage) as average_progress,
  SUM(budget) as total_budget,
  COUNT(*) FILTER (WHERE category = 'website') as website_missions,
  COUNT(*) FILTER (WHERE category = 'app') as app_missions,
  COUNT(*) FILTER (WHERE category = 'business_plan') as business_plan_missions,
  COUNT(*) FILTER (WHERE category = 'real_estate') as real_estate_missions,
  COUNT(*) FILTER (WHERE category = 'transportation') as transportation_missions,
  COUNT(*) FILTER (WHERE category = 'legal_filing') as legal_filing_missions
FROM missions
GROUP BY client_id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON missions TO authenticated;
GRANT SELECT ON mission_stats TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE missions IS 'Stores client missions across different categories';
COMMENT ON COLUMN missions.category IS 'Mission category: website, app, business_plan, real_estate, transportation, legal_filing';
COMMENT ON COLUMN missions.status IS 'Mission status: pending, in_progress, completed, cancelled';
COMMENT ON COLUMN missions.priority IS 'Mission priority: low, medium, high, critical';
COMMENT ON COLUMN missions.progress_percentage IS 'Progress percentage from 0-100';
COMMENT ON COLUMN missions.metadata IS 'Additional mission data in JSON format'; 