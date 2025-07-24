-- Create beam_roles table for BEAM platform jobs
CREATE TABLE IF NOT EXISTS beam_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL CHECK (category IN ('Web Dev', 'Design', 'Admin', 'Logistics', 'Product Prep', 'Retail', 'Events', 'Finance')),
  skills TEXT[] DEFAULT '{}',
  pay_range VARCHAR(100),
  deadline TIMESTAMP WITH TIME ZONE,
  location VARCHAR(255),
  workstream VARCHAR(50) CHECK (workstream IN ('Creative', 'Operations', 'Media', 'Transport', 'Retail', 'Events', 'Admin')),
  visibility VARCHAR(20) DEFAULT 'Public' CHECK (visibility IN ('Public', 'BEAM Members')),
  tags TEXT[] DEFAULT '{}',
  media_url TEXT,
  client_name VARCHAR(255),
  client_id UUID,
  status VARCHAR(20) DEFAULT 'Live' CHECK (status IN ('Draft', 'Live', 'Filled', 'Closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_beam_roles_status ON beam_roles(status);
CREATE INDEX IF NOT EXISTS idx_beam_roles_workstream ON beam_roles(workstream);
CREATE INDEX IF NOT EXISTS idx_beam_roles_category ON beam_roles(category);
CREATE INDEX IF NOT EXISTS idx_beam_roles_created_at ON beam_roles(created_at);

-- Enable Row Level Security
ALTER TABLE beam_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for BEAM roles
CREATE POLICY "Anyone can view live beam roles" ON beam_roles
  FOR SELECT USING (status = 'Live');

CREATE POLICY "Service role can manage beam roles" ON beam_roles
  FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_beam_roles_updated_at BEFORE UPDATE ON beam_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
