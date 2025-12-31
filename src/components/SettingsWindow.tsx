import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { 
  Image, 
  Palette, 
  Layout,
  Check,
  RefreshCw
} from 'lucide-react';
import type { DesktopSettings } from '../types';

interface SettingsWindowProps {
  settings: DesktopSettings;
  onSave: (settings: DesktopSettings) => void;
  accentColor: string;
}

type Tab = 'wallpaper' | 'theme' | 'dock';

export function SettingsWindow({ settings, onSave, accentColor }: SettingsWindowProps) {
  const [tab, setTab] = useState<Tab>('wallpaper');
  const [local, setLocal] = useState(settings);
  const [wallpapers, setWallpapers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const isDark = local.theme === 'dark' || local.theme === 'noir' || local.theme === 'midnight';

  useEffect(() => {
    invoke<string[]>('get_wallpapers')
      .then(setWallpapers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof DesktopSettings>(key: K, value: DesktopSettings[K]) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onSave(next);
  };

  const setWallpaper = async (path: string) => {
    try {
      await invoke('set_wallpaper', { path });
      update('wallpaper', path);
    } catch (e) {
      console.error('set_wallpaper failed:', e);
    }
  };

  const MAX_WALLPAPERS = 40;

  const themes = [
    { id: 'crystal', label: 'Crystal', desc: 'Light & clean', colors: ['#fff', '#f1f5f9'] },
    { id: 'dark', label: 'Dark', desc: 'Dark mode', colors: ['#1e1e1e', '#0a0a0a'] },
    { id: 'noir', label: 'Noir', desc: 'Pure black', colors: ['#000', '#111'] },
    { id: 'midnight', label: 'Midnight', desc: 'Deep blue', colors: ['#0f172a', '#020617'] },
  ];

  const accents = [
    { name: 'SCHALE', value: '#00A3FF' },
    { name: 'Trinity', value: '#6366F1' },
    { name: 'Gehenna', value: '#EF4444' },
    { name: 'Millennium', value: '#10B981' },
    { name: 'Abydos', value: '#F59E0B' },
    { name: 'Hyakkiyako', value: '#EC4899' },
  ];

  const textColor = isDark ? '#fff' : '#333';
  const subTextColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const bgCard = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  return (
    <div className="flex h-full" style={{ color: textColor }}>
      {/* Sidebar */}
      <div 
        className="w-48 flex-shrink-0 p-4 border-r"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
      >
        <div className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: subTextColor }}>
          Settings
        </div>
        {[
          { id: 'wallpaper' as Tab, icon: Image, label: 'Wallpaper' },
          { id: 'theme' as Tab, icon: Palette, label: 'Theme' },
          { id: 'dock' as Tab, icon: Layout, label: 'Dock' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors"
            style={{
              backgroundColor: tab === t.id ? `${accentColor}20` : 'transparent',
              color: tab === t.id ? accentColor : textColor,
            }}
          >
            <t.icon size={16} />
            <span className="text-sm font-medium">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* WALLPAPER TAB */}
        {tab === 'wallpaper' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Wallpaper</h2>

            {/* Opacity */}
            <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: bgCard }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium">Opacity</div>
                  <div className="text-xs" style={{ color: subTextColor }}>
                    Wallpaper visibility on the desktop
                  </div>
                </div>
                <span className="text-sm" style={{ color: subTextColor }}>
                  {Math.round(((local.wallpaper_opacity ?? 0.4) as number) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(((local.wallpaper_opacity ?? 0.4) as number) * 100)}
                onChange={(e) => update('wallpaper_opacity', Number(e.target.value) / 100)}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${accentColor} ${Math.round(((local.wallpaper_opacity ?? 0.4) as number) * 100)}%, rgba(128,128,128,0.3) ${Math.round(((local.wallpaper_opacity ?? 0.4) as number) * 100)}%)`,
                }}
              />
            </div>
            
            {/* Current */}
            {local.wallpaper && (
              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: subTextColor }}>
                  Current
                </div>
                <div 
                  className="w-full h-32 rounded-xl bg-cover bg-center border-2"
                  style={{ 
                    backgroundImage: `url("${local.wallpaper.startsWith('/') ? convertFileSrc(local.wallpaper) : local.wallpaper}")`,
                    borderColor: accentColor
                  }}
                />
              </div>
            )}

            {/* Gallery */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: subTextColor }}>
                Available ({wallpapers.length})
              </div>
              <button
                onClick={() => {
                  setLoading(true);
                  invoke<string[]>('get_wallpapers')
                    .then(setWallpapers)
                    .catch(console.error)
                    .finally(() => setLoading(false));
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-10 text-sm" style={{ color: subTextColor }}>
                Loading...
              </div>
            ) : wallpapers.length === 0 ? (
              <div className="text-center py-10 text-sm" style={{ color: subTextColor }}>
                No wallpapers found in ~/Pictures/wallpaper
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {wallpapers.slice(0, MAX_WALLPAPERS).map((w, i) => (
                  <button
                    key={i}
                    onClick={() => setWallpaper(w)}
                    className="relative aspect-video rounded-lg overflow-hidden group transition-transform hover:scale-105"
                    style={{
                      boxShadow: local.wallpaper === w ? `0 0 0 2px ${accentColor}` : 'none'
                    }}
                  >
                    <img
                      src={convertFileSrc(w)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {local.wallpaper === w && (
                      <div 
                        className="absolute inset-0 flex items-center justify-center bg-black/40"
                      >
                        <Check size={20} className="text-white" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60 text-[8px] truncate text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {w.split('/').pop()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* THEME TAB */}
        {tab === 'theme' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Theme</h2>
            
            {/* Theme Selector */}
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: subTextColor }}>
              Color Scheme
            </div>
            <div className="grid grid-cols-4 gap-3 mb-8">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => update('theme', t.id)}
                  className="p-3 rounded-xl transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: bgCard,
                    boxShadow: local.theme === t.id ? `0 0 0 2px ${accentColor}` : 'none'
                  }}
                >
                  <div className="flex gap-1 mb-2">
                    <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: t.colors[0] }} />
                    <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: t.colors[1] }} />
                  </div>
                  <div className="text-sm font-bold">{t.label}</div>
                  <div className="text-[10px]" style={{ color: subTextColor }}>{t.desc}</div>
                </button>
              ))}
            </div>

            {/* Accent Color */}
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: subTextColor }}>
              Accent Color
            </div>
            <div className="flex flex-wrap gap-3">
              {accents.map(a => (
                <button
                  key={a.value}
                  onClick={() => update('accent_color', a.value)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: bgCard,
                    boxShadow: local.accent_color === a.value ? `0 0 0 2px ${a.value}` : 'none'
                  }}
                >
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: a.value }}
                  >
                    {local.accent_color === a.value && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm">{a.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DOCK TAB */}
        {tab === 'dock' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Dock</h2>

            {/* Position */}
            <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: subTextColor }}>
              Position
            </div>
            <div className="flex gap-3 mb-8">
              {[
                { id: 'bottom', label: 'Bottom' },
                { id: 'left', label: 'Left' },
                { id: 'right', label: 'Right' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => update('dock_position', p.id as 'bottom' | 'left' | 'right')}
                  className="px-4 py-2 rounded-xl text-sm transition-all"
                  style={{
                    backgroundColor: local.dock_position === p.id ? accentColor : bgCard,
                    color: local.dock_position === p.id ? '#fff' : textColor,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Auto-hide */}
            <div className="flex items-center justify-between p-4 rounded-xl mb-4" style={{ backgroundColor: bgCard }}>
              <div>
                <div className="font-medium">Auto-hide Dock</div>
                <div className="text-xs" style={{ color: subTextColor }}>
                  Hide dock until cursor reaches edge
                </div>
              </div>
              <button
                onClick={() => update('dock_auto_hide', !local.dock_auto_hide)}
                className="w-12 h-6 rounded-full p-1 transition-colors"
                style={{ backgroundColor: local.dock_auto_hide ? accentColor : 'rgba(128,128,128,0.3)' }}
              >
                <div 
                  className="w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: local.dock_auto_hide ? 'translateX(24px)' : 'translateX(0)' }}
                />
              </button>
            </div>

            {/* Icon Size */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: bgCard }}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Icon Size</div>
                <span className="text-sm" style={{ color: subTextColor }}>{local.dock_icon_size || 44}px</span>
              </div>
              <input
                type="range"
                min="32"
                max="64"
                value={local.dock_icon_size || 44}
                onChange={(e) => update('dock_icon_size', Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ 
                  background: `linear-gradient(to right, ${accentColor} ${((local.dock_icon_size || 44) - 32) / 32 * 100}%, rgba(128,128,128,0.3) ${((local.dock_icon_size || 44) - 32) / 32 * 100}%)`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
