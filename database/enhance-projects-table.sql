-- Enhance projects table for better website integration
-- This migration adds necessary columns and indexes for the Tactical Orders dashboard

-- Add type column to projects table if it doesn't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'website';
COMMENT ON COLUMN projects.type IS 'Type of project (website, app, business_plan, etc.)';

-- Add is_primary_website flag for handling multiple websites
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_primary_website BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN projects.is_primary_website IS 'Whether this is the primary website for the client';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_client_id_type ON projects(client_id, type);
CREATE INDEX IF NOT EXISTS idx_projects_live_url ON projects(live_url) WHERE live_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_primary_website ON projects(client_id, is_primary_website) WHERE is_primary_website = TRUE;

-- Add RLS policies for the new columns
CREATE POLICY "Users can view their own projects by type" ON projects
FOR SELECT USING (
  auth.uid() = client_id
);

-- Update existing projects to have proper type classification
UPDATE projects 
SET type = 'website' 
WHERE type IS NULL AND live_url IS NOT NULL;

-- Set the most recent website project as primary for each client
UPDATE projects 
SET is_primary_website = TRUE 
WHERE id IN (
  SELECT DISTINCT ON (client_id) id
  FROM projects 
  WHERE type = 'website' 
    AND live_url IS NOT NULL
  ORDER BY client_id, created_at DESC
);

-- Create a view for easy website project access
CREATE OR REPLACE VIEW client_websites AS
SELECT 
  id,
  title as name,
  live_url as url,
  status,
  client_id,
  created_at,
  updated_at,
  is_primary_website
FROM projects 
WHERE type = 'website' 
  AND live_url IS NOT NULL
ORDER BY is_primary_website DESC, created_at DESC;

-- Add RLS policy for the view
CREATE POLICY "Public read access to client_websites" ON client_websites
FOR SELECT USING (true);

-- Function to get primary website for a client
CREATE OR REPLACE FUNCTION get_primary_website(client_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  url TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title as name,
    p.live_url as url,
    p.status,
    p.created_at
  FROM projects p
  WHERE p.client_id = client_uuid
    AND p.type = 'website'
    AND p.live_url IS NOT NULL
    AND p.is_primary_website = TRUE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all websites for a client
CREATE OR REPLACE FUNCTION get_client_websites(client_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  url TEXT,
  status TEXT,
  is_primary BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title as name,
    p.live_url as url,
    p.status,
    p.is_primary_website as is_primary,
    p.created_at
  FROM projects p
  WHERE p.client_id = client_uuid
    AND p.type = 'website'
    AND p.live_url IS NOT NULL
  ORDER BY p.is_primary_website DESC, p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 