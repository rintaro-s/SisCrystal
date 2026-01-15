# SCHALE Desktop Environment

<img width="1920" height="1080" alt="Screenshot from 2026-01-14 09-53-09" src="https://github.com/user-attachments/assets/cd0a7589-8ae5-4849-bdfa-5d4f344b4d6e" />
Wallpaper “Archちゃん” by Ravimo is licensed under CC BY 4.0

https://github.com/user-attachments/assets/0b84328c-c0e5-4888-89c8-0a1a11a3339c

A modern desktop environment UI for Ubuntu.

## Overview

- **Framework**: Tauri 2.x + React + TypeScript
- **Styling**: Tailwind CSS 4.x
- **Icons**: Lucide React

## Features

- Beautiful crystal-themed UI
- Three scenes: Title, Login, Desktop
- Dynamic Island-style status bar
- MomoTalk-style notification widget
- Floating window system
- Dock-style app launcher
- Grid menu system

## Requirements

### Prerequisites for Ubuntu

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  flatpak \
  flatpak-builder

# Optional (recommended): improves media status detection on some setups
sudo apt install playerctl
```

### Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Node.js

```bash
# Node.js 18+ required
nvm install 20
nvm use 20
```

## Installation

```bash
cd sis-crystal-desktop
npm install
```

## Development

```bash
# Start development server
npm run tauri dev
```

## Build & Package (Flatpak)

### Setup Flatpak runtime (one-time)

```bash
flatpak install -y flathub org.gnome.Platform//48 org.gnome.Sdk//48
```

### Build Flatpak package

```bash
./build-flatpak.sh
```

This creates:
- `build-flatpak/` - build directory
- `flatpak_repo/` - local Flatpak repository

### Install & Run

```bash
# Add local repo as a user remote (first time only)
flatpak remote-add --user --if-not-exists --no-gpg-verify siscrystal-local flatpak_repo

# Install
flatpak install -y --user siscrystal-local com.siscrystal.desktop

# Run
flatpak run com.siscrystal.desktop
```

### Export as .flatpak file (for distribution)

```bash
flatpak build-bundle flatpak_repo SisCrystal.flatpak com.siscrystal.desktop
```

This creates `SisCrystal.flatpak` which can be distributed and installed with:
```bash
flatpak install SisCrystal.flatpak
```

## GitHub Pages Demo

This repository can be published as a GitHub Pages demo. The web demo will show a modal notice that system features require Linux.
After enabling GitHub Pages in the repository settings, the site will be available at:
https://rintaro-s.github.io/SisCrystal/

## Project Structure

```
sis-crystal-desktop/
├── src/                    # Frontend (React)
│   ├── App.tsx            # Main application
│   ├── index.css          # Tailwind CSS
│   └── main.tsx           # Entry point
├── src-tauri/             # Backend (Rust/Tauri)
│   ├── src/
│   │   └── lib.rs         # Tauri commands
│   ├── tauri.conf.json    # Tauri config
│   └── Cargo.toml
├── index.html
├── package.json
├── build-flatpak.sh       # Local Flatpak build script
├── com.siscrystal.desktop.yml # Flatpak manifest
└── vite.config.ts
```

## Customization

### Theme Color

Main color is `#00A3FF` (SCHALE Blue).

### Window Settings

You can change window settings in `src-tauri/tauri.conf.json`.

# SCHALE Desktop Environment

Ubuntu向けのモダンなデスクトップ環境UI。

## 概要

- **フレームワーク**: Tauri 2.x + React + TypeScript
- **スタイリング**: Tailwind CSS 4.x
- **アイコン**: Lucide React

## 機能

-  クリスタルテーマの美しいUI
-  タイトル画面・ログイン画面・デスクトップ画面の3シーン
-  Dynamic Islandスタイルのステータスバー
-  MomoTalkスタイルの通知ウィジェット
-  フローティングウィンドウシステム
- ドック型アプリランチャー
-  グリッドメニューシステム

## 必要条件

### Ubuntu での前提条件

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  flatpak \
  flatpak-builder

# 任意（推奨）: 環境によっては再生状態検知が安定します
sudo apt install playerctl
```

### Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Node.js

```bash
# Node.js 18+ が必要
nvm install 20
nvm use 20
```

## インストール

```bash
cd sis-crystal-desktop
npm install
```

## 開発

```bash
# 開発サーバーを起動
npm run tauri dev
```

## ビルド＆パッケージング（Flatpak）

### Flatpakランタイム設定（初回のみ）

```bash
flatpak install -y flathub org.gnome.Platform//48 org.gnome.Sdk//48
```

### Flatpakパッケージをビルド

```bash
./build-flatpak.sh
```

生成されるもの:
- `build-flatpak/` - ビルド作業ディレクトリ
- `flatpak_repo/` - ローカルFlatpakリポジトリ

### インストール＆実行

```bash
# 初回のみ: ローカルリポをユーザーリモートとして追加
flatpak remote-add --user --if-not-exists --no-gpg-verify siscrystal-local flatpak_repo

# インストール
flatpak install -y --user siscrystal-local com.siscrystal.desktop

# 実行
flatpak run com.siscrystal.desktop
```

### .flatpakファイルとしてエクスポート（配布用）

```bash
flatpak build-bundle flatpak_repo SisCrystal.flatpak com.siscrystal.desktop
```

これで `SisCrystal.flatpak` が生成され、配布後は以下でインストール可能：
```bash
flatpak install SisCrystal.flatpak
```

## GitHub Pages デモ

このリポジトリは GitHub Pages としてデモ公開できます。Web版では「システム機能はLinuxで使用してください」というモーダルが表示されます。
リポジトリ設定で GitHub Pages を有効にすると、以下でアクセス可能：
https://rintaro-s.github.io/SisCrystal/

## プロジェクト構造

```
sis-crystal-desktop/
├── src/                    # フロントエンド (React)
│   ├── App.tsx            # メインアプリケーション
│   ├── index.css          # Tailwind CSS
│   └── main.tsx           # エントリーポイント
├── src-tauri/             # バックエンド (Rust/Tauri)
│   ├── src/
│   │   └── lib.rs         # Tauri コマンド
│   ├── tauri.conf.json    # Tauri 設定
│   └── Cargo.toml
├── index.html
├── package.json
├── build-flatpak.sh       # ローカルFlatpakビルドスクリプト
├── com.siscrystal.desktop.yml # Flatpakマニフェスト
└── vite.config.ts
```

## カスタマイズ

### テーマカラー

メインカラーは `#00A3FF` (SCHALE Blue) を使用しています。

### ウィンドウ設定

`src-tauri/tauri.conf.json` でウィンドウの設定を変更可能。
