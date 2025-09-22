"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Sparkles, ArrowLeft, Film, Zap, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AutomatePage() {
  const [showAutomationTypePopup, setShowAutomationTypePopup] = useState(true);
  const [automationType, setAutomationType] = useState<"music" | "video" | null>(null);


  return (
    <div className="h-screen bg-background flex flex-col">
      {/* HEADER */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/create"
                className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Create</span>
              </Link>
            </div>

            <Badge className="px-4 py-2 text-sm font-medium bg-green-500 text-white rounded-lg flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Automate Creator</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* AUTOMATION TYPE SELECTION POPUP */}
      {showAutomationTypePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 bg-card border border-border shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Choose Automation Type</CardTitle>
              <CardDescription className="text-muted-foreground text-base">Select what type of content you want to automate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <Card
                  className="cursor-pointer border-2 border-green-500 bg-green-500/10 hover:bg-green-500/20 transition-all duration-200 group"
                  onClick={() => {
                    setAutomationType("music");
                    setShowAutomationTypePopup(false);
                  }}
                >
                  <CardContent className="p-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <Music className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-foreground mb-2">Music Automation</h3>
                        <p className="text-muted-foreground">Automate music video creation with your tracks or AI-generated music</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative border-2 border-muted bg-muted/20 cursor-not-allowed">
                  <CardContent className="p-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center">
                        <Film className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-muted-foreground mb-2">Video Automation</h3>
                        <p className="text-muted-foreground">Automate video content creation and scheduling</p>
                      </div>
                    </div>
                  </CardContent>
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white mb-2">Available Soon</h3>
                      <p className="text-white/80 text-sm mb-4">We're working on this feature</p>
                      <Button
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Simple notification without toast
                          alert("We'll notify you when video automation is available!");
                        }}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Notify Me
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MAIN CONTENT - Simple placeholder */}
      {automationType && (
        <div className="flex-1 w-full max-w-7xl mx-auto px-8 py-4">
          <Card className="bg-card border border-border shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Automation Coming Soon</CardTitle>
              <CardDescription className="text-muted-foreground text-base">
                The automation feature is being rebuilt. Check back soon for a clean new implementation.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-8">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                This feature will be completely reimplemented with a better architecture.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


