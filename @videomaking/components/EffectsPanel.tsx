"use client";

import React, { useState, useCallback } from 'react';
import { VideoProject, Effect, EffectType } from '../types';
import { Button } from '@/app/dashboard/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/dashboard/components/ui/card';
import { Slider } from '@/app/dashboard/components/ui/slider';
import { Input } from '@/app/dashboard/components/ui/input';
import { Label } from '@/app/dashboard/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/dashboard/components/ui/tabs';
import { 
  Palette, 
  Zap, 
  Eye, 
  Volume2, 
  Move, 
  RotateCw, 
  Crop,
  Plus,
  Trash2,
  Settings,
  Play,
  Pause
} from 'lucide-react';

interface EffectsPanelProps {
  project: VideoProject;
  onProjectChange: (project: VideoProject) => void;
  className?: string;
}


// Icon components
const SunIcon = ({ className }: { className?: string }) => <div className={className}>☀️</div>;
const ContrastIcon = ({ className }: { className?: string }) => <div className={className}>◐</div>;
const BlurIcon = ({ className }: { className?: string }) => <div className={className}>🌀</div>;
const CircleIcon = ({ className }: { className?: string }) => <div className={className}>●</div>;
const Maximize2Icon = ({ className }: { className?: string }) => <div className={className}>⤢</div>;

const EFFECT_CATEGORIES = {
  visual: {
    name: 'Visual',
    icon: Eye,
    effects: [
      { type: 'brightness', name: 'Brightness', icon: SunIcon },
      { type: 'contrast', name: 'Contrast', icon: ContrastIcon },
      { type: 'saturation', name: 'Saturation', icon: Palette },
      { type: 'hue', name: 'Hue Shift', icon: Palette },
      { type: 'blur', name: 'Blur', icon: BlurIcon },
      { type: 'sharpen', name: 'Sharpen', icon: Zap },
      { type: 'vignette', name: 'Vignette', icon: CircleIcon },
      { type: 'noise', name: 'Noise', icon: Zap },
      { type: 'glow', name: 'Glow', icon: SunIcon },
      { type: 'shadow', name: 'Drop Shadow', icon: CircleIcon }
    ]
  },
  transform: {
    name: 'Transform',
    icon: Move,
    effects: [
      { type: 'scale', name: 'Scale', icon: Maximize2Icon },
      { type: 'rotation', name: 'Rotation', icon: RotateCw },
      { type: 'position', name: 'Position', icon: Move },
      { type: 'crop', name: 'Crop', icon: Crop },
      { type: 'opacity', name: 'Opacity', icon: Eye }
    ]
  },
  audio: {
    name: 'Audio',
    icon: Volume2,
    effects: [
      { type: 'volume', name: 'Volume', icon: Volume2 },
      { type: 'fade', name: 'Fade', icon: Volume2 },
      { type: 'echo', name: 'Echo', icon: Volume2 },
      { type: 'reverb', name: 'Reverb', icon: Volume2 }
    ]
  }
};

