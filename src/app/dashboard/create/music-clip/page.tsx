"use client";

import React from "react";
import dynamic from "next/dynamic";

// Dynamically import the MusicClipPage component to avoid SSR issues
const MusicClipPage = dynamic(() => import("../../../../components/music-clip/MusicClipPage"), {
  ssr: false,
  loading: () => (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold mb-2">Music Clip Creator</h1>
        <p className="text-muted-foreground">Loading...</p>
            </div>
            </div>
  ),
});

export default function MusicClipPageRoute() {
  return <MusicClipPage />;
}