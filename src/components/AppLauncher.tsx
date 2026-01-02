import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Search, Grid, List, RefreshCw, Star } from 'lucide-react';
import type { DesktopApp, DesktopSettings } from '../types';

interface AppLauncherProps {
  accentColor: string;
  settings: DesktopSettings;
  onUpdateSettings: (settings: DesktopSettings) => void;
  onClose: () => void;
}

const FAVORITES_CATEGORY = '__favorites__';

export function AppLauncher({ accentColor, settings, onUpdateSettings, onClose }: AppLauncherProps) {
  const theme = settings?.theme || 'crystal';
  const isDarkTheme = theme === 'dark' || theme === 'noir' || theme === 'midnight';

  const [apps, setApps] = useState<DesktopApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const installedApps = await invoke<DesktopApp[]>('get_installed_apps');
      setApps(installedApps);
    } catch (e) {
      console.error('Failed to load apps:', e);
    } finally {
      setLoading(false);
    }
  };

  const launchApp = async (exec: string) => {
    try {
      await invoke('launch_app', { exec });
      onClose();
    } catch (e) {
      console.error('Failed to launch app:', e);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    apps.forEach(app => {
      app.categories.forEach(cat => {
        if (!['GNOME', 'GTK', 'Qt', 'KDE'].includes(cat)) {
          cats.add(cat);
        }
      });
    });
    return Array.from(cats).sort();
  }, [apps]);

  const favoriteSet = useMemo(() => new Set(settings.favorite_apps || []), [settings.favorite_apps]);

  const filteredApps = useMemo(() => {
    let base = apps.filter(app => {
      const matchesSearch = !searchQuery || 
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !selectedCategory ||
        (selectedCategory === FAVORITES_CATEGORY
          ? favoriteSet.has(app.id)
          : app.categories.includes(selectedCategory));
      
      return matchesSearch && matchesCategory;
    });

    // Sort favorites to the top when not in Favorites-only view.
    if (selectedCategory !== FAVORITES_CATEGORY) {
      base = base.sort((a, b) => {
        const af = favoriteSet.has(a.id) ? 1 : 0;
        const bf = favoriteSet.has(b.id) ? 1 : 0;
        if (af !== bf) return bf - af;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    }

    return base;
  }, [apps, searchQuery, selectedCategory, favoriteSet]);

  const toggleFavorite = (appId: string) => {
    const current = settings.favorite_apps || [];
    const next = current.includes(appId)
      ? current.filter(id => id !== appId)
      : [...current, appId];
    onUpdateSettings({ ...settings, favorite_apps: next });
  };

  const getAppIcon = (app: DesktopApp) => {
    // Try to use system icon, fallback to first letter
    if (app.icon) {
      // Check if it's a full path
      if (app.icon.startsWith('/')) {
        return (
          <img 
            src={convertFileSrc(app.icon)} 
            alt={app.name}
            className="w-12 h-12 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        );
      }
    }
    
    // Fallback to letter icon
    return (
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl"
        style={{ backgroundColor: accentColor }}
      >
        {app.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-[300] flex items-center justify-center p-16" onClick={onClose}>
      <div 
        className={`w-full max-w-5xl h-[80vh] backdrop-blur-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col ${
          isDarkTheme
            ? theme === 'noir'
              ? 'bg-black/70 border border-white/10'
              : theme === 'midnight'
                ? 'bg-slate-950/70 border border-white/10'
                : 'bg-slate-950/60 border border-white/10'
            : 'bg-white/80'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b ${isDarkTheme ? 'border-white/10' : 'border-slate-200/50'}`}>
          <div className="flex items-center gap-4 mb-4">
            <h2 className={`text-2xl font-black tracking-tight ${isDarkTheme ? 'text-slate-100' : 'text-slate-800'}`}>Applications</h2>
            <button 
              onClick={loadApps}
              className={`p-2 rounded-lg transition-colors ${isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-white/50'}`}
            >
              <RefreshCw size={18} className={`${isDarkTheme ? 'text-slate-300' : 'text-slate-400'} ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex-1" />
            <div className={`flex rounded-lg p-1 ${isDarkTheme ? 'bg-white/10' : 'bg-slate-100'}`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? (isDarkTheme ? 'bg-white/10' : 'bg-white shadow-sm') : ''}`}
              >
                <Grid size={18} className={isDarkTheme ? 'text-slate-200' : 'text-slate-600'} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? (isDarkTheme ? 'bg-white/10' : 'bg-white shadow-sm') : ''}`}
              >
                <List size={18} className={isDarkTheme ? 'text-slate-200' : 'text-slate-600'} />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkTheme ? 'text-slate-300' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                isDarkTheme
                  ? 'bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-400'
                  : 'bg-white border border-slate-200 text-slate-800'
              }`}
              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
              autoFocus
            />
          </div>
        </div>

        {/* Categories */}
        <div className={`flex gap-2 px-6 py-3 overflow-x-auto border-b ${isDarkTheme ? 'border-white/10' : 'border-slate-200/50'}`}>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              !selectedCategory ? 'text-white' : isDarkTheme ? 'text-slate-200 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
            }`}
            style={!selectedCategory ? { backgroundColor: accentColor } : {}}
          >
            All
          </button>

          {(settings.favorite_apps?.length || 0) > 0 && (
            <button
              onClick={() => setSelectedCategory(FAVORITES_CATEGORY)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === FAVORITES_CATEGORY ? 'text-white' : isDarkTheme ? 'text-slate-200 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
              }`}
              style={selectedCategory === FAVORITES_CATEGORY ? { backgroundColor: accentColor } : {}}
              title="Favorites"
            >
              ★ Favorites
            </button>
          )}

          {categories.slice(0, 10).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat ? 'text-white' : isDarkTheme ? 'text-slate-200 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
              }`}
              style={selectedCategory === cat ? { backgroundColor: accentColor } : {}}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* App Grid/List */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw size={32} className={`animate-spin ${isDarkTheme ? 'text-slate-300' : 'text-slate-400'}`} />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-full ${isDarkTheme ? 'text-slate-300' : 'text-slate-400'}`}>
              <Search size={64} className="mb-4 opacity-30" />
              <span className="text-lg font-medium">No applications found</span>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-5 gap-4">
              {filteredApps.map((app, i) => (
                <div key={app.id || i} className="relative">
                  <button
                    onClick={() => launchApp(app.exec)}
                    className={`w-full flex flex-col items-center p-4 rounded-2xl transition-all group ${
                      isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-white/70'
                    }`}
                  >
                    <div className="mb-3 group-hover:scale-110 transition-transform">
                      {getAppIcon(app)}
                      <div className="hidden w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl" style={{ backgroundColor: accentColor }}>
                        {app.name.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <span className={`text-sm font-medium text-center line-clamp-2 ${isDarkTheme ? 'text-slate-100' : 'text-slate-700'}`}>
                      {app.name}
                    </span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(app.id);
                    }}
                    className={`absolute top-2 right-2 w-8 h-8 rounded-xl flex items-center justify-center ${
                      isDarkTheme ? 'bg-white/10 hover:bg-white/15' : 'bg-white/70 hover:bg-white'
                    }`}
                    title={favoriteSet.has(app.id) ? 'Unfavorite' : 'Favorite'}
                  >
                    <Star
                      size={16}
                      className={favoriteSet.has(app.id) ? 'text-yellow-500' : 'text-slate-400'}
                      fill={favoriteSet.has(app.id) ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredApps.map((app, i) => (
                <div key={app.id || i} className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${isDarkTheme ? 'hover:bg-white/10' : 'hover:bg-white/70'}`}>
                  <button
                    onClick={() => launchApp(app.exec)}
                    className="flex-1 flex items-center gap-4 text-left p-1 rounded-lg"
                  >
                    <div className="w-10 h-10 flex items-center justify-center">
                      {getAppIcon(app)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${isDarkTheme ? 'text-slate-100' : 'text-slate-700'}`}>
                        {app.name}
                      </div>
                      {app.description && (
                        <div className={`text-xs truncate ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>
                          {app.description}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs ${isDarkTheme ? 'text-slate-400' : 'text-slate-400'}`}>
                      {app.categories.slice(0, 2).join(', ')}
                    </div>
                  </button>

                  <button
                    onClick={() => toggleFavorite(app.id)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isDarkTheme ? 'bg-white/10 hover:bg-white/15' : 'bg-white/60 hover:bg-white'
                    }`}
                    title={favoriteSet.has(app.id) ? 'Unfavorite' : 'Favorite'}
                  >
                    <Star
                      size={18}
                      className={favoriteSet.has(app.id) ? 'text-yellow-500' : 'text-slate-400'}
                      fill={favoriteSet.has(app.id) ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t text-xs flex justify-between ${
          isDarkTheme ? 'border-white/10 text-slate-400' : 'border-slate-200/50 text-slate-400'
        }`}>
          <span>{filteredApps.length} applications</span>
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}
