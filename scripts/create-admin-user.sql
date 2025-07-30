-- Script to create an admin user
-- Run this in your Supabase SQL editor after setting up your environment variables

-- First, make sure you have a user in the auth.users table
-- You can create one by signing up through your app or manually

-- Then, update their profile to have admin role
-- Replace 'your-user-email@example.com' with the actual email of the user you want to make admin

UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-user-email@example.com';

-- Verify the update
SELECT id, email, role, contract_accepted_at 
FROM profiles 
WHERE email = 'your-user-email@example.com';

-- Alternative: If you want to create a new admin user directly
-- (This requires the user to already exist in auth.users)

-- INSERT INTO profiles (id, email, full_name, role, contract_accepted_at)
-- VALUES (
--   'your-user-uuid-here',  -- Replace with actual UUID from auth.users
--   'admin@readyaimgo.com',  -- Replace with actual email
--   'Admin User',             -- Replace with actual name
--   'admin',
--   NOW()
-- );

-- To find existing users in auth.users:
-- SELECT id, email FROM auth.users;

-- To see all profiles:
-- SELECT * FROM profiles; 