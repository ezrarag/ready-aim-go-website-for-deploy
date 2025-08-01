import React from 'react';
import { useContributorProjects } from '@/hooks/use-contributor-projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Calendar, User } from 'lucide-react';

interface ContributorPortfolioProps {
  contributorEmail: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  title?: string;
  className?: string;
}

export function ContributorPortfolio({ 
  contributorEmail, 
  supabaseUrl, 
  supabaseKey, 
  title = "My Work",
  className = "" 
}: ContributorPortfolioProps) {
  const { projects, loading, error } = useContributorProjects(contributorEmail, supabaseUrl, supabaseKey);

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="text-center py-12 text-gray-500">
          <p>Unable to load projects at this time.</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="text-center py-12 text-gray-500">
          <p>No projects found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.project_id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{project.project_title}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(project.project_created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={project.project_status === 'completed' ? 'default' : 'secondary'}>
                  {project.project_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.image_url && (
                <div className="aspect-video bg-gray-100 rounded overflow-hidden">
                  <img 
                    src={project.image_url} 
                    alt={project.project_title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.jpg';
                    }}
                  />
                </div>
              )}
              
              <p className="text-sm text-gray-600 line-clamp-3">
                {project.project_description}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{project.role}</span>
                </div>
                {project.live_url && (
                  <a 
                    href={project.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visit
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 