-- Create testimonials table to match what the application expects
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  text TEXT NOT NULL,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow public read access
CREATE POLICY "Anyone can view testimonials" ON public.testimonials
  FOR SELECT USING (true);

-- Insert sample testimonials
INSERT INTO public.testimonials (name, avatar, rating, text, featured) VALUES
  ('Jane Doe', '/placeholder.svg', 5, 'ReadyAimGo made my project a breeze!', true),
  ('Sam Miller', '/placeholder.svg', 5, 'The operator network is top notch.', true),
  ('Alex Lee', '/placeholder.svg', 5, 'I love the BEAM platform!', true); 