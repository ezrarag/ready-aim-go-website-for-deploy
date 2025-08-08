-- Complete Database Setup Check for ReadyAimGo
-- Run this in Supabase SQL Editor to verify all tables are properly configured

-- 1. Check if all required tables exist
SELECT 
  'Table Check' as check_type,
  schemaname,
  tablename,
  CASE 
    WHEN tablename IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_tables 
WHERE tablename IN (
  'profiles',
  'clients', 
  'users',
  'client_stats',
  'roles_pool',
  'marketplace_roles'
)
AND schemaname IN ('public', 'auth')
ORDER BY schemaname, tablename;

-- 2. Check RLS policies
SELECT 
  'RLS Policy Check' as check_type,
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN policyname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_policies 
WHERE tablename IN (
  'profiles',
  'clients',
  'users', 
  'client_stats',
  'roles_pool',
  'marketplace_roles'
)
ORDER BY schemaname, tablename;

-- 3. Check triggers
SELECT 
  'Trigger Check' as check_type,
  event_object_table,
  trigger_name,
  CASE 
    WHEN trigger_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.triggers
WHERE event_object_table IN (
  'profiles',
  'clients',
  'users',
  'client_stats',
  'roles_pool', 
  'marketplace_roles'
)
ORDER BY event_object_table;

-- 4. Check functions
SELECT 
  'Function Check' as check_type,
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routines
WHERE routine_name IN ('handle_new_user', 'update_client_stats')
AND routine_schema = 'public'
ORDER BY routine_name;

-- 5. Test data insertion (if tables exist)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_result TEXT;
BEGIN
  -- Test profiles table
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role) 
    VALUES (test_user_id, 'test@example.com', 'Test User', 'client');
    test_result := '✅ profiles table works';
  EXCEPTION WHEN OTHERS THEN
    test_result := '❌ profiles table error: ' || SQLERRM;
  END;
  
  RAISE NOTICE '%', test_result;
  
  -- Test clients table
  BEGIN
    INSERT INTO public.clients (id, company_name, contact_email) 
    VALUES (test_user_id, 'Test Company', 'test@example.com');
    test_result := '✅ clients table works';
  EXCEPTION WHEN OTHERS THEN
    test_result := '❌ clients table error: ' || SQLERRM;
  END;
  
  RAISE NOTICE '%', test_result;
  
  -- Test roles_pool table
  BEGIN
    INSERT INTO public.roles_pool (title, category, added_by_user_id) 
    VALUES ('Test Role', 'Engineering', test_user_id);
    test_result := '✅ roles_pool table works';
  EXCEPTION WHEN OTHERS THEN
    test_result := '❌ roles_pool table error: ' || SQLERRM;
  END;
  
  RAISE NOTICE '%', test_result;
  
  -- Clean up test data
  DELETE FROM public.profiles WHERE id = test_user_id;
  DELETE FROM public.clients WHERE id = test_user_id;
  DELETE FROM public.roles_pool WHERE added_by_user_id = test_user_id;
  
END $$;

-- 6. Check column structure for key tables
SELECT 
  'Column Check' as check_type,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('profiles', 'clients', 'roles_pool', 'marketplace_roles')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position; 