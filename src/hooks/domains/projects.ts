// PROJECT DOMAIN HOOKS
import { useState, useCallback, useEffect } from 'react';
import { projectsService } from '@/lib/api/services';
import type { CreateProjectRequest, UpdateProjectRequest, Project } from '@/types/domains';

export function useProjectsDomain() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [current, setCurrent] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectsService.getProjects();
      setProjects(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects';
      setError(errorMessage);
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (data: CreateProjectRequest) => {
    try {
      setError(null);
      const newProject = await projectsService.createProject(data);
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
      setError(errorMessage);
      throw error;
    }
  }, []);

  const updateProject = useCallback(async (id: string, data: UpdateProjectRequest) => {
    try {
      setError(null);
      const updatedProject = await projectsService.updateProject(id, data);
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
      return updatedProject;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update project';
      setError(errorMessage);
      throw error;
    }
  }, []);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      await projectsService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete project';
      setError(errorMessage);
      throw error;
    }
  }, []);

  // Auto-fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    items: projects,
    current,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
