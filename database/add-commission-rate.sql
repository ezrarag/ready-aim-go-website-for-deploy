-- Add commission rate settings to profiles table
-- This allows clients to customize their commission rate for revenue sharing

-- Add commission_rate column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(4,2) DEFAULT 10.0;
COMMENT ON COLUMN profiles.commission_rate IS 'Commission rate for revenue sharing (0.2 to 7.0)';

-- Add constraint to ensure commission rate is within valid range
ALTER TABLE profiles ADD CONSTRAINT check_commission_rate 
CHECK (commission_rate >= 0.2 AND commission_rate <= 7.0);

-- Create a function to update commission rate
CREATE OR REPLACE FUNCTION update_commission_rate(
  client_uuid UUID,
  new_rate DECIMAL(4,2)
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate rate is within range
  IF new_rate < 0.2 OR new_rate > 7.0 THEN
    RAISE EXCEPTION 'Commission rate must be between 0.2%% and 7.0%%';
  END IF;
  
  -- Update the commission rate
  UPDATE profiles 
  SET commission_rate = new_rate,
      updated_at = NOW()
  WHERE id = client_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policy for commission rate updates
CREATE POLICY "Users can update their own commission rate" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_commission_rate ON profiles(commission_rate);

-- Insert default commission rates for existing profiles
UPDATE profiles 
SET commission_rate = 10.0 
WHERE commission_rate IS NULL; 