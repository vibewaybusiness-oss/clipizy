"use client";

import React, { useState, useCallback } from 'react';
import { VideoProject, Transition } from '../types';
import { Button } from '@/app/dashboard/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/dashboard/components/ui/card';
import { Slider } from '@/app/dashboard/components/ui/slider';
import { Input } from '@/app/dashboard/components/ui/input';
import { Label } from '@/app/dashboard/components/ui/label';
import { 
  ArrowRight, 
  Clock, 
  Settings, 
  Plus, 
  Trash2, 
  Play,
  Pause
} from 'lucide-react';

interface TransitionPanelProps {
  project: VideoProject;
  onProjectChange: (project: VideoProject) => void;
  className?: string;
}

const TRANSITION_TYPES = [
  { type: 'fade', name: 'Fade', icon: '↔' },
  { type: 'slide', name: 'Slide', icon: '→' },
  { type: 'wipe', name: 'Wipe', icon: '▸' },
  { type: 'zoom', name: 'Zoom', icon: '⧉' },
  { type: 'dissolve', name: 'Dissolve', icon: '◐' },
  { type: 'push', name: 'Push', icon: '⇨' }
];

export function TransitionPanel({ 
  project, 
  onProjectChange, 
  className = "" 
}: TransitionPanelProps) {
  const [selectedTransition, setSelectedTransition] = useState<Transition | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const handleAddTransition = useCallback((type: string) => {
    const newTransition: Transition = {
      id: `transition-${Date.now()}`,
      type: type as any,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Transition`,
      startTime: 0,
      endTime: 1,
      duration: 1,
      enabled: true,
      parameters: {
        direction: 'in',
        easing: 'linear',
        intensity: 1
      }
    };

    const updatedProject = {
      ...project,
      transitions: [...project.transitions, newTransition]
    };
    onProjectChange(updatedProject);
    setSelectedTransition(newTransition);
  }, [project, onProjectChange]);

  const handleUpdateTransition = useCallback((transitionId: string, updates: Partial<Transition>) => {
    const updatedProject = {
      ...project,
      transitions: project.transitions.map(transition =>
        transition.id === transitionId ? { ...transition, ...updates } : transition
      )
    };
    onProjectChange(updatedProject);
    
    if (selectedTransition?.id === transitionId) {
      setSelectedTransition({ ...selectedTransition, ...updates });
    }
  }, [project, onProjectChange, selectedTransition]);

  const handleRemoveTransition = useCallback((transitionId: string) => {
    const updatedProject = {
      ...project,
      transitions: project.transitions.filter(transition => transition.id !== transitionId)
    };
    onProjectChange(updatedProject);
    
    if (selectedTransition?.id === transitionId) {
      setSelectedTransition(null);
    }
  }, [project, onProjectChange, selectedTransition]);

  const handleParameterChange = useCallback((parameter: string, value: any) => {
    if (!selectedTransition) return;
    
    handleUpdateTransition(selectedTransition.id, {
      parameters: {
        ...selectedTransition.parameters,
        [parameter]: value
      }
    });
  }, [selectedTransition, handleUpdateTransition]);

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <Tabs value="transitions" className="h-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          <div className="p-2 space-y-2 h-full overflow-y-auto">
            {/* AVAILABLE TRANSITIONS */}
            <div>
              <h4 className="text-xs font-medium mb-2">Available Transitions</h4>
              <div className="grid grid-cols-2 gap-1">
                {TRANSITION_TYPES.map((transition) => (
                  <Button
                    key={transition.type}
                    variant="outline"
                    size="sm"
                    className="justify-start h-7 p-1 text-xs"
                    onClick={() => handleAddTransition(transition.type)}
                  >
                    <span className="mr-1">{transition.icon}</span>
                    {transition.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* ACTIVE TRANSITIONS */}
            <div>
              <h4 className="text-xs font-medium mb-2">Active Transitions</h4>
              <div className="space-y-1">
                {project.transitions.map((transition) => (
                  <div
                    key={transition.id}
                    className={`cursor-pointer transition-all p-2 rounded border text-xs ${
                      selectedTransition?.id === transition.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-muted'
                    }`}
                    onClick={() => setSelectedTransition(transition)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={transition.enabled}
                          onChange={(e) => handleUpdateTransition(transition.id, { enabled: e.target.checked })}
                          onClick={(e) => e.stopPropagation()}
                          className="w-3 h-3"
                        />
                        <span className="font-medium truncate">{transition.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsPreviewing(!isPreviewing);
                          }}
                        >
                          {isPreviewing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTransition(transition.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TRANSITION CONTROLS */}
            {selectedTransition && (
              <div className="border rounded p-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium">{selectedTransition.name} Settings</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => setSelectedTransition(null)}
                  >
                    <Settings className="w-3 h-3" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Duration</Label>
                    <Slider
                      value={[selectedTransition.duration]}
                      onValueChange={([value]) => handleUpdateTransition(selectedTransition.id, { duration: value })}
                      min={0.1}
                      max={5}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.1s</span>
                      <span>{selectedTransition.duration}s</span>
                      <span>5s</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Direction</Label>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant={selectedTransition.parameters.direction === 'in' ? 'default' : 'outline'}
                        className="h-6 text-xs"
                        onClick={() => handleParameterChange('direction', 'in')}
                      >
                        In
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedTransition.parameters.direction === 'out' ? 'default' : 'outline'}
                        className="h-6 text-xs"
                        onClick={() => handleParameterChange('direction', 'out')}
                      >
                        Out
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Easing</Label>
                    <div className="grid grid-cols-2 gap-1">
                      {['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].map((easing) => (
                        <Button
                          key={easing}
                          size="sm"
                          variant={selectedTransition.parameters.easing === easing ? 'default' : 'outline'}
                          className="h-6 text-xs"
                          onClick={() => handleParameterChange('easing', easing)}
                        >
                          {easing}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Intensity</Label>
                    <Slider
                      value={[selectedTransition.parameters.intensity]}
                      onValueChange={([value]) => handleParameterChange('intensity', value)}
                      min={0}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span>{selectedTransition.parameters.intensity}</span>
                      <span>2</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}
