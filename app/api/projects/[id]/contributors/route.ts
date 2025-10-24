import { NextRequest, NextResponse } from 'next/server';
// TODO: Implement Firebase database operations

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    // Call the database function to get contributors by project
    const { data, error } = await supabase
      .rpc('get_contributors_by_project', {
        project_uuid: projectId
      });

    if (error) {
      console.error('Error fetching project contributors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch project contributors' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      project_id: projectId,
      contributors: data || [],
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Error in project contributors API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 