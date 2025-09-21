"use client";

import { useState, useCallback, useRef } from 'react';
import { VideoProject } from '../types';

interface HistoryState {
  project: VideoProject;
  action: string;
  timestamp: number;
}

export function useUndoRedo(initialProject: VideoProject) {
  const [history, setHistory] = useState<HistoryState[]>([
    {
      project: initialProject,
      action: 'Initial State',
      timestamp: Date.now()
    }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const maxHistorySize = 50;

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const pushState = useCallback((project: VideoProject, action: string) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push({
        project: { ...project },
        action,
        timestamp: Date.now()
      });

      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }

      return newHistory;
    });
    setCurrentIndex(prev => Math.min(prev + 1, maxHistorySize - 1));
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (canUndo) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [canRedo]);

  const getCurrentProject = useCallback(() => {
    return history[currentIndex]?.project || initialProject;
  }, [history, currentIndex, initialProject]);

  const clearHistory = useCallback(() => {
    setHistory([{
      project: initialProject,
      action: 'Initial State',
      timestamp: Date.now()
    }]);
    setCurrentIndex(0);
  }, [initialProject]);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    pushState,
    getCurrentProject,
    clearHistory,
    historyLength: history.length,
    currentIndex
  };
}
