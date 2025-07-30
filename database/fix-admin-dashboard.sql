-- Fix Admin Dashboard Database Issues
-- This script addresses all the problems preventing the admin dashboard from working

-- 1. Add missing columns to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS github_repo TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS slack_channel TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS traffic_data JSONB;

-- 2. Create the project_client_mapping view that the admin dashboard expects
CREATE OR REPLACE VIEW public.project_client_mapping AS
SELECT 
  p.id as project_id,
  p.title as project_title,
  p.status as project_status,
  p.budget as project_budget,
  p.created_at as project_created_at,
  c.id as client_table_id,
  c.company_name,
  c.contact_name,
  c.contact_email,
  c.website_url,
  c.github_repo,
  c.slack_channel,
  c.traffic_data,
  u.email as client_email,
  u.full_name as client_name
FROM public.projects p
LEFT JOIN public.clients c ON p.client_id = c.id
LEFT JOIN public.users u ON c.id = u.id;

-- 3. Create RLS policies for admin access
-- Allow admins to view all clients
CREATE POLICY "Admins can view all clients" ON public.clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow admins to insert clients
CREATE POLICY "Admins can insert clients" ON public.clients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow admins to update clients
CREATE POLICY "Admins can update clients" ON public.clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 4. Create RLS policies for client_todos
-- Allow admins to view all client todos
CREATE POLICY "Admins can view all client todos" ON public.client_todos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow admins to insert client todos
CREATE POLICY "Admins can insert client todos" ON public.client_todos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow admins to update client todos
CREATE POLICY "Admins can update client todos" ON public.client_todos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- 5. Create function to sync projects with clients
CREATE OR REPLACE FUNCTION sync_projects_with_clients()
RETURNS TABLE(action text, details text) AS $$
DECLARE
  project_record RECORD;
  client_record RECORD;
BEGIN
  -- Loop through projects that don't have corresponding clients
  FOR project_record IN 
    SELECT p.*, u.email, u.full_name
    FROM public.projects p
    LEFT JOIN public.users u ON p.client_id = u.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.clients c WHERE c.id = p.client_id
    )
  LOOP
    -- Create client record if it doesn't exist
    INSERT INTO public.clients (id, company_name, contact_name, contact_email, created_at, updated_at)
    VALUES (
      project_record.client_id,
      COALESCE(project_record.title, 'Unknown Company'),
      COALESCE(project_record.full_name, 'Unknown Contact'),
      COALESCE(project_record.email, 'unknown@example.com'),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN QUERY SELECT 'created_client'::text, 
      format('Created client for project: %s', project_record.title)::text;
  END LOOP;
  
  -- Loop through clients that don't have corresponding projects
  FOR client_record IN 
    SELECT c.*
    FROM public.clients c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.projects p WHERE p.client_id = c.id
    )
  LOOP
    -- Create default project for client
    INSERT INTO public.projects (title, description, status, budget, client_id, created_at, updated_at)
    VALUES (
      format('%s Website', COALESCE(client_record.company_name, client_record.contact_name, 'New Client')),
      format('Website and digital presence for %s', COALESCE(client_record.company_name, client_record.contact_name, 'New Client')),
      'in-progress',
      5000,
      client_record.id,
      NOW(),
      NOW()
    );
    
    RETURN QUERY SELECT 'created_project'::text, 
      format('Created project for client: %s', COALESCE(client_record.company_name, client_record.contact_name))::text;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to import demo data
CREATE OR REPLACE FUNCTION import_demo_data()
RETURNS TABLE(profiles_created integer, clients_created integer, projects_created integer) AS $$
DECLARE
  profile_count integer := 0;
  client_count integer := 0;
  project_count integer := 0;
  demo_client_id uuid;
BEGIN
  -- Create demo profiles if they don't exist
  INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), 'demo1@example.com', 'Demo Client 1', 'client', NOW(), NOW()),
    (gen_random_uuid(), 'demo2@example.com', 'Demo Client 2', 'client', NOW(), NOW()),
    (gen_random_uuid(), 'demo3@example.com', 'Demo Client 3', 'client', NOW(), NOW())
  ON CONFLICT (email) DO NOTHING;
  
  GET DIAGNOSTICS profile_count = ROW_COUNT;
  
  -- Create demo clients
  INSERT INTO public.clients (id, company_name, contact_name, contact_email, website_url, created_at, updated_at)
  VALUES 
    (gen_random_uuid(), 'Femileasing', 'Femileasing', 'contact@femileasing.com', 'https://femileasing.com', NOW(), NOW()),
    (gen_random_uuid(), 'RedSquareTransport', 'RedSquareTransport', 'contact@redsquaretransport.com', 'https://redsquaretransport.com', NOW(), NOW()),
    (gen_random_uuid(), 'Demo User', 'Demo User', 'contact@demouser.com', 'https://demouser.com', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS client_count = ROW_COUNT;
  
  -- Create demo projects for each client
  FOR demo_client_id IN SELECT id FROM public.clients WHERE company_name IN ('Femileasing', 'RedSquareTransport', 'Demo User')
  LOOP
    INSERT INTO public.projects (title, description, live_url, image_url, tags, status, budget, client_id, created_at, updated_at)
    VALUES (
      format('%s Website', (SELECT company_name FROM public.clients WHERE id = demo_client_id)),
      format('Professional website and digital presence for %s', (SELECT company_name FROM public.clients WHERE id = demo_client_id)),
      format('https://%s.readyaimgo.com', lower(replace((SELECT company_name FROM public.clients WHERE id = demo_client_id), ' ', ''))),
      '/placeholder.jpg',
      ARRAY['Website', 'Digital', 'ReadyAimGo'],
      'completed',
      5000,
      demo_client_id,
      NOW(),
      NOW()
    );
    
    project_count := project_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT profile_count, client_count, project_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.client_todos TO authenticated;
GRANT SELECT ON public.project_client_mapping TO authenticated;
GRANT EXECUTE ON FUNCTION sync_projects_with_clients() TO authenticated;
GRANT EXECUTE ON FUNCTION import_demo_data() TO authenticated;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON public.clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_contact_email ON public.clients(contact_email);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_client_todos_status ON public.client_todos(status); 