
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function StepGenerating() {
  return (
    <Card className="w-full animate-fade-in-up bg-background/50 text-center">
      <CardContent className="p-12">
        <div className="flex justify-center items-center">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
        </div>
      </CardContent>
    </Card>
  );
}
