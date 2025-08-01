-- Add commission_rate column to profiles table
-- Run this in your Supabase SQL Editor

-- Add the column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(4,2) DEFAULT 10.0;

-- Add constraint to ensure commission rate is within valid range
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS check_commission_rate 
CHECK (commission_rate >= 0.2 AND commission_rate <= 7.0);

-- Update existing profiles with default rate
UPDATE profiles 
SET commission_rate = 10.0 
WHERE commission_rate IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'commission_rate'; 