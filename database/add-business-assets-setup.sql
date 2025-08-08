-- Add business assets and setup completion fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS has_completed_setup BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS business_assets JSONB DEFAULT '[]'::jsonb;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_has_completed_setup ON profiles(has_completed_setup);

-- Update existing profiles to have default values
UPDATE profiles 
SET has_completed_setup = FALSE, 
    business_assets = '[]'::jsonb 
WHERE has_completed_setup IS NULL OR business_assets IS NULL;

-- Add comment to document the new fields
COMMENT ON COLUMN profiles.has_completed_setup IS 'Whether the user has completed the first-time setup process';
COMMENT ON COLUMN profiles.business_assets IS 'JSON array of business assets (website, app, business plan, etc.) with their status and values'; 