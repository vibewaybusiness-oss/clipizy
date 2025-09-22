export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const generateWaveformData = async (file: File): Promise<number[]> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);
  const samples = 400; // Number of bars we want to show
  const blockSize = Math.floor(channelData.length / samples);
  const waveform: number[] = [];
  
  for (let i = 0; i < samples; i++) {
    const start = blockSize * i;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j]);
    }
    waveform.push(sum / blockSize);
  }
  
  const max = Math.max(...waveform);
  return waveform.map(v => v / max);
};

export const drawWaveform = (
  canvas: HTMLCanvasElement,
  waveformData: number[],
  currentTime: number,
  duration: number,
  scenes: any[] = []
) => {
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

  const barWidth = width / waveformData.length;
  const barGap = 1;
  const centerY = height / 2;

  const style = getComputedStyle(document.documentElement);
  const waveColor = `hsl(${style.getPropertyValue('--muted-foreground').trim()})`;
  const progressColor = `hsl(${style.getPropertyValue('--primary').trim()})`;
  const backgroundColor = `hsl(${style.getPropertyValue('--secondary').trim()})`;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const playheadX = (currentTime / duration) * width;

  for (let i = 0; i < waveformData.length; i++) {
    const x = i * barWidth;
    const barHeight = waveformData[i] * height;

    ctx.fillStyle = x < playheadX ? progressColor : waveColor;
    ctx.fillRect(x, centerY - barHeight / 2, barWidth - barGap, barHeight);
  }
};
