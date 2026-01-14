import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Widget } from '../Widget';

interface CalendarWidgetProps {
  id: string;
  accentColor: string;
  defaultPosition?: { x: number; y: number };
  onClose?: () => void;
}

export function CalendarWidget({ id, accentColor, defaultPosition, onClose }: CalendarWidgetProps) {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const year = date.getFullYear();
  const month = date.getMonth();
  const today = date.getDate();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === today;
    days.push(
      <div
        key={day}
        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold ${
          isToday 
            ? 'text-white' 
            : 'text-slate-700'
        }`}
        style={isToday ? { backgroundColor: accentColor } : {}}
      >
        {day}
      </div>
    );
  }

  return (
    <Widget
      id={id}
      title="Calendar"
      icon={<CalendarIcon size={14} />}
      accentColor={accentColor}
      defaultPosition={defaultPosition}
      onClose={onClose}
    >
      <div>
        <div className="text-center mb-3">
          <div className="text-sm font-black text-slate-800">
            {date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
            <div key={i} className="w-8 h-8 flex items-center justify-center text-[10px] font-bold text-slate-400">
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    </Widget>
  );
}
