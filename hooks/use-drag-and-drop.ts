"use client";

import { useState, useCallback, useRef, useEffect } from 'react';

interface DragAndDropState {
  isDragOver: boolean;
  isDragging: boolean;
  isTrackReordering: boolean;
  draggedFiles: File[];
  error: string | null;
}

interface DragAndDropOptions {
  accept?: string[];
  multiple?: boolean;
  maxSize?: number; // in bytes
  onDrop?: (files: File[]) => void;
  onError?: (error: string) => void;
}

export function useDragAndDrop(options: DragAndDropOptions = {}) {
  const {
    accept = [],
    multiple = false,
    maxSize,
    onDrop,
    onError,
  } = options;

  const [state, setState] = useState<DragAndDropState>({
    isDragOver: false,
    isDragging: false,
    isTrackReordering: false,
    draggedFiles: [],
    error: null,
  });

  const dropZoneRef = useRef<HTMLElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (accept.length > 0) {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type;
      
      const isAccepted = accept.some(acceptedType => {
        if (acceptedType.startsWith('.')) {
          return fileExtension === acceptedType;
        }
        return mimeType.startsWith(acceptedType);
      });

      if (!isAccepted) {
        return `File type not supported. Accepted types: ${accept.join(', ')}`;
      }
    }

    // Check file size
    if (maxSize && file.size > maxSize) {
      return `File size too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`;
    }

    return null;
  }, [accept, maxSize]);


  const handleDragStart = useCallback((e: DragEvent) => {
    setState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragEnd = useCallback((e: DragEvent) => {
    setState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const clearFiles = useCallback(() => {
    setState(prev => ({ ...prev, draggedFiles: [], error: null }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Set up event listeners
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    // Global drag events
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, [handleDragStart, handleDragEnd]);

  // Additional methods expected by existing code
  const handleDragEnter = useCallback((e: React.DragEvent, isTrackReordering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ 
      ...prev, 
      isDragOver: !isTrackReordering,
      isTrackReordering 
    }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, isTrackReordering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, isTrackReordering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set isDragOver to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setState(prev => ({ ...prev, isDragOver: false }));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, isTrackReordering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
    setState(prev => ({ ...prev, isDragOver: false, error: null }));

    if (isTrackReordering) {
      // Handle track reordering logic here
      return;
    }

    const files = Array.from(e.dataTransfer?.files || []);
    
    if (files.length === 0) {
      return;
    }

    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      const errorMessage = errors.join('\n');
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
      return;
    }

    // Check multiple files constraint
    if (!multiple && validFiles.length > 1) {
      const errorMessage = 'Only one file is allowed';
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
      return;
    }

    setState(prev => ({ ...prev, draggedFiles: validFiles }));
    onDrop?.(validFiles);
  }, [validateFile, multiple, onDrop, onError]);

  return {
    state,
    dropZoneRef,
    clearFiles,
    clearError,
    actions: {
      handleDragEnter,
      handleDragOver,
      handleDragLeave,
      handleDrop,
    },
  };
}