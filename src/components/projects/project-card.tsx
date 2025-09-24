import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Music,
  Video,
  Film,
  MoreVertical,
  Play,
  Edit,
  Trash2,
  Calendar,
  Clock,
  FolderOpen,
  Check
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Project } from '@/lib/api/projects';

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => void;
  onEdit?: (project: Project) => void;
  onPlay?: (project: Project) => void;
  onOpenInExplorer?: (project: Project) => void;
  viewMode?: 'grid' | 'list';
  isSelected?: boolean;
  onSelect?: (projectId: string, selected: boolean) => void;
  selectionMode?: boolean;
}

const PROJECT_ICONS = {
  'music-clip': Music,
  'video-clip': Video,
  'short-clip': Film,
};

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

export function ProjectCard({
  project,
  onDelete,
  onEdit,
  onPlay,
  onOpenInExplorer,
  viewMode = 'grid',
  isSelected = false,
  onSelect,
  selectionMode = false
}: ProjectCardProps) {
  const IconComponent = PROJECT_ICONS[project.type] || Music;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this project?')) {
      onDelete(project.id);
    }
  };

  const handleEdit = () => {
    onEdit?.(project);
  };

  const handlePlay = () => {
    onPlay?.(project);
  };

  const handleOpenInExplorer = () => {
    onOpenInExplorer?.(project);
  };

  const handleSelect = (e: React.MouseEvent) => {
    if (selectionMode && onSelect) {
      e.stopPropagation();
      onSelect(project.id, !isSelected);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectionMode && onSelect) {
      e.stopPropagation();
      onSelect(project.id, !isSelected);
    } else if (!selectionMode) {
      // Open the project in dashboard/create section
      onPlay?.(project);
    }
  };

  if (viewMode === 'list') {
    return (
      <Card 
        className={`group hover:shadow-md hover:bg-muted/30 transition-all duration-200 cursor-pointer border-border/50 hover:border-border ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
        }`}
        onClick={handleCardClick}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              {selectionMode && (
                <div 
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300'
                  }`}
                  onClick={handleSelect}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
              )}
              <div className="p-3 bg-muted rounded-lg flex-shrink-0">
                <IconComponent className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-foreground truncate">{project.name || 'Untitled Project'}</h3>
                <div className="flex items-center space-x-3 mt-1">
                  <p className="text-sm text-muted-foreground capitalize">
                    {project.type?.replace('-', ' ') || 'Unknown Type'}
                  </p>
                  <span className="text-muted-foreground/60">•</span>
                  <p className="text-sm text-muted-foreground/80">
                    Created {formatDate(project.created_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4 flex-shrink-0">
              <Badge className={`${STATUS_COLORS[project.status]} font-medium`}>
                {project.status}
              </Badge>
              {!selectionMode && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleOpenInExplorer}>
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Open in Explorer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={handleDelete}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`group hover:shadow-lg hover:bg-muted/30 transition-all duration-200 cursor-pointer border-border/50 hover:border-border ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {selectionMode && (
              <div 
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300'
                }`}
                onClick={handleSelect}
              >
                {isSelected && <Check className="w-3 h-3" />}
              </div>
            )}
            <div className="p-3 bg-muted rounded-lg flex-shrink-0">
              <IconComponent className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-foreground truncate">{project.name || 'Untitled Project'}</CardTitle>
              <CardDescription className="capitalize text-muted-foreground mt-1">
                {project.type?.replace('-', ' ') || 'Unknown Type'}
              </CardDescription>
            </div>
          </div>
          {!selectionMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleOpenInExplorer}>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Open in Explorer
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex items-center justify-between">
          <Badge className={`${STATUS_COLORS[project.status]} font-medium`}>
            {project.status}
          </Badge>
          {!selectionMode && (
            <span className="text-sm font-medium text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
              Edit
            </span>
          )}
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-3 text-muted-foreground/60" />
            <span>Created {formatDate(project.created_at)}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-3 text-muted-foreground/60" />
            <span>Updated {formatDate(project.updated_at)}</span>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
