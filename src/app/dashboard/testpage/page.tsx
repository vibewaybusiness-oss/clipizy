"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoading } from "@/contexts/loading-context";
import { Play, Zap, Sparkles } from "lucide-react";

export default function TestPage() {
  const { startLoading, stopLoading } = useLoading();
  const [isLoading, setIsLoading] = useState(false);

  const handleTestLoading = () => {
    setIsLoading(true);
    startLoading("Testing loading animation...");
    
    // Stop loading after 3 seconds
    setTimeout(() => {
      stopLoading();
      setIsLoading(false);
    }, 3000);
  };

  const handleTestDifferentMessages = () => {
    const messages = [
      "Processing your request...",
      "Generating content...",
      "Almost ready...",
      "Finalizing..."
    ];
    
    let currentIndex = 0;
    setIsLoading(true);
    
    const showNextMessage = () => {
      if (currentIndex < messages.length) {
        startLoading(messages[currentIndex]);
        currentIndex++;
        setTimeout(showNextMessage, 750);
      } else {
        stopLoading();
        setIsLoading(false);
      }
    };
    
    showNextMessage();
  };

  return (
    <div className="p-8 space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Loading Animation Test
        </h1>
        <p className="text-muted-foreground">
          Test the Clipizy logo loading animation with different scenarios
        </p>
      </div>

      {/* TEST CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Test */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Play className="w-5 h-5 text-primary" />
              <span>Basic Test</span>
            </CardTitle>
            <CardDescription>
              Test the loading animation for 3 seconds with a single message
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTestLoading}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? "Loading..." : "Start 3-Second Test"}
            </Button>
          </CardContent>
        </Card>

        {/* Advanced Test */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-primary" />
              <span>Advanced Test</span>
            </CardTitle>
            <CardDescription>
              Test with multiple changing messages over 3 seconds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleTestDifferentMessages}
              disabled={isLoading}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {isLoading ? "Loading..." : "Start Multi-Message Test"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* INFO CARD */}
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>Animation Features</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Visual Effects</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Rotating Clipizy logo</li>
                <li>• Scaling animation</li>
                <li>• Pulsing rings</li>
                <li>• Black background overlay</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-2">Functionality</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Custom loading messages</li>
                <li>• Automatic navigation loading</li>
                <li>• Data loading states</li>
                <li>• Manual trigger support</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STATUS */}
      {isLoading && (
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm text-primary font-medium">
                Loading animation is active
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
