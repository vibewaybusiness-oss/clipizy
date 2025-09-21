import { useState, useCallback, useRef } from 'react';
import { AssetItem } from '../types';

interface UseAssetLibraryReturn {
  assets: AssetItem[];
  selectedAssets: string[];
  searchQuery: string;
  selectedCategory: string;
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSelectedAssets: (assets: string[]) => void;
  selectAsset: (assetId: string, multiSelect?: boolean) => void;
  addAsset: (asset: AssetItem) => void;
  removeAsset: (assetId: string) => void;
  updateAsset: (assetId: string, updates: Partial<AssetItem>) => void;
  uploadAssets: (files: File[]) => Promise<void>;
  deleteSelectedAssets: () => void;
  getFilteredAssets: () => AssetItem[];
  getAssetsByCategory: (category: string) => AssetItem[];
  getAssetsByTag: (tag: string) => AssetItem[];
}

export function useAssetLibrary(initialAssets: AssetItem[] = []): UseAssetLibraryReturn {
  const [assets, setAssets] = useState<AssetItem[]>(initialAssets);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);

  const selectAsset = useCallback((assetId: string, multiSelect: boolean = false) => {
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

  const addAsset = useCallback((asset: AssetItem) => {
    setAssets(prev => [...prev, asset]);
  }, []);

  const removeAsset = useCallback((assetId: string) => {
    setAssets(prev => prev.filter(asset => asset.id !== assetId));
    setSelectedAssets(prev => prev.filter(id => id !== assetId));
  }, []);

  const updateAsset = useCallback((assetId: string, updates: Partial<AssetItem>) => {
    setAssets(prev => 
      prev.map(asset => 
        asset.id === assetId ? { ...asset, ...updates } : asset
      )
    );
  }, []);

  const uploadAssets = useCallback(async (files: File[]) => {
    setIsLoading(true);
    
    try {
      const newAssets: AssetItem[] = [];
      
      for (const file of files) {
        const asset: AssetItem = {
          id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: getFileType(file.type),
          url: URL.createObjectURL(file),
          size: file.size,
          createdAt: new Date(),
          tags: generateTagsFromFile(file)
        };

        // Generate thumbnail for images and videos
        if (asset.type === 'image' || asset.type === 'video') {
          try {
            asset.thumbnail = await generateThumbnail(file);
          } catch (error) {
            console.warn('Failed to generate thumbnail:', error);
          }
        }

        // Get duration for audio and video files
        if (asset.type === 'audio' || asset.type === 'video') {
          try {
            asset.duration = await getMediaDuration(file);
          } catch (error) {
            console.warn('Failed to get media duration:', error);
          }
        }

        newAssets.push(asset);
      }

      setAssets(prev => [...prev, ...newAssets]);
    } catch (error) {
      console.error('Failed to upload assets:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSelectedAssets = useCallback(() => {
    setAssets(prev => prev.filter(asset => !selectedAssets.includes(asset.id)));
    setSelectedAssets([]);
  }, [selectedAssets]);

  const getFilteredAssets = useCallback(() => {
    return assets.filter(asset => {
      const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || asset.type === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [assets, searchQuery, selectedCategory]);

  const getAssetsByCategory = useCallback((category: string) => {
    return assets.filter(asset => asset.type === category);
  }, [assets]);

  const getAssetsByTag = useCallback((tag: string) => {
    return assets.filter(asset => asset.tags.includes(tag));
  }, [assets]);

  return {
    assets,
    selectedAssets,
    searchQuery,
    selectedCategory,
    viewMode,
    isLoading,
    setSearchQuery,
    setSelectedCategory,
    setViewMode,
    setSelectedAssets,
    selectAsset,
    addAsset,
    removeAsset,
    updateAsset,
    uploadAssets,
    deleteSelectedAssets,
    getFilteredAssets,
    getAssetsByCategory,
    getAssetsByTag
  };
}

function getFileType(mimeType: string): 'video' | 'image' | 'audio' | 'text' {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'text';
}

function generateTagsFromFile(file: File): string[] {
  const tags: string[] = [];
  
  // Add file type tag
  if (file.type.startsWith('video/')) tags.push('video');
  if (file.type.startsWith('image/')) tags.push('image');
  if (file.type.startsWith('audio/')) tags.push('audio');
  
  // Add size-based tags
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB < 1) tags.push('small');
  else if (sizeMB < 10) tags.push('medium');
  else tags.push('large');
  
  // Add name-based tags
  const name = file.name.toLowerCase();
  if (name.includes('logo')) tags.push('logo');
  if (name.includes('background')) tags.push('background');
  if (name.includes('music')) tags.push('music');
  if (name.includes('intro')) tags.push('intro');
  if (name.includes('outro')) tags.push('outro');
  
  return tags;
}

async function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = 200;
        canvas.height = 150;
        ctx.drawImage(img, 0, 0, 200, 150);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        canvas.width = 200;
        canvas.height = 150;
        ctx.drawImage(video, 0, 0, 200, 150);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = URL.createObjectURL(file);
      video.currentTime = 1; // Seek to 1 second
    } else {
      reject(new Error('Unsupported file type for thumbnail generation'));
    }
  });
}

async function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      const media = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video');
      media.onloadedmetadata = () => {
        resolve(media.duration);
        URL.revokeObjectURL(media.src);
      };
      media.onerror = () => {
        reject(new Error('Failed to load media'));
        URL.revokeObjectURL(media.src);
      };
      media.src = URL.createObjectURL(file);
    } else {
      reject(new Error('File type does not support duration'));
    }
  });
}
