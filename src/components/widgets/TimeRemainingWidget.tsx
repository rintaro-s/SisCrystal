import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { Widget } from '../Widget';

interface TimeRemainingWidgetProps {
  id: string;
  accentColor: string;
  defaultPosition?: { x: number; y: number };
  onClose?: () => void;
}

export function TimeRemainingWidget({ id, accentColor, defaultPosition, onClose }: TimeRemainingWidgetProps) {
  const [remaining, setRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateRemaining = () => {
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const diff = endOfDay.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setRemaining({ hours, minutes, seconds });
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Widget
      id={id}
      title="Today's Remaining"
      icon={<Timer size={14} />}
      accentColor={accentColor}
      defaultPosition={defaultPosition}
      onClose={onClose}
    >
      <div className="text-center">
        <div className="text-xs text-slate-500 mb-2">今日の残り時間</div>
        <div className="flex gap-1 justify-center">
          <div className="bg-white/40 px-3 py-2 rounded-lg">
            <div className="text-2xl font-black text-slate-800">{remaining.hours}</div>
            <div className="text-[8px] text-slate-400">時間</div>
          </div>
          <div className="bg-white/40 px-3 py-2 rounded-lg">
            <div className="text-2xl font-black text-slate-800">{remaining.minutes}</div>
            <div className="text-[8px] text-slate-400">分</div>
          </div>
          <div className="bg-white/40 px-3 py-2 rounded-lg">
            <div className="text-2xl font-black text-slate-800">{remaining.seconds}</div>
            <div className="text-[8px] text-slate-400">秒</div>
          </div>
        </div>
      </div>
    </Widget>
  );
}
