use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use sysinfo::{System, Disks};
use walkdir::WalkDir;
use mpris::PlayerFinder;

// ===== Type Definitions =====

#[derive(Serialize, Clone)]
pub struct SystemInfo {
    pub cpu_usage: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub memory_percent: f32,
    pub uptime: u64,
    pub hostname: String,
    pub os_name: String,
    pub kernel_version: String,
}

#[derive(Serialize, Clone)]
pub struct BatteryInfo {
    pub percentage: f32,
    pub is_charging: bool,
    pub time_to_full: Option<u64>,
    pub time_to_empty: Option<u64>,
}

#[derive(Serialize, Clone)]
pub struct NetworkInfo {
    pub is_connected: bool,
    pub ssid: Option<String>,
    pub signal_strength: Option<i32>,
    pub ip_address: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total: u64,
    pub used: u64,
    pub available: u64,
    pub percent: f32,
}

#[derive(Serialize, Clone)]
pub struct AudioInfo {
    pub volume: u32,
    pub is_muted: bool,
    pub current_track: Option<String>,
    pub current_artist: Option<String>,
    pub is_playing: bool,
}

#[derive(Serialize, Clone)]
pub struct DesktopApp {
    pub id: String,
    pub name: String,
    pub exec: String,
    pub icon: Option<String>,
    pub categories: Vec<String>,
    pub description: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<String>,
    pub icon: String,
}

#[derive(Serialize, Clone)]
pub struct UserProfile {
    pub username: String,
    pub avatar_path: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct DesktopSettings {
    pub wallpaper: String,
    pub wallpaper_opacity: f32,
    pub theme: String,
    pub accent_color: String,
    pub favorite_apps: Vec<String>,
    pub dock_position: String,
    pub dock_size: u32,
    pub dock_auto_hide: bool,
    pub dock_trigger_size: u32,
    pub dock_icon_size: u32,
    pub island_trigger_size: u32,
    pub show_notifications_widget: bool,
    pub show_desktop_files_widget: bool,
    pub animation_speed: f32,
    pub blur_enabled: bool,
    pub transparency: f32,
}

impl Default for DesktopSettings {
    fn default() -> Self {
        Self {
            wallpaper: String::from("/usr/share/backgrounds/default.jpg"),
            wallpaper_opacity: 0.4,
            theme: String::from("crystal"),
            accent_color: String::from("#00A3FF"),
            favorite_apps: Vec::new(),
            dock_position: String::from("bottom"),
            dock_size: 64,
            dock_auto_hide: false,
            dock_trigger_size: 6,
            dock_icon_size: 44,
            island_trigger_size: 6,
            show_notifications_widget: true,
            show_desktop_files_widget: true,
            animation_speed: 1.0,
            blur_enabled: true,
            transparency: 0.8,
        }
    }
}

// ===== Helper Functions =====

fn get_config_dir() -> PathBuf {
    if let Some(dir) = dirs::config_dir() {
        return dir.join("sis-crystal");
    }

    // Fallback: ~/.config (avoid writing to a literal "~" directory)
    if let Some(home) = dirs::home_dir() {
        return home.join(".config").join("sis-crystal");
    }

    PathBuf::from(".sis-crystal")
}

fn get_settings_path() -> PathBuf {
    get_config_dir().join("settings.json")
}

fn run_command(cmd: &str, args: &[&str]) -> Result<String, String> {
    Command::new(cmd)
        .args(args)
        .output()
        .map_err(|e| e.to_string())
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout).map_err(|e| e.to_string())
            } else {
                Err(String::from_utf8_lossy(&output.stderr).to_string())
            }
        })
}

fn parse_first_percent_value(s: &str) -> Option<u32> {
    // Find the first "NN%" occurrence and extract NN.
    let bytes = s.as_bytes();
    for (i, b) in bytes.iter().enumerate() {
        if *b != b'%' || i == 0 {
            continue;
        }
        let mut j = i;
        while j > 0 && bytes[j - 1].is_ascii_digit() {
            j -= 1;
        }
        if j == i {
            continue;
        }
        if let Ok(v) = s[j..i].parse::<u32>() {
            return Some(v);
        }
    }
    None
}

