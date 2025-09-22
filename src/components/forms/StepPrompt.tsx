"use client";

import React from 'react';
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface StepPromptProps {
  form: UseFormReturn<any>;
  settings: any;
  audioFile: File | null;
  audioDuration: number;
  onSubmit: (data: any) => void;
  onBack: () => void;
  fileToDataUri: (file: File) => Promise<string>;
  toast: (message: string) => void;
}

export function StepPrompt({
  form,
  settings,
  audioFile,
  audioDuration,
  onSubmit,
  onBack,
  fileToDataUri,
  toast
}: StepPromptProps) {
  const handleSubmit = (data: any) => {
    onSubmit(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          Music Prompt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="musicDescription">Describe your music</Label>
          <Textarea
            id="musicDescription"
            placeholder="Describe the style, mood, and characteristics of your music..."
            className="min-h-[100px]"
            {...form.register("musicDescription")}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="videoDescription">Describe your video</Label>
          <Textarea
            id="videoDescription"
            placeholder="Describe what you want to see in your video..."
            className="min-h-[100px]"
            {...form.register("videoDescription")}
          />
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={form.handleSubmit(handleSubmit)}>
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
