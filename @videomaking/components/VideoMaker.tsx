"use client";

import React, { useState, useCallback } from 'react';
import { VideoEditor } from './VideoEditor';
import { VideoPreview } from './VideoPreview';
import { Timeline } from './Timeline';
import { EnhancedTimeline } from './EnhancedTimeline';
import { AssetLibrary } from './AssetLibrary';
import { EffectsPanel } from './EffectsPanel';
import { ExportDialog } from './ExportDialog';
import { TransitionPanel } from './TransitionPanel';
import { KeyframeEditor } from './KeyframeEditor';
import { AutoVideoGenerator } from './AutoVideoGenerator';
import { useVideoEditor } from '../hooks/useVideoEditor';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { VideoProject, VideoMakerProps } from '../types';
import { exportVideoToFile } from '../utils/videoExporter';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Settings, 
  Download,
  Save,
  Upload,
  Scissors,
  Layers,
  Palette,
  ArrowRight,
  Undo,
  Redo,
  Key,
  Zap,
  Plus,
  X
} from 'lucide-react';

const visualStyles = [
  { id: "educational", name: "Educational", description: "Clean, informative visuals", icon: "🎓" },
  { id: "documentary", name: "Documentary", description: "Cinematic, professional style", icon: "🎬" },
  { id: "animated", name: "Animated", description: "Colorful, engaging animations", icon: "🎨" },
  { id: "minimalist", name: "Minimalist", description: "Simple, clean design", icon: "⚪" },
  { id: "vintage", name: "Vintage", description: "Retro, nostalgic aesthetic", icon: "📼" },
  { id: "modern", name: "Modern", description: "Contemporary, sleek design", icon: "✨" },
  { id: "custom", name: "Custom", description: "Create your own style", icon: "⚙️", isCustom: true },
];

