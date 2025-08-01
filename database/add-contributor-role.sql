-- Add contributor role to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_contributor BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN profiles.is_contributor IS 'Whether this user is a contributor who can be attributed to projects';

-- Create project_contributors junction table
CREATE TABLE IF NOT EXISTS project_contributors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'contributor', -- e.g., 'developer', 'designer', 'project_manager'
  contribution_percentage INTEGER DEFAULT 100, -- percentage of contribution
  attribution_order INTEGER DEFAULT 1, -- order in which contributors should be displayed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, contributor_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_contributors_project_id ON project_contributors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_contributors_contributor_id ON project_contributors(contributor_id);
CREATE INDEX IF NOT EXISTS idx_project_contributors_role ON project_contributors(role);

-- Add RLS policies for project_contributors
ALTER TABLE project_contributors ENABLE ROW LEVEL SECURITY;

-- Allow public read access to project_contributors (for portfolio display)
CREATE POLICY "Public read access to project_contributors" ON project_contributors
  FOR SELECT USING (true);

-- Allow authenticated users to manage their own contributions
CREATE POLICY "Users can manage their own contributions" ON project_contributors
  FOR ALL USING (
    auth.uid() = contributor_id OR 
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_contributors.project_id 
      AND p.client_id = auth.uid()
    )
  );

-- Create a view for easy contributor data access
CREATE OR REPLACE VIEW contributor_projects AS
SELECT 
  pc.contributor_id,
  p.id as profile_id,
  p.full_name,
  p.avatar_url,
  p.is_contributor,
  pr.id as project_id,
  pr.title as project_title,
  pr.description as project_description,
  pr.live_url,
  pr.image_url,
  pr.status as project_status,
  pr.created_at as project_created_at,
  pc.role,
  pc.contribution_percentage,
  pc.attribution_order
FROM project_contributors pc
JOIN profiles p ON pc.contributor_id = p.id
JOIN projects pr ON pc.project_id = pr.id
WHERE p.is_contributor = TRUE
ORDER BY pc.attribution_order, pr.created_at DESC;

-- Add RLS policy for the view
CREATE POLICY "Public read access to contributor_projects" ON contributor_projects
  FOR SELECT USING (true);

-- Function to get projects by contributor
CREATE OR REPLACE FUNCTION get_projects_by_contributor(contributor_email TEXT)
RETURNS TABLE (
  project_id UUID,
  project_title TEXT,
  project_description TEXT,
  live_url TEXT,
  image_url TEXT,
  project_status TEXT,
  project_created_at TIMESTAMP WITH TIME ZONE,
  role TEXT,
  contribution_percentage INTEGER,
  attribution_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.project_id,
    cp.project_title,
    cp.project_description,
    cp.live_url,
    cp.image_url,
    cp.project_status,
    cp.project_created_at,
    cp.role,
    cp.contribution_percentage,
    cp.attribution_order
  FROM contributor_projects cp
  JOIN profiles p ON cp.profile_id = p.id
  WHERE p.email = contributor_email
  ORDER BY cp.attribution_order, cp.project_created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get contributors by project
CREATE OR REPLACE FUNCTION get_contributors_by_project(project_uuid UUID)
RETURNS TABLE (
  contributor_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT,
  contribution_percentage INTEGER,
  attribution_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.contributor_id,
    cp.full_name,
    cp.avatar_url,
    cp.role,
    cp.contribution_percentage,
    cp.attribution_order
  FROM contributor_projects cp
  WHERE cp.project_id = project_uuid
  ORDER BY cp.attribution_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 