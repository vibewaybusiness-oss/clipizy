'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Music,
  Video,
  Film,
  Search,
  CheckSquare,
  Square,
  Trash2,
  FolderOpen
} from 'lucide-react';
import { useProjects } from '@/hooks/projects/use-projects';
import { Project } from '@/lib/api/projects';
import { ProjectCard } from '@/components/projects/project-card';
import { ProjectFileExplorer } from '@/components/projects/project-file-explorer';
import { ClipizyLoading } from '@/components/ui/clipizy-loading';

const PROJECT_TYPES = [
  { value: 'all', label: 'All Projects', icon: null },
  { value: 'music-clip', label: 'Music Clips', icon: Music },
  { value: 'video-clip', label: 'Video Clips', icon: Video },
  { value: 'short-clip', label: 'Short Clips', icon: Film },
];

const STATUS_COLORS = {
  created: 'bg-gray-100 text-gray-800',
  uploading: 'bg-blue-100 text-blue-800',
  analyzing: 'bg-yellow-100 text-yellow-800',
  queued: 'bg-purple-100 text-purple-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  draft: 'bg-gray-100 text-gray-800',
};


export default function ProjectsPage() {
  const router = useRouter();
  const { projects, loading, error, deleteProject } = useProjects();
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [selectedProjectForExplorer, setSelectedProjectForExplorer] = useState<Project | null>(null);

  useEffect(() => {
    filterProjects();
  }, [projects, searchQuery, selectedType]);


  const filterProjects = () => {
    console.log('filterProjects called with projects:', projects, 'type:', typeof projects, 'isArray:', Array.isArray(projects));
    
    let filtered = Array.isArray(projects) ? projects : [];
    
    // Handle case where projects might be an object with a projects property
    if (!Array.isArray(projects) && projects && typeof projects === 'object' && 'projects' in projects) {
      console.log('Projects is an object with projects property:', projects);
      filtered = Array.isArray((projects as any).projects) ? (projects as any).projects : [];
    }

    if (searchQuery) {
      filtered = filtered.filter(project =>
        (project.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (project.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
      );
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(project => project.type === selectedType);
    }

    console.log('Final filtered projects:', filtered);
    setFilteredProjects(filtered);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleEditProject = (project: Project) => {
    console.log('Edit project:', project);
  };

  const handlePlayProject = (project: Project) => {
    // Navigate to the appropriate project page based on project type
    if (project.type === 'music-clip') {
      router.push(`/dashboard/create/music-clip?projectId=${project.id}`);
    } else if (project.type === 'video-clip' || project.type === 'short-clip') {
      router.push(`/dashboard/create?projectId=${project.id}`);
    } else {
      console.log('Unsupported project type:', project.type);
    }
  };

  const handleOpenInExplorer = (project: Project) => {
    setSelectedProjectForExplorer(project);
    setShowFileExplorer(true);
  };

  const handleCloseFileExplorer = () => {
    setShowFileExplorer(false);
    setSelectedProjectForExplorer(null);
  };

  const handleOpenProjectFromExplorer = (project: Project) => {
    setShowFileExplorer(false);
    setSelectedProjectForExplorer(null);
    handlePlayProject(project);
  };

  const handleSelectProject = (projectId: string, selected: boolean) => {
    if (!selectionMode) return;

    const projectIndex = filteredProjects.findIndex((p: Project) => p.id === projectId);
    
    // For now, we'll handle Ctrl/Shift logic in the ProjectCard component
    // and pass the event through the onSelect callback
    setSelectedProjects((prev: Set<string>) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(projectId);
      } else {
        newSet.delete(projectId);
      }
      return newSet;
    });
    setLastSelectedIndex(projectIndex);
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(filteredProjects.map((p: Project) => p.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProjects.size === 0) return;
    
    const confirmed = confirm(`Are you sure you want to delete ${selectedProjects.size} project(s)?`);
    if (!confirmed) return;

    try {
      for (const projectId of selectedProjects) {
        await deleteProject(projectId);
      }
      setSelectedProjects(new Set());
    } catch (error) {
      console.error('Error deleting projects:', error);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedProjects(new Set());
    setLastSelectedIndex(-1);
  };

  if (showFileExplorer && selectedProjectForExplorer) {
    return (
      <ProjectFileExplorer
        project={selectedProjectForExplorer}
        onClose={handleCloseFileExplorer}
        onOpenProject={handleOpenProjectFromExplorer}
      />
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <ClipizyLoading message="Loading projects..." size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <Music className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading projects</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-gray-600">Manage your video and music projects</p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode && selectedProjects.size > 0 && (
            <Button variant="destructive" onClick={handleDeleteSelected}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedProjects.size})
            </Button>
          )}
          <Button variant={selectionMode ? "default" : "outline"} onClick={toggleSelectionMode}>
            {selectionMode ? (
              <>
                <CheckSquare className="w-4 h-4 mr-2" />
                Exit Selection
              </>
            ) : (
              <>
                <Square className="w-4 h-4 mr-2" />
                Select
              </>
            )}
          </Button>
          <Button>
            <Music className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_TYPES.map((type) => {
              const IconComponent = type.icon;
              return (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center">
                    {IconComponent && <IconComponent className="w-4 h-4 mr-2" />}
                    {type.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {selectionMode && filteredProjects.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {selectedProjects.size === filteredProjects.length ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {selectedProjects.size === filteredProjects.length ? 'Deselect All' : 'Select All'}
          </button>
          <div className="text-sm text-gray-600">
            {selectedProjects.size} of {filteredProjects.length} selected
          </div>
        </div>
      )}

      <Tabs defaultValue="grid" className="w-full">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          {!Array.isArray(filteredProjects) || filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || selectedType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first project'
                }
              </p>
              <Button>
                <Music className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.isArray(filteredProjects) && filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={handleDeleteProject}
                  onEdit={handleEditProject}
                  onPlay={handlePlayProject}
                  onOpenInExplorer={handleOpenInExplorer}
                  onSelect={handleSelectProject}
                  viewMode="grid"
                  isSelected={selectedProjects.has(project.id)}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="space-y-2">
            {Array.isArray(filteredProjects) && filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={handleDeleteProject}
                onEdit={handleEditProject}
                onPlay={handlePlayProject}
                onOpenInExplorer={handleOpenInExplorer}
                onSelect={handleSelectProject}
                viewMode="list"
                isSelected={selectedProjects.has(project.id)}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
