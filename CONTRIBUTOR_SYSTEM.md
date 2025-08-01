# Contributor System Documentation

## Overview

This system allows you to mark users as contributors and attribute them to projects. Contributors can then display their work on personal websites by fetching data from your agency's Supabase database.

## Database Schema

### Tables

1. **profiles** (existing)
   - Added `is_contributor` boolean field
   - Marks users who can be attributed to projects

2. **project_contributors** (new)
   - Junction table linking projects to contributors
   - Tracks role, contribution percentage, and display order

3. **contributor_projects** (view)
   - Convenient view for fetching contributor data
   - Joins all necessary tables

### Functions

- `get_projects_by_contributor(contributor_email)` - Get all projects for a contributor
- `get_contributors_by_project(project_uuid)` - Get all contributors for a project

## API Endpoints

### Get Contributor Projects
```
GET /api/contributors/{email}/projects
```

Returns all projects where the contributor was involved.

### Get Project Contributors
```
GET /api/projects/{id}/contributors
```

Returns all contributors for a specific project.

## Usage Examples

### 1. Mark a User as Contributor

```sql
-- In Supabase SQL editor
UPDATE profiles 
SET is_contributor = TRUE 
WHERE email = 'ezra@example.com';
```

### 2. Add Contributor to Project

```sql
-- In Supabase SQL editor
INSERT INTO project_contributors (
  project_id, 
  contributor_id, 
  role, 
  contribution_percentage, 
  attribution_order
) VALUES (
  'project-uuid',
  'contributor-profile-uuid',
  'developer',
  80,
  1
);
```

### 3. Use on Personal Website

#### Option A: Same Supabase Project
```tsx
import { ContributorPortfolio } from '@/components/contributor-portfolio';

function MyPortfolio() {
  return (
    <ContributorPortfolio 
      contributorEmail="ezra@example.com"
      title="My Work"
    />
  );
}
```

#### Option B: Cross-Project (Personal Website)
```tsx
import { ContributorPortfolio } from '@/components/contributor-portfolio';

function MyPortfolio() {
  return (
    <ContributorPortfolio 
      contributorEmail="ezra@example.com"
      supabaseUrl="https://your-agency.supabase.co"
      supabaseKey="your-anon-key"
      title="My Work"
    />
  );
}
```

### 4. Fetch Data Programmatically

```tsx
import { useContributorProjects } from '@/hooks/use-contributor-projects';

function MyComponent() {
  const { projects, loading, error } = useContributorProjects(
    'ezra@example.com',
    'https://your-agency.supabase.co',
    'your-anon-key'
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {projects.map(project => (
        <div key={project.project_id}>
          <h3>{project.project_title}</h3>
          <p>{project.project_description}</p>
          <span>Role: {project.role}</span>
        </div>
      ))}
    </div>
  );
}
```

## Security

### RLS Policies

- **Public Read Access**: Anyone can read contributor data (for portfolio display)
- **Authenticated Write Access**: Only project owners and contributors can modify data

### Cross-Project Access

When using the cross-project approach:
1. Use only the **anon key** (never service role key)
2. Set up RLS policies to allow public read access
3. Only expose data you want to be public

## Setup Instructions

### 1. Run Database Migration

Execute the SQL in `database/add-contributor-role.sql` in your Supabase SQL editor.

### 2. Mark Users as Contributors

```sql
UPDATE profiles 
SET is_contributor = TRUE 
WHERE email IN ('ezra@example.com', 'other@example.com');
```

### 3. Add Contributors to Projects

Use the dashboard interface or run SQL:

```sql
INSERT INTO project_contributors (
  project_id, 
  contributor_id, 
  role, 
  contribution_percentage, 
  attribution_order
) 
SELECT 
  p.id as project_id,
  prof.id as contributor_id,
  'developer' as role,
  80 as contribution_percentage,
  1 as attribution_order
FROM projects p
CROSS JOIN profiles prof
WHERE p.title = 'Ezra Hauga Brooks Website'
AND prof.email = 'ezra@example.com';
```

### 4. Test the API

```bash
curl "https://your-project.supabase.co/rest/v1/rpc/get_projects_by_contributor" \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"contributor_email": "ezra@example.com"}'
```

## Dashboard Integration

The `ProjectContributorsManager` component can be added to project detail pages in your dashboard to manage contributors.

## Troubleshooting

### Common Issues

1. **No projects returned**: Check that the user is marked as `is_contributor = TRUE`
2. **Permission denied**: Ensure RLS policies are set up correctly
3. **Cross-project not working**: Verify the anon key and URL are correct

### Debug Queries

```sql
-- Check if user is contributor
SELECT * FROM profiles WHERE email = 'ezra@example.com';

-- Check project contributors
SELECT * FROM project_contributors pc
JOIN profiles p ON pc.contributor_id = p.id
JOIN projects pr ON pc.project_id = pr.id
WHERE p.email = 'ezra@example.com';

-- Check the view
SELECT * FROM contributor_projects 
WHERE contributor_id = (SELECT id FROM profiles WHERE email = 'ezra@example.com');
``` 