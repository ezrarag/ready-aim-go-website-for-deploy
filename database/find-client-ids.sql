-- Script to find client IDs for testing
-- Run this in your Supabase SQL Editor to get the client IDs

-- Find all clients in the profiles table
SELECT 
  id as client_id,
  full_name,
  email,
  created_at
FROM profiles 
WHERE full_name IS NOT NULL 
ORDER BY created_at DESC;

-- Find existing business assets
SELECT 
  ba.client_id,
  ba.name,
  ba.url,
  ba.type,
  ba.status,
  p.full_name,
  p.email
FROM business_assets ba
LEFT JOIN profiles p ON ba.client_id = p.id
ORDER BY ba.created_at DESC;

-- Find existing projects
SELECT 
  p.client_id,
  p.title,
  p.live_url,
  p.type,
  p.status,
  prof.full_name,
  prof.email
FROM projects p
LEFT JOIN profiles prof ON p.client_id = prof.id
WHERE p.type = 'website'
ORDER BY p.created_at DESC;

-- Check if business_assets table exists and has the right structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'business_assets'
ORDER BY ordinal_position; 