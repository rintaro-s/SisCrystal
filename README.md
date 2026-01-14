# SCHALE Desktop Environment (English)

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
  librsvg2-dev
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

## Build

```bash
# Build for Ubuntu (.deb, .AppImage)
npm run tauri build
```

Built files are generated in `src-tauri/target/release/bundle/`.

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
  librsvg2-dev
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

## ビルド

```bash
# Ubuntu向けにビルド (.deb, .AppImage)
npm run tauri build
```

ビルドされたファイルは \`src-tauri/target/release/bundle/\` に生成されます。

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
└── vite.config.ts
```

## カスタマイズ

### テーマカラー

メインカラーは \`#00A3FF\` (SCHALE Blue) を使用しています。

### ウィンドウ設定

\`src-tauri/tauri.conf.json\` でウィンドウの設定を変更可能。
