
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, Music } from "lucide-react";
import type { MusicTrack } from "@/types/domains/music";

type StepPreviewProps = {
  videoUri: string | null;
  onReset: () => void;
  musicTracks: MusicTrack[];
  selectedTrackId: string | null;
  onTrackSelect: (track: MusicTrack) => void;
};

export function StepPreview({ videoUri, onReset, musicTracks, selectedTrackId, onTrackSelect }: StepPreviewProps) {
  if (!videoUri) {
    return null;
  }

  return (
    <div className="h-screen bg-background w-full flex flex-col">
      {/* MAIN CONTENT */}
      <div className="flex-1 w-full px-8 py-6 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* THREE COLUMN LAYOUT */}
          <div className="grid grid-cols-12 gap-6 w-full flex-1 min-h-0">
            
            {/* LEFT COLUMN - SEGMENTS (30%) */}
            <div className="col-span-3 flex flex-col">
              <Card className="bg-card border border-border shadow-lg flex-1 flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold">Segments</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {musicTracks.length} track{musicTracks.length !== 1 ? 's' : ''}
                  </p>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col">
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {musicTracks.map((track, index) => (
                      <div
                        key={track.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedTrackId === track.id
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/50 hover:shadow-sm'
                        }`}
                        onClick={() => onTrackSelect(track)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-foreground text-sm">
                              Segment {index + 1}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {track.duration ? `${Math.floor(track.duration / 60)}:${Math.floor(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Duration: {track.duration ? `${Math.floor(track.duration / 60)}:${Math.floor(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Energy: 0%
                          </div>
                          <div className="w-full bg-muted rounded-full h-1">
                            <div className="bg-primary h-1 rounded-full" style={{ width: '0%' }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CENTER COLUMN - VIDEO PREVIEW (60%) */}
            <div className="col-span-7 flex flex-col">
              <Card className="bg-card border border-border shadow-lg flex-1 flex flex-col">
                <CardContent className="p-6 flex-1 flex flex-col">
                  <video src={videoUri} controls className="w-full rounded-lg aspect-video bg-black flex-1" />
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-4">
                  <Button asChild size="lg" className="w-full sm:w-auto flex-1">
                    <a href={videoUri} download="clipizy-video.mp4">
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
            </div>

            {/* RIGHT COLUMN - TRACKS (10%) */}
            <div className="col-span-2 flex flex-col">
              <Card className="bg-card border border-border shadow-lg flex-1 flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold">Tracks</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {musicTracks.length} track{musicTracks.length !== 1 ? 's' : ''}
                  </p>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col">
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {musicTracks.map((track) => (
                      <div
                        key={track.id}
                        className={`p-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedTrackId === track.id
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-primary/50 hover:shadow-sm'
                        }`}
                        onClick={() => onTrackSelect(track)}
                      >
                        <div className="flex flex-col items-center space-y-1">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="text-primary font-bold text-xs">♪</span>
                          </div>
                          <div className="text-center">
                            <h4 className="font-semibold text-foreground truncate text-xs">
                              {track.name || 'Track'}
                            </h4>
                            <p className="text-muted-foreground text-xs">
                              {track.duration ? `${Math.floor(track.duration / 60)}:${Math.floor(track.duration % 60).toString().padStart(2, '0')}` : '--:--'}
                            </p>
                          </div>
                          {selectedTrackId === track.id && (
                            <Badge variant="secondary" className="px-1 py-0.5 text-xs">✓</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
