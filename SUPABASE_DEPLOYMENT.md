# Supabase Deployment Guide

## Overview
This guide covers the deployment of Supabase AI's unified solution for client and project management.

## 1. SQL Scripts Deployment

### Run these SQL scripts in your Supabase SQL Editor:

#### A. Create the unified view and functions:
```sql
-- Create the project_client_mapping view
CREATE OR REPLACE VIEW public.project_client_mapping AS
SELECT 
  p.id AS project_id,
  p.title AS project_title,
  p.description AS project_description,
  p.live_url,
  p.type AS project_type,
  p.tags AS project_tags,
  p.image_url AS project_image_url,
  p.status AS project_status,
  p.progress AS project_progress,
  c.id AS client_table_id,
  c.company_name,
  c.contact_name,
  c.contact_email,
  c.website_url,
  c.github_repo,
  c.slack_channel,
  c.traffic_data,
  pr.id AS profile_id,
  pr.full_name AS client_name,
  pr.email AS client_email
FROM public.projects p
FULL OUTER JOIN public.clients c ON p.client_id = c.id
FULL OUTER JOIN public.profiles pr ON c.id = pr.id
WHERE c.id IS NOT NULL OR pr.id IS NOT NULL;

-- Grant permissions on the view
GRANT SELECT ON public.project_client_mapping TO authenticated;
GRANT SELECT ON public.project_client_mapping TO anon;
```

#### B. Create the sync function:
```sql
-- Create function to sync projects with clients
CREATE OR REPLACE FUNCTION public.sync_projects_with_clients()
RETURNS TABLE(action text, details jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  client_record RECORD;
  profile_record RECORD;
  result_record RECORD;
BEGIN
  -- Create clients for profiles that don't have them
  FOR profile_record IN 
    SELECT p.id, p.full_name, p.email, p.avatar_url
    FROM public.profiles p
    LEFT JOIN public.clients c ON p.id = c.id
    WHERE c.id IS NULL AND p.role = 'client'
  LOOP
    INSERT INTO public.clients (id, company_name, contact_name, contact_email, created_at, updated_at)
    VALUES (profile_record.id, profile_record.full_name, profile_record.full_name, profile_record.email, NOW(), NOW());
    
    RETURN QUERY SELECT 'created_client'::text, jsonb_build_object('id', profile_record.id, 'name', profile_record.full_name);
  END LOOP;

  -- Create projects for clients that don't have them
  FOR client_record IN 
    SELECT c.id, c.company_name, c.website_url, c.github_repo
    FROM public.clients c
    LEFT JOIN public.projects p ON c.id = p.client_id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO public.projects (title, description, live_url, type, tags, image_url, repo_url, status, progress, client_id)
    VALUES (
      client_record.company_name || ' Website',
      'Website project for ' || client_record.company_name,
      client_record.website_url,
      'website',
      ARRAY['client', 'website'],
      'https://picsum.photos/800/600?random=' || floor(random() * 1000)::text,
      client_record.github_repo,
      'active',
      10,
      client_record.id
    );
    
    RETURN QUERY SELECT 'created_project'::text, jsonb_build_object('client_id', client_record.id, 'title', client_record.company_name || ' Website');
  END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.sync_projects_with_clients() TO authenticated;
```

