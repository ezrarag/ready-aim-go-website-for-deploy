import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roles, businessId } = await request.json();

    if (!roles || !Array.isArray(roles)) {
      return NextResponse.json({ error: 'Invalid roles data' }, { status: 400 });
    }

    const results = [];

    for (const role of roles) {
      try {
        // Insert into roles_pool
        const { data: roleData, error: roleError } = await supabase
          .from('roles_pool')
          .insert({
            title: role.title,
            category: role.category,
            description: `Role extracted from business plan: ${role.title}`,
            source_business_id: businessId,
            added_by_user_id: user.id,
            tags: [role.category.toLowerCase(), 'business-plan-extracted']
          })
          .select()
          .single();

        if (roleError) {
          console.error('Error inserting role:', roleError);
          results.push({ 
            title: role.title, 
            success: false, 
            error: roleError.message 
          });
          continue;
        }

        // Insert into marketplace_roles
        const { data: marketplaceData, error: marketplaceError } = await supabase
          .from('marketplace_roles')
          .insert({
            role_id: roleData.id,
            business_id: businessId,
            posted_by_user_id: user.id,
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
          })
          .select()
          .single();

        if (marketplaceError) {
          console.error('Error inserting marketplace role:', marketplaceError);
          results.push({ 
            title: role.title, 
            success: false, 
            error: marketplaceError.message 
          });
          continue;
        }

        results.push({ 
          title: role.title, 
          success: true, 
          roleId: roleData.id,
          marketplaceId: marketplaceData.id 
        });

      } catch (error) {
        console.error('Error processing role:', role.title, error);
        results.push({ 
          title: role.title, 
          success: false, 
          error: 'Unknown error' 
        });
      }
    }

    const successfulRoles = results.filter(r => r.success);
    const failedRoles = results.filter(r => !r.success);

    return NextResponse.json({
      success: true,
      totalRoles: roles.length,
      successfulRoles: successfulRoles.length,
      failedRoles: failedRoles.length,
      results,
      message: `Successfully published ${successfulRoles.length} of ${roles.length} roles`
    });

  } catch (error) {
    console.error('Error publishing roles:', error);
    return NextResponse.json(
      { error: 'Failed to publish roles' },
      { status: 500 }
    );
  }
} 