// GitHub service for fetching TODO.me content
// This service will handle fetching TODO items from GitHub repositories

export interface TodoItem {
  id: string;
  content: string;
  author: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  line?: number;
  file?: string;
  url?: string;
}

export interface GitHubConfig {
  token?: string;
  baseUrl?: string;
  apiVersion?: string;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
  defaultBranch?: string;
}

class GitHubService {
  private config: GitHubConfig;

  constructor(config: GitHubConfig = {}) {
    this.config = {
      baseUrl: 'https://api.github.com',
      apiVersion: '2022-11-28',
      ...config
    };
  }

  /**
   * Extract repository info from GitHub URL
   */
  private parseGitHubUrl(url: string): GitHubRepo | null {
    try {
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace('.git', '')
        };
      }
    } catch (error) {
      console.error('Error parsing GitHub URL:', error);
    }
    return null;
  }

  /**
   * Search for TODO.me files in repository
   */
  private async searchTodoMeFiles(owner: string, repo: string): Promise<any[]> {
    try {
      if (!this.config.token) {
        console.warn('GitHub token not configured, using mock data');
        return [];
      }

      const response = await fetch(
        `${this.config.baseUrl}/search/code?q=filename:TODO.md+repo:${owner}/${repo}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': this.config.apiVersion!
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('GitHub token invalid or expired, falling back to empty data');
          return [];
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('GitHub search results:', data);
      return data.items || [];
    } catch (error) {
      console.error('Error searching for TODO.me files:', error);
      return [];
    }
  }

  /**
   * Fetch file content from GitHub
   */
  private async fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
    try {
      if (!this.config.token) {
        throw new Error('GitHub token required for file content');
      }

      const response = await fetch(
        `${this.config.baseUrl}/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': this.config.apiVersion!
          }
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      return atob(data.content); // Decode base64 content
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw error;
    }
  }

  /**
   * Parse TODO.me file content
   */
  private parseTodoMeContent(content: string, filePath: string): TodoItem[] {
    const lines = content.split('\n');
    const todoItems: TodoItem[] = [];
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;
      
      // Match TODO patterns
      const todoMatch = line.match(/^[-\s]*\[([ x])\]\s*(.+)$/i);
      if (todoMatch) {
        const isCompleted = todoMatch[1] === 'x';
        const content = todoMatch[2].trim();
        
        // Extract priority from content
        const priorityMatch = content.match(/#(high|medium|low|critical)/i);
        const priority = priorityMatch ? 
          (priorityMatch[1].toLowerCase() as 'high' | 'medium' | 'low') : 'medium';
        
        // Extract author from content
        const authorMatch = content.match(/@(\w+)/);
        const author = authorMatch ? authorMatch[1] : 'developer';
        
        // Extract date if present
        const dateMatch = content.match(/\d{4}-\d{2}-\d{2}/);
        const date = dateMatch ? dateMatch[0] : new Date().toISOString().split('T')[0];
        
        todoItems.push({
          id: `${filePath}_${lineNumber}`,
          content: content.replace(/#(high|medium|low|critical)|@\w+|\d{4}-\d{2}-\d{2}/gi, '').trim(),
          author,
          date,
          priority,
          status: isCompleted ? 'completed' : 'pending',
          line: lineNumber,
          file: filePath
        });
      }
    }

    return todoItems;
  }

  /**
   * Fetch TODO.me content from a GitHub repository
   */
  async fetchTodoMeContent(githubUrl: string): Promise<TodoItem[]> {
    try {
      const repoInfo = this.parseGitHubUrl(githubUrl);
      if (!repoInfo) {
        throw new Error('Invalid GitHub URL');
      }

      // Try to fetch real TODO.md files
      if (this.config.token) {
        try {
          console.log('Searching for TODO.md files in:', repoInfo.owner, repoInfo.repo);
          const todoFiles = await this.searchTodoMeFiles(repoInfo.owner, repoInfo.repo);
          console.log('Found TODO.md files:', todoFiles);
          
          if (todoFiles.length > 0) {
            const allTodoItems: TodoItem[] = [];
            
            for (const file of todoFiles) {
              try {
                console.log('Fetching content from:', file.path);
                const content = await this.fetchFileContent(repoInfo.owner, repoInfo.repo, file.path);
                console.log('File content:', content.substring(0, 200) + '...');
                const todoItems = this.parseTodoMeContent(content, file.path);
                console.log('Parsed TODO items:', todoItems);
                allTodoItems.push(...todoItems);
              } catch (error) {
                console.warn(`Failed to fetch content from ${file.path}:`, error);
              }
            }
            
            if (allTodoItems.length > 0) {
              console.log('Returning real TODO items:', allTodoItems);
              return allTodoItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            }
          }
        } catch (error) {
          console.warn('Failed to fetch real TODO.md files:', error);
        }
      }

      // Return empty array if no real data found
      return [];
    } catch (error) {
      console.error('Error fetching TODO.me content:', error);
      return [];
    }
  }

  /**
   * Mock TODO items for development (removed - now only shows real data)
   */
  private getMockTodoItems(): TodoItem[] {
    return [];
  }

  /**
   * Check if GitHub token is configured
   */
  isConfigured(): boolean {
    return !!this.config.token;
  }

  /**
   * Get repository information
   */
  async getRepoInfo(githubUrl: string): Promise<GitHubRepo | null> {
    return this.parseGitHubUrl(githubUrl);
  }
}

// Create a singleton instance with configuration
import { getServiceConfig } from '@/lib/config/services';

const config = getServiceConfig();
export const githubService = new GitHubService(config.github);

import { useState, useEffect } from 'react';

// React hook for using GitHub service
export function useGitHubTodoMe(githubUrl: string | undefined) {
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (!githubUrl) {
      setTodoItems([]);
      return;
    }

    setLoading(true);
    setError(null);
    setIsConfigured(githubService.isConfigured());

    githubService.fetchTodoMeContent(githubUrl)
      .then(items => {
        setTodoItems(items);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [githubUrl]);

  return { todoItems, loading, error, isConfigured };
} 