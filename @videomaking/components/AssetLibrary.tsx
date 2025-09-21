"use client";

import React, { useState, useCallback, useRef } from 'react';
import { AssetItem } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Search,
  Filter,
  Grid,
  List,
  Video,
  Image,
  Music,
  Type,
  Plus,
  FolderOpen,
  Download,
  Trash2,
  Star
} from 'lucide-react';

interface AssetLibraryProps {
  onAssetSelect?: (asset: AssetItem) => void;
  onAssetUpload?: (files: File[]) => void;
  className?: string;
}

export function AssetLibrary({
  onAssetSelect,
  onAssetUpload,
  className = ""
}: AssetLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Test Library assets
  const [assets] = useState<AssetItem[]>([
    // Video assets
    {
      id: 'video_1_1',
      name: 'video_1_1.mp4',
      type: 'video',
      url: '/TEST Library/video/video_1_1.mp4',
      duration: 15,
      size: 5242880,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_1_2',
      name: 'video_1_2.mp4',
      type: 'video',
      url: '/TEST Library/video/video_1_2.mp4',
      duration: 12,
      size: 4194304,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_1_3',
      name: 'video_1_3.mp4',
      type: 'video',
      url: '/TEST Library/video/video_1_3.mp4',
      duration: 18,
      size: 6291456,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_1_4',
      name: 'video_1_4.mp4',
      type: 'video',
      url: '/TEST Library/video/video_1_4.mp4',
      duration: 20,
      size: 7340032,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_1_5',
      name: 'video_1_5.mp4',
      type: 'video',
      url: '/TEST Library/video/video_1_5.mp4',
      duration: 14,
      size: 4718592,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_1_6',
      name: 'video_1_6.mp4',
      type: 'video',
      url: '/TEST Library/video/video_1_6.mp4',
      duration: 16,
      size: 5767168,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_1_7',
      name: 'video_1_7.mp4',
      type: 'video',
      url: '/TEST Library/video/video_1_7.mp4',
      duration: 13,
      size: 4456448,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_2_1',
      name: 'video_2_1.mp4',
      type: 'video',
      url: '/TEST Library/video/video_2_1.mp4',
      duration: 17,
      size: 6029312,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_2_2',
      name: 'video_2_2.mp4',
      type: 'video',
      url: '/TEST Library/video/video_2_2.mp4',
      duration: 19,
      size: 6815744,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_2_3',
      name: 'video_2_3.mp4',
      type: 'video',
      url: '/TEST Library/video/video_2_3.mp4',
      duration: 11,
      size: 3932160,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_2_4',
      name: 'video_2_4.mp4',
      type: 'video',
      url: '/TEST Library/video/video_2_4.mp4',
      duration: 21,
      size: 7602176,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_2_5',
      name: 'video_2_5.mp4',
      type: 'video',
      url: '/TEST Library/video/video_2_5.mp4',
      duration: 22,
      size: 7864320,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_2_6',
      name: 'video_2_6.mp4',
      type: 'video',
      url: '/TEST Library/video/video_2_6.mp4',
      duration: 10,
      size: 3670016,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_2_7',
      name: 'video_2_7.mp4',
      type: 'video',
      url: '/TEST Library/video/video_2_7.mp4',
      duration: 23,
      size: 8126464,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    {
      id: 'video_3_1',
      name: 'video_3_1.mp4',
      type: 'video',
      url: '/TEST Library/video/video_3_1.mp4',
      duration: 25,
      size: 8912896,
      createdAt: new Date('2024-01-15'),
      tags: ['video', 'test', 'sample']
    },
    // Audio assets
    {
      id: 'music_1',
      name: 'music_1.wav',
      type: 'audio',
      url: '/TEST Library/audio/music_1.wav',
      duration: 120,
      size: 10485760,
      createdAt: new Date('2024-01-14'),
      tags: ['music', 'audio', 'background']
    },
    {
      id: 'music_2',
      name: 'music_2.wav',
      type: 'audio',
      url: '/TEST Library/audio/music_2.wav',
      duration: 90,
      size: 7864320,
      createdAt: new Date('2024-01-14'),
      tags: ['music', 'audio', 'background']
    },
    {
      id: 'music_3',
      name: 'music_3.wav',
      type: 'audio',
      url: '/TEST Library/audio/music_3.wav',
      duration: 150,
      size: 13107200,
      createdAt: new Date('2024-01-14'),
      tags: ['music', 'audio', 'background']
    },
    {
      id: 'music_4',
      name: 'music_4.wav',
      type: 'audio',
      url: '/TEST Library/audio/music_4.wav',
      duration: 180,
      size: 15728640,
      createdAt: new Date('2024-01-14'),
      tags: ['music', 'audio', 'background']
    },
    {
      id: 'enhanced_music_1',
      name: 'enhanced_music_1.wav',
      type: 'audio',
      url: '/TEST Library/audio/enhanced_music_1.wav',
      duration: 200,
      size: 20971520,
      createdAt: new Date('2024-01-14'),
      tags: ['music', 'audio', 'enhanced', 'premium']
    },
    {
      id: 'enhanced_music_2',
      name: 'enhanced_music_2.wav',
      type: 'audio',
      url: '/TEST Library/audio/enhanced_music_2.wav',
      duration: 160,
      size: 16777216,
      createdAt: new Date('2024-01-14'),
      tags: ['music', 'audio', 'enhanced', 'premium']
    },
    {
      id: 'enhanced_music_3',
      name: 'enhanced_music_3.wav',
      type: 'audio',
      url: '/TEST Library/audio/enhanced_music_3.wav',
      duration: 140,
      size: 14680064,
      createdAt: new Date('2024-01-14'),
      tags: ['music', 'audio', 'enhanced', 'premium']
    },
    {
      id: 'enhanced_music_4',
      name: 'enhanced_music_4.wav',
      type: 'audio',
      url: '/TEST Library/audio/enhanced_music_4.wav',
      duration: 170,
      size: 17825792,
      createdAt: new Date('2024-01-14'),
      tags: ['music', 'audio', 'enhanced', 'premium']
    },
    // Image assets
    {
      id: 'character_1',
      name: 'character_1.png',
      type: 'image',
      url: '/TEST Library/image/character_1.png',
      size: 512000,
      createdAt: new Date('2024-01-13'),
      tags: ['character', 'image', 'graphic']
    },
    {
      id: 'character_2',
      name: 'character_2.png',
      type: 'image',
      url: '/TEST Library/image/character_2.png',
      size: 480000,
      createdAt: new Date('2024-01-13'),
      tags: ['character', 'image', 'graphic']
    },
    {
      id: 'character_3',
      name: 'character_3.png',
      type: 'image',
      url: '/TEST Library/image/character_3.png',
      size: 456000,
      createdAt: new Date('2024-01-13'),
      tags: ['character', 'image', 'graphic']
    },
    {
      id: 'character_4',
      name: 'character_4.png',
      type: 'image',
      url: '/TEST Library/image/character_4.png',
      size: 524000,
      createdAt: new Date('2024-01-13'),
      tags: ['character', 'image', 'graphic']
    },
    {
      id: 'compilation_image',
      name: 'compilation_image.png',
      type: 'image',
      url: '/TEST Library/image/compilation_image.png',
      size: 1024000,
      createdAt: new Date('2024-01-13'),
      tags: ['compilation', 'image', 'graphic']
    },
    {
      id: 'image_1_1',
      name: 'image_1_1.png',
      type: 'image',
      url: '/TEST Library/image/image_1_1.png',
      size: 256000,
      createdAt: new Date('2024-01-13'),
      tags: ['image', 'graphic', 'background']
    },
    {
      id: 'image_1_2',
      name: 'image_1_2.png',
      type: 'image',
      url: '/TEST Library/image/image_1_2.png',
      size: 288000,
      createdAt: new Date('2024-01-13'),
      tags: ['image', 'graphic', 'background']
    },
    {
      id: 'image_1_3',
      name: 'image_1_3.png',
      type: 'image',
      url: '/TEST Library/image/image_1_3.png',
      size: 240000,
      createdAt: new Date('2024-01-13'),
      tags: ['image', 'graphic', 'background']
    },
    {
      id: 'image_1_4',
      name: 'image_1_4.png',
      type: 'image',
      url: '/TEST Library/image/image_1_4.png',
      size: 272000,
      createdAt: new Date('2024-01-13'),
      tags: ['image', 'graphic', 'background']
    },
    {
      id: 'image_1_5',
      name: 'image_1_5.png',
      type: 'image',
      url: '/TEST Library/image/image_1_5.png',
      size: 264000,
      createdAt: new Date('2024-01-13'),
      tags: ['image', 'graphic', 'background']
    },
    {
      id: 'image_1_6',
      name: 'image_1_6.png',
      type: 'image',
      url: '/TEST Library/image/image_1_6.png',
      size: 248000,
      createdAt: new Date('2024-01-13'),
      tags: ['image', 'graphic', 'background']
    },
    {
      id: 'image_1_7',
      name: 'image_1_7.png',
      type: 'image',
      url: '/TEST Library/image/image_1_7.png',
      size: 280000,
      createdAt: new Date('2024-01-13'),
      tags: ['image', 'graphic', 'background']
    },
    {
      id: 'image_2_1',
      name: 'image_2_1.png',
      type: 'image',
      url: '/TEST Library/image/image_2_1.png',
      size: 296000,
      createdAt: new Date('2024-01-13'),
      tags: ['image', 'graphic', 'background']
    },
    {
      id: 'image_2_2',
      name: 'image_2_2.png',
      type: 'image',
      url: '/TEST Library/image/image_2_2.png',
      size: 312000,
      createdAt: new Date('2024-01-13'),
      tags: ['image', 'graphic', 'background']
    },
    {
      id: 'image_2_3',
      name: 'image_2_3.png',
      type: 'image',
      url: '/TEST Library/image/image_2_3.png',
      size: 232000,
      createdAt: new Date('2024-01-13'),
      tags: ['image', 'graphic', 'background']
    },
    {
      id: 'image_2_4',
      name: 'image_2_4.png',
      type: 'image',
      url: '/TEST Library/image/image_2_4.png',
      size: 304000,
      createdAt: new Date('2024-01-13'),
      tags: ['image', 'graphic', 'background']
    }
  ]);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || asset.type === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    onAssetUpload?.(fileArray);
  }, [onAssetUpload]);

  const handleAssetClick = useCallback((asset: AssetItem) => {
    onAssetSelect?.(asset);
  }, [onAssetSelect]);

  const handleAssetSelect = useCallback((assetId: string, multiSelect: boolean = false) => {
    if (multiSelect) {
      setSelectedAssets(prev =>
        prev.includes(assetId)
          ? prev.filter(id => id !== assetId)
          : [...prev, assetId]
      );
    } else {
      setSelectedAssets([assetId]);
    }
  }, []);

  const handleDeleteSelected = useCallback(() => {
    // In a real app, this would delete the selected assets
    console.log('Deleting assets:', selectedAssets);
    setSelectedAssets([]);
  }, [selectedAssets]);

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'text': return <Type className="w-4 h-4" />;
      default: return <FolderOpen className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* COMPACT HEADER */}
      <div className="p-2 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Asset Library</h3>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-7 px-2"
            >
              <Upload className="w-3 h-3 mr-1" />
              <span className="text-xs">Upload</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="h-7 w-7 p-0"
            >
              {viewMode === 'grid' ? <List className="w-3 h-3" /> : <Grid className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="space-y-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-5 h-6">
              <TabsTrigger value="all" className="text-xs h-5">All</TabsTrigger>
              <TabsTrigger value="video" className="text-xs h-5">Video</TabsTrigger>
              <TabsTrigger value="image" className="text-xs h-5">Image</TabsTrigger>
              <TabsTrigger value="audio" className="text-xs h-5">Audio</TabsTrigger>
              <TabsTrigger value="text" className="text-xs h-5">Text</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ASSETS GRID/LIST */}
      <div className="flex-1 overflow-auto p-2">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredAssets.map((asset) => (
              <Card
                key={asset.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedAssets.includes(asset.id) ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleAssetClick(asset)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleAssetSelect(asset.id, e.ctrlKey || e.metaKey);
                }}
              >
                <CardContent className="p-2">
                  <div className="aspect-video bg-muted rounded flex items-center justify-center mb-1">
                    {asset.thumbnail ? (
                      <img
                        src={asset.thumbnail}
                        alt={asset.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="text-muted-foreground text-xs">
                        {getAssetIcon(asset.type)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium truncate">{asset.name}</h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(asset.size)}</span>
                      {asset.duration && <span>{formatDuration(asset.duration)}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {asset.tags.slice(0, 1).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className={`cursor-pointer transition-all hover:shadow-md p-2 rounded border ${
                  selectedAssets.includes(asset.id) ? 'ring-2 ring-blue-500' : 'bg-muted'
                }`}
                onClick={() => handleAssetClick(asset)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleAssetSelect(asset.id, e.ctrlKey || e.metaKey);
                }}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                    <div className="text-xs">{getAssetIcon(asset.type)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium truncate">{asset.name}</h4>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <span>{formatFileSize(asset.size)}</span>
                      {asset.duration && <span>• {formatDuration(asset.duration)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      <Star className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SELECTED ASSETS ACTIONS */}
      {selectedAssets.length > 0 && (
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleDeleteSelected}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN FILE INPUT */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*"
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
