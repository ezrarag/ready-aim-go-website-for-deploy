-- Video Categories Table
CREATE TABLE video_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  video_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Demo Videos Table
CREATE TABLE demo_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  duration VARCHAR(20),
  thumbnail_url TEXT,
  video_url TEXT NOT NULL,
  featured BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key to categories
  CONSTRAINT fk_category FOREIGN KEY (category) REFERENCES video_categories(id)
);

-- Indexes for better performance
CREATE INDEX idx_demo_videos_category ON demo_videos(category);
CREATE INDEX idx_demo_videos_featured ON demo_videos(featured);
CREATE INDEX idx_demo_videos_view_count ON demo_videos(view_count DESC);
CREATE INDEX idx_demo_videos_created_at ON demo_videos(created_at DESC);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(video_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE demo_videos 
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update video count in categories
CREATE OR REPLACE FUNCTION update_category_video_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the video count for the affected category
  IF TG_OP = 'INSERT' THEN
    UPDATE video_categories 
    SET video_count = video_count + 1 
    WHERE id = NEW.category;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE video_categories 
    SET video_count = video_count - 1 
    WHERE id = OLD.category;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If category changed, update both old and new categories
    IF OLD.category != NEW.category THEN
      UPDATE video_categories 
      SET video_count = video_count - 1 
      WHERE id = OLD.category;
      
      UPDATE video_categories 
      SET video_count = video_count + 1 
      WHERE id = NEW.category;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update category video counts
CREATE TRIGGER trigger_update_category_video_count
  AFTER INSERT OR UPDATE OR DELETE ON demo_videos
  FOR EACH ROW EXECUTE FUNCTION update_category_video_count();

-- RLS (Row Level Security) policies
ALTER TABLE video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_videos ENABLE ROW LEVEL SECURITY;

-- Allow public read access to videos and categories
CREATE POLICY "Public can view video categories" ON video_categories
  FOR SELECT USING (true);

CREATE POLICY "Public can view demo videos" ON demo_videos
  FOR SELECT USING (true);

-- Only authenticated users can modify (you can adjust this based on your needs)
CREATE POLICY "Authenticated users can manage video categories" ON video_categories
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage demo videos" ON demo_videos
  FOR ALL USING (auth.role() = 'authenticated');
