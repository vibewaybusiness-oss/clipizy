import { AudioTrack } from '../types';

export const audioUtils = {
  // Analyze audio file and extract metadata
  async analyzeAudio(file: File): Promise<{
    duration: number;
    sampleRate: number;
    channels: number;
    bitRate: number;
    format: string;
  }> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      
      audio.onloadedmetadata = () => {
        resolve({
          duration: audio.duration,
          sampleRate: 44100, // Default, would need Web Audio API for actual value
          channels: 2, // Default, would need Web Audio API for actual value
          bitRate: 128, // Default, would need Web Audio API for actual value
          format: file.type
        });
      };
      
      audio.onerror = () => {
        reject(new Error('Failed to load audio file'));
      };
      
      audio.src = URL.createObjectURL(file);
    });
  },

  // Generate waveform data from audio file
  async generateWaveform(file: File, samples: number = 1000): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          const channelData = audioBuffer.getChannelData(0);
          const blockSize = Math.floor(channelData.length / samples);
          const waveform: number[] = [];
          
          for (let i = 0; i < samples; i++) {
            const start = i * blockSize;
            const end = Math.min(start + blockSize, channelData.length);
            let sum = 0;
            
            for (let j = start; j < end; j++) {
              sum += Math.abs(channelData[j]);
            }
            
            waveform.push(sum / (end - start));
          }
          
          resolve(waveform);
        } catch (error) {
          reject(error);
        }
      };
      
      fileReader.onerror = () => {
        reject(new Error('Failed to read audio file'));
      };
      
      fileReader.readAsArrayBuffer(file);
    });
  },

  // Normalize audio volume
  normalizeVolume(audioTracks: AudioTrack[], targetLevel: number = 0.8): AudioTrack[] {
    return audioTracks.map(track => ({
      ...track,
      volume: Math.min(track.volume * (targetLevel / getAverageVolume(audioTracks)), 1)
    }));
  },

  // Fade in/out audio
  applyFade(track: AudioTrack, fadeInDuration: number = 0, fadeOutDuration: number = 0): AudioTrack {
    return {
      ...track,
      effects: [
        ...track.effects,
        {
          id: `fade-${Date.now()}`,
          name: 'Fade',
          type: 'opacity' as any, // Using opacity as a workaround for fade
          enabled: true,
          parameters: {
            fadeInDuration,
            fadeOutDuration
          }
        }
      ]
    };
  },

  // Mix multiple audio tracks
  async mixAudioTracks(tracks: AudioTrack[]): Promise<AudioBuffer> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = Math.max(...tracks.map(t => t.startTime + t.duration));
    const sampleRate = audioContext.sampleRate;
    const length = duration * sampleRate;
    
    const mixedBuffer = audioContext.createBuffer(2, length, sampleRate);
    const leftChannel = mixedBuffer.getChannelData(0);
    const rightChannel = mixedBuffer.getChannelData(1);
    
    for (const track of tracks) {
      if (track.muted) continue;
      
      try {
        const audioBuffer = await loadAudioBuffer(track.source, audioContext);
        const startSample = Math.floor(track.startTime * sampleRate);
        const trackLength = Math.min(audioBuffer.length, length - startSample);
        
        for (let i = 0; i < trackLength; i++) {
          const sampleIndex = startSample + i;
          if (sampleIndex >= 0 && sampleIndex < length) {
            const sample = audioBuffer.getChannelData(0)[i] * track.volume;
            leftChannel[sampleIndex] += sample;
            rightChannel[sampleIndex] += sample;
          }
        }
      } catch (error) {
        console.warn(`Failed to load audio track ${track.id}:`, error);
      }
    }
    
    return mixedBuffer;
  },

  // Detect silence in audio
  detectSilence(audioBuffer: AudioBuffer, threshold: number = 0.01): { start: number; end: number }[] {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const silence: { start: number; end: number }[] = [];
    let silenceStart = -1;
    
    for (let i = 0; i < channelData.length; i++) {
      const amplitude = Math.abs(channelData[i]);
      
      if (amplitude < threshold) {
        if (silenceStart === -1) {
          silenceStart = i;
        }
      } else {
        if (silenceStart !== -1) {
          silence.push({
            start: silenceStart / sampleRate,
            end: i / sampleRate
          });
          silenceStart = -1;
        }
      }
    }
    
    if (silenceStart !== -1) {
      silence.push({
        start: silenceStart / sampleRate,
        end: channelData.length / sampleRate
      });
    }
    
    return silence;
  },

  // Apply audio effects
  applyEffect(audioBuffer: AudioBuffer, effect: string, parameters: Record<string, any>): AudioBuffer {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const newBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = newBuffer.getChannelData(channel);
      
      switch (effect) {
        case 'gain':
          const gain = parameters.amount || 1;
          for (let i = 0; i < inputData.length; i++) {
            outputData[i] = inputData[i] * gain;
          }
          break;
          
        case 'lowpass':
          const cutoff = parameters.frequency || 1000;
          const resonance = parameters.resonance || 1;
          // Simple low-pass filter implementation
          let y1 = 0, y2 = 0;
          const c = 1 / Math.tan(Math.PI * cutoff / audioBuffer.sampleRate);
          const a1 = 1 / (1 + resonance * c + c * c);
          const a2 = 2 * a1;
          const a3 = a1;
          const b1 = 2 * (1 - c * c) * a1;
          const b2 = (1 - resonance * c + c * c) * a1;
          
          for (let i = 0; i < inputData.length; i++) {
            const x = inputData[i];
            const y = a1 * x + a2 * y1 + a3 * y2 - b1 * y1 - b2 * y2;
            outputData[i] = y;
            y2 = y1;
            y1 = y;
          }
          break;
          
        default:
          // Copy input to output
          for (let i = 0; i < inputData.length; i++) {
            outputData[i] = inputData[i];
          }
      }
    }
    
    return newBuffer;
  },

  // Export audio as WAV
  exportAsWAV(audioBuffer: AudioBuffer): Blob {
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
};

function getAverageVolume(tracks: AudioTrack[]): number {
  if (tracks.length === 0) return 1;
  return tracks.reduce((sum, track) => sum + track.volume, 0) / tracks.length;
}

async function loadAudioBuffer(url: string, audioContext: AudioContext): Promise<AudioBuffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return audioContext.decodeAudioData(arrayBuffer);
}
