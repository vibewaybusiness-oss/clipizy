"use client";

import React, { useState, useCallback } from 'react';
import { VideoProject, ExportFormat } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Settings, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Film, 
  Image as ImageIcon,
  FileVideo,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ExportDialogProps {
  project: VideoProject;
  onExport: (format: ExportFormat) => void;
  onClose: () => void;
  className?: string;
}

const PRESET_FORMATS: Record<string, ExportFormat> = {
  'youtube-1080p': {
    name: 'YouTube 1080p',
    extension: 'mp4',
    mimeType: 'video/mp4',
    resolution: { width: 1920, height: 1080, name: '1080p' },
    frameRate: 30,
    quality: 'high',
    codec: 'h264'
  },
  'youtube-4k': {
    name: 'YouTube 4K',
    extension: 'mp4',
    mimeType: 'video/mp4',
    resolution: { width: 3840, height: 2160, name: '4K' },
    frameRate: 30,
    quality: 'ultra',
    codec: 'h264'
  },
  'instagram-square': {
    name: 'Instagram Square',
    extension: 'mp4',
    mimeType: 'video/mp4',
    resolution: { width: 1080, height: 1080, name: 'Square' },
    frameRate: 30,
    quality: 'high',
    codec: 'h264'
  },
  'instagram-story': {
    name: 'Instagram Story',
    extension: 'mp4',
    mimeType: 'video/mp4',
    resolution: { width: 1080, height: 1920, name: '9:16' },
    frameRate: 30,
    quality: 'high',
    codec: 'h264'
  },
  'tiktok': {
    name: 'TikTok',
    extension: 'mp4',
    mimeType: 'video/mp4',
    resolution: { width: 1080, height: 1920, name: '9:16' },
    frameRate: 30,
    quality: 'high',
    codec: 'h264'
  },
  'twitter': {
    name: 'Twitter',
    extension: 'mp4',
    mimeType: 'video/mp4',
    resolution: { width: 1280, height: 720, name: '720p' },
    frameRate: 30,
    quality: 'medium',
    codec: 'h264'
  }
};

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low (Fast)', description: 'Smaller file size, faster export' },
  { value: 'medium', label: 'Medium (Balanced)', description: 'Good quality and reasonable file size' },
  { value: 'high', label: 'High (Quality)', description: 'High quality, larger file size' },
  { value: 'ultra', label: 'Ultra (Best)', description: 'Maximum quality, largest file size' }
];

const CODEC_OPTIONS = [
  { value: 'h264', label: 'H.264', description: 'Best compatibility' },
  { value: 'h265', label: 'H.265', description: 'Better compression' },
  { value: 'vp9', label: 'VP9', description: 'Web optimized' },
  { value: 'av1', label: 'AV1', description: 'Next-gen compression' }
];

export function ExportDialog({ 
  project, 
  onExport, 
  onClose, 
  className = "" 
}: ExportDialogProps) {
  const [selectedPreset, setSelectedPreset] = useState('youtube-1080p');
  const [customFormat, setCustomFormat] = useState<ExportFormat>(PRESET_FORMATS['youtube-1080p']);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'completed' | 'error'>('idle');

  const handlePresetChange = useCallback((preset: string) => {
    setSelectedPreset(preset);
    setCustomFormat(PRESET_FORMATS[preset]);
  }, []);

  const handleCustomFormatChange = useCallback((field: keyof ExportFormat, value: any) => {
    setCustomFormat(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportStatus('exporting');
    setExportProgress(0);

    try {
      // Simulate export progress
      const interval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setExportStatus('completed');
            setIsExporting(false);
            return 100;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      // In a real implementation, this would call the actual export function
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onExport(customFormat);
    } catch (error) {
      setExportStatus('error');
      setIsExporting(false);
    }
  }, [customFormat, onExport]);

  const getEstimatedFileSize = () => {
    const { resolution, frameRate, quality } = customFormat;
    const pixels = resolution.width * resolution.height;
    const duration = project.duration;
    
    // Rough estimation based on quality
    const qualityMultiplier = {
      low: 0.5,
      medium: 1,
      high: 2,
      ultra: 4
    }[quality];

    const estimatedMB = (pixels * frameRate * duration * qualityMultiplier) / (1024 * 1024 * 100);
    return Math.round(estimatedMB);
  };

  const getEstimatedTime = () => {
    const { resolution, frameRate, quality } = customFormat;
    const pixels = resolution.width * resolution.height;
    
    // Rough estimation based on resolution and quality
    const complexityMultiplier = {
      low: 0.5,
      medium: 1,
      high: 2,
      ultra: 4
    }[quality];

    const estimatedMinutes = (pixels * complexityMultiplier) / (1920 * 1080 * 100);
    return Math.max(1, Math.round(estimatedMinutes));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Export Video</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(PRESET_FORMATS).map(([key, format]) => (
                  <Card
                    key={key}
                    className={`cursor-pointer transition-all ${
                      selectedPreset === key ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handlePresetChange(key)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          {key.includes('youtube') && <Film className="w-6 h-6" />}
                          {key.includes('instagram') && <ImageIcon className="w-6 h-6" />}
                          {key.includes('tiktok') && <Smartphone className="w-6 h-6" />}
                          {key.includes('twitter') && <Monitor className="w-6 h-6" />}
                        </div>
                        <div>
                          <h4 className="font-medium">{format.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format.resolution.name} • {format.frameRate}fps
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Resolution</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input
                      type="number"
                      placeholder="Width"
                      value={customFormat.resolution.width}
                      onChange={(e) => handleCustomFormatChange('resolution', {
                        ...customFormat.resolution,
                        width: parseInt(e.target.value) || 0
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Height"
                      value={customFormat.resolution.height}
                      onChange={(e) => handleCustomFormatChange('resolution', {
                        ...customFormat.resolution,
                        height: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Frame Rate</Label>
                  <Select
                    value={customFormat.frameRate.toString()}
                    onValueChange={(value) => handleCustomFormatChange('frameRate', parseInt(value))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">24 fps</SelectItem>
                      <SelectItem value="25">25 fps</SelectItem>
                      <SelectItem value="30">30 fps</SelectItem>
                      <SelectItem value="50">50 fps</SelectItem>
                      <SelectItem value="60">60 fps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quality</Label>
                  <Select
                    value={customFormat.quality}
                    onValueChange={(value) => handleCustomFormatChange('quality', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUALITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Codec</Label>
                  <Select
                    value={customFormat.codec}
                    onValueChange={(value) => handleCustomFormatChange('codec', value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CODEC_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* EXPORT INFO */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <h4 className="font-medium">Export Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <span className="ml-2">{Math.floor(project.duration / 60)}:{(project.duration % 60).toFixed(0).padStart(2, '0')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Estimated Size:</span>
                <span className="ml-2">{getEstimatedFileSize()} MB</span>
              </div>
              <div>
                <span className="text-muted-foreground">Estimated Time:</span>
                <span className="ml-2">{getEstimatedTime()} min</span>
              </div>
              <div>
                <span className="text-muted-foreground">Format:</span>
                <span className="ml-2">{customFormat.extension.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* EXPORT PROGRESS */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Exporting video...</span>
                <span>{Math.round(exportProgress)}%</span>
              </div>
              <Progress value={exportProgress} className="w-full" />
            </div>
          )}

          {/* EXPORT STATUS */}
          {exportStatus === 'completed' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>Export completed successfully!</span>
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>Export failed. Please try again.</span>
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="min-w-[100px]"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