#### C. Create the import demo data function:
```sql
-- Create function to import demo data
CREATE OR REPLACE FUNCTION public.import_demo_data()
RETURNS TABLE(profiles_created integer, clients_created integer, projects_created integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_count integer := 0;
  client_count integer := 0;
  project_count integer := 0;
  new_client_id uuid;
BEGIN
  -- Insert demo profiles
  INSERT INTO public.profiles (id, full_name, email, role, contract_accepted_at, is_demo_client)
  VALUES 
    (gen_random_uuid(), 'Femileasing', 'maria@femileasing.com', 'client', NOW(), true),
    (gen_random_uuid(), 'RedSquareTransport', 'alex@redsquaretransport.com', 'client', NOW(), true),
    (gen_random_uuid(), 'Demo User', 'demo@example.com', 'client', NOW(), true)
  ON CONFLICT (email) DO NOTHING;
  
  GET DIAGNOSTICS profile_count = ROW_COUNT;
  
  -- Insert demo clients
  INSERT INTO public.clients (company_name, contact_name, contact_email, website_url, github_repo, slack_channel, traffic_data)
  VALUES 
    ('Femileasing', 'Maria Rodriguez', 'maria@femileasing.com', 'https://femileasing.com', 'github.com/femileasing', 'femileasing-general', '{"monthly_visitors": 5200, "page_views": 12500, "bounce_rate": 32.5}'::jsonb),
    ('RedSquareTransport', 'Alex Johnson', 'alex@redsquaretransport.com', 'https://redsquaretransport.com', 'github.com/redsquaretransport', 'rst-team', '{"monthly_visitors": 3800, "page_views": 9200, "bounce_rate": 28.7}'::jsonb),
    ('Demo User', 'Demo User', 'demo@example.com', 'https://demo-site.com', 'github.com/demo-user', 'demo-channel', '{"monthly_visitors": 1200, "page_views": 3500, "bounce_rate": 45.2}'::jsonb)
  ON CONFLICT (company_name) DO NOTHING;
  
  GET DIAGNOSTICS client_count = ROW_COUNT;
  
  -- Create projects for new clients
  FOR new_client_id IN 
    SELECT id FROM public.clients 
    WHERE company_name IN ('Femileasing', 'RedSquareTransport', 'Demo User')
  LOOP
    INSERT INTO public.projects (title, description, live_url, type, tags, image_url, repo_url, status, progress, client_id)
    VALUES (
      (SELECT company_name FROM public.clients WHERE id = new_client_id) || ' Website',
      'Website project for ' || (SELECT company_name FROM public.clients WHERE id = new_client_id),
      (SELECT website_url FROM public.clients WHERE id = new_client_id),
      'website',
      ARRAY['client', 'website'],
      'https://picsum.photos/800/600?random=' || floor(random() * 1000)::text,
      (SELECT github_repo FROM public.clients WHERE id = new_client_id),
      'active',
      10,
      new_client_id
    );
    
    project_count := project_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT profile_count, client_count, project_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.import_demo_data() TO authenticated;
```

#### D. Create helper function:
```sql
-- Create helper function to get clients without projects
CREATE OR REPLACE FUNCTION public.get_clients_without_projects()
RETURNS SETOF public.clients
LANGUAGE sql
SECURITY INVOKER
AS $$
SELECT c.* 
FROM public.clients c
LEFT JOIN public.projects p ON p.client_id = c.id
WHERE p.id IS NULL AND c.company_name IS NOT NULL;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_clients_without_projects() TO authenticated;
```

## 2. Edge Function Deployment

### Option A: Using Supabase CLI

1. **Install Supabase CLI** (if not already installed):
```bash
npm install -g supabase
```

2. **Login to Supabase**:
```bash
supabase login
```

3. **Link your project**:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

4. **Deploy the Edge Function**:
```bash
supabase functions deploy sync-projects-clients
```

### Option B: Using Supabase Dashboard

1. **Go to your Supabase Dashboard**
2. **Navigate to Edge Functions**
3. **Click "Create a new function"**
4. **Name it**: `sync-projects-clients`
5. **Copy the code** from `supabase/functions/sync-projects-clients/index.ts`
6. **Click "Deploy"**

## 3. Environment Variables

### For Edge Functions, add these to your Supabase project:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

## 4. Testing the Implementation

### Test the SQL functions:
```sql
-- Test the sync function
SELECT * FROM public.sync_projects_with_clients();

-- Test the import function
SELECT * FROM public.import_demo_data();

-- Test the view
SELECT * FROM public.project_client_mapping LIMIT 5;
```

### Test the Edge Function:
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-projects-clients \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## 5. Frontend Integration

The frontend is already updated to use these functions. The admin dashboard will:
- Use `project_client_mapping` view for data
- Call `import_demo_data()` for imports
- Call `sync_projects_with_clients()` for syncing
- Fall back gracefully if functions don't exist

## 6. Verification Checklist

- [ ] SQL scripts executed successfully
- [ ] Edge Function deployed
- [ ] Environment variables set
- [ ] Admin dashboard loads without errors
- [ ] Import button works
- [ ] Sync button works
- [ ] Website generator shows projects
- [ ] Client creation creates projects automatically

## Troubleshooting

### Common Issues:

1. **"Function not found" errors**: Make sure SQL scripts were executed
2. **"View not found" errors**: Check if `project_client_mapping` view exists
3. **Edge Function 401 errors**: Check authentication and environment variables
4. **Permission denied**: Ensure RLS policies are correctly set

### Debug Commands:
```sql
-- Check if functions exist
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';

-- Check if view exists
SELECT table_name FROM information_schema.views WHERE table_schema = 'public';

-- Check RLS policies
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';
``` 