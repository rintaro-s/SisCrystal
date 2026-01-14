import { useState, useEffect } from 'react';
import { Train, Clock } from 'lucide-react';
import { Widget } from '../Widget';
import { invoke } from '@tauri-apps/api/core';

interface TrainSchedule {
  time: string;
  destination: string;
  platform?: string;
}

interface TrainTimerWidgetProps {
  id: string;
  accentColor: string;
  defaultPosition?: { x: number; y: number };
  onClose?: () => void;
}

export function TrainTimerWidget({ id, accentColor, defaultPosition, onClose }: TrainTimerWidgetProps) {
  const [schedules, setSchedules] = useState<TrainSchedule[]>([]);
  const [nextTrain, setNextTrain] = useState<{ schedule: TrainSchedule; minutesUntil: number } | null>(null);

  useEffect(() => {
    // Load train schedule from CSV file
    const loadSchedule = async () => {
      try {
        const csvPath = '~/train_schedule.csv';
        const content = await invoke<string>('read_file', { path: csvPath });
        const lines = content.trim().split('\n').slice(1); // Skip header
        
        const parsed: TrainSchedule[] = lines.map(line => {
          const [time, destination, platform] = line.split(',');
          return { time: time.trim(), destination: destination.trim(), platform: platform?.trim() };
        });
        
        setSchedules(parsed);
      } catch (e) {
        console.error('Failed to load train schedule:', e);
        // Use default schedule
        setSchedules([
          { time: '08:30', destination: '東京', platform: '1' },
          { time: '09:00', destination: '新宿', platform: '2' },
          { time: '09:30', destination: '池袋', platform: '1' },
        ]);
      }
    };

    loadSchedule();
  }, []);

  useEffect(() => {
    const updateNextTrain = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const schedule of schedules) {
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const trainMinutes = hours * 60 + minutes;

        if (trainMinutes > currentMinutes) {
          const minutesUntil = trainMinutes - currentMinutes;
          setNextTrain({ schedule, minutesUntil });
          return;
        }
      }

      setNextTrain(null);
    };

    updateNextTrain();
    const timer = setInterval(updateNextTrain, 30000); // Update every 30 seconds
    return () => clearInterval(timer);
  }, [schedules]);

  return (
    <Widget
      id={id}
      title="Train Timer"
      icon={<Train size={14} />}
      accentColor={accentColor}
      defaultPosition={defaultPosition}
      onClose={onClose}
    >
      <div className="min-w-[200px]">
        {nextTrain ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-slate-500" />
              <div className="text-xs text-slate-500">次の電車</div>
            </div>
            <div className="bg-white/40 p-3 rounded-xl">
              <div className="flex items-baseline gap-2 mb-1">
                <div className="text-2xl font-black text-slate-800">{nextTrain.schedule.time}</div>
                {nextTrain.schedule.platform && (
                  <div className="text-xs text-slate-400">番線 {nextTrain.schedule.platform}</div>
                )}
              </div>
              <div className="text-sm font-bold text-slate-700 mb-2">{nextTrain.schedule.destination}</div>
              <div className="text-xs font-black" style={{ color: accentColor }}>
                あと {nextTrain.minutesUntil} 分
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 py-4">
            <Train size={32} className="mx-auto mb-2 opacity-30" />
            <div className="text-xs">本日の運行終了</div>
          </div>
        )}
        
        {schedules.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="text-[10px] text-slate-400 mb-2">今日の時刻表</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {schedules.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-mono">{s.time}</span>
                  <span className="text-slate-500">{s.destination}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Widget>
  );
}
