"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Calendar, Clock, Plus, ArrowRight, Trash2, AlertTriangle } from "lucide-react";
import { projectsAPI } from "@/lib/api/projects";
import { useToast } from "@/hooks/ui/use-toast";

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  tracks?: Array<{
    id: string;
    name: string;
    duration: number;
    created_at: string;
  }>;
}

interface ProjectSelectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onNewProject: () => void;
  onContinueProject: (projectId: string) => void;
}

export function ProjectSelectionPopup({
  isOpen,
  onClose,
  onNewProject,
  onContinueProject,
}: ProjectSelectionPopupProps) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset and fetch projects when popup opens
  useEffect(() => {
    if (isOpen) {
      // Log user ID when create-music popup opens
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          console.log('🎵 Create-Music Popup Opened!');
          console.log('👤 User ID:', user.id);
          console.log('📧 User Email:', user.email);
          console.log('👨‍💼 User Name:', user.name);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      } else {
        console.log('🎵 Create-Music Popup Opened!');
        console.log('⚠️ No user data found in localStorage');
      }
      
      resetAndFetchProjects();
    }
  }, [isOpen]);

  const resetAndFetchProjects = async () => {
    setLoading(true);
    try {
      // Fetch existing projects from backend
      const response = await projectsAPI.getAllProjects();
      setProjects(response.projects);
      console.log('Fetched projects:', response.projects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      // If API fails, show empty state instead of mock data
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await projectsAPI.getAllProjects();
      setProjects(response.projects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      // If API fails, show empty state instead of mock data
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = (tracks: Project['tracks']) => {
    if (!tracks) return 0;
    return tracks.reduce((total, track) => total + track.duration, 0);
  };

  const handleContinue = () => {
    if (selectedProjectId) {
      onContinueProject(selectedProjectId);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    try {
      await projectsAPI.deleteProject(projectToDelete.id);

      // Remove the project from the local state
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));

      // Clear selection if the deleted project was selected
      if (selectedProjectId === projectToDelete.id) {
        setSelectedProjectId(null);
      }

      setDeleteConfirmOpen(false);
      setProjectToDelete(null);

      toast({
        title: "Project Deleted",
        description: `"${projectToDelete.name}" has been successfully deleted.`,
      });
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Failed to delete the project. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setProjectToDelete(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Choose Your Project
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Start a new music project or continue working on an existing one
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* New Project Option */}
          <Card
            className="border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={onNewProject}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Start New Project</h3>
                    <p className="text-sm text-muted-foreground">
                      Create a fresh music project from scratch
                    </p>
                  </div>
                </div>
                <div className="btn-ai-gradient text-white px-4 py-2 rounded-md flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Projects */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <Music className="w-5 h-5" />
              <span>Continue Existing Project</span>
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-muted-foreground">Loading projects...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No existing projects found</p>
                <p className="text-sm">Start your first project above!</p>
              </div>
            ) : (
              <div className="grid gap-4 max-h-96 overflow-y-auto scrollbar-modern">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition-all duration-200  ${
                      selectedProjectId === project.id
                        ? 'ring-2 ring-primary border-primary'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-lg">{project.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {project.status}
                            </Badge>
                          </div>

                          {project.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {project.description}
                            </p>
                          )}

                          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(project.created_at)}</span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <Music className="w-4 h-4" />
                              <span>{project.tracks?.length || 0} track{(project.tracks?.length || 0) !== 1 ? 's' : ''}</span>
                            </div>

                            {project.tracks && project.tracks.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatDuration(getTotalDuration(project.tracks))}</span>
                              </div>
                            )}
                          </div>

                          {/* Track Preview */}
                          {project.tracks && project.tracks.length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Tracks:</p>
                              <div className="space-y-1">
                                {project.tracks.slice(0, 3).map((track) => (
                                  <div key={track.id} className="flex items-center justify-between text-xs">
                                    <span className="truncate flex-1">{track.name}</span>
                                    <span className="text-muted-foreground ml-2">
                                      {formatDuration(track.duration)}
                                    </span>
                                  </div>
                                ))}
                                {project.tracks.length > 3 && (
                                  <p className="text-xs text-muted-foreground">
                                    +{project.tracks.length - 3} more track{project.tracks.length - 3 !== 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteClick(e, project)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {selectedProjectId === project.id && (
                            <div className="flex items-center text-primary">
                              <ArrowRight className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {projects.length > 0 && (
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!selectedProjectId}
                className="btn-ai-gradient text-white"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Continue Project
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Delete Project</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-foreground">
              Are you sure you want to delete <span className="font-semibold">"{projectToDelete?.name}"</span>?
            </p>
            {projectToDelete?.tracks && projectToDelete.tracks.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                This will also delete {projectToDelete.tracks.length} track{projectToDelete.tracks.length !== 1 ? 's' : ''} associated with this project.
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="flex items-center space-x-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Project</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
