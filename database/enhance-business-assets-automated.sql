-- Enhance business_assets table with website-specific fields
-- This will automatically fetch client IDs and insert sample data

-- Add new columns to business_assets table
ALTER TABLE business_assets 
ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS github_repo TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comment to explain the new columns
COMMENT ON COLUMN business_assets.tech_stack IS 'Array of technologies used (e.g., ["React", "Next.js", "TypeScript"])';
COMMENT ON COLUMN business_assets.github_repo IS 'GitHub repository URL for the project';
COMMENT ON COLUMN business_assets.description IS 'Description of the business asset';
COMMENT ON COLUMN business_assets.metadata IS 'Additional metadata for the asset';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_business_assets_client_type ON business_assets(client_id, type);

-- Insert sample data for testing using actual client IDs from profiles table
-- This automatically fetches real client IDs instead of using placeholders
DO $$
DECLARE
    client_id_1 UUID;
    client_id_2 UUID;
    client_name_1 TEXT;
    client_name_2 TEXT;
BEGIN
    -- Get first client ID from profiles table
    SELECT id, full_name INTO client_id_1, client_name_1 
    FROM profiles 
    WHERE full_name IS NOT NULL 
    ORDER BY created_at LIMIT 1;
    
    -- Get second client ID (or use the first one if only one exists)
    SELECT id, full_name INTO client_id_2, client_name_2 
    FROM profiles 
    WHERE id != client_id_1 AND full_name IS NOT NULL
    ORDER BY created_at LIMIT 1;
    
    -- If no second client found, use the first one
    IF client_id_2 IS NULL THEN
        client_id_2 := client_id_1;
        client_name_2 := client_name_1;
    END IF;
    
    -- Insert for first client
    INSERT INTO business_assets (
      client_id, 
      name, 
      url, 
      type, 
      status, 
      tech_stack, 
      github_repo, 
      description
    ) VALUES 
      (
        client_id_1,
        COALESCE(client_name_1 || ' Portfolio', 'Client Portfolio'),
        'https://' || LOWER(REPLACE(client_name_1, ' ', '')) || '.com',
        'website',
        'active',
        ARRAY['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Supabase'],
        'https://github.com/' || LOWER(REPLACE(client_name_1, ' ', '')) || '/portfolio',
        'Personal portfolio website showcasing creative work and services'
      )
    ON CONFLICT (client_id, type, name) DO UPDATE SET
      url = EXCLUDED.url,
      tech_stack = EXCLUDED.tech_stack,
      github_repo = EXCLUDED.github_repo,
      description = EXCLUDED.description,
      updated_at = NOW();
    
    -- Insert for second client (only if different from first)
    IF client_id_2 != client_id_1 THEN
      INSERT INTO business_assets (
        client_id, 
        name, 
        url, 
        type, 
        status, 
        tech_stack, 
        github_repo, 
        description
      ) VALUES 
        (
          client_id_2,
          COALESCE(client_name_2 || ' Consulting', 'Client Consulting'),
          'https://' || LOWER(REPLACE(client_name_2, ' ', '')) || 'consulting.com',
          'website',
          'active',
          ARRAY['Vue.js', 'Nuxt.js', 'JavaScript', 'Vuetify', 'Firebase'],
          'https://github.com/' || LOWER(REPLACE(client_name_2, ' ', '')) || '/consulting-site',
          'Professional consulting website with service offerings and case studies'
        )
      ON CONFLICT (client_id, type, name) DO UPDATE SET
        url = EXCLUDED.url,
        tech_stack = EXCLUDED.tech_stack,
        github_repo = EXCLUDED.github_repo,
        description = EXCLUDED.description,
        updated_at = NOW();
    END IF;
      
    RAISE NOTICE 'Inserted sample data for clients: % (%) and % (%)', 
      client_name_1, client_id_1, client_name_2, client_id_2;
END $$;

-- Function to get client website data
CREATE OR REPLACE FUNCTION get_client_website_data(client_uuid UUID)
RETURNS TABLE (
  name TEXT,
  url TEXT,
  status TEXT,
  tech_stack TEXT[],
  github_repo TEXT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ba.name,
    ba.url,
    ba.status,
    ba.tech_stack,
    ba.github_repo,
    ba.description
  FROM business_assets ba
  WHERE ba.client_id = client_uuid 
    AND ba.type = 'website'
  ORDER BY ba.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_client_website_data(UUID) TO authenticated;

-- Verify the data was inserted correctly
SELECT 
  ba.client_id,
  ba.name,
  ba.url,
  ba.tech_stack,
  ba.github_repo,
  p.full_name,
  p.email
FROM business_assets ba
LEFT JOIN profiles p ON ba.client_id = p.id
WHERE ba.type = 'website'
ORDER BY ba.created_at DESC; 