-- Fix clients table by adding missing columns
-- Run this in Supabase SQL Editor

-- Add missing columns to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS github_repo TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS slack_channel TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS traffic_data JSONB;

-- Update any existing records with default values
UPDATE public.clients 
SET 
  company_name = COALESCE(company_name, 'Client ' || id::text),
  contact_name = COALESCE(contact_name, 'Contact ' || id::text),
  contact_email = COALESCE(contact_email, 'client-' || id::text || '@example.com')
WHERE company_name IS NULL OR contact_name IS NULL OR contact_email IS NULL;

-- Grant permissions
GRANT ALL ON public.clients TO authenticated;
GRANT ALL ON public.client_todos TO authenticated; 