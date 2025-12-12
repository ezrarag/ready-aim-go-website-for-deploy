-- Create partners table
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_name TEXT,
  org_type TEXT NOT NULL DEFAULT 'church_choir',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contributions table
CREATE TABLE IF NOT EXISTS public.contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  partner_slug TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  stripe_session_id TEXT UNIQUE NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  purpose TEXT NOT NULL DEFAULT 'fleet_contribution',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contributions_partner_slug ON public.contributions(partner_slug);
CREATE INDEX IF NOT EXISTS idx_contributions_stripe_session_id ON public.contributions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_partners_slug ON public.partners(slug);

-- Enable RLS (Row Level Security)
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for partners (public read, admin write)
CREATE POLICY "Partners are viewable by everyone" ON public.partners
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert partners" ON public.partners
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update partners" ON public.partners
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for contributions (public read, service role write via webhook)
CREATE POLICY "Contributions are viewable by everyone" ON public.contributions
  FOR SELECT USING (true);

-- Service role can insert (for webhook)
-- This is handled via service role key which bypasses RLS

-- Insert seed data for Carlot
INSERT INTO public.partners (slug, name, contact_name, contact_email, org_type)
VALUES ('carlot', 'Dorve Church Choir', 'Carlot Dorve', 'carlot@example.com', 'church_choir')
ON CONFLICT (slug) DO NOTHING;


