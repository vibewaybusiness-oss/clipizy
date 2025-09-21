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
  Clock
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Project } from '@/lib/api/projects';

interface ProjectCardProps {
  project: Project;
  onDelete: (projectId: string) => void;
  onEdit?: (project: Project) => void;
  onPlay?: (project: Project) => void;
  viewMode?: 'grid' | 'list';
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
  viewMode = 'grid'
}: ProjectCardProps) {
  const IconComponent = PROJECT_ICONS[project.type];

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

  if (viewMode === 'list') {
    return (
      <Card className="group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <IconComponent className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-medium">{project.name || 'Untitled Project'}</h3>
                <p className="text-sm text-gray-600 capitalize">
                  {project.type.replace('-', ' ')} • {formatDate(project.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Badge className={STATUS_COLORS[project.status]}>
                {project.status}
              </Badge>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={handlePlay}>
                  <Play className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleEdit}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <IconComponent className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{project.name || 'Untitled Project'}</CardTitle>
              <CardDescription className="capitalize">
                {project.type.replace('-', ' ')}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handlePlay}>
                <Play className="w-4 h-4 mr-2" />
                Play
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge className={STATUS_COLORS[project.status]}>
            {project.status}
          </Badge>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Created {formatDate(project.created_at)}
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            Updated {formatDate(project.updated_at)}
          </div>
        </div>

        <div className="flex space-x-2">
          <Button size="sm" className="flex-1" onClick={handlePlay}>
            <Play className="w-4 h-4 mr-2" />
            Open
          </Button>
          <Button size="sm" variant="outline" onClick={handleEdit}>
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
