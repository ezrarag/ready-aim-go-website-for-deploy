-- Create Admin User for Testing
-- Run this script to create an admin user that can access the admin dashboard

-- Insert admin user into auth.users (you'll need to do this through Supabase Auth UI or API)
-- For now, we'll create a profile record that assumes the user exists

-- Create admin profile (replace 'your-admin-user-id' with actual UUID from auth.users)
INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
VALUES (
  'your-admin-user-id', -- Replace with actual UUID from auth.users
  'admin@readyaimgo.com',
  'Admin User',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- Alternative: Create a test admin user with a known UUID
-- INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
-- VALUES (
--   '00000000-0000-0000-0000-000000000001',
--   'test-admin@readyaimgo.com',
--   'Test Admin',
--   'admin',
--   NOW(),
--   NOW()
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   role = 'admin',
--   updated_at = NOW();

-- Grant admin permissions
-- Note: You'll need to create the user in Supabase Auth first, then update the UUID above 