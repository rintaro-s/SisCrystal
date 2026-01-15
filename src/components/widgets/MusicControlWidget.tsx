import { useState, useEffect, useMemo } from 'react';
import { Music, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Widget } from '../Widget';
import { invoke } from '@tauri-apps/api/core';
import type { AudioInfo } from '../../types';

interface MusicControlWidgetProps {
  id: string;
  accentColor: string;
  defaultPosition?: { x: number; y: number };
  onClose?: () => void;
  audioInfo?: AudioInfo | null;
}

export function MusicControlWidget({ id, accentColor, defaultPosition, onClose, audioInfo }: MusicControlWidgetProps) {
  const isPlaying = useMemo(() => Boolean(audioInfo?.is_playing), [audioInfo?.is_playing]);
  const [audioData, setAudioData] = useState<number[]>(new Array(20).fill(0));

  // Simulate audio waveform
  useEffect(() => {
    if (!isPlaying) {
      setAudioData(new Array(20).fill(0));
      return;
    }

    const interval = setInterval(() => {
      setAudioData(prev => 
        prev.map(() => Math.random() * 100)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlayPause = async () => {
    try {
      await invoke('media_control', { action: isPlaying ? 'pause' : 'play' });
    } catch (e) {
      console.error('Media control failed:', e);
    }
  };

  const handlePrevious = async () => {
    try {
      await invoke('media_control', { action: 'previous' });
    } catch (e) {
      console.error('Media control failed:', e);
    }
  };

  const handleNext = async () => {
    try {
      await invoke('media_control', { action: 'next' });
    } catch (e) {
      console.error('Media control failed:', e);
    }
  };

  return (
    <Widget
      id={id}
      title="Music"
      icon={<Music size={14} />}
      accentColor={accentColor}
      defaultPosition={defaultPosition}
      onClose={onClose}
    >
      <div className="min-w-[280px]">
        {/* Waveform */}
        <div className="h-16 mb-4 flex items-end justify-center gap-1">
          {audioData.map((height, i) => (
            <div
              key={i}
              className="w-1 rounded-full transition-all duration-100"
              style={{
                height: `${isPlaying ? height : 10}%`,
                backgroundColor: accentColor,
                opacity: 0.7
              }}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handlePrevious}
            className="w-10 h-10 rounded-full bg-white/40 hover:bg-white/60 transition-all flex items-center justify-center"
          >
            <SkipBack size={16} className="text-slate-700" />
          </button>
          
          <button
            onClick={handlePlayPause}
            className="w-12 h-12 rounded-full text-white shadow-lg hover:scale-105 transition-all flex items-center justify-center"
            style={{ backgroundColor: accentColor }}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          
          <button
            onClick={handleNext}
            className="w-10 h-10 rounded-full bg-white/40 hover:bg-white/60 transition-all flex items-center justify-center"
          >
            <SkipForward size={16} className="text-slate-700" />
          </button>
        </div>

        {/* Track Info */}
        <div className="mt-4 text-center">
          <div className="text-xs font-bold text-slate-700 mb-1">
            {isPlaying ? 'Now Playing' : 'Paused'}
          </div>
          <div className="text-[10px] text-slate-500 truncate">
            {audioInfo?.current_track || 'No Track'}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {audioInfo?.current_artist || '—'}
          </div>
        </div>
      </div>
    </Widget>
  );
}
