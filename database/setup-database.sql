-- Comprehensive database setup for ReadyAimGo
-- Run this script to set up all necessary tables and fix the application issues

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (this is what the app expects)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('client', 'operator', 'admin')) DEFAULT 'client',
  contract_accepted_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  is_demo_client BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
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

-- Create testimonials table
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  text TEXT NOT NULL,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Projects RLS Policies
DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "Clients can create projects" ON public.projects;
DROP POLICY IF EXISTS "Clients can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Operators can update assigned projects" ON public.projects;

CREATE POLICY "Anyone can view projects" ON public.projects
  FOR SELECT USING (true);

CREATE POLICY "Clients can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "Operators can update assigned projects" ON public.projects
  FOR UPDATE USING (auth.uid() = operator_id);

-- Testimonials RLS Policies
DROP POLICY IF EXISTS "Anyone can view testimonials" ON public.testimonials;

CREATE POLICY "Anyone can view testimonials" ON public.testimonials
  FOR SELECT USING (true);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'client'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample data
INSERT INTO public.projects (title, description, live_url, tags, status, budget) VALUES
  ('E-commerce Website', 'Modern e-commerce platform with payment integration', 'https://example.com/shop', ARRAY['React', 'E-commerce', 'Payment'], 'completed', 5000),
  ('Portfolio Site', 'Creative portfolio for a photographer', 'https://example.com/portfolio', ARRAY['Design', 'Portfolio', 'Photography'], 'completed', 2500),
  ('Mobile App', 'Cross-platform mobile application', 'https://example.com/app', ARRAY['React Native', 'Mobile', 'Cross-platform'], 'in-progress', 8000)
ON CONFLICT DO NOTHING;

INSERT INTO public.testimonials (name, avatar, rating, text, featured) VALUES
  ('Jane Doe', '/placeholder.svg', 5, 'ReadyAimGo made my project a breeze!', true),
  ('Sam Miller', '/placeholder.svg', 5, 'The operator network is top notch.', true),
  ('Alex Lee', '/placeholder.svg', 5, 'I love the BEAM platform!', true)
ON CONFLICT DO NOTHING; 