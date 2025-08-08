-- Add location fields to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create project_locations table for better location management
CREATE TABLE IF NOT EXISTS public.project_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient location queries
CREATE INDEX IF NOT EXISTS idx_project_locations_city ON public.project_locations(city);
CREATE INDEX IF NOT EXISTS idx_project_locations_country ON public.project_locations(country);

-- Add RLS policies for project_locations
ALTER TABLE public.project_locations ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view project locations
CREATE POLICY "Users can view project locations" ON public.project_locations
    FOR SELECT USING (true);

-- Policy to allow authenticated users to insert project locations
CREATE POLICY "Authenticated users can insert project locations" ON public.project_locations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow project owners to update their project locations
CREATE POLICY "Project owners can update project locations" ON public.project_locations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_locations.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Policy to allow project owners to delete their project locations
CREATE POLICY "Project owners can delete project locations" ON public.project_locations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_locations.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_project_locations_updated_at
    BEFORE UPDATE ON public.project_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_project_locations_updated_at();

-- Insert sample location data for existing projects
INSERT INTO public.project_locations (project_id, city, country, latitude, longitude)
SELECT 
    p.id,
    CASE 
        WHEN p.id % 5 = 0 THEN 'San Francisco'
        WHEN p.id % 5 = 1 THEN 'New York'
        WHEN p.id % 5 = 2 THEN 'London'
        WHEN p.id % 5 = 3 THEN 'Toronto'
        ELSE 'Berlin'
    END as city,
    CASE 
        WHEN p.id % 5 = 0 THEN 'USA'
        WHEN p.id % 5 = 1 THEN 'USA'
        WHEN p.id % 5 = 2 THEN 'UK'
        WHEN p.id % 5 = 3 THEN 'Canada'
        ELSE 'Germany'
    END as country,
    CASE 
        WHEN p.id % 5 = 0 THEN 37.7749
        WHEN p.id % 5 = 1 THEN 40.7128
        WHEN p.id % 5 = 2 THEN 51.5074
        WHEN p.id % 5 = 3 THEN 43.6532
        ELSE 52.5200
    END as latitude,
    CASE 
        WHEN p.id % 5 = 0 THEN -122.4194
        WHEN p.id % 5 = 1 THEN -74.0060
        WHEN p.id % 5 = 2 THEN -0.1278
        WHEN p.id % 5 = 3 THEN -79.3832
        ELSE 13.4050
    END as longitude
FROM public.projects p
WHERE NOT EXISTS (
    SELECT 1 FROM public.project_locations pl WHERE pl.project_id = p.id
);

-- Update projects table with location data
UPDATE public.projects 
SET 
    city = pl.city,
    country = pl.country,
    latitude = pl.latitude,
    longitude = pl.longitude
FROM public.project_locations pl
WHERE projects.id = pl.project_id; 