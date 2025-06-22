-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('client', 'operator', 'admin')) NOT NULL DEFAULT 'client',
  company TEXT,
  industry TEXT,
  website TEXT,
  location TEXT,
  bio TEXT,
  skills TEXT[],
  specialties TEXT[],
  hourly_rate DECIMAL(10,2),
  is_verified BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client stats table
CREATE TABLE public.client_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  total_projects INTEGER DEFAULT 0,
  active_operators INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Operations table (BEAM tasks)
CREATE TABLE public.operations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('design', 'development', 'marketing', 'content', 'audio', 'video', 'consulting', 'other')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'claimed', 'in-progress', 'review', 'completed', 'cancelled')) DEFAULT 'open',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  budget DECIMAL(10,2),
  deadline TIMESTAMP WITH TIME ZONE,
  deliverables TEXT[],
  attachments TEXT[],
  tags TEXT[],
  requirements JSONB,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE
);

-- Operation feedback table
CREATE TABLE public.operation_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  operation_id UUID REFERENCES public.operations(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio items table
CREATE TABLE public.portfolio_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  operator_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  operation_id UUID REFERENCES public.operations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  images TEXT[],
  tags TEXT[],
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketplace items table
CREATE TABLE public.marketplace_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  images TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  sales INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')) NOT NULL,
  plan_id TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
  category TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  action_label TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Client stats policies
CREATE POLICY "Users can view own stats" ON public.client_stats
  FOR SELECT USING (auth.uid() = user_id);

-- Operations policies
CREATE POLICY "Clients can view own operations" ON public.operations
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Operators can view assigned operations" ON public.operations
  FOR SELECT USING (auth.uid() = operator_id);

CREATE POLICY "Operators can view open operations" ON public.operations
  FOR SELECT USING (status = 'open');

CREATE POLICY "Clients can create operations" ON public.operations
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Operators can update assigned operations" ON public.operations
  FOR UPDATE USING (auth.uid() = operator_id);

-- Marketplace policies (public read)
CREATE POLICY "Anyone can view active marketplace items" ON public.marketplace_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Sellers can manage own items" ON public.marketplace_items
  FOR ALL USING (auth.uid() = seller_id);

-- Notification policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create client stats record
  INSERT INTO public.client_stats (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update client stats
CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats when operations change
  UPDATE public.client_stats
  SET 
    total_projects = (
      SELECT COUNT(*) FROM public.operations 
      WHERE client_id = COALESCE(NEW.client_id, OLD.client_id)
    ),
    completed_tasks = (
      SELECT COUNT(*) FROM public.operations 
      WHERE client_id = COALESCE(NEW.client_id, OLD.client_id) 
      AND status = 'completed'
    ),
    updated_at = NOW()
  WHERE user_id = COALESCE(NEW.client_id, OLD.client_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION update_client_stats();
