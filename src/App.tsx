import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { 
  Folder, 
  Globe, 
  Settings, 
  Terminal, 
  Power,
  Moon,
  RotateCcw,
  Lock,
  LogOut,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Battery,
  BatteryCharging,
  Cpu,
  HardDrive,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Search,
  X,
  Music,
  Image,
  FileText,
  LayoutGrid,
  ShieldCheck,
  Activity
} from 'lucide-react';

import { SettingsWindow } from './components/SettingsWindow';
import { FileManager } from './components/FileManager';
import { ConsoleWindow } from './components/ConsoleWindow';
import { AppLauncher } from './components/AppLauncher';

import type { DesktopSettings, FileEntry, SystemInfo, BatteryInfo, NetworkInfo, AudioInfo } from './types';

type UserProfile = {
  username: string;
  avatar_path: string | null;
};

// ==================== MAIN APP ====================
const App = () => {
  // Scene state
  const [scene, setScene] = useState<'title' | 'login' | 'desktop'>('title');
  const [isBooting, setIsBooting] = useState(false);

  // Settings
  const [settings, setSettings] = useState<DesktopSettings | null>(null);
  const [wallpaperUrl, setWallpaperUrl] = useState('');

  // User
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // System data - REAL from system
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null);
  const [uiVolume, setUiVolume] = useState<number>(50);
  const volumeCommitTimer = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Desktop files (from ~/Desktop)
  const [desktopFiles, setDesktopFiles] = useState<FileEntry[]>([]);

  // UI state
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [showAppLauncher, setShowAppLauncher] = useState(false);
  const [showPowerMenu, setShowPowerMenu] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Sister Network
  const [networkUrl, setNetworkUrl] = useState('https://');

  // Derived values
  const accentColor = settings?.accent_color || '#00A3FF';

  // Styles
  const crystalBase = "backdrop-blur-2xl bg-white/20 border border-white/40 shadow-[0_8px_32px_rgba(0,163,255,0.1)]";
  const blueGradient = "bg-gradient-to-br from-[#00A3FF] to-[#0066FF]";

  // ==================== LOAD SETTINGS ====================
  useEffect(() => {
    invoke<DesktopSettings>('get_settings').then(setSettings).catch(console.error);
  }, []);

  useEffect(() => {
    invoke<UserProfile>('get_user_profile').then(setUserProfile).catch(() => {
      setUserProfile({ username: 'sis', avatar_path: null });
    });
  }, []);

  // ==================== LOAD WALLPAPER ====================
  useEffect(() => {
    if (settings?.wallpaper) {
      if (settings.wallpaper.startsWith('/')) {
        setWallpaperUrl(convertFileSrc(settings.wallpaper));
      } else {
        setWallpaperUrl(settings.wallpaper);
      }
    } else {
      setWallpaperUrl('https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80');
    }
  }, [settings?.wallpaper]);

  // ==================== SYSTEM DATA POLLING ====================
  useEffect(() => {
    if (scene !== 'desktop') return;

    const fetchAll = async () => {
      try {
        const [sys, bat, net, aud] = await Promise.all([
          invoke<SystemInfo>('get_system_info'),
          invoke<BatteryInfo | null>('get_battery_info'),
          invoke<NetworkInfo>('get_network_info'),
          invoke<AudioInfo>('get_audio_info'),
        ]);
        setSystemInfo(sys);
        setBatteryInfo(bat);
        setNetworkInfo(net);
        setAudioInfo(aud);
      } catch (e) {
        console.error('System fetch error:', e);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 2000);
    return () => clearInterval(interval);
  }, [scene]);

  useEffect(() => {
    if (typeof audioInfo?.volume === 'number') {
      setUiVolume(audioInfo.volume);
    }
  }, [audioInfo?.volume]);

  // ==================== TIME ====================
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ==================== DESKTOP FILES (~/Desktop) ====================
  useEffect(() => {
    if (scene !== 'desktop') return;
    
    invoke<FileEntry[]>('get_directory_contents', { path: '~/Desktop' })
      .then(files => setDesktopFiles(files.slice(0, 4)))
      .catch(() => setDesktopFiles([]));
  }, [scene]);

  // ==================== SAVE SETTINGS ====================
  const saveSettings = useCallback(async (newSettings: DesktopSettings) => {
    try {
      await invoke('save_settings', { settings: newSettings });
      setSettings(newSettings);
    } catch (e) {
      console.error('Save settings failed:', e);
    }
  }, []);

  const openModule = useCallback((id: string) => {
    setActiveWindow(id);
    setMenuOpen(false);
    setShowPowerMenu(false);
    setShowAppLauncher(false);
  }, []);

  // ==================== SYSTEM ACTIONS ====================
  const systemAction = async (action: string) => {
    try {
      await invoke('system_action', { action });
    } catch (e) {
      console.error('System action failed:', e);
    }
    setShowPowerMenu(false);
  };

  // ==================== AUDIO CONTROLS ====================
  const setVolume = async (vol: number) => {
    try {
      await invoke('set_volume', { volume: vol });
      const aud = await invoke<AudioInfo>('get_audio_info');
      setAudioInfo(aud);
    } catch (e) {
      console.error('Set volume failed:', e);
    }
  };

  const toggleMute = async () => {
    try {
      await invoke('toggle_mute');
      const aud = await invoke<AudioInfo>('get_audio_info');
      setAudioInfo(aud);
    } catch (e) {
      console.error('Toggle mute failed:', e);
    }
  };

  const mediaControl = async (action: string) => {
    try {
      await invoke('media_control', { action });
      setTimeout(async () => {
        const aud = await invoke<AudioInfo>('get_audio_info');
        setAudioInfo(aud);
      }, 300);
    } catch (e) {
      console.error('Media control failed:', e);
    }
  };

  // ==================== OPEN FILE ====================
  const openFile = async (path: string) => {
    try {
      await invoke('open_file', { path });
    } catch (e) {
      console.error('Open file failed:', e);
    }
  };

  // ==================== FORMATTERS ====================
  const formatTime = (d: Date) => d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' });

  const userAvatarSrc = userProfile?.avatar_path ? convertFileSrc(userProfile.avatar_path) : null;

  // ==================== FILE ICON ====================
  const getFileIcon = (icon: string) => {
    const icons: Record<string, React.ReactNode> = {
      folder: <Folder size={18} className="text-amber-500" />,
      image: <Image size={18} className="text-pink-500" />,
      music: <Music size={18} className="text-purple-500" />,
      'file-text': <FileText size={18} className="text-blue-500" />,
    };
    return icons[icon] || <FileText size={18} className="text-slate-400" />;
  };

  // ==================== TITLE SCENE ====================
  if (scene === 'title') {
    return (
      <div 
        className="w-screen h-screen flex flex-col items-center justify-center bg-[#f4faff] relative overflow-hidden cursor-pointer select-none"
        onClick={() => setScene('login')}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,163,255,0.15),transparent)] animate-pulse" />
        <div className="z-10 text-center animate-in zoom-in duration-1000">
          <h1 className="text-8xl font-thin tracking-[0.3em] mb-4 drop-shadow-sm" style={{ color: accentColor }}>
            SisCrystal
          </h1>
          <p className="text-slate-400 tracking-[0.8em] font-light text-sm uppercase animate-pulse">Touch to Sync</p>
        </div>
        <div className="absolute bottom-10 flex flex-col items-center gap-2 opacity-30">
          <div className="w-[1px] h-12 bg-gradient-to-b from-transparent" style={{ backgroundImage: `linear-gradient(to bottom, transparent, ${accentColor})` }} />
          <span className="text-[10px] font-mono tracking-widest" style={{ color: accentColor }}>SISTER LINK 2025</span>
        </div>
      </div>
    );
  }

  // ==================== LOGIN SCENE ====================
  if (scene === 'login' || isBooting) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-white relative overflow-hidden select-none">
        {isBooting ? (
          <div className="flex flex-col items-center gap-6">
            <div className="w-64 h-[1px] bg-slate-100 relative overflow-hidden">
              <div className="absolute inset-0 animate-loading" style={{ backgroundColor: accentColor }} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-black tracking-[0.5em] uppercase" style={{ color: accentColor }}>
                Linking Sisters
              </span>
              <span className="text-[8px] text-slate-300 font-mono">Synchronizing sister nodes...</span>
            </div>
          </div>
        ) : (
          <div className={`w-[420px] p-16 rounded-[4rem] text-center animate-in fade-in slide-in-from-bottom-10 ${crystalBase}`}>
            <div 
              className="w-24 h-24 rounded-[2.5rem] mx-auto mb-10 flex items-center justify-center shadow-2xl"
              style={{ backgroundColor: accentColor }}
            >
              <ShieldCheck className="text-white" size={48} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter italic mb-10 uppercase">Sister Check</h2>
            <div className="space-y-8">
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full bg-transparent border-b-2 border-blue-100 py-3 text-center text-2xl tracking-[0.6em] focus:outline-none transition-colors mb-4"
                style={{ borderColor: accentColor }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsBooting(true);
                    setTimeout(() => { setScene('desktop'); setIsBooting(false); }, 1500);
                  }
                }}
                autoFocus
              />
              <button 
                onClick={() => {
                  setIsBooting(true);
                  setTimeout(() => { setScene('desktop'); setIsBooting(false); }, 1500);
                }}
                className={`w-full py-5 rounded-2xl text-white font-black tracking-[0.2em] shadow-xl transition-all hover:scale-105 active:scale-95 ${blueGradient}`}
              >
                AUTHORIZE
              </button>
            </div>
          </div>
        )}
        <style>{`
          @keyframes loading { 0% { left: -100%; } 100% { left: 100%; } }
          .animate-loading { animation: loading 2s infinite; }
        `}</style>
      </div>
    );
  }

  // ==================== DESKTOP SCENE ====================
  return (
    <div className="w-screen h-screen flex flex-col relative overflow-hidden font-sans select-none bg-[#F7FBFF]">
      {/* ===== WALLPAPER ===== */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[40s] scale-110"
        style={{ 
          backgroundImage: `url("${wallpaperUrl}")`,
          opacity: settings?.wallpaper_opacity ?? 0.4,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-white/60 via-transparent to-blue-50/30 pointer-events-none" />
      
      {/* Grid decoration */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ 
          backgroundImage: `linear-gradient(${accentColor} 0.5px, transparent 0.5px), linear-gradient(90deg, ${accentColor} 0.5px, transparent 0.5px)`, 
          backgroundSize: '100px 100px' 
        }} 
      />

      {/* ===== HEADER ===== */}
      <header className="h-24 flex items-center justify-between px-12 z-[100] relative">
        {/* Left: Brand & System Status */}
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-[0.3em] leading-none uppercase italic" style={{ color: accentColor }}>
              SisCrystal
            </span>
            <span className="text-2xl font-black text-slate-800 tracking-tighter italic">SisCrystal</span>
          </div>
          <div className="h-10 w-[1px] bg-blue-200/50" />
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-slate-400 uppercase">System Load</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all" 
                  style={{ width: `${systemInfo?.cpu_usage || 0}%`, backgroundColor: accentColor }} 
                />
              </div>
              <span className="text-[10px] font-bold text-slate-600">{systemInfo?.cpu_usage?.toFixed(0) || 0}%</span>
            </div>
          </div>
        </div>

        {/* Center: Sister Control Bar (always visible) */}
        <div className={`h-16 px-5 rounded-[2rem] flex items-center gap-4 ${crystalBase} border-white/60`}
             style={{ backgroundColor: 'rgba(15,23,42,0.65)' }}>
          {/* Modules */}
          <div className="flex items-center gap-2">
            {[
              { id: 'files', label: 'Storage', icon: Folder },
              { id: 'terminal', label: 'Console', icon: Terminal },
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'browser', label: 'Network', icon: Globe },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => openModule(m.id)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors"
                title={m.label}
              >
                <m.icon size={18} className="text-white" />
              </button>
            ))}
          </div>

          <div className="h-8 w-[1px] bg-white/15" />

          {/* Media */}
          <div className="flex items-center gap-2 text-white">
            <button onClick={() => mediaControl('previous')} className="p-2 hover:bg-white/10 rounded-full">
              <SkipBack size={16} />
            </button>
            <button
              onClick={() => mediaControl(audioInfo?.is_playing ? 'pause' : 'play')}
              className="p-2 rounded-full"
              style={{ backgroundColor: accentColor }}
            >
              {audioInfo?.is_playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button onClick={() => mediaControl('next')} className="p-2 hover:bg-white/10 rounded-full">
              <SkipForward size={16} />
            </button>
            <div className="min-w-0 ml-2">
              <div className="text-[11px] font-black truncate max-w-[160px]">
                {audioInfo?.current_track || 'No Track'}
              </div>
              <div className="text-[9px] text-white/60 truncate max-w-[160px]">
                {audioInfo?.current_artist || '—'}
              </div>
            </div>
          </div>

          <div className="h-8 w-[1px] bg-white/15" />

          {/* Volume */}
          <div className="flex items-center gap-2 text-white">
            <button onClick={() => toggleMute()} className="p-2 hover:bg-white/10 rounded-full">
              {audioInfo?.is_muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={uiVolume}
              onChange={(e) => {
                const next = Number(e.target.value);
                setUiVolume(next);
                setAudioInfo((prev) => (prev ? { ...prev, volume: next } : prev));
                if (volumeCommitTimer.current) {
                  window.clearTimeout(volumeCommitTimer.current);
                }
                volumeCommitTimer.current = window.setTimeout(() => {
                  setVolume(next);
                }, 120);
              }}
              className="w-28 h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${accentColor} ${uiVolume}%, rgba(255,255,255,0.2) ${uiVolume}%)`,
              }}
            />
            <span className="text-[10px] font-black text-white/70 w-10 text-right">{uiVolume}%</span>
          </div>

          <div className="h-8 w-[1px] bg-white/15" />

          {/* Status */}
          <div className="flex items-center gap-3 text-white/80">
            {networkInfo?.is_connected ? <Wifi size={16} /> : <WifiOff size={16} className="text-red-300" />}
            {batteryInfo && <span className="text-[11px] font-black">{Math.round(batteryInfo.percentage)}%</span>}
          </div>
        </div>

        {/* Right: Time, Launcher, Menu & User */}
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-3xl font-black italic text-slate-800 leading-none tracking-tighter">{formatTime(currentTime)}</div>
            <div className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase mt-1">{formatDate(currentTime)}</div>
          </div>

          <button
            onClick={() => setShowAppLauncher(true)}
            className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all hover:scale-105 ${crystalBase}`}
            title="Apps"
          >
            <Search size={22} style={{ color: accentColor }} />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 ${blueGradient}`}
              title="Menu"
            >
              <LayoutGrid size={22} className="text-white" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-[140]" onClick={() => setMenuOpen(false)} />
                <div
                  className={`absolute top-16 right-0 w-[380px] p-10 rounded-[3rem] z-[150] border-2 border-white/60 shadow-2xl animate-in slide-in-from-top-10 ${crystalBase}`}
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black tracking-[0.4em] uppercase italic" style={{ color: accentColor }}>
                        SisCrystal Modules
                      </span>
                      <h4 className="text-xl font-black italic tracking-widest text-slate-800 uppercase">Sister Root</h4>
                    </div>
                    <button onClick={() => setMenuOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'settings', label: 'Crystal Settings', icon: Settings, color: 'bg-slate-800' },
                      { id: 'files', label: 'Sister Storage', icon: Folder, color: 'bg-amber-500' },
                      { id: 'terminal', label: 'Sister Console', icon: Terminal, color: 'bg-green-600' },
                      { id: 'browser', label: 'Sister Network', icon: Globe, color: 'bg-blue-500' },
                    ].map(app => (
                      <button
                        key={app.id}
                        onClick={() => openModule(app.id)}
                        className="flex flex-col items-center p-5 rounded-[2rem] bg-white/40 border border-white hover:bg-blue-50 transition-all group shadow-sm"
                      >
                        <div className={`${app.color} text-white p-3 rounded-2xl mb-2 group-hover:scale-110 transition-transform shadow-lg`}>
                          <app.icon size={22} />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{app.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-8 pt-6 border-t border-blue-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {userAvatarSrc && (
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <img src={userAvatarSrc} className="w-full h-full" />
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-slate-400">{userProfile?.username ?? 'sister'}</span>
                    </div>
                    <button
                      onClick={() => systemAction('shutdown')}
                      className="flex items-center gap-2 text-red-400 font-black tracking-widest text-[10px] uppercase hover:text-red-600 transition-colors"
                    >
                      Goodnight <Power size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowPowerMenu(!showPowerMenu)}
            className="w-14 h-14 rounded-full p-1 bg-white border border-blue-100 shadow-xl group cursor-pointer overflow-hidden"
          >
            {userAvatarSrc ? (
              <img 
                src={userAvatarSrc}
                alt="user" 
                className="w-full h-full rounded-full transition-transform group-hover:scale-110" 
              />
            ) : (
              <div className="w-full h-full rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* ===== DOCK (fixed) ===== */}
      {settings && (
        <div
          className={`fixed z-[220] ${
            settings.dock_position === 'left'
              ? 'left-6 top-1/2 -translate-y-1/2'
              : settings.dock_position === 'right'
                ? 'right-6 top-1/2 -translate-y-1/2'
                : 'left-1/2 -translate-x-1/2 bottom-6'
          }`}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className={`${crystalBase} border-white/60 shadow-2xl rounded-[3rem] ${
              settings.dock_position === 'left' || settings.dock_position === 'right'
                ? 'p-3 flex flex-col gap-2'
                : 'px-6 py-3 flex items-center gap-2'
            }`}
            style={{
              transform:
                settings.dock_auto_hide
                  ? settings.dock_position === 'bottom'
                    ? 'translateY(60%)'
                    : settings.dock_position === 'left'
                      ? 'translateX(-60%)'
                      : 'translateX(60%)'
                  : 'none',
              transition: 'transform 220ms ease',
            }}
            onMouseEnter={(e) => {
              if (!settings.dock_auto_hide) return;
              (e.currentTarget as HTMLDivElement).style.transform = 'none';
            }}
            onMouseLeave={(e) => {
              if (!settings.dock_auto_hide) return;
              (e.currentTarget as HTMLDivElement).style.transform =
                settings.dock_position === 'bottom'
                  ? 'translateY(60%)'
                  : settings.dock_position === 'left'
                    ? 'translateX(-60%)'
                    : 'translateX(60%)';
            }}
          >
            {[
              { id: 'files', label: 'Sister Storage', icon: Folder, color: 'text-amber-500' },
              { id: 'browser', label: 'Sister Network', icon: Globe, color: 'text-blue-500' },
              { id: 'terminal', label: 'Sister Console', icon: Terminal, color: 'text-green-500' },
              { id: 'settings', label: 'Crystal Settings', icon: Settings, color: 'text-slate-500' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => openModule(item.id)}
                className={`flex flex-col items-center ${
                  settings.dock_position === 'left' || settings.dock_position === 'right'
                    ? 'px-3 py-2'
                    : 'px-4 py-2'
                } rounded-[1.5rem] hover:bg-white/60 transition-all group`}
                title={item.label}
              >
                <item.icon
                  size={settings.dock_icon_size || 44}
                  className={`${item.color} group-hover:scale-110 transition-transform mb-1`}
                />
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 group-hover:text-slate-700">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== POWER MENU ===== */}
      {showPowerMenu && (
        <>
          <div className="fixed inset-0 z-[150]" onClick={() => setShowPowerMenu(false)} />
          <div 
            className={`absolute top-28 right-12 w-56 p-4 rounded-[2rem] z-[160] ${crystalBase} border-white/60 shadow-2xl animate-in slide-in-from-top-5`}
          >
            <div className="text-[10px] font-black tracking-[0.3em] uppercase mb-4" style={{ color: accentColor }}>
              Sister Power
            </div>
            {[
              { icon: Lock, label: 'Lock', action: 'lock' },
              { icon: Moon, label: 'Sleep', action: 'suspend' },
              { icon: RotateCcw, label: 'Restart', action: 'reboot' },
              { icon: LogOut, label: 'Logout', action: 'logout' },
              { icon: Power, label: 'Shutdown', action: 'shutdown', danger: true },
            ].map(item => (
              <button
                key={item.action}
                onClick={() => systemAction(item.action)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:scale-105 ${
                  item.danger ? 'hover:bg-red-500/20 text-red-500' : 'hover:bg-white/40 text-slate-700'
                }`}
              >
                <item.icon size={16} />
                <span className="text-sm font-bold">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ===== MAIN AREA ===== */}
      <main className="flex-1 flex items-center justify-center relative">
        {/* Left: Decorative Text */}
        <div className="absolute left-16 top-1/2 -translate-y-1/2 flex flex-col gap-16 pointer-events-none">
          <div className="flex flex-col">
            <div className="h-1 w-12 mb-4" style={{ backgroundColor: accentColor }} />
            <h3 className="text-[11px] font-black tracking-[0.6em] mb-3 uppercase italic opacity-60" style={{ color: accentColor }}>
              Sister Ops
            </h3>
            <div className="text-5xl font-thin text-slate-800 tracking-tighter italic">Desktop_Crystal</div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-[11px] font-black text-slate-400 tracking-[0.6em] mb-3 uppercase italic opacity-60">Sister Phase</h3>
            <div className="text-5xl font-thin text-slate-300 tracking-tighter italic">Phase_04: Sisters</div>
          </div>
        </div>

        {/* Right: Floating Widgets */}
        <div className="absolute right-16 top-1/2 -translate-y-1/2 w-80 space-y-6 animate-in slide-in-from-right duration-1000">
          {/* System Status Widget */}
          <div className={`p-6 rounded-[2.5rem] ${crystalBase} border-white/60`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3" style={{ color: accentColor }}>
                <Activity size={16} />
                <span className="font-black italic tracking-widest text-xs">SYSTEM</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white/30 rounded-2xl">
                <Cpu size={20} className="mx-auto mb-1" style={{ color: accentColor }} />
                <div className="text-lg font-black text-slate-800">{systemInfo?.cpu_usage?.toFixed(0) || 0}%</div>
                <div className="text-[8px] text-slate-400 uppercase font-bold">CPU</div>
              </div>
              <div className="text-center p-3 bg-white/30 rounded-2xl">
                <HardDrive size={20} className="mx-auto mb-1 text-purple-500" />
                <div className="text-lg font-black text-slate-800">{systemInfo?.memory_percent?.toFixed(0) || 0}%</div>
                <div className="text-[8px] text-slate-400 uppercase font-bold">RAM</div>
              </div>
              <div className="text-center p-3 bg-white/30 rounded-2xl">
                {batteryInfo?.is_charging ? 
                  <BatteryCharging size={20} className="mx-auto mb-1 text-green-500" /> :
                  <Battery size={20} className="mx-auto mb-1 text-yellow-500" />
                }
                <div className="text-lg font-black text-slate-800">{batteryInfo ? Math.round(batteryInfo.percentage) : '--'}%</div>
                <div className="text-[8px] text-slate-400 uppercase font-bold">BAT</div>
              </div>
              <div className="text-center p-3 bg-white/30 rounded-2xl">
                {networkInfo?.is_connected ? 
                  <Wifi size={20} className="mx-auto mb-1 text-cyan-500" /> :
                  <WifiOff size={20} className="mx-auto mb-1 text-red-500" />
                }
                <div className="text-sm font-black text-slate-800 truncate">{networkInfo?.ssid || 'Off'}</div>
                <div className="text-[8px] text-slate-400 uppercase font-bold">NET</div>
              </div>
            </div>
          </div>

          {/* Desktop Files Widget */}
          {desktopFiles.length > 0 && (
            <div className={`p-6 rounded-[2.5rem] ${crystalBase} border-white/60`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3" style={{ color: accentColor }}>
                  <Folder size={16} />
                  <span className="font-black italic tracking-widest text-xs">DESKTOP</span>
                </div>
              </div>
              <div className="space-y-2">
                {desktopFiles.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => !f.is_dir && openFile(f.path)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/40 transition-all group"
                  >
                    {getFileIcon(f.icon)}
                    <span className="text-xs font-bold text-slate-700 truncate group-hover:text-slate-900">
                      {f.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: Large decorative element */}
        <div className="relative flex items-center justify-center opacity-10 scale-150 pointer-events-none">
          <div 
            className="absolute w-[600px] h-[600px] border-[0.5px] rounded-full animate-[spin_120s_linear_infinite]" 
            style={{ borderColor: accentColor }}
          />
          <div 
            className="absolute w-[500px] h-[500px] border-[0.5px] rounded-full animate-[spin_80s_linear_infinite_reverse] opacity-50" 
            style={{ borderColor: accentColor }}
          />
          <div className="text-[240px] font-black tracking-tighter rotate-[-15deg]" style={{ color: accentColor }}>
            SisCrystal
          </div>
        </div>
      </main>

      {/* ===== WINDOWS ===== */}
      {activeWindow && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-16 animate-in zoom-in duration-500">
          <div className="absolute inset-0 bg-white/60 backdrop-blur-xl" onClick={() => setActiveWindow(null)} />
          <div className={`w-full max-w-6xl h-full rounded-[3rem] overflow-hidden flex flex-col shadow-[0_64px_128px_rgba(0,163,255,0.15)] border-2 border-white/80 ${crystalBase}`}>
            {/* Window Header */}
            <div className="h-20 flex items-center justify-between px-12 border-b border-blue-50">
              <div className="flex items-center gap-6">
                <div className="p-3 bg-blue-50 rounded-2xl shadow-inner" style={{ color: accentColor }}>
                  {activeWindow === 'files' && <Folder size={24} />}
                  {activeWindow === 'terminal' && <Terminal size={24} />}
                  {activeWindow === 'settings' && <Settings size={24} />}
                  {activeWindow === 'browser' && <Globe size={24} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-60 italic" style={{ color: accentColor }}>
                    SisCrystal Module
                  </span>
                  <h2 className="text-2xl font-black italic tracking-widest text-slate-800 uppercase">
                    {activeWindow === 'files' ? 'Sister Storage' : 
                    activeWindow === 'terminal' ? 'Sister Console' :
                    activeWindow === 'settings' ? 'Crystal Settings' : 'Sister Network'}
                  </h2>
                </div>
              </div>
              <button 
                onClick={() => setActiveWindow(null)}
                className="w-14 h-14 rounded-[1.5rem] flex items-center justify-center bg-slate-50 hover:bg-red-500 hover:text-white transition-all text-slate-300"
              >
                <X size={28} />
              </button>
            </div>
            {/* Window Content */}
            <div className="flex-1 overflow-hidden bg-white/50">
              {activeWindow === 'settings' && settings && (
                <SettingsWindow
                  settings={settings}
                  onSave={saveSettings}
                  accentColor={accentColor}
                />
              )}
              {activeWindow === 'files' && (
                <FileManager accentColor={accentColor} />
              )}
              {activeWindow === 'terminal' && (
                <ConsoleWindow accentColor={accentColor} />
              )}
              {activeWindow === 'browser' && (
                <div className="h-full flex flex-col items-center justify-center px-16">
                  <Globe size={64} className="mb-6 opacity-20" style={{ color: accentColor }} />
                  <p className="text-lg font-black italic text-slate-800 mb-2">Sister Network</p>
                  <p className="text-sm text-slate-400 mb-6">Type a URL and open it via system browser</p>
                  <div className="w-full max-w-2xl flex items-center gap-3">
                    <input
                      value={networkUrl}
                      onChange={(e) => setNetworkUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 h-12 px-4 rounded-2xl bg-white/70 border border-white/80 shadow-inner focus:outline-none"
                    />
                    <button
                      onClick={() => openFile(networkUrl)}
                      className={`h-12 px-6 rounded-2xl text-white font-black tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 ${blueGradient}`}
                    >
                      OPEN
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== APP LAUNCHER ===== */}
      {showAppLauncher && (
        <AppLauncher accentColor={accentColor} onClose={() => setShowAppLauncher(false)} />
      )}

      {/* ===== ANIMATIONS ===== */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default App;
