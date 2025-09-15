"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/dashboard/components/ui/card";
import { Button } from "@/app/dashboard/components/ui/button";
import { Badge } from "@/app/dashboard/components/ui/badge";
import { Input } from "@/app/dashboard/components/ui/input";
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Plus,
  Play,
  Download,
  Share2,
  MoreVertical,
  Calendar,
  Eye,
  Clock
} from "lucide-react";
import Link from "next/link";

const projects = [
  {
    id: 1,
    title: "Summer Vibes Mix",
    description: "Upbeat electronic track with vibrant visuals",
    status: "completed",
    thumbnail: "/media/thumbnail_1.mp4",
    duration: "3:24",
    views: 1250,
    createdAt: "2024-01-15",
    tags: ["Electronic", "Summer", "Vibrant"],
  },
  {
    id: 2,
    title: "Electronic Dreams",
    description: "Ambient electronic with dreamy visuals",
    status: "processing",
    thumbnail: "/media/thumbnail_2.mp4",
    duration: "4:12",
    views: 890,
    createdAt: "2024-01-14",
    tags: ["Ambient", "Electronic", "Dreamy"],
  },
  {
    id: 3,
    title: "Chill Beats",
    description: "Relaxing lo-fi hip hop vibes",
    status: "completed",
    thumbnail: "/media/thumbnail_3.mp4",
    duration: "2:58",
    views: 2100,
    createdAt: "2024-01-13",
    tags: ["Lo-fi", "Chill", "Hip Hop"],
  },
  {
    id: 4,
    title: "Neon Nights",
    description: "Synthwave inspired cyberpunk aesthetics",
    status: "completed",
    thumbnail: "/media/thumbnail_1.mp4",
    duration: "3:45",
    views: 1850,
    createdAt: "2024-01-12",
    tags: ["Synthwave", "Cyberpunk", "Neon"],
  },
  {
    id: 5,
    title: "Nature Sounds",
    description: "Organic ambient with natural visuals",
    status: "draft",
    thumbnail: "/media/thumbnail_2.mp4",
    duration: "5:20",
    views: 0,
    createdAt: "2024-01-11",
    tags: ["Ambient", "Nature", "Organic"],
  },
  {
    id: 6,
    title: "Urban Pulse",
    description: "City-inspired electronic beats",
    status: "completed",
    thumbnail: "/media/thumbnail_3.mp4",
    duration: "3:10",
    views: 950,
    createdAt: "2024-01-10",
    tags: ["Urban", "Electronic", "City"],
  },
];

const statusColors = {
  completed: "bg-green-500",
  processing: "bg-yellow-500",
  draft: "bg-gray-500",
  error: "bg-red-500",
};

const statusLabels = {
  completed: "Ready",
  processing: "Processing",
  draft: "Draft",
  error: "Error",
};

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterStatus === "all" || project.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-8 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">Projects</h1>
          <p className="text-muted-foreground">
            Manage and organize your AI-generated music videos
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white" asChild>
          <Link href="/dashboard/create">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {/* FILTERS AND SEARCH */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
          >
            All
          </Button>
          <Button
            variant={filterStatus === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("completed")}
          >
            Ready
          </Button>
          <Button
            variant={filterStatus === "processing" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("processing")}
          >
            Processing
          </Button>
          <Button
            variant={filterStatus === "draft" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("draft")}
          >
            Drafts
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PROJECTS GRID/LIST */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="bg-card border border-border hover:border-border/60 transition-colors group">
              <CardContent className="p-0">
                <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
                  <video
                    src={project.thumbnail}
                    className="w-full h-full object-cover"
                    muted
                    onLoadedMetadata={(e) => {
                      e.currentTarget.currentTime = 5;
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.play();
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 5;
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className={`${statusColors[project.status]} text-white`}>
                      {statusLabels[project.status]}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {project.duration}
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {project.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {project.tags.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{project.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-3 h-3" />
                      <span>{project.views.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Play className="w-3 h-3 mr-1" />
                      Play
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Share2 className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="bg-card border border-border hover:border-border/60 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="relative w-20 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    <video
                      src={project.thumbnail}
                      className="w-full h-full object-cover"
                      muted
                      onLoadedMetadata={(e) => {
                        e.currentTarget.currentTime = 5;
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.play();
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 5;
                      }}
                    />
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                      {project.duration}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {project.title}
                      </h3>
                      <Badge className={`${statusColors[project.status]} text-white text-xs`}>
                        {statusLabels[project.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                      {project.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{project.views.toLocaleString()} views</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline">
                      <Play className="w-3 h-3 mr-1" />
                      Play
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Share2 className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {filteredProjects.length === 0 && (
        <Card className="bg-card border border-border">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterStatus !== "all" 
                ? "Try adjusting your search or filters"
                : "Get started by creating your first music video"
              }
            </p>
            <Button className="bg-primary hover:bg-primary/90 text-white" asChild>
              <Link href="/dashboard/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Video
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
