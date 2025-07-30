import { createClient } from 'npm:@supabase/supabase-js@2.39.3'

// This Edge Function handles synchronization between clients and projects
Deno.serve(async (req) => {
  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create a Supabase client using the request's Authorization header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Check if the user is an admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError) {
      return new Response(
        JSON.stringify({ error: 'Error fetching user', details: userError }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the user's profile to check if they're an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Error fetching profile', details: profileError }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can sync clients and projects' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the request body
    const { action } = await req.json()
    let result

    // Handle different synchronization actions
    switch (action) {
      case 'sync':
        // Call the sync_projects_with_clients function
        const { data: syncData, error: syncError } = await supabaseClient.rpc(
          'sync_projects_with_clients'
        )
        
        if (syncError) throw syncError
        result = { success: true, action: 'sync', data: syncData }
        break

      case 'import_demo':
        // Call the import_demo_data function
        const { data: importData, error: importError } = await supabaseClient.rpc(
          'import_demo_data'
        )
        
        if (importError) throw importError
        result = { success: true, action: 'import_demo', data: importData }
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Use "sync" or "import_demo"' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }

    // Return the result
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in sync-clients-projects function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 