export function VideoMaker({ 
  project: initialProject, 
  onProjectChange, 
  onSave, 
  onExport, 
  className = "" 
}: VideoMakerProps) {
  const {
    project,
    setProject,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setPlaybackRate,
    addClip,
    removeClip,
    updateClip,
    addEffect,
    removeEffect,
    updateEffect,
    addTransition,
    removeTransition,
    updateTransition
  } = useVideoEditor(initialProject);

  const [activeTab, setActiveTab] = useState('auto');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [selectedClip, setSelectedClip] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedMusicFile, setSelectedMusicFile] = useState('music_4');
  const [selectedVisualStyle, setSelectedVisualStyle] = useState('');
  const [showVisualStylePopup, setShowVisualStylePopup] = useState(false);
  const [customStyleName, setCustomStyleName] = useState('');
  const [customStyleDescription, setCustomStyleDescription] = useState('');
  const [showVisualStyleSelector, setShowVisualStyleSelector] = useState(true);

  // Initialize undo/redo
  const undoRedo = useUndoRedo(project);

  const handleProjectChange = useCallback((updatedProject: VideoProject) => {
    setProject(updatedProject);
    onProjectChange?.(updatedProject);
    // Push to undo/redo history
    undoRedo.pushState(updatedProject, 'Project Update');
  }, [setProject, onProjectChange, undoRedo]);

  const handleSave = useCallback(() => {
    onSave?.(project);
  }, [project, onSave]);

  const handleExport = useCallback(async (format: any) => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const result = await exportVideoToFile(
        project,
        format,
        `${format.name || 'export'}.${format.extension}`,
        (progress) => {
          setExportProgress(progress.progress);
        }
      );
      
      if (result.success) {
        console.log('Export completed successfully:', result.url);
      } else {
        console.error('Export failed:', result.error);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
      setShowExportDialog(false);
    }
  }, [project]);

  return (
    <div className={`flex h-full bg-background overflow-hidden ${className}`}>
      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* COMPACT TOOLBAR */}
        <div className="h-12 border-b bg-muted/50 flex items-center justify-between px-3 flex-shrink-0">
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={undoRedo.undo}
              disabled={!undoRedo.canUndo}
              className="h-8 w-8 p-0"
            >
              <Undo className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={undoRedo.redo}
              disabled={!undoRedo.canRedo}
              className="h-8 w-8 p-0"
            >
              <Redo className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAssetLibrary(true)}
              className="h-8 px-2"
            >
              <Upload className="w-3 h-3 mr-1" />
              <span className="text-xs">Import</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="h-8 px-2"
            >
              <Save className="w-3 h-3 mr-1" />
              <span className="text-xs">Save</span>
            </Button>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => isPlaying ? pause() : play()}
              className="h-8 w-8 p-0"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={stop}
              className="h-8 w-8 p-0"
            >
              <Square className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => seek(Math.max(0, currentTime - 1))}
              className="h-8 w-8 p-0"
            >
              <SkipBack className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => seek(Math.min(duration, currentTime + 1))}
              className="h-8 w-8 p-0"
            >
              <SkipForward className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              className="h-8 px-2"
            >
              <Download className="w-3 h-3 mr-1" />
              <span className="text-xs">Export</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* VIDEO PREVIEW */}
        <div className="flex-1 p-2 min-h-0">
          <VideoPreview
            project={project}
            currentTime={currentTime}
            isPlaying={isPlaying}
            className="h-full"
          />
        </div>

        {/* ENHANCED TIMELINE WITH MUSIC WAVEFORM */}
        <div className="h-64 border-t flex-shrink-0">
          <EnhancedTimeline
            project={project}
            onProjectChange={handleProjectChange}
            currentTime={currentTime}
            onTimeChange={seek}
            musicFile={selectedMusicFile}
          />
        </div>

        {/* FLOATING VISUAL STYLE SELECTOR */}
        {showVisualStyleSelector && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowVisualStyleSelector(false)}
          >
            <Card 
              className="bg-card/95 backdrop-blur-sm border border-border/50 shadow-2xl max-w-4xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Palette className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Choose Visual Style</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVisualStyleSelector(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl">
                    {visualStyles.map((style) => (
                      <div
                        key={style.id}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          style.isCustom
                            ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-300 hover:border-purple-400 hover:shadow-lg"
                            : selectedVisualStyle === style.id
                            ? "border-primary bg-primary/5 shadow-lg scale-[1.02]"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                        onClick={() => {
                          if (style.isCustom) {
                            setShowVisualStylePopup(true);
                          } else {
                            setSelectedVisualStyle(style.id);
                            setShowVisualStyleSelector(false);
                          }
                        }}
                      >
                        <div className="text-center space-y-2">
                          <div className="text-2xl">{style.icon}</div>
                          <h4 className="font-semibold text-foreground text-sm">{style.name}</h4>
                          <p className="text-xs text-muted-foreground">{style.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedVisualStyle && (
                    <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center justify-center space-x-2">
                        <Palette className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          Selected: {visualStyles.find(s => s.id === selectedVisualStyle)?.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* SIDEBAR */}
      <div className="w-72 border-l bg-muted/30 flex-shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-6 h-10">
            <TabsTrigger value="auto" className="text-xs h-8">
              <Zap className="w-3 h-3 mr-1" />
              Auto
            </TabsTrigger>
            <TabsTrigger value="assets" className="text-xs h-8">
              <Upload className="w-3 h-3 mr-1" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-xs h-8">
              <Palette className="w-3 h-3 mr-1" />
              Effects
            </TabsTrigger>
            <TabsTrigger value="transitions" className="text-xs h-8">
              <ArrowRight className="w-3 h-3 mr-1" />
              Transitions
            </TabsTrigger>
            <TabsTrigger value="keyframes" className="text-xs h-8">
              <Key className="w-3 h-3 mr-1" />
              Keyframes
            </TabsTrigger>
            <TabsTrigger value="layers" className="text-xs h-8">
              <Layers className="w-3 h-3 mr-1" />
              Layers
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 p-3 min-h-0">
            <TabsContent value="auto" className="h-full">
              <div className="mb-4">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Select Music File
                </label>
                <select
                  value={selectedMusicFile}
                  onChange={(e) => setSelectedMusicFile(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="music_1">Music 1</option>
                  <option value="music_2">Music 2</option>
                  <option value="music_3">Music 3</option>
                  <option value="music_4">Music 4</option>
                </select>
              </div>
              <AutoVideoGenerator
                project={project}
                onProjectChange={handleProjectChange}
                className="h-full"
              />
            </TabsContent>

            <TabsContent value="assets" className="h-full">
              <AssetLibrary
                onAssetSelect={(asset) => {
                  addClip({
                    name: asset.name,
                    type: asset.type,
                    source: asset.url,
                    startTime: currentTime,
                    duration: asset.duration || 5,
                    endTime: currentTime + (asset.duration || 5),
                    layer: 0,
                    effects: [],
                    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 },
                    opacity: 1
                  });
                }}
              />
            </TabsContent>

            <TabsContent value="effects" className="h-full">
              <EffectsPanel
                project={project}
                onProjectChange={handleProjectChange}
              />
            </TabsContent>

            <TabsContent value="transitions" className="h-full">
              <TransitionPanel
                project={project}
                onProjectChange={handleProjectChange}
              />
            </TabsContent>

            <TabsContent value="keyframes" className="h-full">
              <KeyframeEditor
                project={project}
                onProjectChange={handleProjectChange}
                currentTime={currentTime}
                onTimeChange={seek}
              />
            </TabsContent>

            <TabsContent value="layers" className="h-full">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Project Layers</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="space-y-1">
                    {project.clips.map((clip) => (
                      <div
                        key={clip.id}
                        className="flex items-center justify-between p-2 bg-background rounded border text-xs"
                      >
                        <span className="truncate">{clip.name}</span>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <Scissors className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </div>
        </Tabs>
      </div>

      {/* MODALS */}
      {showExportDialog && (
        <ExportDialog
          project={project}
          onExport={handleExport}
          onClose={() => setShowExportDialog(false)}
        />
      )}

      {/* EXPORT PROGRESS OVERLAY */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-80">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Exporting Video</h3>
                <p className="text-sm text-muted-foreground">
                  Please wait while your video is being processed...
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(exportProgress)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* CUSTOM VISUAL STYLE POPUP */}
      {showVisualStylePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Create Custom Style</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVisualStylePopup(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Style Name</label>
                <input
                  type="text"
                  placeholder="Enter style name"
                  value={customStyleName}
                  onChange={(e) => setCustomStyleName(e.target.value)}
                  className="w-full mt-1 p-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <textarea
                  placeholder="Describe your custom visual style..."
                  value={customStyleDescription}
                  onChange={(e) => setCustomStyleDescription(e.target.value)}
                  className="w-full mt-1 p-2 border border-border rounded-md bg-background text-foreground min-h-[80px] resize-none"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setCustomStyleName("");
                  setCustomStyleDescription("");
                  setShowVisualStylePopup(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (customStyleName.trim()) {
                    setSelectedVisualStyle('custom');
                    setShowVisualStylePopup(false);
                    setShowVisualStyleSelector(false);
                  }
                }}
                disabled={!customStyleName.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Style
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