export function EffectsPanel({ 
  project, 
  onProjectChange, 
  className = "" 
}: EffectsPanelProps) {
  const [selectedEffect, setSelectedEffect] = useState<Effect | null>(null);
  const [activeCategory, setActiveCategory] = useState<keyof typeof EFFECT_CATEGORIES>('visual');
  const [isPreviewing, setIsPreviewing] = useState(false);

  const handleAddEffect = useCallback((effectType: EffectType) => {
    const newEffect: Effect = {
      id: `effect-${Date.now()}`,
      name: getEffectName(effectType),
      type: effectType,
      enabled: true,
      parameters: getDefaultParameters(effectType)
    };

    const updatedProject = {
      ...project,
      effects: [...project.effects, newEffect]
    };
    onProjectChange(updatedProject);
    setSelectedEffect(newEffect);
  }, [project, onProjectChange]);

  const handleUpdateEffect = useCallback((effectId: string, updates: Partial<Effect>) => {
    const updatedProject = {
      ...project,
      effects: project.effects.map(effect =>
        effect.id === effectId ? { ...effect, ...updates } : effect
      )
    };
    onProjectChange(updatedProject);
    
    if (selectedEffect?.id === effectId) {
      setSelectedEffect({ ...selectedEffect, ...updates });
    }
  }, [project, onProjectChange, selectedEffect]);

  const handleRemoveEffect = useCallback((effectId: string) => {
    const updatedProject = {
      ...project,
      effects: project.effects.filter(effect => effect.id !== effectId)
    };
    onProjectChange(updatedProject);
    
    if (selectedEffect?.id === effectId) {
      setSelectedEffect(null);
    }
  }, [project, onProjectChange, selectedEffect]);

  const handleParameterChange = useCallback((parameter: string, value: any) => {
    if (!selectedEffect) return;
    
    handleUpdateEffect(selectedEffect.id, {
      parameters: {
        ...selectedEffect.parameters,
        [parameter]: value
      }
    });
  }, [selectedEffect, handleUpdateEffect]);

  const renderEffectControls = () => {
    if (!selectedEffect) return null;

    const { type, parameters } = selectedEffect;

    switch (type) {
      case 'brightness':
        return (
          <div className="space-y-4">
            <div>
              <Label>Brightness</Label>
              <Slider
                value={[parameters.amount || 1]}
                onValueChange={(value) => handleParameterChange('amount', value[0])}
                min={0}
                max={2}
                step={0.01}
                className="mt-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {((parameters.amount || 1) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        );

      case 'contrast':
        return (
          <div className="space-y-4">
            <div>
              <Label>Contrast</Label>
              <Slider
                value={[parameters.amount || 1]}
                onValueChange={(value) => handleParameterChange('amount', value[0])}
                min={0}
                max={2}
                step={0.01}
                className="mt-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {((parameters.amount || 1) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        );

      case 'saturation':
        return (
          <div className="space-y-4">
            <div>
              <Label>Saturation</Label>
              <Slider
                value={[parameters.amount || 1]}
                onValueChange={(value) => handleParameterChange('amount', value[0])}
                min={0}
                max={2}
                step={0.01}
                className="mt-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {((parameters.amount || 1) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        );

      case 'blur':
        return (
          <div className="space-y-4">
            <div>
              <Label>Blur Amount</Label>
              <Slider
                value={[parameters.amount || 0]}
                onValueChange={(value) => handleParameterChange('amount', value[0])}
                min={0}
                max={10}
                step={0.1}
                className="mt-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {(parameters.amount || 0).toFixed(1)}px
              </div>
            </div>
          </div>
        );

      case 'scale':
        return (
          <div className="space-y-4">
            <div>
              <Label>Scale X</Label>
              <Slider
                value={[parameters.scaleX || 1]}
                onValueChange={(value) => handleParameterChange('scaleX', value[0])}
                min={0.1}
                max={3}
                step={0.01}
                className="mt-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {((parameters.scaleX || 1) * 100).toFixed(0)}%
              </div>
            </div>
            <div>
              <Label>Scale Y</Label>
              <Slider
                value={[parameters.scaleY || 1]}
                onValueChange={(value) => handleParameterChange('scaleY', value[0])}
                min={0.1}
                max={3}
                step={0.01}
                className="mt-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {((parameters.scaleY || 1) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="uniform-scale"
                checked={parameters.uniform || false}
                onChange={(e) => handleParameterChange('uniform', e.target.checked)}
              />
              <Label htmlFor="uniform-scale" className="text-sm">Uniform Scale</Label>
            </div>
          </div>
        );

      case 'rotation':
        return (
          <div className="space-y-4">
            <div>
              <Label>Rotation</Label>
              <Slider
                value={[parameters.angle || 0]}
                onValueChange={(value) => handleParameterChange('angle', value[0])}
                min={-180}
                max={180}
                step={1}
                className="mt-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {(parameters.angle || 0).toFixed(0)}°
              </div>
            </div>
          </div>
        );

      case 'opacity':
        return (
          <div className="space-y-4">
            <div>
              <Label>Opacity</Label>
              <Slider
                value={[parameters.amount || 1]}
                onValueChange={(value) => handleParameterChange('amount', value[0])}
                min={0}
                max={1}
                step={0.01}
                className="mt-2"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {((parameters.amount || 1) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            No parameters available for this effect.
          </div>
        );
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as keyof typeof EFFECT_CATEGORIES)} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3 h-8">
          {Object.entries(EFFECT_CATEGORIES).map(([key, category]) => (
            <TabsTrigger key={key} value={key} className="text-xs h-6">
              <category.icon className="w-3 h-3 mr-1" />
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value={activeCategory} className="h-full">
            <div className="p-2 space-y-2 h-full overflow-y-auto">
              {/* EFFECT LIBRARY */}
              <div>
                <h4 className="text-xs font-medium mb-2">Available Effects</h4>
                <div className="grid grid-cols-2 gap-1">
                  {EFFECT_CATEGORIES[activeCategory].effects.map((effect) => (
                    <Button
                      key={effect.type}
                      variant="outline"
                      size="sm"
                      className="justify-start h-7 p-1 text-xs"
                      onClick={() => handleAddEffect(effect.type as EffectType)}
                    >
                      <effect.icon className="w-3 h-3 mr-1" />
                      <span className="text-xs">{effect.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* ACTIVE EFFECTS */}
              <div>
                <h4 className="text-xs font-medium mb-2">Active Effects</h4>
                <div className="space-y-1">
                  {project.effects.map((effect) => (
                    <div
                      key={effect.id}
                      className={`cursor-pointer transition-all p-2 rounded border text-xs ${
                        selectedEffect?.id === effect.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-muted'
                      }`}
                      onClick={() => setSelectedEffect(effect)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={effect.enabled}
                            onChange={(e) => handleUpdateEffect(effect.id, { enabled: e.target.checked })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-3 h-3"
                          />
                          <span className="font-medium truncate">{effect.name}</span>
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
                              handleRemoveEffect(effect.id);
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

              {/* EFFECT CONTROLS */}
              {selectedEffect && (
                <div className="border rounded p-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium">{selectedEffect.name} Settings</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={() => setSelectedEffect(null)}
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {renderEffectControls()}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function getEffectName(type: EffectType): string {
  const names: Record<EffectType, string> = {
    brightness: 'Brightness',
    contrast: 'Contrast',
    saturation: 'Saturation',
    hue: 'Hue Shift',
    opacity: 'Opacity',
    scale: 'Scale',
    rotation: 'Rotation',
    position: 'Position',
    crop: 'Crop',
    colorize: 'Colorize',
    vignette: 'Vignette',
    noise: 'Noise',
    sharpen: 'Sharpen',
    glow: 'Glow',
    shadow: 'Drop Shadow',
    blur: 'Blur'
  };
  return names[type] || type;
}

function getDefaultParameters(type: EffectType): Record<string, any> {
  const defaults: Record<EffectType, Record<string, any>> = {
    brightness: { amount: 1 },
    contrast: { amount: 1 },
    saturation: { amount: 1 },
    hue: { amount: 0 },
    opacity: { amount: 1 },
    scale: { scaleX: 1, scaleY: 1, uniform: true },
    rotation: { angle: 0 },
    position: { x: 0, y: 0 },
    crop: { x: 0, y: 0, width: 1, height: 1 },
    colorize: { hue: 0, saturation: 1, lightness: 0 },
    vignette: { amount: 0, size: 0.5 },
    noise: { amount: 0 },
    sharpen: { amount: 0 },
    glow: { amount: 0, radius: 10 },
    shadow: { x: 0, y: 0, blur: 0, color: '#000000' },
    blur: { amount: 0 }
  };
  return defaults[type] || {};
}

