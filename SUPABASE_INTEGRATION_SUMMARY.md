# Supabase Integration Summary

## Client Library Information

**Library**: `@supabase/supabase-js` (JavaScript/TypeScript client)
**Version**: Latest stable
**Authentication**: Using anon key for client-side operations
**Real-time**: Enabled with `postgres_changes` subscriptions

## Database Schema Enhancements

### Projects Table Enhancements
```sql
-- Added columns for better website integration
ALTER TABLE projects ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'website';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_primary_website BOOLEAN DEFAULT FALSE;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_projects_client_id_type ON projects(client_id, type);
CREATE INDEX IF NOT EXISTS idx_projects_live_url ON projects(live_url) WHERE live_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_primary_website ON projects(client_id, is_primary_website) WHERE is_primary_website = TRUE;
```

### New Views and Functions
```sql
-- View for easy website access
CREATE OR REPLACE VIEW client_websites AS
SELECT id, title as name, live_url as url, status, client_id, created_at, updated_at, is_primary_website
FROM projects 
WHERE type = 'website' AND live_url IS NOT NULL
ORDER BY is_primary_website DESC, created_at DESC;

-- Function to get primary website
CREATE OR REPLACE FUNCTION get_primary_website(client_uuid UUID)
RETURNS TABLE (id UUID, name TEXT, url TEXT, status TEXT, created_at TIMESTAMP WITH TIME ZONE)
AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all client websites
CREATE OR REPLACE FUNCTION get_client_websites(client_uuid UUID)
RETURNS TABLE (id UUID, name TEXT, url TEXT, status TEXT, is_primary BOOLEAN, created_at TIMESTAMP WITH TIME ZONE)
AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;
```

## React Implementation

### Enhanced Hook: `useClientWebsite`
```typescript
// hooks/use-client-website.ts
export function useClientWebsite(clientId: string | undefined) {
  // Fetches website info from both business_assets and projects tables
  // Real-time subscriptions for both tables
  // Fallback to default values if no data found
  // Returns: { websiteInfo, loading, error }
}
```

### Dashboard Integration
```typescript
// app/dashboard/client/page.tsx
const { websiteInfo, loading: websiteLoading, error: websiteError } = useClientWebsite(session?.user?.id);

// Dynamic website name update
useEffect(() => {
  if (!websiteLoading && websiteInfo) {
    setBusinessAssets(prev => prev.map(asset => 
      asset.type === 'website' 
        ? { ...asset, name: websiteInfo.name, status: websiteInfo.status }
        : asset
    ));
  }
}, [websiteInfo, websiteLoading]);
```

## Real-time Subscriptions

### Projects Table Subscription
```typescript
const projectsSubscription = supabase
  .channel('website-projects-changes')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'projects',
      filter: `client_id=eq.${clientId} AND type=eq.website`
    }, 
    () => fetchWebsiteInfo()
  )
  .subscribe();
```

### Business Assets Table Subscription
```typescript
const assetsSubscription = supabase
  .channel('website-assets-changes')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'business_assets',
      filter: `client_id=eq.${clientId} AND type=eq.website`
    }, 
    () => fetchWebsiteInfo()
  )
  .subscribe();
```

## Data Flow

1. **Initial Load**: Hook fetches website data from both tables
2. **Priority**: Business assets table first, then projects table
3. **Fallback**: Default to "ezrahaugabrooks.com" if no data found
4. **Real-time**: Updates automatically when either table changes
5. **Dashboard**: Website card updates dynamically with new data

## Error Handling

- **Network errors**: Fallback to default values
- **Missing data**: Graceful degradation with defaults
- **Permission errors**: Logged to console, fallback values used
- **Real-time errors**: Automatic retry with exponential backoff

## Performance Optimizations

- **Indexed queries**: Fast lookups by client_id and type
- **Limited results**: Using LIMIT 1 for primary website
- **Efficient filters**: WHERE clauses for non-null live_url
- **Cached subscriptions**: Reuse channels for multiple components

## Security

- **RLS Policies**: Users can only access their own data
- **SECURITY DEFINER**: Functions run with elevated privileges
- **Parameterized queries**: SQL injection prevention
- **Anon key only**: No sensitive operations on client side

## Testing Recommendations

1. **Add test data** to projects table with different types
2. **Test real-time updates** by modifying data in Supabase dashboard
3. **Verify fallback behavior** by removing all website data
4. **Check performance** with multiple clients and websites
5. **Test error scenarios** by temporarily disabling RLS

## Next Steps

1. **Run the migration**: `enhance-projects-table.sql`
2. **Test the integration** with real project data
3. **Monitor performance** in production
4. **Add more project types** (app, business_plan, etc.)
5. **Implement similar patterns** for other business assets 