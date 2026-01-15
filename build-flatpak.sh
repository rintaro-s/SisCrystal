#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build-flatpak"
REPO_DIR="${SCRIPT_DIR}/flatpak_repo"
OUTPUT_DIR="${SCRIPT_DIR}"

echo "[*] SisCrystal Flatpak build"
echo "[*] Build directory: $BUILD_DIR"
echo "[*] Repo directory: $REPO_DIR"

# Check if flatpak-builder is installed
if ! command -v flatpak-builder &> /dev/null; then
    echo "[!] flatpak-builder not found. Install with: sudo apt install flatpak-builder"
    exit 1
fi

# Check if runtime/sdk are installed
if ! flatpak info org.gnome.Platform//48 &>/dev/null; then
    echo "[!] Runtime org.gnome.Platform//48 not installed."
    echo "[*] Install with: flatpak install -y flathub org.gnome.Platform//48 org.gnome.Sdk//48"
    exit 1
fi

# Clean build directory
rm -rf "$BUILD_DIR"
mkdir -p "$REPO_DIR"

LOG_FILE="$SCRIPT_DIR/flatpak-build.log"

echo "[*] Building Flatpak... (log: $LOG_FILE)"
flatpak-builder \
    --repo="$REPO_DIR" \
    --force-clean \
    --jobs="$(nproc)" \
    "$BUILD_DIR" \
    "$SCRIPT_DIR/com.siscrystal.desktop.yml" 2>&1 | tee "$LOG_FILE"

echo "[+] Flatpak built successfully!"
echo "[*] To install locally (adds a user remote pointing to $REPO_DIR):"
echo "    flatpak remote-add --user --if-not-exists --no-gpg-verify siscrystal-local $REPO_DIR"
echo "    flatpak install -y --user siscrystal-local com.siscrystal.desktop"
echo "[*] To run:"
echo "    flatpak run com.siscrystal.desktop"
echo "[*] To export .flatpak file:"
echo "    flatpak build-bundle $REPO_DIR SisCrystal.flatpak com.siscrystal.desktop"
