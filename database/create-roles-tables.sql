-- Create roles_pool table
CREATE TABLE IF NOT EXISTS roles_pool (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  requirements TEXT,
  salary_range VARCHAR(100),
  location VARCHAR(255),
  is_remote BOOLEAN DEFAULT false,
  is_full_time BOOLEAN DEFAULT true,
  source_business_id UUID REFERENCES clients(id),
  added_by_user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'active',
  tags TEXT[]
);

-- Create marketplace_roles table
CREATE TABLE IF NOT EXISTS marketplace_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID REFERENCES roles_pool(id) ON DELETE CASCADE,
  business_id UUID REFERENCES clients(id),
  posted_by_user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'active',
  applications_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roles_pool_category ON roles_pool(category);
CREATE INDEX IF NOT EXISTS idx_roles_pool_user_id ON roles_pool(added_by_user_id);
CREATE INDEX IF NOT EXISTS idx_roles_pool_status ON roles_pool(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_roles_status ON marketplace_roles(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_roles_business_id ON marketplace_roles(business_id);

-- Enable Row Level Security
ALTER TABLE roles_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles_pool
CREATE POLICY "Users can view all active roles" ON roles_pool
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can insert their own roles" ON roles_pool
  FOR INSERT WITH CHECK (auth.uid() = added_by_user_id);

CREATE POLICY "Users can update their own roles" ON roles_pool
  FOR UPDATE USING (auth.uid() = added_by_user_id);

CREATE POLICY "Users can delete their own roles" ON roles_pool
  FOR DELETE USING (auth.uid() = added_by_user_id);

-- RLS Policies for marketplace_roles
CREATE POLICY "Users can view all active marketplace roles" ON marketplace_roles
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can insert their own marketplace roles" ON marketplace_roles
  FOR INSERT WITH CHECK (auth.uid() = posted_by_user_id);

CREATE POLICY "Users can update their own marketplace roles" ON marketplace_roles
  FOR UPDATE USING (auth.uid() = posted_by_user_id);

CREATE POLICY "Users can delete their own marketplace roles" ON marketplace_roles
  FOR DELETE USING (auth.uid() = posted_by_user_id);

-- Add comments for documentation
COMMENT ON TABLE roles_pool IS 'Pool of all available job roles that can be published to marketplace';
COMMENT ON TABLE marketplace_roles IS 'Active job postings in the marketplace';
COMMENT ON COLUMN roles_pool.source_business_id IS 'Reference to the business that this role was extracted from';
COMMENT ON COLUMN roles_pool.tags IS 'Array of tags for role filtering (e.g., ["remote", "senior", "ai"])'; 