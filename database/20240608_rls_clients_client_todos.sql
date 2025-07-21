-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_todos ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can access
CREATE POLICY "Authenticated users only" ON public.clients
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users only" ON public.client_todos
  FOR ALL USING (auth.role() = 'authenticated');

-- Admins can read/write all
CREATE POLICY "Admins can access all clients" ON public.clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
CREATE POLICY "Admins can access all todos" ON public.client_todos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can read their own client record
CREATE POLICY "Client can read own client record" ON public.clients
  FOR SELECT USING (id = auth.uid());

-- Clients can read/write their own todos
CREATE POLICY "Client can manage own todos" ON public.client_todos
  FOR ALL USING (
    client_id = auth.uid()
  );

-- Default deny all other access
-- (Supabase RLS is deny-by-default once enabled) 