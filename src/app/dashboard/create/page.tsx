"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Music, 
  FileText, 
  Zap, 
  ArrowRight,
  Sparkles,
  Clock,
  Mail
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectSelectionPopup } from "@/components/create/create-music/project-selection-popup";

const creationOptions = [
  {
    id: "music-clip",
    title: "Music Clip",
    description: "Transform your audio into stunning music videos with AI-generated visuals",
    icon: Music,
    href: "/dashboard/create/music-clip",
    features: [
      "Upload your own audio track",
      "AI-generated audio track",
      "AI-generated visual styles",
      "Sync visuals to music beats",
      "Multiple export formats"
    ],
    estimatedTime: "10-30 minutes",
    color: "bg-blue-500",
    popular: true,
    helpText: "Perfect for musicians, content creators, and anyone with an audio track they want to visualize.",
  },
  {
    id: "script-video",
    title: "Video",
    description: "Create educational or narrative videos from your script with AI voice and visuals",
    icon: FileText,
    href: "/dashboard/create/script-video",
    features: [
      "AI-generated content",
      "AI-generated visuals",
      "Clone your own voice",
      "Educational templates",
      "Custom voice options"
    ],
    estimatedTime: "10-30 minutes",
    color: "bg-purple-500",
    popular: false,
    helpText: "Available Soon",
  },
  {
    id: "automate",
    title: "Automate",
    description: "Schedule automatic video creation and upload (e.g., 1 music clip per day)",
    icon: Zap,
    href: "/dashboard/create/automate",
    features: [
      "AI-generated content",
      "Schedule video creation",
      "Automatic uploads",
      "Custom frequency settings",
      "Batch processing"
    ],
    estimatedTime: "Custom",
    color: "bg-green-500",
    popular: false,
    helpText: "Great for content creators who want to generate multiple videos on trending topics automatically.",
  },
];

export default function CreatePage() {
  const [showProjectSelection, setShowProjectSelection] = useState(false);
  const router = useRouter();

  const handleMusicClipClick = () => {
    setShowProjectSelection(true);
  };

  const handleNewProject = () => {
    // Clear all music clip related localStorage data
    if (typeof window !== 'undefined') {
      // Get all localStorage keys and remove music clip related ones
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('musicClip_') || key === 'currentProjectId')) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all music clip related keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('Cleared localStorage for new project:', keysToRemove);
    }
    
    setShowProjectSelection(false);
    // Add timestamp to force fresh start
    router.push(`/dashboard/create/music-clip?new=${Date.now()}`);
  };

  const handleContinueProject = (projectId: string) => {
    setShowProjectSelection(false);
    router.push(`/dashboard/create/music-clip?projectId=${projectId}`);
  };

  const handleCloseProjectSelection = () => {
    setShowProjectSelection(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center p-8">
      <div className="space-y-8">
        {/* HEADER */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-4">
            Choose Your Creation Type
          </h1>
          <p className="text-lg text-muted-foreground">
            Select the type of content you want to create. Our AI will help you bring your vision to life.
          </p>
        </div>

        {/* CREATION OPTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto justify-items-center">
        {creationOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Card 
              key={option.id} 
              className={`bg-card clickable-card group relative flex flex-col ${
                option.popular ? 'ring-2 ring-primary/20' : ''
              } ${option.id === "script-video" ? 'relative' : ''}`}
            >
              {option.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-white px-3 py-1 text-xs font-medium">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {option.id === "script-video" && (
                <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-2">Available Soon</h3>
                    <p className="text-white/80 text-sm">We're working on this feature</p>
                  </div>
                </div>
              )}
              
              {option.id === "script-video" ? (
                <div className="flex flex-col h-full">
                  <CardHeader className="text-center pb-4 flex-shrink-0">
                    <div className={`w-20 h-20 ${option.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors mb-3">
                      {option.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground leading-relaxed text-base">
                      {option.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0 flex flex-col flex-grow">
                    <div className="space-y-6 flex-grow">
                      {/* FEATURES */}
                      <div className="space-y-3">
                        {option.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-3 text-sm text-muted-foreground">
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* HELP TEXT */}
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {option.helpText}
                        </p>
                      </div>
                      
                      {/* METADATA */}
                      <div className="flex items-center justify-center text-sm text-muted-foreground pt-2 border-t border-border">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">{option.estimatedTime}</span>
                      </div>
                    </div>
                    
                    {/* CTA BUTTON - Always at bottom */}
                    <Button 
                      className="w-full mt-6 h-12 text-base font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all duration-200 relative z-20"
                    >
                      Notify Me
                      <Mail className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
                    </Button>
                  </CardContent>
                </div>
              ) : option.id === "music-clip" ? (
                <div className="flex flex-col h-full cursor-pointer" onClick={handleMusicClipClick}>
                  <CardHeader className="text-center pb-4 flex-shrink-0">
                    <div className={`w-20 h-20 ${option.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors mb-3">
                      {option.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground leading-relaxed text-base">
                      {option.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0 flex flex-col flex-grow">
                    <div className="space-y-6 flex-grow">
                      {/* FEATURES */}
                      <div className="space-y-3">
                        {option.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-3 text-sm text-muted-foreground">
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* HELP TEXT */}
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {option.helpText}
                        </p>
                      </div>
                      
                      {/* METADATA */}
                      <div className="flex items-center justify-center text-sm text-muted-foreground pt-2 border-t border-border">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">{option.estimatedTime}</span>
                      </div>
                    </div>
                    
                    {/* CTA BUTTON - Always at bottom */}
                    <Button 
                      className={`w-full mt-6 h-12 text-base font-semibold ${option.popular ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-muted hover:bg-muted/80 text-foreground'} transition-all duration-200`}
                    >
                      Create {option.title}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </div>
              ) : (
                <Link href={option.href} className="flex flex-col h-full">
                  <CardHeader className="text-center pb-4 flex-shrink-0">
                    <div className={`w-20 h-20 ${option.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors mb-3">
                      {option.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground leading-relaxed text-base">
                      {option.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0 flex flex-col flex-grow">
                    <div className="space-y-6 flex-grow">
                      {/* FEATURES */}
                      <div className="space-y-3">
                        {option.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-3 text-sm text-muted-foreground">
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* HELP TEXT */}
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {option.helpText}
                        </p>
                      </div>
                      
                      {/* METADATA */}
                      <div className="flex items-center justify-center text-sm text-muted-foreground pt-2 border-t border-border">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-medium">{option.estimatedTime}</span>
                      </div>
                    </div>
                    
                    {/* CTA BUTTON - Always at bottom */}
                    <Button 
                      className={`w-full mt-6 h-12 text-base font-semibold ${option.popular ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-muted hover:bg-muted/80 text-foreground'} transition-all duration-200`}
                    >
                      Create {option.title}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Link>
              )}
            </Card>
          );
        })}
        </div>
      </div>

      {/* Project Selection Popup */}
      <ProjectSelectionPopup
        isOpen={showProjectSelection}
        onClose={handleCloseProjectSelection}
        onNewProject={handleNewProject}
        onContinueProject={handleContinueProject}
      />
    </div>
  );
}