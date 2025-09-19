"use client";

import { useState, useCallback, useEffect } from 'react';

interface Project {
  id: string;
  name: string;
  type: 'music-clip' | 'script-video' | 'automate';
  status: 'draft' | 'processing' | 'completed' | 'error';
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    audioFile?: string;
    duration?: number;
    genre?: string;
    mood?: string;
    style?: string;
    budget?: number;
    sceneCount?: number;
  };
}

interface ProjectManagementState {
  projects: Project[];
  currentProject: Project | null;
  currentProjectId: string | null;
  isLoadingProject: boolean;
  loading: boolean;
  error: string | null;
}

export function useProjectManagement() {
  const [state, setState] = useState<ProjectManagementState>({
    projects: [],
    currentProject: null,
    currentProjectId: null,
    isLoadingProject: false,
    loading: false,
    error: null,
  });

  const loadProjects = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // TODO: Replace with actual API call
      // Load from localStorage for now
      if (typeof window !== 'undefined') {
        const savedProjects = localStorage.getItem('projects');
        if (savedProjects) {
          const projects = JSON.parse(savedProjects);
          setState(prev => ({ ...prev, projects, loading: false }));
        } else {
          setState(prev => ({ ...prev, loading: false }));
        }
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load projects',
        loading: false,
      }));
    }
  }, []);

  const createProject = useCallback(async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const newProject: Project = {
        ...projectData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedProjects = [...state.projects, newProject];
      setState(prev => ({
        ...prev,
        projects: updatedProjects,
        currentProject: newProject,
        loading: false,
      }));

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
      }

      return newProject;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create project',
        loading: false,
      }));
      throw error;
    }
  }, [state.projects]);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const updatedProjects = state.projects.map(project =>
        project.id === id
          ? { ...project, ...updates, updatedAt: new Date() }
          : project
      );

      setState(prev => ({
        ...prev,
        projects: updatedProjects,
        currentProject: prev.currentProject?.id === id 
          ? { ...prev.currentProject, ...updates, updatedAt: new Date() }
          : prev.currentProject,
        loading: false,
      }));

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update project',
        loading: false,
      }));
      throw error;
    }
  }, [state.projects]);

  const deleteProject = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const updatedProjects = state.projects.filter(project => project.id !== id);
      setState(prev => ({
        ...prev,
        projects: updatedProjects,
        currentProject: prev.currentProject?.id === id ? null : prev.currentProject,
        loading: false,
      }));

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('projects', JSON.stringify(updatedProjects));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete project',
        loading: false,
      }));
      throw error;
    }
  }, [state.projects]);

  const selectProject = useCallback((project: Project | null) => {
    setState(prev => ({ ...prev, currentProject: project }));
  }, []);

  const getProjectById = useCallback((id: string) => {
    return state.projects.find(project => project.id === id);
  }, [state.projects]);

  const getProjectsByType = useCallback((type: Project['type']) => {
    return state.projects.filter(project => project.type === type);
  }, [state.projects]);

  const getProjectsByStatus = useCallback((status: Project['status']) => {
    return state.projects.filter(project => project.status === status);
  }, [state.projects]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Additional methods expected by existing code
  const clearProjectData = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentProject: null,
      currentProjectId: null,
    }));
  }, []);

  const updateProjectSettings = useCallback(async (projectId: string, settings: any) => {
    setState(prev => ({ ...prev, isLoadingProject: true, error: null }));
    
    try {
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call
      
      setState(prev => ({
        ...prev,
        isLoadingProject: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update project settings',
        isLoadingProject: false,
      }));
      throw error;
    }
  }, []);

  const loadExistingProject = useCallback(async (projectId: string) => {
    setState(prev => ({ ...prev, isLoadingProject: true, error: null }));
    
    try {
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call
      
      const project = getProjectById(projectId);
      setState(prev => ({
        ...prev,
        currentProject: project || null,
        currentProjectId: projectId,
        isLoadingProject: false,
      }));
      
      return project;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load project',
        isLoadingProject: false,
      }));
      throw error;
    }
  }, [getProjectById]);

  const createProjectAction = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingProject: true, error: null }));
    
    try {
      // TODO: Implement actual API call
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call
      
      const newProjectId = Date.now().toString();
      setState(prev => ({
        ...prev,
        currentProjectId: newProjectId,
        isLoadingProject: false,
      }));
      
      return newProjectId;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create project',
        isLoadingProject: false,
      }));
      throw error;
    }
  }, []);

  return {
    state,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
    getProjectById,
    getProjectsByType,
    getProjectsByStatus,
    actions: {
      clearProjectData,
      updateProjectSettings,
      loadExistingProject,
      createProject: createProjectAction,
    },
  };
}