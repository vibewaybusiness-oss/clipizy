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

  // Helper function to validate audio file format
  const isValidAudioFile = (file: File): boolean => {
    const validTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/webm',
      'audio/x-m4a', 'audio/m4a', 'audio/x-wav', 'audio/wave', 'audio/x-pn-wav'
    ];
    
    // Check MIME type first
    if (validTypes.includes(file.type)) {
      return true;
    }
    
    // Check file extension as fallback
    const audioExtensions = /\.(mp3|wav|ogg|m4a|aac|webm|flac|wma)$/i;
    return audioExtensions.test(file.name);
  };

  // Helper function to validate audio URL
  const isValidAudioUrl = (url: string): boolean => {
    if (!url || url === '') return false;
    
    // Check for valid URL format
    try {
      new URL(url);
    } catch {
      // If it's a blob URL, it's valid
      if (url.startsWith('blob:')) return true;
      return false;
    }
    
    // Check for audio file extensions
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm'];
    return audioExtensions.some(ext => url.toLowerCase().includes(ext)) || url.startsWith('blob:');
  };

  // Helper function to validate audio file content
  const validateAudioFileContent = async (file: File): Promise<boolean> => {
    try {
      // For very small files, skip content validation as it might be a valid short audio clip
      if (file.size < 1024) {
        console.log('File is very small, skipping content validation:', file.name, file.size);
        return true;
      }
      
      // Read the first few bytes to check for audio file signatures
      const buffer = await file.slice(0, 16).arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      
      // Check for common audio file signatures
      // MP3: ID3 tag (49 44 33) or frame sync (FF FB/FA/F2/F3)
      // WAV: RIFF header (52 49 46 46)
      // OGG: OggS header (4F 67 67 53)
      // M4A: ftyp box (66 74 79 70)
      // FLAC: fLaC header (66 4C 61 43)
      
      const signatures = [
        [0x49, 0x44, 0x33], // ID3 (MP3)
        [0xFF, 0xFB], // MP3 frame sync
        [0xFF, 0xFA], // MP3 frame sync
        [0xFF, 0xF2], // MP3 frame sync
        [0xFF, 0xF3], // MP3 frame sync
        [0x52, 0x49, 0x46, 0x46], // RIFF (WAV)
        [0x4F, 0x67, 0x67, 0x53], // OggS (OGG)
        [0x66, 0x74, 0x79, 0x70], // ftyp (M4A)
        [0x66, 0x4C, 0x61, 0x43], // fLaC (FLAC)
      ];
      
      for (const signature of signatures) {
        if (signature.every((byte, index) => uint8Array[index] === byte)) {
          console.log('Valid audio file signature found:', signature);
          return true;
        }
      }
      
      // If no signature is found, but the file has a valid MIME type and extension, 
      // assume it's valid (some audio files might not have standard headers)
      if (isValidAudioFile(file)) {
        console.log('No signature found but file type appears valid:', file.name);
        return true;
      }
      
      console.warn('No valid audio file signature found in file:', file.name);
      return false;
    } catch (error) {
      console.error('Error validating audio file content:', error);
      // If validation fails, but the file type is valid, assume it's okay
      return isValidAudioFile(file);
    }
  };

  const playTrack = useCallback(async (track: { id: string; file: File; url: string }) => {
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
      // Only create blob URL if the file has actual content and valid format
      if (track.file && track.file.size > 0) {
        if (!isValidAudioFile(track.file)) {
          console.error('Invalid audio file format for track:', track.id, 'File type:', track.file.type);
          toast({
            variant: "destructive",
            title: "Playback Error",
            description: "Unsupported audio file format. Please use MP3, WAV, OGG, M4A, AAC, or WebM files.",
          });
          return;
        }
        
        // Additional validation: check if the file has valid audio data
        console.log('File details:', {
          name: track.file.name,
          type: track.file.type,
          size: track.file.size,
          lastModified: track.file.lastModified
        });
        
        // Check if file size is suspiciously small (might be empty/corrupted)
        if (track.file.size < 1024) { // Less than 1KB
          console.warn('Audio file is very small, might be corrupted:', track.file.size, 'bytes');
        }
        
        // Validate audio file content
        const hasValidContent = await validateAudioFileContent(track.file);
        if (!hasValidContent) {
          console.error('Audio file content validation failed for track:', track.id);
          toast({
            variant: "destructive",
            title: "Playback Error",
            description: "Audio file appears to be corrupted or not a valid audio file. Please try uploading a different file.",
          });
          return;
        }
        
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
      // Use the provided URL (S3 URL for existing projects or existing blob URL)
      console.log('Using provided URL for track:', track.id, 'URL:', track.url);
      
      // Validate the URL format
      if (!isValidAudioUrl(track.url)) {
        console.error('Invalid audio URL format for track:', track.id, 'URL:', track.url);
        toast({
          variant: "destructive",
          title: "Playback Error",
          description: "Invalid audio URL format. Please check the file URL.",
        });
        return;
      }
      
      // Check if it's a blob URL that might have been revoked
      if (track.url.startsWith('blob:')) {
        // Test if the blob URL is still accessible
        try {
          const testResponse = await fetch(track.url);
          if (!testResponse.ok) {
            console.error('Blob URL is no longer accessible:', testResponse.status, testResponse.statusText);
            // If the blob URL is no longer accessible, try to recreate it from the file
            if (track.file && track.file.size > 0) {
              console.log('Recreating blob URL from file for track:', track.id);
              audioUrl = URL.createObjectURL(track.file);
              trackBlobUrl(audioUrl, `use-audio-playback:playTrack:recreate:${track.id}`);
            } else {
              toast({
                variant: "destructive",
                title: "Playback Error",
                description: "Audio file is no longer accessible. Please try uploading again.",
              });
              return;
            }
          } else {
            console.log('Blob URL accessibility test passed');
            audioUrl = track.url;
          }
        } catch (fetchError) {
          console.error('Failed to test blob URL accessibility:', fetchError);
          // If the blob URL is no longer accessible, try to recreate it from the file
          if (track.file && track.file.size > 0) {
            console.log('Recreating blob URL from file for track:', track.id);
            audioUrl = URL.createObjectURL(track.file);
            trackBlobUrl(audioUrl, `use-audio-playback:playTrack:recreate:${track.id}`);
          } else {
            toast({
              variant: "destructive",
              title: "Playback Error",
              description: "Audio file is no longer accessible. Please try uploading again.",
            });
            return;
          }
        }
      } else {
        audioUrl = track.url;
      }
      
      // Check for common CORS or accessibility issues
      if (track.url.startsWith('http') && !track.url.includes(window.location.origin)) {
        console.warn('Cross-origin audio URL detected - may have CORS issues:', track.url);
      }
    }
    
    // Final validation of the audio URL before creating Audio object
    if (!audioUrl || audioUrl === '') {
      console.error('Invalid audio URL for track:', track.id);
      toast({
        variant: "destructive",
        title: "Playback Error",
        description: "Invalid audio URL. Please try again.",
      });
      return;
    }
    
    // Additional debugging for the audio URL
    console.log('Creating Audio object with URL:', audioUrl);
    console.log('URL type:', typeof audioUrl);
    console.log('URL length:', audioUrl.length);
    
    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    setCurrentlyPlayingId(track.id);
    
    // Log audio element properties immediately after creation
    console.log('Audio element created:', {
      src: audio.src,
      networkState: audio.networkState,
      readyState: audio.readyState,
      preload: audio.preload
    });
    
    // Set a timeout to handle cases where audio fails to load
    const loadTimeout = setTimeout(() => {
      console.error('Audio load timeout for track:', track.id);
      toast({
        variant: "destructive",
        title: "Playback Error",
        description: "Audio file took too long to load. Please check your connection and try again.",
      });
      stopCurrentAudio();
    }, 10000); // 10 second timeout
    
    // Add event listeners with proper cleanup
    const handleEnded = () => {
      clearTimeout(loadTimeout);
      stopCurrentAudio();
    };
    
    const handleError = (e: Event) => {
      clearTimeout(loadTimeout);
      
      // Log the raw error event for debugging
      console.error('Raw audio error event:', e);
      console.error('Error event type:', e.type);
      console.error('Error event target:', e.target);
      
      const error = e.target as HTMLAudioElement;
      
      // More comprehensive error information extraction
      const errorDetails = {
        error: error?.error ? {
          code: error.error.code,
          message: error.error.message || 'No message available',
          name: (error.error as any).name || 'Unknown error name'
        } : 'No error object available',
        networkState: error?.networkState !== undefined ? error.networkState : 'Unknown',
        readyState: error?.readyState !== undefined ? error.readyState : 'Unknown',
        src: error?.src || 'Unknown',
        currentTime: error?.currentTime || 0,
        duration: error?.duration || 0,
        paused: error?.paused,
        ended: error?.ended
      };
      
      console.error('Audio error details:', errorDetails);
      console.error('Audio element properties:', {
        src: error?.src,
        networkState: error?.networkState,
        readyState: error?.readyState,
        error: error?.error
      });
      
      // Try to recover from blob URL issues by recreating the URL
      if (audioUrl.startsWith('blob:') && track.file && track.file.size > 0) {
        console.log('Attempting to recover from blob URL error by recreating URL for track:', track.id);
        try {
          // Revoke the old blob URL
          URL.revokeObjectURL(audioUrl);
          
          // Create a new blob URL
          const newAudioUrl = URL.createObjectURL(track.file);
          trackBlobUrl(newAudioUrl, `use-audio-playback:playTrack:recovery:${track.id}`);
          
          // Update the audio element with the new URL
          audio.src = newAudioUrl;
          audio.load();
          
          // Try to play again
          audio.play().then(() => {
            console.log('Audio playback recovered successfully for track:', track.id);
            setIsPlaying(true);
          }).catch((recoveryError) => {
            console.error('Audio recovery failed:', recoveryError);
            // If recovery fails, show the error message
            showAudioError(error, audioUrl);
          });
          
          return; // Exit early if we're attempting recovery
        } catch (recoveryError) {
          console.error('Failed to recreate blob URL for recovery:', recoveryError);
        }
      }
      
      // If we can't recover, show the error
      showAudioError(error, audioUrl);
    };
    
    const showAudioError = (error: HTMLAudioElement, failedUrl: string) => {
      // Determine specific error message based on error type
      let errorMessage = "Failed to play the audio file. The file may be corrupted or in an unsupported format.";
      
      if (error?.error) {
        // Check for specific error names first
        if ((error.error as any).name === 'NotSupportedError') {
          errorMessage = "Audio file format is not supported by your browser. The file may be corrupted or in an unsupported format.";
        } else {
          switch (error.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = "Audio playback was aborted.";
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = "Network error occurred while loading the audio file. Please check your internet connection.";
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = "Audio file format is not supported or corrupted.";
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = "Audio file format is not supported by your browser or the file URL is not accessible.";
              break;
            default:
              errorMessage = `Audio playback error (code: ${error.error.code}, name: ${(error.error as any).name}).`;
          }
        }
      } else {
        // Handle cases where error object is not available but we know there's an issue
        if (error?.networkState === 3) { // NETWORK_NO_SOURCE
          errorMessage = "No supported audio source found. The file may be corrupted, in an unsupported format, or the URL is not accessible.";
        } else if (error?.readyState === 0) { // HAVE_NOTHING
          errorMessage = "Audio file failed to load. Please check the file URL and try again.";
        } else if (error?.networkState === 2) { // NETWORK_LOADING
          errorMessage = "Audio file is still loading. This may indicate a network or CORS issue.";
        }
      }
      
      // Check for specific error patterns in the console
      if (typeof window !== 'undefined' && window.console) {
        // This will help identify if it's a CORS issue
        console.error('Possible causes for audio error:');
        console.error('1. CORS policy blocking the audio file');
        console.error('2. Audio file format not supported by browser');
        console.error('3. Audio file URL is not accessible');
        console.error('4. Audio file is corrupted or empty');
        console.error('5. Network connectivity issues');
      }
      
      // Additional context for debugging
      console.error('Final error message:', errorMessage);
      console.error('Audio URL that failed:', failedUrl);
      
      toast({
        variant: "destructive",
        title: "Playback Error",
        description: errorMessage,
      });
      stopCurrentAudio();
    };
    
    const handleLoadStart = () => {
      console.log('Audio load started for track:', track.id);
    };
    
    const handleCanPlay = () => {
      clearTimeout(loadTimeout);
      console.log('Audio can play for track:', track.id);
    };
    
    // Store references for cleanup
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    
    // Store cleanup function on the audio element for later use
    (audio as any)._cleanup = () => {
      clearTimeout(loadTimeout);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };

    audio.play().then(() => {
      clearTimeout(loadTimeout);
      console.log('Audio playback started for track:', track.id);
      setIsPlaying(true);
    }).catch((error) => {
      clearTimeout(loadTimeout);
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
