-- Add avatar_url column to profiles table
-- This will store Google OAuth avatar URLs

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.avatar_url IS 'Google OAuth avatar URL from user_metadata.avatar_url';

-- Create index for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url); 