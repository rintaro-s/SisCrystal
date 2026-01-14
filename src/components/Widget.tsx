import { ReactNode, useState, useRef, useEffect } from 'react';

interface WidgetProps {
  id: string;
  title: string;
  icon?: ReactNode;
  accentColor: string;
  children: ReactNode;
  defaultPosition?: { x: number; y: number };
  onClose?: () => void;
}

export function Widget({ 
  title, 
  icon, 
  accentColor, 
  children, 
  defaultPosition = { x: 0, y: 0 },
  onClose 
}: WidgetProps) {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.widget-handle')) {
      setIsDragging(true);
      const rect = widgetRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      e.preventDefault();
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div 
      ref={widgetRef}
      className="fixed backdrop-blur-2xl bg-white/20 border border-white/40 shadow-[0_8px_32px_rgba(0,163,255,0.1)] rounded-3xl overflow-hidden z-[150]"
      style={{ 
        minWidth: '200px',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Widget Header */}
      <div 
        className="widget-handle cursor-grab active:cursor-grabbing flex items-center justify-between px-4 py-2 border-b border-white/20"
        style={{ 
          background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)`,
        }}
      >
        <div className="flex items-center gap-2">
          {icon && <div style={{ color: accentColor }}>{icon}</div>}
          <span className="text-xs font-black tracking-wider uppercase" style={{ color: accentColor }}>
            {title}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-lg hover:bg-red-500/20 hover:text-red-500 transition-all text-slate-400 flex items-center justify-center"
          >
            ×
          </button>
        )}
      </div>
      
      {/* Widget Content */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
