-- Check what tables exist and their structure
-- This will help us understand the current database schema

-- List all tables in the public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if business_assets table exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'business_assets'
ORDER BY ordinal_position;

-- Check if projects table exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- Check if clients table exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'clients'
ORDER BY ordinal_position;

-- Check if profiles table exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check what data exists in each table
SELECT 'business_assets' as table_name, COUNT(*) as row_count FROM business_assets
UNION ALL
SELECT 'projects' as table_name, COUNT(*) as row_count FROM projects
UNION ALL
SELECT 'clients' as table_name, COUNT(*) as row_count FROM clients
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles; 