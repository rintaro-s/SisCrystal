// System Types
export interface SystemInfo {
  cpu_usage: number;
  memory_used: number;
  memory_total: number;
  memory_percent: number;
  uptime: number;
  hostname: string;
  os_name: string;
  kernel_version: string;
}

export interface BatteryInfo {
  percentage: number;
  is_charging: boolean;
  time_to_full: number | null;
  time_to_empty: number | null;
}

export interface NetworkInfo {
  is_connected: boolean;
  ssid: string | null;
  signal_strength: number | null;
  ip_address: string | null;
}

export interface DiskInfo {
  name: string;
  mount_point: string;
  total: number;
  used: number;
  available: number;
  percent: number;
}

export interface AudioInfo {
  volume: number;
  is_muted: boolean;
  current_track: string | null;
  current_artist: string | null;
  is_playing: boolean;
}

export interface DesktopApp {
  name: string;
  exec: string;
  icon: string | null;
  categories: string[];
  description: string | null;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: string | null;
  icon: string;
}

export interface DesktopSettings {
  wallpaper: string;
  wallpaper_opacity: number;
  theme: string;
  accent_color: string;
  dock_position: 'bottom' | 'left' | 'right';
  dock_size: number;
  dock_auto_hide: boolean;
  dock_trigger_size: number;
  dock_icon_size: number;
  island_trigger_size: number;
  show_notifications_widget: boolean;
  show_desktop_files_widget: boolean;
  animation_speed: number;
  blur_enabled: boolean;
  transparency: number;
}

export interface WifiNetwork {
  ssid: string;
  signal: string;
  security: string;
}

export interface BluetoothDevice {
  mac: string;
  name: string;
}

// Window types
export interface WindowItem {
  id: string;
  title: string;
  iconKey: string;
  component?: string;
}
