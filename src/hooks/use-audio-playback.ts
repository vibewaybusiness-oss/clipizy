import { useState, useRef, useCallback } from 'react';
import { useToast } from './use-toast';
import type { AudioPlaybackState } from '@/types/music-clip';

// Simple blob URL tracking for debugging (can be removed in production)
const trackBlobUrl = (url: string, source: string = 'unknown') => {
  if (url.startsWith('blob:')) {
    console.log(`[BLOB TRACKER] Created: ${url} from ${source}`);
  }
};

const untrackBlobUrl = (url: string) => {
  if (url.startsWith('blob:')) {
    console.log(`[BLOB TRACKER] Revoked: ${url}`);
  }
};

export function useAudioPlayback() {
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Keep ref in sync with state
  currentAudioRef.current = currentAudio;

  const stopCurrentAudio = useCallback(() => {
    const audio = currentAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      
      // Clean up event listeners
      if ((audio as any)._cleanup) {
        (audio as any)._cleanup();
      }
      
      // Revoke the blob URL if it was created for this audio
      if (audio.src.startsWith('blob:')) {
        try {
          console.log('Revoking blob URL:', audio.src);
          untrackBlobUrl(audio.src);
          URL.revokeObjectURL(audio.src);
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error);
        }
      }
      
      // Clear the src to prevent further requests
      audio.src = '';
      audio.load();
      
      setCurrentAudio(null);
    }
    setIsPlaying(false);
    setCurrentlyPlayingId(null);
  }, []); // Remove currentAudio from dependencies to prevent infinite loop

  const stopAllAudio = useCallback(() => {
    // Stop current audio
    stopCurrentAudio();
    
    // Stop any remaining audio elements in the DOM
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      if (audio instanceof HTMLAudioElement) {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
      }
    });
    
    // Force stop any media elements
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach(media => {
      if (media instanceof HTMLMediaElement) {
        media.pause();
        media.currentTime = 0;
        media.src = '';
        media.load();
      }
    });
  }, [stopCurrentAudio]);

  const playTrack = useCallback((track: { id: string; file: File; url: string }) => {
    // If this track is already playing, pause it
    if (currentlyPlayingId === track.id && isPlaying) {
      stopCurrentAudio();
      return;
    }

    // If clicking the same track that was paused, resume it
    if (currentlyPlayingId === track.id && !isPlaying) {
      const audio = currentAudioRef.current;
      if (audio) {
        audio.play();
        setIsPlaying(true);
        return;
      }
    }

    // Stop any currently playing audio when starting playback of a different track
    stopCurrentAudio();

    // Start playing the selected track
    let audioUrl = track.url;
    console.log('Playing track:', track.id, 'URL:', track.url, 'File size:', track.file?.size);
    
    // Check if we have a valid URL or file
    if (!track.url || track.url === '') {
      // Only create blob URL if the file has actual content (not empty placeholder)
      if (track.file && track.file.size > 0) {
        audioUrl = URL.createObjectURL(track.file);
        trackBlobUrl(audioUrl, `use-audio-playback:playTrack:${track.id}`);
        console.log('Created new blob URL for track:', track.id, 'URL:', audioUrl);
      } else {
        console.error('No valid audio URL available for track:', track.id, 'File size:', track.file?.size);
        toast({
          variant: "destructive",
          title: "Playback Error",
          description: "This track doesn't have audio content yet. Please upload an audio file or generate music first.",
        });
        return;
      }
    } else {
      // Use the provided URL (S3 URL for existing projects)
      console.log('Using provided URL for track:', track.id, 'URL:', track.url);
      
      // Validate that the URL is accessible
      if (track.url.startsWith('blob:') && track.url.includes('localhost:3000')) {
        console.warn('Potentially invalid blob URL detected:', track.url);
      }
    }
    
    // Validate the audio URL before creating Audio object
    if (!audioUrl || audioUrl === '') {
      console.error('Invalid audio URL for track:', track.id);
      toast({
        variant: "destructive",
        title: "Playback Error",
        description: "Invalid audio URL. Please try again.",
      });
      return;
    }
    
    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    setCurrentlyPlayingId(track.id);
    
    // Add event listeners with proper cleanup
    const handleEnded = () => {
      stopCurrentAudio();
    };
    
    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
      const error = e.target as HTMLAudioElement;
      console.error('Audio error details:', {
        error: error.error,
        networkState: error.networkState,
        readyState: error.readyState,
        src: error.src
      });
      
      toast({
        variant: "destructive",
        title: "Playback Error",
        description: "Failed to play the audio file. The file may be corrupted or in an unsupported format.",
      });
      stopCurrentAudio();
    };
    
    const handleLoadStart = () => {
      console.log('Audio load started for track:', track.id);
    };
    
    const handleCanPlay = () => {
      console.log('Audio can play for track:', track.id);
    };
    
    // Store references for cleanup
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    
    // Store cleanup function on the audio element for later use
    (audio as any)._cleanup = () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };

    audio.play().then(() => {
      console.log('Audio playback started for track:', track.id);
      setIsPlaying(true);
    }).catch((error) => {
      console.error('Audio play failed:', error);
      toast({
        variant: "destructive",
        title: "Playback Error",
        description: "Failed to start playback. The file might be corrupted or in an unsupported format.",
      });
      stopCurrentAudio();
    });
  }, [currentlyPlayingId, isPlaying, stopCurrentAudio, toast]);

  return {
    currentlyPlayingId,
    isPlaying,
    currentAudio,
    stopCurrentAudio,
    stopAllAudio,
    playTrack,
  };
}
