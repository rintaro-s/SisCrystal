# SCHALE Desktop Environment

Ubuntu向けのモダンなデスクトップ環境UI。



https://github.com/user-attachments/assets/92e7594f-154e-49ec-9e8b-7c502b757081


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
