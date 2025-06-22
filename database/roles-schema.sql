-- Create roles table for BEAM integration
CREATE TABLE public.roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('Web Dev', 'Design', 'Admin', 'Logistics', 'Product Prep', 'Retail', 'Events', 'Finance')) NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  pay_range TEXT NOT NULL,
  deadline TEXT NOT NULL,
  location TEXT,
  workstream TEXT CHECK (workstream IN ('Creative', 'Operations', 'Media', 'Transport', 'Retail', 'Events', 'Admin')) NOT NULL,
  visibility TEXT CHECK (visibility IN ('Public', 'BEAM Members')) DEFAULT 'Public',
  tags TEXT[] DEFAULT '{}',
  media_url TEXT,
  status TEXT CHECK (status IN ('Draft', 'Live', 'Filled')) DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Clients can view own roles" ON public.roles
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can create roles" ON public.roles
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own roles" ON public.roles
  FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete own roles" ON public.roles
  FOR DELETE USING (auth.uid() = client_id);

-- Public can view live roles (for BEAM integration)
CREATE POLICY "Public can view live roles" ON public.roles
  FOR SELECT USING (status = 'Live');

-- Update trigger
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at_trigger
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION update_roles_updated_at();