fn parse_wpctl_volume(output: &str) -> Option<(u32, bool)> {
    // Example: "Volume: 0.52" or "Volume: 0.52 [MUTED]"
    let muted = output.to_uppercase().contains("MUTED");
    let after = output.split(':').nth(1)?.trim();
    let number = after
        .split_whitespace()
        .next()?
        .parse::<f32>()
        .ok()?;
    let percent = (number * 100.0).round() as i32;
    let percent = percent.clamp(0, 150) as u32;
    Some((percent, muted))
}

fn resolve_icon_path(icon: &str) -> Option<String> {
    let icon = icon.trim();
    if icon.is_empty() {
        return None;
    }

    // Absolute path
    let p = PathBuf::from(icon);
    if p.is_absolute() && p.exists() && p.is_file() {
        return Some(p.to_string_lossy().to_string());
    }

    let lower = icon.to_lowercase();
    let has_ext = lower.ends_with(".png") || lower.ends_with(".svg") || lower.ends_with(".xpm");
    let mut filenames = Vec::new();
    if has_ext {
        filenames.push(icon.to_string());
    } else {
        filenames.push(format!("{icon}.svg"));
        filenames.push(format!("{icon}.png"));
        filenames.push(format!("{icon}.xpm"));
    }

    // Common pixmaps
    let pixmap_roots = [
        "/usr/share/pixmaps",
        "/usr/local/share/pixmaps",
        "/var/lib/flatpak/exports/share/pixmaps",
        "/run/host/usr/share/pixmaps",
        "/run/host/usr/local/share/pixmaps",
        "/run/host/var/lib/flatpak/exports/share/pixmaps",
    ];
    let mut pixmap_roots = pixmap_roots
        .into_iter()
        .map(PathBuf::from)
        .collect::<Vec<_>>();
    if let Some(home) = dirs::home_dir() {
        pixmap_roots.push(home.join(".local/share/flatpak/exports/share/pixmaps"));
    }
    for root in pixmap_roots {
        for ext in ["png", "svg", "xpm"] {
            let pix = root.join(format!("{icon}.{ext}"));
            if pix.exists() && pix.is_file() {
                return Some(pix.to_string_lossy().to_string());
            }
        }
    }

    let mut roots: Vec<PathBuf> = Vec::new();
    if let Some(home) = dirs::home_dir() {
        roots.push(home.join(".local/share/icons"));
    }
    roots.push(PathBuf::from("/usr/share/icons"));
    roots.push(PathBuf::from("/usr/local/share/icons"));
    roots.push(PathBuf::from("/var/lib/flatpak/exports/share/icons"));
    roots.push(PathBuf::from("/run/host/usr/share/icons"));
    roots.push(PathBuf::from("/run/host/usr/local/share/icons"));
    roots.push(PathBuf::from("/run/host/var/lib/flatpak/exports/share/icons"));
    if let Some(home) = dirs::home_dir() {
        roots.push(home.join(".local/share/flatpak/exports/share/icons"));
    }

    let themes = ["hicolor", "Adwaita"];
    let sizes = [
        "scalable",
        "512x512",
        "256x256",
        "192x192",
        "128x128",
        "96x96",
        "64x64",
        "48x48",
        "32x32",
        "24x24",
        "16x16",
    ];
    let contexts = [
        "apps",
        "applications",
        "places",
        "categories",
        "mimetypes",
        "status",
        "actions",
    ];

    for root in roots {
        for theme in themes {
            for size in sizes {
                for ctx in contexts {
                    for filename in &filenames {
                        let candidate = root.join(theme).join(size).join(ctx).join(filename);
                        if candidate.exists() && candidate.is_file() {
                            return Some(candidate.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }

    None
}

fn get_player_metadata() -> (Option<String>, Option<String>, bool) {
    // Primary: MPRIS over DBus (works on GNOME when a player exposes MPRIS)
    if let Ok(finder) = PlayerFinder::new() {
        if let Ok(players) = finder.find_all() {
            // Prefer a playing player, else the first one
            let mut chosen = None;
            for p in players {
                if let Ok(status) = p.get_playback_status() {
                    if status == mpris::PlaybackStatus::Playing {
                        chosen = Some(p);
                        break;
                    }
                }
                if chosen.is_none() {
                    chosen = Some(p);
                }
            }

            if let Some(player) = chosen {
                let playing = player
                    .get_playback_status()
                    .map(|s| s == mpris::PlaybackStatus::Playing)
                    .unwrap_or(false);
                let meta = player.get_metadata().ok();
                let title = meta
                    .as_ref()
                    .and_then(|m| m.title().map(|s| s.to_string()));
                let artist = meta
                    .as_ref()
                    .and_then(|m| m.artists())
                    .and_then(|a| a.get(0).map(|s| s.to_string()));
                // Always return playback state if a player is present.
                // Some players expose playback status but omit metadata.
                if title.is_some() || artist.is_some() {
                    return (title, artist, playing);
                }

                // If MPRIS is present but metadata is empty, try playerctl to fill title/artist.
                if let Ok(output) = run_command(
                    "playerctl",
                    &[
                        "metadata",
                        "--player=%any",
                        "--format",
                        "{{title}}|||{{artist}}|||{{status}}",
                    ],
                ) {
                    let parts: Vec<&str> = output.trim().split("|||").collect();
                    let title = parts
                        .get(0)
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string());
                    let artist = parts
                        .get(1)
                        .filter(|s| !s.is_empty())
                        .map(|s| s.to_string());
                    let playing_from_playerctl = parts.get(2).map(|s| *s == "Playing").unwrap_or(false);
                    return (title, artist, playing || playing_from_playerctl);
                }

                return (None, None, playing);
            }
        }
    }

    // Fallback: playerctl if installed
    if let Ok(output) = run_command(
        "playerctl",
        &[
            "metadata",
            "--player=%any",
            "--format",
            "{{title}}|||{{artist}}|||{{status}}",
        ],
    ) {
        let parts: Vec<&str> = output.trim().split("|||").collect();
        let title = parts.get(0).filter(|s| !s.is_empty()).map(|s| s.to_string());
        let artist = parts.get(1).filter(|s| !s.is_empty()).map(|s| s.to_string());
        let playing = parts.get(2).map(|s| *s == "Playing").unwrap_or(false);
        return (title, artist, playing);
    }

    (None, None, false)
}

fn get_file_icon(name: &str, is_dir: bool) -> String {
    if is_dir {
        return "folder".to_string();
    }
    
    let ext = name.rsplit('.').next().unwrap_or("").to_lowercase();
    match ext.as_str() {
        "png" | "jpg" | "jpeg" | "gif" | "bmp" | "svg" | "webp" => "image",
        "mp3" | "wav" | "flac" | "ogg" | "m4a" | "aac" => "music",
        "mp4" | "mkv" | "avi" | "mov" | "webm" => "video",
        "pdf" | "doc" | "docx" | "txt" | "md" | "rtf" => "file-text",
        "rs" | "py" | "js" | "ts" | "tsx" | "jsx" | "c" | "cpp" | "h" | "java" | "go" | "html" | "css" | "scss" | "json" | "xml" | "yaml" | "toml" => "code",
        "zip" | "tar" | "gz" | "rar" | "7z" | "xz" => "archive",
        "sh" | "bash" | "zsh" | "fish" => "terminal",
        "deb" | "rpm" | "snap" | "flatpak" | "appimage" => "package",
        _ => "file",
    }.to_string()
}

fn find_user_avatar(username: &str) -> Option<String> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join(".face"));
        candidates.push(home.join(".face.icon"));
    }

    candidates.push(PathBuf::from(format!(
        "/var/lib/AccountsService/icons/{username}"
    )));

    for path in &candidates {
        if path.exists() && path.is_file() {
            return Some(path.to_string_lossy().to_string());
        }
    }

    // AccountsService user file may contain: Icon=/path/to/icon
    let accounts_service_user = format!("/var/lib/AccountsService/users/{username}");
    if let Ok(contents) = fs::read_to_string(&accounts_service_user) {
        for line in contents.lines() {
            if let Some(rest) = line.strip_prefix("Icon=") {
                let icon_path = PathBuf::from(rest.trim());
                if icon_path.exists() && icon_path.is_file() {
                    return Some(icon_path.to_string_lossy().to_string());
                }
            }
        }
    }

    None
}

// ===== Tauri Commands =====

static LAST_SYSTEM_REFRESH: OnceLock<Mutex<(std::time::Instant, SystemInfo)>> = OnceLock::new();
static SYSTEM_CACHE_DURATION: std::time::Duration = std::time::Duration::from_millis(1000); // Cache for 1 second

#[tauri::command]
fn get_system_info() -> SystemInfo {
    static SYS: OnceLock<Mutex<System>> = OnceLock::new();
    let sys_mutex = SYS.get_or_init(|| {
        let mut sys = System::new();
        sys.refresh_all();
        Mutex::new(sys)
    });

    // Check if we have a recent cached value
    if let Ok(cache_guard) = LAST_SYSTEM_REFRESH.get_or_init(|| {
        let mut sys = sys_mutex.lock().expect("sysinfo mutex poisoned");
        sys.refresh_memory();
        
        let info = SystemInfo {
            cpu_usage: sys.global_cpu_usage(),
            memory_used: sys.used_memory(),
            memory_total: sys.total_memory(),
            memory_percent: {
                let total = sys.total_memory();
                if total > 0 { (sys.used_memory() as f32 / total as f32) * 100.0 } else { 0.0 }
            },
            uptime: System::uptime(),
            hostname: System::host_name().unwrap_or_default(),
            os_name: System::name().unwrap_or_default(),
            kernel_version: System::kernel_version().unwrap_or_default(),
        };
        Mutex::new((std::time::Instant::now(), info))
    }).lock() {
        let (last_refresh, cached_info) = cache_guard.clone();
        if last_refresh.elapsed() < SYSTEM_CACHE_DURATION {
            return cached_info;
        }
    }

    // Cache expired, refresh
    let mut sys = sys_mutex.lock().expect("sysinfo mutex poisoned");
    sys.refresh_memory();

    let cpu_usage = sys.global_cpu_usage();
    let memory_used = sys.used_memory();
    let memory_total = sys.total_memory();
    let memory_percent = if memory_total > 0 {
        (memory_used as f32 / memory_total as f32) * 100.0
    } else {
        0.0
    };

    let info = SystemInfo {
        cpu_usage,
        memory_used,
        memory_total,
        memory_percent,
        uptime: System::uptime(),
        hostname: System::host_name().unwrap_or_default(),
        os_name: System::name().unwrap_or_default(),
        kernel_version: System::kernel_version().unwrap_or_default(),
    };

    if let Ok(mut cache_guard) = LAST_SYSTEM_REFRESH.get_or_init(|| Mutex::new((std::time::Instant::now(), info.clone()))).lock() {
        cache_guard.0 = std::time::Instant::now();
        cache_guard.1 = info.clone();
    }

    info
}

#[tauri::command]
fn get_battery_info() -> Option<BatteryInfo> {
    use battery::Manager;
    
    let manager = Manager::new().ok()?;
    let battery = manager.batteries().ok()?.next()?.ok()?;
    
    Some(BatteryInfo {
        percentage: battery.state_of_charge().value * 100.0,
        is_charging: battery.state() == battery::State::Charging,
        time_to_full: battery.time_to_full().map(|t| t.value as u64),
        time_to_empty: battery.time_to_empty().map(|t| t.value as u64),
    })
}

#[tauri::command]
fn get_network_info() -> NetworkInfo {
    static LAST_NETWORK_REFRESH: OnceLock<Mutex<(std::time::Instant, NetworkInfo)>> = OnceLock::new();
    static NETWORK_CACHE_DURATION: std::time::Duration = std::time::Duration::from_secs(3);

    if let Ok(cache_guard) = LAST_NETWORK_REFRESH.get_or_init(|| {
        let ssid = run_command("nmcli", &["-t", "-f", "active,ssid", "dev", "wifi"])
            .ok()
            .and_then(|output| {
                output.lines()
                    .find(|line| line.starts_with("yes:"))
                    .map(|line| line.trim_start_matches("yes:").to_string())
            });
        
        let ip_address = run_command("hostname", &["-I"])
            .ok()
            .and_then(|output| output.split_whitespace().next().map(String::from));

        let info = NetworkInfo {
            is_connected: ssid.is_some(),
            ssid,
            signal_strength: None,
            ip_address,
        };
        Mutex::new((std::time::Instant::now(), info))
    }).lock() {
        let (last_refresh, cached_info) = cache_guard.clone();
        if last_refresh.elapsed() < NETWORK_CACHE_DURATION {
            return cached_info;
        }
    }

    let ssid = run_command("nmcli", &["-t", "-f", "active,ssid", "dev", "wifi"])
        .ok()
        .and_then(|output| {
            output.lines()
                .find(|line| line.starts_with("yes:"))
                .map(|line| line.trim_start_matches("yes:").to_string())
        });
    
    let ip_address = run_command("hostname", &["-I"])
        .ok()
        .and_then(|output| output.split_whitespace().next().map(String::from));

    let info = NetworkInfo {
        is_connected: ssid.is_some(),
        ssid,
        signal_strength: None,
        ip_address,
    };

    if let Ok(mut cache_guard) = LAST_NETWORK_REFRESH.get_or_init(|| Mutex::new((std::time::Instant::now(), info.clone()))).lock() {
        cache_guard.0 = std::time::Instant::now();
        cache_guard.1 = info.clone();
    }

    info
}

#[tauri::command]
fn get_user_profile() -> UserProfile {
    let username = whoami::username();
    let avatar_path = find_user_avatar(&username);
    UserProfile { username, avatar_path }
}

#[tauri::command]
fn get_disk_info() -> Vec<DiskInfo> {
    let disks = Disks::new_with_refreshed_list();
    
    disks.iter().map(|disk| {
        let total = disk.total_space();
        let available = disk.available_space();
        let used = total.saturating_sub(available);
        
        DiskInfo {
            name: disk.name().to_string_lossy().to_string(),
            mount_point: disk.mount_point().to_string_lossy().to_string(),
            total,
            used,
            available,
            percent: if total > 0 { (used as f32 / total as f32) * 100.0 } else { 0.0 },
        }
    }).collect()
}

#[tauri::command]
fn get_audio_info() -> AudioInfo {
    let (volume, is_muted) = if let Ok(output) = run_command("pactl", &["get-sink-volume", "@DEFAULT_SINK@"]) {
        let v = parse_first_percent_value(&output).unwrap_or(50);
        let muted = run_command("pactl", &["get-sink-mute", "@DEFAULT_SINK@"]) 
            .map(|s| s.contains("yes"))
            .unwrap_or(false);
        (v, muted)
    } else if let Ok(output) = run_command("wpctl", &["get-volume", "@DEFAULT_AUDIO_SINK@"]) {
        parse_wpctl_volume(&output).unwrap_or((50, false))
    } else {
        (50, false)
    };

    let (current_track, current_artist, is_playing) = get_player_metadata();

    AudioInfo {
        volume,
        is_muted,
        current_track,
        current_artist,
        is_playing,
    }
}

#[tauri::command]
fn set_volume(volume: u32) -> Result<(), String> {
    let v = volume.min(150);
    if run_command("pactl", &["set-sink-volume", "@DEFAULT_SINK@", &format!("{}%", v)]).is_ok() {
        return Ok(());
    }
    // PipeWire
    run_command("wpctl", &["set-volume", "@DEFAULT_AUDIO_SINK@", &format!("{}%", v)])?;
    Ok(())
}

#[tauri::command]
fn toggle_mute() -> Result<(), String> {
    if run_command("pactl", &["set-sink-mute", "@DEFAULT_SINK@", "toggle"]).is_ok() {
        return Ok(());
    }
    run_command("wpctl", &["set-mute", "@DEFAULT_AUDIO_SINK@", "toggle"])?;
    Ok(())
}

#[tauri::command]
fn media_control(action: &str) -> Result<(), String> {
    let cmd = match action {
        "play" | "pause" => "play-pause",
        "next" => "next",
        "previous" => "previous",
        _ => return Err("Unknown action".to_string()),
    };

    // Primary: MPRIS
    let mut mpris_error: Option<String> = None;
    if let Ok(finder) = PlayerFinder::new() {
        if let Ok(players) = finder.find_all() {
            // Prefer playing player
            let mut chosen = None;
            for p in players {
                if let Ok(status) = p.get_playback_status() {
                    if status == mpris::PlaybackStatus::Playing {
                        chosen = Some(p);
                        break;
                    }
                }
                if chosen.is_none() {
                    chosen = Some(p);
                }
            }

            if let Some(player) = chosen {
                let res: Result<(), String> = match cmd {
                    "play-pause" => player.play_pause().map_err(|e| e.to_string()),
                    "next" => player.next().map_err(|e| e.to_string()),
                    "previous" => player.previous().map_err(|e| e.to_string()),
                    _ => Ok(()),
                };
                if res.is_ok() {
                    return Ok(());
                }
                mpris_error = res.err();
            }
        }
    }

    // Fallback: playerctl
    run_command("playerctl", &["--player=%any", cmd]).map_err(|e| {
        if let Some(mpris_error) = &mpris_error {
            format!(
                "MPRIS failed ({mpris_error}); playerctl also failed ({e})."
            )
        } else {
            format!(
                "No MPRIS player found. Install 'playerctl' or run a MPRIS-compatible player. Details: {e}"
            )
        }
    })?;
    Ok(())
}

#[tauri::command]
fn set_brightness(brightness: u32) -> Result<(), String> {
    run_command("brightnessctl", &["set", &format!("{}%", brightness.min(100))])?;
    Ok(())
}

#[tauri::command]
fn get_brightness() -> u32 {
    run_command("brightnessctl", &["get"])
        .ok()
        .and_then(|current| {
            let max = run_command("brightnessctl", &["max"]).ok()?;
            let c: f32 = current.trim().parse().ok()?;
            let m: f32 = max.trim().parse().ok()?;
            Some((c / m * 100.0) as u32)
        })
        .unwrap_or(100)
}

#[tauri::command]
fn get_installed_apps() -> Vec<DesktopApp> {
    let mut apps = Vec::new();
    let mut app_dirs: Vec<PathBuf> = vec![
        PathBuf::from("/usr/share/applications"),
        PathBuf::from("/usr/local/share/applications"),
        PathBuf::from("/var/lib/flatpak/exports/share/applications"),
        PathBuf::from("/run/host/usr/share/applications"),
        PathBuf::from("/run/host/usr/local/share/applications"),
        PathBuf::from("/run/host/var/lib/flatpak/exports/share/applications"),
    ];
    if let Some(home) = dirs::home_dir() {
        app_dirs.push(home.join(".local/share/applications"));
        app_dirs.push(home.join(".local/share/flatpak/exports/share/applications"));
    }

    for dir in app_dirs {
        if !dir.exists() {
            continue;
        }
        for entry in WalkDir::new(&dir)
            .max_depth(2)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.path().extension().map(|e| e == "desktop").unwrap_or(false) {
                if let Some(app) = parse_desktop_file(entry.path()) {
                    apps.push(app);
                }
            }
        }
    }

    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps.dedup_by(|a, b| a.name == b.name);
    apps
}

fn parse_desktop_file(path: &std::path::Path) -> Option<DesktopApp> {
    use freedesktop_entry_parser::parse_entry;
    
    let entry = parse_entry(path).ok()?;
    let section = entry.section("Desktop Entry");
    
    let no_display = section.attr("NoDisplay").unwrap_or("false");
    let hidden = section.attr("Hidden").unwrap_or("false");
    
    if no_display == "true" || hidden == "true" {
        return None;
    }

    let name = section.attr("Name")?.to_string();
    let id = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(&name)
        .to_string();
    let exec = section.attr("Exec")
        .map(|e| e.split_whitespace().next().unwrap_or(e).to_string())?;
    let icon = section.attr("Icon").and_then(resolve_icon_path);
    let categories = section.attr("Categories")
        .map(|c| c.split(';').filter(|s| !s.is_empty()).map(String::from).collect())
        .unwrap_or_default();
    let description = section.attr("Comment").map(|s| s.to_string());

    Some(DesktopApp {
        id,
        name,
        exec,
        icon,
        categories,
        description,
    })
}

#[tauri::command]
fn launch_app(exec: &str) -> Result<(), String> {
    Command::new("sh")
        .args(["-c", &format!("{} &", exec)])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_directory_contents(path: &str) -> Result<Vec<FileEntry>, String> {
    let path = if path == "~" || path.is_empty() {
        dirs::home_dir().ok_or("No home directory")?
    } else {
        PathBuf::from(path.replace("~", &dirs::home_dir().unwrap_or_default().to_string_lossy()))
    };

    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut files: Vec<FileEntry> = entries
        .filter_map(|e| e.ok())
        .filter_map(|entry| {
            let path = entry.path();
            let metadata = fs::metadata(&path).ok()?;
            let name = entry.file_name().to_string_lossy().to_string();
            
            Some(FileEntry {
                name: name.clone(),
                path: path.to_string_lossy().to_string(),
                is_dir: metadata.is_dir(),
                size: metadata.len(),
                modified: metadata.modified()
                    .ok()
                    .map(|t| chrono::DateTime::<chrono::Local>::from(t).format("%Y-%m-%d %H:%M").to_string()),
                icon: get_file_icon(&name, metadata.is_dir()),
            })
        })
        .collect();

    files.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(files)
}

#[tauri::command]
fn open_file(path: &str) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_wallpapers() -> Vec<String> {
    fn is_wallpaper(path: &std::path::Path) -> bool {
        if !path.is_file() {
            return false;
        }

        let Some(ext) = path.extension() else {
            return false;
        };
        let ext = ext.to_string_lossy().to_lowercase();
        matches!(ext.as_str(), "png" | "jpg" | "jpeg" | "webp")
    }

    let mut wallpapers: Vec<String> = Vec::new();

    // User wallpapers: ~/Pictures/wallpaper (requested)
    if let Some(home) = dirs::home_dir() {
        let wallpapers_dir = home.join("Pictures").join("wallpaper");
        if wallpapers_dir.exists() {
            for entry in WalkDir::new(&wallpapers_dir)
                .max_depth(4)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                let path = entry.path();
                if is_wallpaper(path) {
                    wallpapers.push(path.to_string_lossy().to_string());
                }
            }
        }
    }

    // NOTE: Intentionally do not scan system directories here.
    // The UI explicitly references ~/Pictures/wallpaper.

    wallpapers.sort();
    wallpapers.dedup();
    wallpapers.truncate(200);
    wallpapers
}

#[tauri::command]
fn set_wallpaper(path: &str) -> Result<(), String> {
    // GNOME expects a valid URI like: file:///usr/share/backgrounds/foo.jpg
    // If the caller already passed a URI, use it as-is.
    let uri = if path.starts_with("http://") || path.starts_with("https://") || path.starts_with("file://") {
        path.to_string()
    } else {
        let trimmed = path.trim_start_matches('/');
        format!("file:///{trimmed}")
    };

    // Try GNOME (fail loudly so UI can show/log the issue)
    run_command(
        "gsettings",
        &[
            "set",
            "org.gnome.desktop.background",
            "picture-uri",
            &uri,
        ],
    )?;
    // Some desktops use the dark variant key
    let _ = run_command(
        "gsettings",
        &[
            "set",
            "org.gnome.desktop.background",
            "picture-uri-dark",
            &uri,
        ],
    );
    
    // Update settings
    let mut settings = load_settings();
    settings.wallpaper = path.to_string();
    save_settings_internal(&settings)?;
    
    Ok(())
}

fn load_settings() -> DesktopSettings {
    let path = get_settings_path();
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_settings_internal(settings: &DesktopSettings) -> Result<(), String> {
    let dir = get_config_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(get_settings_path(), json).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings() -> DesktopSettings {
    load_settings()
}

#[tauri::command]
fn save_settings(settings: DesktopSettings) -> Result<(), String> {
    save_settings_internal(&settings)
}

#[tauri::command]
fn get_wifi_networks() -> Vec<HashMap<String, String>> {
    run_command("nmcli", &["-t", "-f", "SSID,SIGNAL,SECURITY", "dev", "wifi", "list"])
        .map(|output| {
            output.lines()
                .filter(|line| !line.is_empty())
                .map(|line| {
                    let parts: Vec<&str> = line.split(':').collect();
                    let mut map = HashMap::new();
                    if let Some(ssid) = parts.get(0) { map.insert("ssid".to_string(), ssid.to_string()); }
                    if let Some(signal) = parts.get(1) { map.insert("signal".to_string(), signal.to_string()); }
                    if let Some(security) = parts.get(2) { map.insert("security".to_string(), security.to_string()); }
                    map
                })
                .collect()
        })
        .unwrap_or_default()
}

#[tauri::command]
fn connect_wifi(ssid: &str, password: &str) -> Result<(), String> {
    if password.is_empty() {
        run_command("nmcli", &["dev", "wifi", "connect", ssid])?;
    } else {
        run_command("nmcli", &["dev", "wifi", "connect", ssid, "password", password])?;
    }
    Ok(())
}

#[tauri::command]
fn disconnect_wifi() -> Result<(), String> {
    run_command("nmcli", &["dev", "disconnect", "wlan0"])?;
    Ok(())
}

#[tauri::command]
fn get_bluetooth_devices() -> Vec<HashMap<String, String>> {
    run_command("bluetoothctl", &["devices"])
        .map(|output| {
            output.lines()
                .filter_map(|line| {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 3 {
                        let mut map = HashMap::new();
                        map.insert("mac".to_string(), parts[1].to_string());
                        map.insert("name".to_string(), parts[2..].join(" "));
                        Some(map)
                    } else {
                        None
                    }
                })
                .collect()
        })
        .unwrap_or_default()
}

#[tauri::command]
fn system_action(action: &str) -> Result<(), String> {
    match action {
        "shutdown" => { run_command("systemctl", &["poweroff"])?; }
        "reboot" => { run_command("systemctl", &["reboot"])?; }
        "suspend" => { run_command("systemctl", &["suspend"])?; }
        "lock" => { 
            let _ = run_command("loginctl", &["lock-session"]);
            let _ = run_command("gnome-screensaver-command", &["-l"]);
        }
        "logout" => { run_command("loginctl", &["terminate-user", &whoami::username()])?; }
        _ => return Err("Unknown action".to_string()),
    }
    Ok(())
}

#[tauri::command]
fn run_shell(command: &str) -> Result<String, String> {
    let output = Command::new("sh")
        .args(["-lc", command])
        .output()
        .map_err(|e| e.to_string())?;

    let mut text = String::new();
    if !output.stdout.is_empty() {
        text.push_str(&String::from_utf8_lossy(&output.stdout));
    }
    if !output.stderr.is_empty() {
        if !text.is_empty() {
            text.push('\n');
        }
        text.push_str(&String::from_utf8_lossy(&output.stderr));
    }

    if output.status.success() {
        Ok(text)
    } else {
        Err(if text.is_empty() { "Command failed".to_string() } else { text })
    }
}

// ===== File Reading =====

#[tauri::command]
fn read_file(path: &str) -> Result<String, String> {
    let expanded_path = shellexpand::tilde(path);
    fs::read_to_string(expanded_path.as_ref())
        .map_err(|e| format!("Failed to read file: {}", e))
}

// ===== Application Entry =====

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_battery_info,
            get_network_info,
            get_disk_info,
            get_audio_info,
            set_volume,
            toggle_mute,
            media_control,
            set_brightness,
            get_brightness,
            get_installed_apps,
            launch_app,
            get_directory_contents,
            open_file,
            get_wallpapers,
            set_wallpaper,
            get_settings,
            save_settings,
            get_wifi_networks,
            connect_wifi,
            disconnect_wifi,
            get_bluetooth_devices,
            get_user_profile,
            system_action,
            run_shell,
            read_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
