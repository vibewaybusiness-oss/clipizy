import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { musicClipAPI } from '@/lib/api/music-clip';
import type { MusicTrack } from '@/types/music-clip';
import * as z from 'zod';
import { SettingsSchema } from '@/components/clipizi-generator';

export interface Project {
  project_id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
}

export interface ProjectManagementState {
  currentProjectId: string | null;
  isProjectCreated: boolean;
  isLoadingProject: boolean;
  existingProjects: Project[];
}

export interface ProjectManagementActions {
  createProject: () => Promise<string | null>;
  loadExistingProjects: () => Promise<void>;
  loadExistingProject: (projectId: string) => Promise<{ script: any; tracks: any } | undefined>;
  updateProjectSettings: (projectId: string, settings: z.infer<typeof SettingsSchema>) => Promise<void>;
  clearProjectData: () => void;
}

export function useProjectManagement() {
  const { toast } = useToast();

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isProjectCreated, setIsProjectCreated] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [existingProjects, setExistingProjects] = useState<Project[]>([]);

  const createProject = useCallback(async (): Promise<string | null> => {
    if (isProjectCreated && currentProjectId) {
      // Verify the project still exists on the backend
      try {
        console.log('Verifying existing project:', currentProjectId);
        await musicClipAPI.getProjectScript(currentProjectId);
        console.log('Project verified successfully:', currentProjectId);
        return currentProjectId;
      } catch (error) {
        console.log('Project not found on backend, creating new one:', error);
        // Project doesn't exist, reset state and create new one
        setCurrentProjectId(null);
        setIsProjectCreated(false);
      }
    }

    try {
      console.log('Creating new project...');
      const project = await musicClipAPI.createProject(
        `Music Clip ${new Date().toLocaleDateString()}`,
        "AI-generated music video project"
      );
      console.log('Project created successfully:', project.project_id);

      setCurrentProjectId(project.project_id);
      setIsProjectCreated(true);

      toast({
        title: "Project Created",
        description: "Your music clip project has been created successfully.",
      });

      return project.project_id;
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        variant: "destructive",
        title: "Project Creation Failed",
        description: "Failed to create project. Please try again.",
      });
      throw error;
    }
  }, [isProjectCreated, currentProjectId, toast]);

  const loadExistingProjects = useCallback(async () => {
    try {
      console.log('Loading existing projects...');
      const response = await musicClipAPI.getAllProjects();
      setExistingProjects(response.projects);
      console.log('Loaded projects:', response.projects);
    } catch (error) {
      console.error('Failed to load existing projects:', error);
      toast({
        variant: "destructive",
        title: "Failed to Load Projects",
        description: "Could not load existing projects. Please try again.",
      });
    }
  }, [toast]);

  const loadExistingProject = useCallback(async (projectId: string) => {
    if (isLoadingProject) {
      console.log('Project already loading, skipping...');
      return;
    }

    try {
      console.log('Loading existing project:', projectId);
      setIsLoadingProject(true);

      // Set the project ID
      setCurrentProjectId(projectId);
      setIsProjectCreated(true);

      // Load project data from backend
      const projectScript = await musicClipAPI.getProjectScript(projectId);
      const projectTracks = await musicClipAPI.getProjectTracks(projectId);

      console.log('Project script loaded:', projectScript);
      console.log('Project tracks loaded:', projectTracks);

      return {
        script: projectScript,
        tracks: projectTracks,
      };
    } catch (error) {
      console.error('Failed to load existing project:', error);
      toast({
        variant: "destructive",
        title: "Project Load Failed",
        description: "Failed to load existing project. Starting with a new project.",
      });

      // Reset to new project state on error
      setCurrentProjectId(null);
      setIsProjectCreated(false);
      throw error;
    } finally {
      setIsLoadingProject(false);
    }
  }, [isLoadingProject, toast]);

  const updateProjectSettings = useCallback(async (
    projectId: string,
    settings: z.infer<typeof SettingsSchema>
  ) => {
    try {
      await musicClipAPI.updateProjectSettings(projectId, settings);
      console.log('Settings synced to backend successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        variant: "destructive",
        title: "Settings Save Failed",
        description: "Failed to save settings to project. Continuing anyway.",
      });
      throw error;
    }
  }, [toast]);

  const clearProjectData = useCallback(() => {
    setCurrentProjectId(null);
    setIsProjectCreated(false);
    setExistingProjects([]);
  }, []);

  const state: ProjectManagementState = {
    currentProjectId,
    isProjectCreated,
    isLoadingProject,
    existingProjects,
  };

  const actions: ProjectManagementActions = {
    createProject,
    loadExistingProjects,
    loadExistingProject,
    updateProjectSettings,
    clearProjectData,
  };

  return {
    state,
    actions,
  };
}
