-- Add missing columns to clients table
-- This script adds the columns needed for the enhanced admin dashboard

-- Add website_url column
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add github_repo column  
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS github_repo TEXT;

-- Add slack_channel column
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS slack_channel TEXT;

-- Add traffic_data column for analytics
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS traffic_data JSONB;

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
CREATE POLICY "Admins can view all clients" ON public.clients
  FOR SELECT USING (auth.role() = 'admin' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can insert clients" ON public.clients;
CREATE POLICY "Admins can insert clients" ON public.clients
  FOR INSERT WITH CHECK (auth.role() = 'admin' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
CREATE POLICY "Admins can update clients" ON public.clients
  FOR UPDATE USING (auth.role() = 'admin' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
CREATE POLICY "Admins can delete clients" ON public.clients
  FOR DELETE USING (auth.role() = 'admin' OR auth.role() = 'service_role');

-- Grant permissions to authenticated users for the new columns
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.client_todos TO authenticated; 