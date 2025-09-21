"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Music, 
  Play, 
  Pause, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Clock, 
  BarChart3, 
  Volume2 
} from 'lucide-react';

interface MusicAnalysisData {
  file_path: string;
  metadata: {
    title: string;
    artist: string;
    album: string;
    genre: string;
    year: string;
    duration: number;
    bitrate: number;
    sample_rate: number;
    channels: number;
    file_size: number;
    file_type: string;
  };
  features: {
    duration: number;
    tempo: number;
    spectral_centroid: number;
    rms_energy: number;
    harmonic_ratio: number;
    onset_rate: number;
    key: string;
    time_signature: string;
  };
  genre_scores: Record<string, number>;
  predicted_genre: string;
  confidence: number;
  peak_analysis: {
    peak_times: number[];
    peak_scores: number[];
    total_peaks: number;
    analysis_duration: number;
  };
  analysis_timestamp: string;
  segments_sec: number[];
  segments: any[];
  segment_analysis: any[];
  beat_times_sec: number[];
  downbeats_sec: number[];
  tempo: number;
  duration: number;
  debug: any;
  original_filename: string;
  file_size: number;
}

interface MusicAnalysisVisualizerProps {
  analysisData: MusicAnalysisData | null;
  audioFile: File | null;
}

export function MusicAnalysisVisualizer({ analysisData, audioFile }: MusicAnalysisVisualizerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomStart, setZoomStart] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const generateWaveformData = useCallback(() => {
    if (!analysisData) return [];
    
    const duration = analysisData.duration || 0;
    const samples = Math.floor(duration * 50); // 50 samples per second
    const data: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      const time = (i / samples) * duration;
      
      // Find nearby peaks for this time
      const nearbyPeaks = (analysisData.peak_analysis?.peak_times || []).filter(
        peakTime => Math.abs(peakTime - time) < 0.5
      );
      
      if (nearbyPeaks.length > 0) {
        // Use peak intensity for waveform height
        const peakIndex = (analysisData.peak_analysis?.peak_times || []).indexOf(nearbyPeaks[0]);
        const peakScore = (analysisData.peak_analysis?.peak_scores || [])[peakIndex] || 0;
        data.push(Math.min(peakScore / 4, 1)); // Normalize peak scores
      } else {
        // Generate base waveform based on RMS energy and tempo
        const baseLevel = (analysisData.features?.rms_energy || 0) * 0.3;
        const tempoVariation = Math.sin(time * (analysisData.features?.tempo || 120) / 60 * Math.PI * 2) * 0.2;
        data.push(Math.max(0, baseLevel + tempoVariation + Math.random() * 0.1));
      }
    }
    
    return data;
  }, [analysisData]);

  const waveformData = generateWaveformData();

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData.length) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Calculate visible range based on zoom
    const totalDuration = analysisData?.duration || 0;
    const visibleDuration = totalDuration / zoomLevel;
    const startTime = zoomStart;
    const endTime = Math.min(startTime + visibleDuration, totalDuration);
    
    const startSample = Math.floor((startTime / totalDuration) * waveformData.length);
    const endSample = Math.floor((endTime / totalDuration) * waveformData.length);
    const visibleSamples = endSample - startSample;
    
    if (visibleSamples <= 0) return;
    
    const barWidth = width / visibleSamples;
    const centerY = height / 2;
    
    // Colors
    const waveColor = '#3b82f6';
    const peakColor = '#ef4444';
    const segmentColor = '#10b981';
    const progressColor = '#8b5cf6';
    const beatColor = '#f59e0b';
    
    // Draw waveform bars
    for (let i = startSample; i < endSample; i++) {
      const x = (i - startSample) * barWidth;
      const barHeight = waveformData[i] * height * 0.8;
      
      // Check if this is a peak
      const time = (i / waveformData.length) * totalDuration;
      const isPeak = (analysisData?.peak_analysis?.peak_times || []).some(
        peakTime => Math.abs(peakTime - time) < 0.1
      );
      
      // Check if this is a beat
      const isBeat = (analysisData?.beat_times_sec || []).some(
        beatTime => Math.abs(beatTime - time) < 0.05
      );
      
      ctx.fillStyle = isPeak ? peakColor : (isBeat ? beatColor : waveColor);
      ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 1), barHeight);
    }
    
    // Draw segments
    (analysisData?.segments_sec || []).forEach((segmentTime, index) => {
      if (segmentTime >= startTime && segmentTime <= endTime) {
        const x = ((segmentTime - startTime) / visibleDuration) * width;
        ctx.strokeStyle = segmentColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        
        // Segment label
        ctx.fillStyle = segmentColor;
        ctx.font = '12px sans-serif';
        ctx.fillText(`S${index + 1}`, x + 2, 15);
      }
    });
    
    // Draw playhead
    if (currentTime >= startTime && currentTime <= endTime) {
      const playheadX = ((currentTime - startTime) / visibleDuration) * width;
      ctx.strokeStyle = progressColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
    
  }, [waveformData, analysisData, currentTime, zoomLevel, zoomStart]);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !analysisData) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    
    const totalDuration = analysisData.duration;
    const visibleDuration = totalDuration / zoomLevel;
    const clickTime = zoomStart + (x / width) * visibleDuration;
    
    setCurrentTime(Math.max(0, Math.min(clickTime, totalDuration)));
    
    if (audioRef.current) {
      audioRef.current.currentTime = clickTime;
    }
  }, [analysisData, zoomLevel, zoomStart]);

  const handleCanvasMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart(event.clientX);
  }, []);

  const handleCanvasMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !analysisData) return;
    
    const deltaX = event.clientX - dragStart;
    const sensitivity = 0.5;
    const deltaTime = (deltaX / (containerRef.current?.offsetWidth || 1)) * (analysisData.duration / zoomLevel) * sensitivity;
    
    setZoomStart(Math.max(0, Math.min(zoomStart - deltaTime, analysisData.duration - (analysisData.duration / zoomLevel))));
    setDragStart(event.clientX);
  }, [isDragging, dragStart, analysisData, zoomLevel, zoomStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 1.5, 20));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 1.5, 1));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setZoomStart(0);
  }, []);

  // Audio controls
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  if (!analysisData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Music Analysis</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Loading music analysis data...
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                Analyzing your music to create the visualization...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with track info */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Music className="w-6 h-6 text-primary" />
              <div>
                <CardTitle className="text-xl">{analysisData.metadata.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {analysisData.metadata.artist} • {formatTime(analysisData.duration || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{analysisData.predicted_genre}</Badge>
              <Badge variant="outline">{(analysisData.features.tempo || 120).toFixed(0)} BPM</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main visualization */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Music Analysis Visualization</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                disabled={zoomLevel <= 1}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                disabled={zoomLevel >= 20}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetZoom}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Audio controls */}
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={togglePlayPause}
                disabled={!audioFile}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <div className="flex-1">
                <Progress 
                  value={(currentTime / analysisData.duration) * 100} 
                  className="h-2"
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(analysisData.duration)}
              </span>
            </div>

            {/* Waveform canvas */}
            <div 
              ref={containerRef}
              className="relative border rounded-lg overflow-hidden bg-muted/20"
            >
              <canvas
                ref={canvasRef}
                className="w-full h-32 cursor-pointer"
                onClick={handleCanvasClick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              
              {/* Legend */}
              <div className="absolute top-2 left-2 flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Waveform</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Peaks</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Segments</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-amber-500 rounded"></div>
                  <span>Beats</span>
                </div>
              </div>
            </div>

            {/* Zoom info */}
            <div className="text-sm text-muted-foreground text-center">
              Zoom: {zoomLevel.toFixed(1)}x • 
              {formatTime(zoomStart)} - {formatTime(Math.min(zoomStart + analysisData.duration / zoomLevel, analysisData.duration))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segment details */}
      {selectedSegment !== null && analysisData.segments[selectedSegment] && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-lg">
              Segment {analysisData.segments[selectedSegment].segment_index + 1} Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatTime(analysisData.segments[selectedSegment].start_time)} - {formatTime(analysisData.segments[selectedSegment].end_time)} 
              ({formatTime(analysisData.segments[selectedSegment].duration)})
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Duration</span>
                </div>
                <p className="text-2xl font-bold">{formatTime(analysisData.segments[selectedSegment].duration)}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Peaks</span>
                </div>
                <p className="text-2xl font-bold">
                  {analysisData.peak_analysis.peak_times.filter(
                    peak => peak >= analysisData.segments[selectedSegment].start_time && peak <= analysisData.segments[selectedSegment].end_time
                  ).length}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Energy</span>
                </div>
                <p className="text-2xl font-bold">
                  {analysisData.segments[selectedSegment].features?.rms_energy?.toFixed(3) || 'N/A'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Music className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Tempo</span>
                </div>
                <p className="text-2xl font-bold">
                  {analysisData.segments[selectedSegment].features?.tempo?.toFixed(0) || analysisData.features.tempo.toFixed(0)} BPM
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall analysis summary */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold">Audio Features</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{formatTime(analysisData.features.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tempo:</span>
                  <span>{analysisData.features.tempo.toFixed(1)} BPM</span>
                </div>
                <div className="flex justify-between">
                  <span>Energy:</span>
                  <span>{analysisData.features.rms_energy.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Harmonic Ratio:</span>
                  <span>{analysisData.features.harmonic_ratio.toFixed(3)}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Segmentation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Segments:</span>
                  <span>{analysisData.segments.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Peaks:</span>
                  <span>{analysisData.peak_analysis.total_peaks}</span>
                </div>
                <div className="flex justify-between">
                  <span>Beat Count:</span>
                  <span>{analysisData.beat_times_sec.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Downbeats:</span>
                  <span>{analysisData.downbeats_sec.length}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Genre Classification</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Predicted:</span>
                  <Badge variant="secondary">{analysisData.predicted_genre}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Confidence:</span>
                  <span>{analysisData.confidence}%</span>
                </div>
                {Object.entries(analysisData.genre_scores).map(([genre, score]) => (
                  <div key={genre} className="flex justify-between">
                    <span className="text-xs">{genre}:</span>
                    <span className="text-xs">{score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hidden audio element */}
      {audioFile && audioFile instanceof File && (
        <audio
          ref={audioRef}
          src={URL.createObjectURL(audioFile)}
          preload="metadata"
        />
      )}
    </div>
  );
}