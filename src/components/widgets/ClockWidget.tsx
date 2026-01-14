import { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';
import { Widget } from '../Widget';

interface ClockWidgetProps {
  id: string;
  accentColor: string;
  defaultPosition?: { x: number; y: number };
  onClose?: () => void;
}

export function ClockWidget({ id, accentColor, defaultPosition, onClose }: ClockWidgetProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Widget
      id={id}
      title="Clock"
      icon={<ClockIcon size={14} />}
      accentColor={accentColor}
      defaultPosition={defaultPosition}
      onClose={onClose}
    >
      <div className="text-center">
        <div className="text-3xl font-black text-slate-800 mb-1">
          {time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="text-xs text-slate-400">
          {time.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
        </div>
      </div>
    </Widget>
  );
}
