import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface WindowWrapperProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  accentColor: string;
  onClose?: () => void;
  children: ReactNode;
}

export function WindowWrapper({ 
  title, 
  subtitle, 
  icon, 
  accentColor, 
  onClose, 
  children 
}: WindowWrapperProps) {
  return (
    <div className="w-full max-w-5xl h-[80vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl border border-white/80 backdrop-blur-2xl bg-white/30">
      {/* Header */}
      <div className="h-20 flex items-center justify-between px-10 border-b border-white/40">
        <div className="flex items-center gap-4">
          <div 
            className="p-3 rounded-2xl text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
          >
            {icon}
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black tracking-[0.3em] uppercase opacity-60 italic" style={{ color: accentColor }}>
              {subtitle}
            </span>
            <h2 className="text-2xl font-black italic tracking-widest text-slate-800 uppercase">{title}</h2>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50/60 hover:bg-red-500 hover:text-white transition-all text-slate-400"
            title="Close"
          >
            <X size={22} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
