-- Enhance business_assets table with website-specific fields
-- This will allow us to store client-specific website data

-- Add new columns to business_assets table
ALTER TABLE business_assets 
ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS github_repo TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comment to explain the new columns
COMMENT ON COLUMN business_assets.tech_stack IS 'Array of technologies used (e.g., ["React", "Next.js", "TypeScript"])';
COMMENT ON COLUMN business_assets.github_repo IS 'GitHub repository URL for the project';
COMMENT ON COLUMN business_assets.description IS 'Description of the business asset';
COMMENT ON COLUMN business_assets.metadata IS 'Additional metadata for the asset';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_business_assets_client_type ON business_assets(client_id, type);

-- Insert sample data for testing (replace with actual client IDs)
-- This will create different website data for different clients

-- Sample data for client 1 (replace with actual client ID)
INSERT INTO business_assets (
  client_id, 
  name, 
  url, 
  type, 
  status, 
  tech_stack, 
  github_repo, 
  description
) VALUES 
  (
    'your-client-id-1', -- Replace with actual client ID
    'Ezra Haugabrooks Portfolio',
    'https://ezrahaugabrooks.com',
    'website',
    'active',
    ARRAY['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Supabase'],
    'https://github.com/ezrahaugabrooks/portfolio',
    'Personal portfolio website showcasing creative work and services'
  )
ON CONFLICT (client_id, type, name) DO UPDATE SET
  url = EXCLUDED.url,
  tech_stack = EXCLUDED.tech_stack,
  github_repo = EXCLUDED.github_repo,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Sample data for client 2 (replace with actual client ID)
INSERT INTO business_assets (
  client_id, 
  name, 
  url, 
  type, 
  status, 
  tech_stack, 
  github_repo, 
  description
) VALUES 
  (
    'your-client-id-2', -- Replace with actual client ID
    'John Doe Consulting',
    'https://johndoeconsulting.com',
    'website',
    'active',
    ARRAY['Vue.js', 'Nuxt.js', 'JavaScript', 'Vuetify', 'Firebase'],
    'https://github.com/johndoe/consulting-site',
    'Professional consulting website with service offerings and case studies'
  )
ON CONFLICT (client_id, type, name) DO UPDATE SET
  url = EXCLUDED.url,
  tech_stack = EXCLUDED.tech_stack,
  github_repo = EXCLUDED.github_repo,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Function to get client website data
CREATE OR REPLACE FUNCTION get_client_website_data(client_uuid UUID)
RETURNS TABLE (
  name TEXT,
  url TEXT,
  status TEXT,
  tech_stack TEXT[],
  github_repo TEXT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.name,
    ba.url,
    ba.status,
    ba.tech_stack,
    ba.github_repo,
    ba.description
  FROM business_assets ba
  WHERE ba.client_id = client_uuid 
    AND ba.type = 'website'
  ORDER BY ba.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_client_website_data(UUID) TO authenticated; 