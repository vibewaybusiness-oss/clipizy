
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, RefreshCw } from "lucide-react";

type StepPreviewProps = {
  videoUri: string | null;
  onReset: () => void;
};

export function StepPreview({ videoUri, onReset }: StepPreviewProps) {
  if (!videoUri) {
    // Or a loading/error state
    return null;
  }

  return (
    <Card className="w-full animate-fade-in-up bg-background/50">
      <CardContent className="p-6">
        <video src={videoUri} controls className="w-full rounded-lg aspect-video bg-black" />
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-4">
        <Button asChild size="lg" className="w-full sm:w-auto flex-1">
          <a href={videoUri} download="clipizi-video.mp4">
            <Download className="w-5 h-5 mr-2" />
            Download
          </a>
        </Button>
        <Button variant="outline" size="lg" onClick={onReset} className="w-full sm:w-auto flex-1 btn-secondary-hover">
          <RefreshCw className="w-5 h-5 mr-2" />
          Create Another
        </Button>
      </CardFooter>
    </Card>
  );
}
