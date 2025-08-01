import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const email = decodeURIComponent(params.email);
    
    // Call the database function to get projects by contributor
    const { data, error } = await supabase
      .rpc('get_projects_by_contributor', {
        contributor_email: email
      });

    if (error) {
      console.error('Error fetching contributor projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contributor projects' },
        { status: 500 }
      );
    }

    // Filter to only show completed or active projects for public display
    const publicProjects = data?.filter((project: any) => 
      project.project_status === 'completed' || project.project_status === 'active'
    ) || [];

    return NextResponse.json({
      contributor_email: email,
      projects: publicProjects,
      total: publicProjects.length
    });

  } catch (error) {
    console.error('Error in contributor projects API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 