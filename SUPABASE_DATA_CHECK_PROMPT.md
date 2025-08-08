# Supabase Data Check Prompt

Please run the following queries to check if we have the necessary data for our home page sections:

## 1. Projects Data Check
```sql
-- Check if projects table exists and has data
SELECT 
  COUNT(*) as total_projects,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
  COUNT(CASE WHEN live_url IS NOT NULL AND live_url != '' THEN 1 END) as projects_with_live_urls,
  COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as projects_with_images,
  COUNT(CASE WHEN tags IS NOT NULL AND tags != '[]' THEN 1 END) as projects_with_tags
FROM projects;

-- Check sample project data
SELECT id, title, description, live_url, image_url, status, tags, created_at 
FROM projects 
LIMIT 5;
```

## 2. Project Locations Data Check
```sql
-- Check if project_locations table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'project_locations'
) as table_exists;

-- If table exists, check the data
SELECT 
  COUNT(*) as total_locations,
  COUNT(CASE WHEN city IS NOT NULL THEN 1 END) as locations_with_cities,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as locations_with_coordinates
FROM project_locations;

-- Check sample location data
SELECT * FROM project_locations LIMIT 5;
```

## 3. Operators Data Check
```sql
-- Check if we have operator data
SELECT 
  COUNT(DISTINCT operator_id) as unique_operators,
  COUNT(CASE WHEN operator_id IS NOT NULL THEN 1 END) as projects_with_operators
FROM projects;

-- Check operator details if operators table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'operators'
) as operators_table_exists;
```

## 4. Home Page Stats Data Check
```sql
-- Check data needed for HomeStats component
SELECT 
  -- Projects Complete
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as projects_complete,
  
  -- Active Operators (unique operators from projects)
  COUNT(DISTINCT operator_id) as active_operators,
  
  -- Creator Value (sum of budgets from completed projects)
  COALESCE(SUM(CASE WHEN status = 'completed' THEN COALESCE(budget, 0) ELSE 0 END), 0) as creator_value,
  
  -- Total projects
  COUNT(*) as total_projects
FROM projects;
```

## 5. Recent Projects for Carousel
```sql
-- Get recent projects for the carousel (last 6 completed projects)
SELECT 
  id,
  title,
  description,
  live_url,
  image_url,
  tags,
  created_at,
  status
FROM projects 
WHERE status = 'completed' 
ORDER BY created_at DESC 
LIMIT 6;
```

## 6. Project Locations for Map
```sql
-- Get project locations for the map
SELECT 
  pl.id,
  pl.city,
  pl.country,
  pl.latitude,
  pl.longitude,
  COUNT(p.id) as project_count,
  ARRAY_AGG(p.title) as project_titles
FROM project_locations pl
LEFT JOIN projects p ON pl.project_id = p.id
WHERE pl.city IS NOT NULL
GROUP BY pl.id, pl.city, pl.country, pl.latitude, pl.longitude
ORDER BY project_count DESC;
```

## 7. Database Schema Check
```sql
-- Check all tables in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check projects table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;
```

## 8. Data Quality Check
```sql
-- Check for data quality issues
SELECT 
  'Projects without live URLs' as issue,
  COUNT(*) as count
FROM projects 
WHERE live_url IS NULL OR live_url = ''

UNION ALL

SELECT 
  'Projects without descriptions' as issue,
  COUNT(*) as count
FROM projects 
WHERE description IS NULL OR description = ''

UNION ALL

SELECT 
  'Projects without tags' as issue,
  COUNT(*) as count
FROM projects 
WHERE tags IS NULL OR tags = '[]'

UNION ALL

SELECT 
  'Projects without status' as issue,
  COUNT(*) as count
FROM projects 
WHERE status IS NULL;
```

## Expected Results:

### For Home Page to Work Properly:
1. **Projects table** should have at least 3-6 completed projects
2. **Each project** should have:
   - `live_url` (for screenshots)
   - `title` and `description`
   - `status` = 'completed'
   - `tags` (array or string)
3. **Project locations** should have:
   - `city` and `country` names
   - `latitude` and `longitude` coordinates
4. **Operators** should be linked to projects

### If Data is Missing:
- **For projects**: We can create sample data
- **For locations**: We can use fallback locations
- **For operators**: We can calculate from project data

Please run these queries and let me know the results so I can adjust the frontend accordingly! 