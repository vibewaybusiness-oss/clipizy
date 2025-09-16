"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { VideoProject, Keyframe } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Key, 
  Plus, 
  Trash2, 
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Settings
} from 'lucide-react';

interface KeyframeEditorProps {
  project: VideoProject;
  onProjectChange: (project: VideoProject) => void;
  currentTime: number;
  onTimeChange: (time: number) => void;
  className?: string;
}

export function KeyframeEditor({ 
  project, 
  onProjectChange, 
  currentTime,
  onTimeChange,
  className = "" 
}: KeyframeEditorProps) {
  const [selectedKeyframe, setSelectedKeyframe] = useState<Keyframe | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('opacity');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const properties = [
    { key: 'opacity', name: 'Opacity', min: 0, max: 1, step: 0.01 },
    { key: 'scaleX', name: 'Scale X', min: 0.1, max: 3, step: 0.01 },
    { key: 'scaleY', name: 'Scale Y', min: 0.1, max: 3, step: 0.01 },
    { key: 'rotation', name: 'Rotation', min: -180, max: 180, step: 1 },
    { key: 'x', name: 'Position X', min: -1000, max: 1000, step: 1 },
    { key: 'y', name: 'Position Y', min: -1000, max: 1000, step: 1 }
  ];

  const handleAddKeyframe = useCallback((property: string) => {
    const newKeyframe: Keyframe = {
      id: `keyframe-${Date.now()}`,
      time: currentTime,
      property: property,
      value: getCurrentValue(property),
      easing: 'linear',
      enabled: true
    };

    const updatedProject = {
      ...project,
      keyframes: [...project.keyframes, newKeyframe]
    };
    onProjectChange(updatedProject);
    setSelectedKeyframe(newKeyframe);
  }, [project, onProjectChange, currentTime]);

  const handleUpdateKeyframe = useCallback((keyframeId: string, updates: Partial<Keyframe>) => {
    const updatedProject = {
      ...project,
      keyframes: project.keyframes.map(keyframe =>
        keyframe.id === keyframeId ? { ...keyframe, ...updates } : keyframe
      )
    };
    onProjectChange(updatedProject);
    
    if (selectedKeyframe?.id === keyframeId) {
      setSelectedKeyframe({ ...selectedKeyframe, ...updates });
    }
  }, [project, onProjectChange, selectedKeyframe]);

  const handleRemoveKeyframe = useCallback((keyframeId: string) => {
    const updatedProject = {
      ...project,
      keyframes: project.keyframes.filter(keyframe => keyframe.id !== keyframeId)
    };
    onProjectChange(updatedProject);
    
    if (selectedKeyframe?.id === keyframeId) {
      setSelectedKeyframe(null);
    }
  }, [project, onProjectChange, selectedKeyframe]);

  const getCurrentValue = (property: string): number => {
    // Get current value from selected clip or default values
    const selectedClip = project.clips.find(clip => clip.selected);
    if (selectedClip) {
      switch (property) {
        case 'opacity': return selectedClip.opacity;
        case 'scaleX': return selectedClip.transform.scaleX;
        case 'scaleY': return selectedClip.transform.scaleY;
        case 'rotation': return selectedClip.transform.rotation;
        case 'x': return selectedClip.transform.x;
        case 'y': return selectedClip.transform.y;
        default: return 0;
      }
    }
    return 0;
  };

  const getKeyframesForProperty = (property: string) => {
    return project.keyframes.filter(kf => kf.property === property).sort((a, b) => a.time - b.time);
  };

  const getValueAtTime = (property: string, time: number): number => {
    const keyframes = getKeyframesForProperty(property);
    if (keyframes.length === 0) return getCurrentValue(property);

    // Find surrounding keyframes
    const before = keyframes.filter(kf => kf.time <= time).pop();
    const after = keyframes.find(kf => kf.time > time);

    if (!before) return after?.value || getCurrentValue(property);
    if (!after) return before.value;

    // Interpolate between keyframes
    const progress = (time - before.time) / (after.time - before.time);
    return before.value + (after.value - before.value) * progress;
  };

  const drawCurve = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const keyframes = getKeyframesForProperty(selectedProperty);
    if (keyframes.length === 0) return;

    keyframes.forEach((keyframe, index) => {
      const x = padding + (keyframe.time / project.duration) * (width - 2 * padding);
      const y = height - padding - (keyframe.value / 1) * (height - 2 * padding); // Assuming max value of 1

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw keyframe points
    keyframes.forEach((keyframe) => {
      const x = padding + (keyframe.time / project.duration) * (width - 2 * padding);
      const y = height - padding - (keyframe.value / 1) * (height - 2 * padding);

      ctx.fillStyle = selectedKeyframe?.id === keyframe.id ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [project, selectedProperty, selectedKeyframe]);

  useEffect(() => {
    drawCurve();
  }, [drawCurve]);

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Keyframe Editor
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            {/* PROPERTY SELECTOR */}
            <div>
              <Label className="text-xs">Property</Label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {properties.map((prop) => (
                  <Button
                    key={prop.key}
                    size="sm"
                    variant={selectedProperty === prop.key ? 'default' : 'outline'}
                    className="h-6 text-xs"
                    onClick={() => setSelectedProperty(prop.key)}
                  >
                    {prop.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* CURVE CANVAS */}
            <div>
              <Label className="text-xs">Animation Curve</Label>
              <div className="border rounded mt-1">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={150}
                  className="w-full h-32 cursor-crosshair"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const time = (x / rect.width) * project.duration;
                    onTimeChange(time);
                  }}
                />
              </div>
            </div>

            {/* KEYFRAME CONTROLS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Keyframes</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() => handleAddKeyframe(selectedProperty)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-1 max-h-32 overflow-y-auto">
                {getKeyframesForProperty(selectedProperty).map((keyframe) => (
                  <div
                    key={keyframe.id}
                    className={`flex items-center justify-between p-2 rounded border text-xs ${
                      selectedKeyframe?.id === keyframe.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-muted'
                    }`}
                    onClick={() => setSelectedKeyframe(keyframe)}
                  >
                    <div className="flex items-center space-x-2">
                      <Key className="w-3 h-3" />
                      <span>{keyframe.time.toFixed(2)}s</span>
                      <span>{keyframe.value.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveKeyframe(keyframe.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KEYFRAME SETTINGS */}
            {selectedKeyframe && (
              <div className="border rounded p-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium">Keyframe Settings</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => setSelectedKeyframe(null)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Time</Label>
                    <Input
                      type="number"
                      value={selectedKeyframe.time}
                      onChange={(e) => handleUpdateKeyframe(selectedKeyframe.id, { time: parseFloat(e.target.value) })}
                      className="h-6 text-xs"
                      step="0.1"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Value</Label>
                    <Input
                      type="number"
                      value={selectedKeyframe.value}
                      onChange={(e) => handleUpdateKeyframe(selectedKeyframe.id, { value: parseFloat(e.target.value) })}
                      className="h-6 text-xs"
                      step="0.01"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Easing</Label>
                    <div className="grid grid-cols-2 gap-1">
                      {['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].map((easing) => (
                        <Button
                          key={easing}
                          size="sm"
                          variant={selectedKeyframe.easing === easing ? 'default' : 'outline'}
                          className="h-6 text-xs"
                          onClick={() => handleUpdateKeyframe(selectedKeyframe.id, { easing: easing as any })}
                        >
                          {easing}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
