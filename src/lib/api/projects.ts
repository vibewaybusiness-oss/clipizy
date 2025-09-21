export interface Project {
  id: string;
  name: string | null;
  type: 'music-clip' | 'video-clip' | 'short-clip';
  status: 'created' | 'uploading' | 'analyzing' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'draft';
  created_at: string;
  updated_at: string;
  description: string | null;
  user_id: string;
}

export interface CreateProjectRequest {
  name?: string;
  type: 'music-clip' | 'video-clip' | 'short-clip';
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export class ProjectsAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '';
  }

  async getProjects(): Promise<Project[]> {
    try {
      const response = await fetch('/api/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  async getProject(projectId: string): Promise<Project> {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  }

  async createProject(projectData: CreateProjectRequest): Promise<Project> {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create project: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(projectId: string, projectData: UpdateProjectRequest): Promise<Project> {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update project: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete project: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  async getProjectStats(projectId: string): Promise<any> {
    try {
      const response = await fetch(`/api/projects/${projectId}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch project stats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching project stats:', error);
      throw error;
    }
  }
}

export const projectsAPI = new ProjectsAPI();
