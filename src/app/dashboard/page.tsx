"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/dashboard/components/ui/card";
import { Button } from "@/app/dashboard/components/ui/button";
import { Badge } from "@/app/dashboard/components/ui/badge";
import { 
  Plus, 
  Play, 
  Clock, 
  TrendingUp, 
  Users, 
  Star,
  ArrowRight,
  Sparkles,
  Video,
  Download,
  Share2
} from "lucide-react";
import Link from "next/link";

const stats = [
  {
    title: "Total Videos",
    value: "24",
    change: "+12%",
    changeType: "positive" as const,
    icon: Video,
  },
  {
    title: "Views This Month",
    value: "12.5K",
    change: "+8%",
    changeType: "positive" as const,
    icon: TrendingUp,
  },
  {
    title: "Processing Time",
    value: "2.3 min",
    change: "-15%",
    changeType: "positive" as const,
    icon: Clock,
  },
  {
    title: "Active Projects",
    value: "8",
    change: "+3",
    changeType: "positive" as const,
    icon: Users,
  },
];

const recentProjects = [
  {
    id: 1,
    title: "Summer Vibes Mix",
    status: "completed",
    thumbnail: "/media/thumbnail_1.mp4",
    duration: "3:24",
    views: 1250,
    createdAt: "2 hours ago",
  },
  {
    id: 2,
    title: "Electronic Dreams",
    status: "processing",
    thumbnail: "/media/thumbnail_2.mp4",
    duration: "4:12",
    views: 890,
    createdAt: "5 hours ago",
  },
  {
    id: 3,
    title: "Chill Beats",
    status: "completed",
    thumbnail: "/media/thumbnail_3.mp4",
    duration: "2:58",
    views: 2100,
    createdAt: "1 day ago",
  },
];

const quickActions = [
  {
    title: "Create New Video",
    description: "Start a new AI-generated music video",
    icon: Plus,
    href: "/dashboard/create",
    color: "bg-primary",
  },
  {
    title: "Upload Audio",
    description: "Add your own music track",
    icon: Play,
    href: "/dashboard/upload",
    color: "bg-blue-500",
  },
  {
    title: "Browse Templates",
    description: "Explore visual styles",
    icon: Star,
    href: "/dashboard/templates",
    color: "bg-purple-500",
  },
];

export default function DashboardPage() {
  return (
    <div className="p-8 space-y-8">
      {/* WELCOME SECTION */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Welcome back
          </h1>
          <p className="text-muted-foreground">
            Ready to create your next amazing music video?
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white" asChild>
          <Link href="/dashboard/create">
            <Plus className="w-4 h-4 mr-2" />
            Create Video
          </Link>
        </Button>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-card border border-border hover:border-border/60 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className={`text-xs font-medium ${
                    stat.changeType === "positive" ? "text-green-600" : "text-red-600"
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <div className="text-2xl font-semibold text-foreground mb-1">{stat.value}</div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card key={index} className="bg-card border border-border hover:border-border/60 transition-colors cursor-pointer group">
                <Link href={action.href}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>

      {/* RECENT PROJECTS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Projects</h2>
          <Button variant="ghost" asChild>
            <Link href="/dashboard/projects">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentProjects.map((project) => (
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
                    <Badge 
                      className={`${
                        project.status === "completed" 
                          ? "bg-green-500 text-white" 
                          : "bg-yellow-500 text-white"
                      }`}
                    >
                      {project.status === "completed" ? "Ready" : "Processing"}
                    </Badge>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {project.duration}
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                    <span>{project.views.toLocaleString()} views</span>
                    <span>{project.createdAt}</span>
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FEATURED CONTENT */}
      <Card className="card-modern bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="w-5 h-5 text-primary" />
                <Badge className="gradient-primary text-white">
                  New Feature
                </Badge>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Try our new AI Style Transfer
              </h3>
              <p className="text-muted-foreground mb-4">
                Transform your videos with artistic styles inspired by famous artists and movements.
              </p>
              <Button className="btn-gradient">
                Explore Styles
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="hidden md:block ml-8">
              <div className="w-32 h-32 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-16 h-16 text-primary" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
