#!/usr/bin/env bash
set -euo pipefail

# SisCrystal installer for Ubuntu/Debian GNOME.
# - Installs runtime deps for audio/media control (PipeWire/Pulse + MPRIS helpers)
# - Builds SisCrystal from this repo
# - Installs it as a normal GNOME app + autostart entry (coexists with GNOME)
#
# NOTE: GNOME "desktop replacement" (becoming the actual background) is a GNOME Shell feature;
# this script installs SisCrystal as a fullscreen, decorationless app you can pin to workspace 1.

APP_NAME="SisCrystal"
BIN_NAME="sis-crystal-desktop"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

if ! need_cmd apt-get; then
  echo "This installer currently supports apt-get (Debian/Ubuntu)." >&2
  exit 1
fi

echo "[1/4] Installing system dependencies..."

sudo apt-get update -y

# WebKitGTK + GTK runtime deps are required for Tauri on Linux.
# Audio/media deps:
# - pipewire-utils provides wpctl
# - pulseaudio-utils provides pactl (still common)
# - playerctl optional (fallback / debugging)
# Build deps:
# - curl, pkg-config, build-essential, etc.
sudo apt-get install -y \
  curl \
  pkg-config \
  build-essential \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  pipewire-utils \
  pulseaudio-utils \
  playerctl

echo "[2/4] Ensuring Node.js and Rust toolchains exist..."
if ! need_cmd node || ! need_cmd npm; then
  echo "Node.js/npm not found. Install Node.js LTS first (e.g. from nodesource or distro packages)." >&2
  exit 1
fi
if ! need_cmd cargo; then
  echo "Rust (cargo) not found. Installing rustup..." >&2
  curl https://sh.rustup.rs -sSf | sh -s -- -y
  # shellcheck disable=SC1090
  source "$HOME/.cargo/env"
fi

echo "[3/4] Building SisCrystal..."
cd "$REPO_ROOT"

npm install
npm run build
npm run tauri build

echo "[4/4] Installing desktop entry + autostart..."

# Tauri bundles usually land under src-tauri/target/release/bundle
BUNDLE_DIR="$REPO_ROOT/src-tauri/target/release/bundle"

# Prefer AppImage for user-local install
APPIMAGE_PATH=""
if compgen -G "$BUNDLE_DIR/appimage/*.AppImage" > /dev/null; then
  APPIMAGE_PATH="$(ls -1 "$BUNDLE_DIR"/appimage/*.AppImage | head -n1)"
fi

INSTALL_DIR="$HOME/.local/opt/siscrystal"
mkdir -p "$INSTALL_DIR"

LAUNCH_CMD=""
if [[ -n "$APPIMAGE_PATH" ]]; then
  cp -f "$APPIMAGE_PATH" "$INSTALL_DIR/SisCrystal.AppImage"
  chmod +x "$INSTALL_DIR/SisCrystal.AppImage"
  LAUNCH_CMD="$INSTALL_DIR/SisCrystal.AppImage"
else
  echo "AppImage not found. You can still run via 'npm --prefix $REPO_ROOT run tauri dev'." >&2
  # Fallback to dev launch if no bundle is present
  LAUNCH_CMD="bash -lc 'cd "$REPO_ROOT" && npm run tauri dev'"
fi

DESKTOP_DIR="$HOME/.local/share/applications"
AUTOSTART_DIR="$HOME/.config/autostart"
mkdir -p "$DESKTOP_DIR" "$AUTOSTART_DIR"

DESKTOP_FILE="$DESKTOP_DIR/siscrystal.desktop"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=$APP_NAME
Comment=Game-like desktop UI that coexists with GNOME
Exec=$LAUNCH_CMD
Terminal=false
Categories=Utility;
StartupNotify=true
EOF

AUTOSTART_FILE="$AUTOSTART_DIR/siscrystal.desktop"
cp -f "$DESKTOP_FILE" "$AUTOSTART_FILE"

echo "Installed: $DESKTOP_FILE"
echo "Autostart: $AUTOSTART_FILE"

cat <<'TIP'

Next steps (GNOME coexist):
- Launch SisCrystal from Activities.
- Move it to Workspace 1, then set it fullscreen.
- Optionally: right-click the app icon and pin to favorites.

If media control still doesn't work:
- Ensure a MPRIS-compatible player is running (e.g. Spotify, VLC, browsers often expose MPRIS).
- Check: playerctl -l
TIP
