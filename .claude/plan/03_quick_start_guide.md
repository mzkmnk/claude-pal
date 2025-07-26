# Claude PAL クイックスタートガイド

## 開発環境のセットアップ

### 1. 前提条件
```bash
# Node.jsバージョン確認（20.x以上必要）
node --version

# npm バージョン確認（10.x以上推奨）
npm --version

# Ionic CLI インストール
npm install -g @ionic/cli
```

### 2. プロジェクトの作成
```bash
# プロジェクト作成
ionic start claude-pal tabs --type=angular --capacitor

# ディレクトリに移動
cd claude-pal

# 依存関係のインストール
npm install
```

### 3. 必要なパッケージのインストール
```bash
# SSH関連
npm install ssh2 ssh2-promise node-forge

# ターミナルUI
npm install xterm xterm-addon-fit xterm-addon-web-links xterm-addon-search

# セキュリティ
npm install crypto-js

# Capacitorプラグイン
npm install @capacitor/preferences @capacitor/clipboard @capacitor/filesystem

# 開発ツール
npm install -D @types/ssh2 @types/node-forge
```

### 4. プラットフォームの追加
```bash
# iOS
ionic capacitor add ios

# Android
ionic capacitor add android
```

## 開発の開始

### ローカル開発サーバー
```bash
# ブラウザで開発
ionic serve

# デバイスプレビュー
ionic serve --lab
```

### モバイルデバイスでのテスト
```bash
# iOS（Macのみ）
ionic capacitor run ios -l

# Android
ionic capacitor run android -l
```

## ディレクトリ構造の作成
```bash
# コアモジュール
mkdir -p src/app/core/services
mkdir -p src/app/core/guards
mkdir -p src/app/core/interceptors

# 共有モジュール
mkdir -p src/app/shared/components
mkdir -p src/app/shared/directives
mkdir -p src/app/shared/pipes

# 機能モジュール
mkdir -p src/app/features/chat
mkdir -p src/app/features/terminal
mkdir -p src/app/features/keys
mkdir -p src/app/features/connection
mkdir -p src/app/features/settings
```

## 最初のコンポーネント作成

### SSH鍵管理サービス
```bash
ionic generate service core/services/key-manager
```

### ターミナルコンポーネント
```bash
ionic generate component shared/components/terminal
```

### 接続画面
```bash
ionic generate page features/connection/connection
```

## Git設定
```bash
# リポジトリ初期化（既に存在する場合はスキップ）
git init

# .gitignoreに追加
echo "node_modules/" >> .gitignore
echo ".env" >> .gitignore
echo "*.log" >> .gitignore

# 初回コミット
git add .
git commit -m "feat: Claude PAL初期セットアップ"
```

## 環境変数の設定

### src/environments/environment.ts
```typescript
export const environment = {
  production: false,
  appName: 'Claude PAL',
  version: '1.0.0',
  defaultSSHPort: 22,
  defaultTerminalRows: 24,
  defaultTerminalCols: 80
};
```

### src/environments/environment.prod.ts
```typescript
export const environment = {
  production: true,
  appName: 'Claude PAL',
  version: '1.0.0',
  defaultSSHPort: 22,
  defaultTerminalRows: 24,
  defaultTerminalCols: 80
};
```

## TypeScript設定の更新

### tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@app/*": ["src/app/*"],
      "@core/*": ["src/app/core/*"],
      "@shared/*": ["src/app/shared/*"],
      "@features/*": ["src/app/features/*"],
      "@env/*": ["src/environments/*"]
    },
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## 開発のヒント

### 1. SSH接続のテスト環境
開発中はローカルのSSHサーバーでテストすることを推奨：
```bash
# macOS: SSHが有効か確認
sudo systemsetup -getremotelogin

# 有効化
sudo systemsetup -setremotelogin on
```

### 2. Chrome DevToolsでのデバッグ
```bash
# Androidデバイスのデバッグ
chrome://inspect

# Safari（iOS）
Safari > 開発 > [デバイス名]
```

### 3. ホットリロード
開発中は `-l` フラグを使用してライブリロードを有効化

### 4. Capacitor同期
```bash
# コード変更後の同期
ionic capacitor sync
```

## トラブルシューティング

### よくある問題

1. **SSH接続エラー**
   - ローカルファイアウォールの確認
   - SSH鍵の権限確認（600）

2. **Capacitorビルドエラー**
   ```bash
   # クリーンビルド
   ionic capacitor sync --force
   ```

3. **iOSシミュレーターの問題**
   ```bash
   # シミュレーターリスト確認
   xcrun simctl list devices
   ```

## 次のステップ

1. `.claude/plan/02_implementation_todo.md` のTODOリストに従って実装
2. 各フェーズ完了時にテストを実施
3. 定期的にコミット＆プッシュ

開発の準備が整いました！🚀