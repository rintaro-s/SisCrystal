import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  Folder, 
  File, 
  Image, 
  Music, 
  Video, 
  FileText, 
  Code,
  Archive,
  Terminal as TerminalIcon,
  Package,
  ChevronLeft,
  ChevronRight,
  Home,
  HardDrive,
  RefreshCw,
  Grid,
  List,
  ArrowUp
} from 'lucide-react';
import type { FileEntry } from '../types';
import { WindowWrapper } from './WindowWrapper';

interface FileManagerProps {
  accentColor: string;
  onClose?: () => void;
}

export function FileManager({ accentColor, onClose }: FileManagerProps) {
  const [currentPath, setCurrentPath] = useState('~');
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [history, setHistory] = useState<string[]>(['~']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const contents = await invoke<FileEntry[]>('get_directory_contents', { path });
      setFiles(contents);
      setCurrentPath(path);
    } catch (e) {
      console.error('Failed to load directory:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory('~');
  }, [loadDirectory]);

  const navigate = (path: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    loadDirectory(path);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      loadDirectory(history[historyIndex - 1]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      loadDirectory(history[historyIndex + 1]);
    }
  };

  const goUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      navigate('/' + parts.join('/'));
    } else if (currentPath !== '/') {
      navigate('/');
    }
  };

  const handleFileClick = async (file: FileEntry) => {
    if (file.is_dir) {
      navigate(file.path);
    } else {
      try {
        await invoke('open_file', { path: file.path });
      } catch (e) {
        console.error('Failed to open file:', e);
      }
    }
  };

  const getIcon = (iconName: string, size = 24): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      folder: <Folder size={size} className="text-yellow-500" />,
      image: <Image size={size} className="text-pink-500" />,
      music: <Music size={size} className="text-purple-500" />,
      video: <Video size={size} className="text-red-500" />,
      'file-text': <FileText size={size} className="text-blue-500" />,
      code: <Code size={size} className="text-green-500" />,
      archive: <Archive size={size} className="text-orange-500" />,
      terminal: <TerminalIcon size={size} className="text-gray-500" />,
      package: <Package size={size} className="text-indigo-500" />,
      file: <File size={size} className="text-gray-400" />,
    };
    return icons[iconName] || <File size={size} className="text-gray-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const quickAccess = [
    { name: 'Home', path: '~', icon: Home },
    { name: 'Documents', path: '~/Documents', icon: FileText },
    { name: 'Downloads', path: '~/Downloads', icon: Folder },
    { name: 'Pictures', path: '~/Pictures', icon: Image },
    { name: 'Music', path: '~/Music', icon: Music },
    { name: 'Videos', path: '~/Videos', icon: Video },
    { name: 'Root', path: '/', icon: HardDrive },
  ];

  return (
    <WindowWrapper
      title="File Manager"
      subtitle="Sister Storage"
      icon={<Folder size={22} />}
      accentColor={accentColor}
      onClose={onClose}
    >
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-56 border-r border-white/10 p-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Quick Access</h3>
          <nav className="space-y-1">
            {quickAccess.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left ${
                  currentPath === item.path || currentPath.startsWith(item.path.replace('~', ''))
                    ? 'text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
                }`}
                style={currentPath === item.path ? { backgroundColor: `${accentColor}30`, color: accentColor } : {}}
              >
                <item.icon size={18} />
                <span className="font-medium text-sm">{item.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-2 p-3 border-b border-white/10">
          <button
            onClick={goBack}
            disabled={historyIndex === 0}
            className="p-2 rounded-lg hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <button
            onClick={goForward}
            disabled={historyIndex === history.length - 1}
            className="p-2 rounded-lg hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} className="text-slate-600" />
          </button>
          <button
            onClick={goUp}
            className="p-2 rounded-lg hover:bg-white/30 transition-colors"
          >
            <ArrowUp size={20} className="text-slate-600" />
          </button>
          
          <div className="flex-1 px-4 py-2 bg-white/30 rounded-xl text-sm text-slate-600 font-mono">
            {currentPath}
          </div>
          
          <button
            onClick={() => loadDirectory(currentPath)}
            className="p-2 rounded-lg hover:bg-white/30 transition-colors"
          >
            <RefreshCw size={20} className={`text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="flex bg-white/30 rounded-lg p-1">
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

          {/* File List */}
          <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw size={32} className="animate-spin text-slate-400" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Folder size={64} className="mb-4 opacity-30" />
              <span className="text-lg font-medium">Empty Directory</span>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-6 gap-4">
              {files.map((file, i) => (
                <button
                  key={i}
                  onClick={() => handleFileClick(file)}
                  onDoubleClick={() => handleFileClick(file)}
                  className="flex flex-col items-center p-4 rounded-2xl hover:bg-white/50 transition-all group"
                >
                  <div className="mb-2 group-hover:scale-110 transition-transform">
                    {getIcon(file.icon, 48)}
                  </div>
                  <span className="text-sm text-slate-700 font-medium text-center line-clamp-2 w-full">
                    {file.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((file, i) => (
                <button
                  key={i}
                  onClick={() => handleFileClick(file)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/50 transition-all text-left"
                >
                  {getIcon(file.icon, 24)}
                  <span className="flex-1 text-sm text-slate-700 font-medium truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-slate-400 w-20 text-right">
                    {file.is_dir ? '—' : formatSize(file.size)}
                  </span>
                  <span className="text-xs text-slate-400 w-36 text-right">
                    {file.modified || '—'}
                  </span>
                </button>
              ))}
            </div>
          )}
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 text-xs text-slate-400">
            <span>{files.length} items</span>
            <span>{files.filter(f => f.is_dir).length} folders, {files.filter(f => !f.is_dir).length} files</span>
          </div>
        </div>
      </div>
    </WindowWrapper>
  );
}
