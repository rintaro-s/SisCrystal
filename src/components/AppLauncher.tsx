import { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Grid, List, RefreshCw } from 'lucide-react';
import type { DesktopApp } from '../types';

interface AppLauncherProps {
  accentColor: string;
  onClose: () => void;
}

export function AppLauncher({ accentColor, onClose }: AppLauncherProps) {
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

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchesSearch = !searchQuery || 
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = !selectedCategory || 
        app.categories.includes(selectedCategory);
      
      return matchesSearch && matchesCategory;
    });
  }, [apps, searchQuery, selectedCategory]);

  const getAppIcon = (app: DesktopApp) => {
    // Try to use system icon, fallback to first letter
    if (app.icon) {
      // Check if it's a full path
      if (app.icon.startsWith('/')) {
        return (
          <img 
            src={`file://${app.icon}`} 
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
        className="w-full max-w-5xl h-[80vh] bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200/50">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Applications</h2>
            <button 
              onClick={loadApps}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <RefreshCw size={18} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex-1" />
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid size={18} className="text-slate-600" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <List size={18} className="text-slate-600" />
              </button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 transition-all"
              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
              autoFocus
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-6 py-3 overflow-x-auto border-b border-slate-200/50">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              !selectedCategory ? 'text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
            style={!selectedCategory ? { backgroundColor: accentColor } : {}}
          >
            All
          </button>
          {categories.slice(0, 10).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat ? 'text-white' : 'text-slate-600 hover:bg-slate-100'
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
              <RefreshCw size={32} className="animate-spin text-slate-400" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Search size={64} className="mb-4 opacity-30" />
              <span className="text-lg font-medium">No applications found</span>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-5 gap-4">
              {filteredApps.map((app, i) => (
                <button
                  key={i}
                  onClick={() => launchApp(app.exec)}
                  className="flex flex-col items-center p-4 rounded-2xl hover:bg-white/70 transition-all group"
                >
                  <div className="mb-3 group-hover:scale-110 transition-transform">
                    {getAppIcon(app)}
                    <div className="hidden w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-xl" style={{ backgroundColor: accentColor }}>
                      {app.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <span className="text-sm text-slate-700 font-medium text-center line-clamp-2">
                    {app.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredApps.map((app, i) => (
                <button
                  key={i}
                  onClick={() => launchApp(app.exec)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/70 transition-all text-left"
                >
                  <div className="w-10 h-10 flex items-center justify-center">
                    {getAppIcon(app)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-700 font-medium truncate">
                      {app.name}
                    </div>
                    {app.description && (
                      <div className="text-xs text-slate-400 truncate">
                        {app.description}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {app.categories.slice(0, 2).join(', ')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200/50 text-xs text-slate-400 flex justify-between">
          <span>{filteredApps.length} applications</span>
          <span>Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}
