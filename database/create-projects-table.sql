-- Create projects table to match what the application expects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  live_url TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT CHECK (status IN ('open', 'in-progress', 'completed', 'cancelled')) DEFAULT 'open',
  budget DECIMAL(10,2),
  operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view projects" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "Clients can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "Operators can update assigned projects" ON public.projects
  FOR UPDATE USING (auth.uid() = operator_id);

-- Insert some sample projects
INSERT INTO public.projects (title, description, live_url, tags, status, budget) VALUES
  ('E-commerce Website', 'Modern e-commerce platform with payment integration', 'https://example.com/shop', ARRAY['React', 'E-commerce', 'Payment'], 'completed', 5000),
  ('Portfolio Site', 'Creative portfolio for a photographer', 'https://example.com/portfolio', ARRAY['Design', 'Portfolio', 'Photography'], 'completed', 2500),
  ('Mobile App', 'Cross-platform mobile application', 'https://example.com/app', ARRAY['React Native', 'Mobile', 'Cross-platform'], 'in-progress', 8000); 