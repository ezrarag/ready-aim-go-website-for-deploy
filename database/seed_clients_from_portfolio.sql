-- Add missing constraints so ON CONFLICT works

-- Ensure profiles.email is unique
ALTER TABLE public.profiles
ADD CONSTRAINT IF NOT EXISTS profiles_email_unique UNIQUE (email);

-- Ensure clients.id is the primary key (if not already)
ALTER TABLE public.clients
ADD CONSTRAINT IF NOT EXISTS clients_pkey PRIMARY KEY (id);

-- List of portfolio clients (replace/add as needed)
WITH portfolio_clients AS (
  SELECT 'Femileasing' AS name
  UNION ALL SELECT 'RedSquareTransport'
  UNION ALL SELECT 'Demo User'
  -- Add more as needed
)

-- Insert into profiles
INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT
  gen_random_uuid(),
  name,
  'contact@' || lower(replace(name, ' ', '')) || '.com',
  'client',
  NOW()
FROM portfolio_clients
ON CONFLICT (email) DO NOTHING;

-- Insert into clients, referencing profiles
INSERT INTO public.clients (id, company_name, contact_name, contact_email, created_at, updated_at)
SELECT
  p.id,
  p.full_name,
  p.full_name,
  p.email,
  NOW(),
  NOW()
FROM public.profiles p
JOIN portfolio_clients pc ON p.full_name = pc.name
ON CONFLICT (id) DO NOTHING; 