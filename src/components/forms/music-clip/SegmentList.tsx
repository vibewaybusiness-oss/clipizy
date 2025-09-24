"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, BarChart3, Volume2, Music, ChevronDown, Play, Eye } from 'lucide-react';

interface Segment {
  segment_index: number;
  start_time: number;
  end_time: number;
  duration: number;
  peaks_count?: number;
  energy?: number;
  tempo?: number;
  key?: string;
}

interface Scene {
  id: string;
  name: string;
  description?: string;
  start_time: number;
  end_time: number;
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'solo' | 'break';
}

interface SegmentListProps {
  segments: Segment[];
  selectedSegment: number | null;
  onSegmentSelect: (segmentIndex: number) => void;
  analysisData: any;
  onSegmentFocus?: (segmentIndex: number) => void;
}

export function SegmentList({
  segments,
  selectedSegment,
  onSegmentSelect,
  analysisData,
  onSegmentFocus
}: SegmentListProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSegmentEnergy = (segment: Segment) => {
    return segment.energy || 0;
  };

  const getSegmentScenes = (segment: Segment): Scene[] => {
    // Mock scenes for demonstration - in real implementation, this would come from analysis data
    const sceneTypes: Scene['type'][] = ['intro', 'verse', 'chorus', 'bridge', 'outro', 'solo', 'break'];
    const scenes: Scene[] = [];

    // Generate 1-3 scenes per segment for demonstration
    const numScenes = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numScenes; i++) {
      const sceneStart = segment.start_time + (i / numScenes) * segment.duration;
      const sceneEnd = segment.start_time + ((i + 1) / numScenes) * segment.duration;

      scenes.push({
        id: `scene-${segment.segment_index}-${i}`,
        name: `${sceneTypes[i % sceneTypes.length].charAt(0).toUpperCase() + sceneTypes[i % sceneTypes.length].slice(1)} ${i + 1}`,
        description: `Scene ${i + 1} in segment ${segment.segment_index + 1}`,
        start_time: sceneStart,
        end_time: sceneEnd,
        type: sceneTypes[i % sceneTypes.length]
      });
    }

    return scenes;
  };

  const toggleSegmentExpansion = (segmentIndex: number) => {
    const newExpanded = new Set(expandedSegments);
    if (newExpanded.has(segmentIndex)) {
      newExpanded.delete(segmentIndex);
    } else {
      newExpanded.add(segmentIndex);
    }
    setExpandedSegments(newExpanded);
  };

  const handleSegmentClick = (segmentIndex: number) => {
    onSegmentSelect(segmentIndex);
    if (onSegmentFocus) {
      onSegmentFocus(segmentIndex);
    }
  };

  return (
    <Card className="bg-card border border-border shadow-lg h-full">
      <CardContent className="p-6">
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {segments.map((segment, index) => {
            const segmentEnergy = getSegmentEnergy(segment);
            const isSelected = selectedSegment === segment.segment_index;
            const isExpanded = expandedSegments.has(segment.segment_index);
            const scenes = getSegmentScenes(segment);

            return (
              <Collapsible
                key={segment.segment_index}
                open={isExpanded}
                onOpenChange={() => toggleSegmentExpansion(segment.segment_index)}
              >
                <div
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50 hover:shadow-sm'
                  }`}
                  onClick={() => handleSegmentClick(segment.segment_index)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-foreground">
                          Segment {segment.segment_index + 1}
                        </h4>
                        {scenes.length > 0 && (
                          <Badge variant="outline" className="px-2 py-1 text-xs">
                            {scenes.length} scene{scenes.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {isSelected && (
                          <Badge variant="secondary" className="px-2 py-1 text-xs">
                            Selected
                          </Badge>
                        )}
                        {scenes.length > 0 && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span className="font-medium">Duration:</span>
                        <span>{formatTime(segment.duration)}</span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Volume2 className="w-4 h-4" />
                        <span>Energy: {Math.round(segmentEnergy * 100)}%</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Energy Level</span>
                        <span className="font-medium">{Math.round(segmentEnergy * 100)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(segmentEnergy * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <CollapsibleContent className="mt-2">
                  <div className="ml-4 space-y-2">
                    {scenes.map((scene) => (
                      <div
                        key={scene.id}
                        className="p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {scene.type}
                            </Badge>
                            <span className="font-medium text-sm">{scene.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Play className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(scene.start_time)} - {formatTime(scene.end_time)}
                        </p>
                        {scene.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {scene.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
