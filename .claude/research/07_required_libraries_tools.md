# 必要なライブラリとツールのまとめ

## フロントエンド（Ionicアプリ）

### コアフレームワーク
```json
{
  "@ionic/angular": "^8.6.5",
  "@angular/core": "^19.1.2",
  "@angular/common": "^19.1.2",
  "@angular/forms": "^19.1.2",
  "@angular/router": "^19.1.2",
  "@capacitor/core": "^7.0.0",
  "@capacitor/ios": "^7.0.0",
  "@capacitor/android": "^7.0.0"
}
```

### 状態管理
```json
{
  "@ngrx/store": "^19.2.1",
  "@ngrx/effects": "^19.2.1",
  "@ngrx/entity": "^19.2.1",
  "@ngrx/store-devtools": "^19.2.1"
}
```

### UI/UXコンポーネント
```json
{
  "monaco-editor": "^0.46.0",
  "@materia-ui/ngx-monaco-editor": "^8.0.0",
  "xterm": "^5.4.0",
  "xterm-addon-fit": "^0.9.0",
  "xterm-addon-web-links": "^0.10.0",
  "ansi-to-html": "^0.7.2",
  "strip-ansi": "^7.1.0"
}
```

### ネイティブ機能
```json
{
  "@capacitor/push-notifications": "^7.0.0",
  "@capacitor/preferences": "^7.0.0",
  "@capacitor/filesystem": "^7.0.0",
  "@capacitor/network": "^7.0.0",
  "@capacitor/app": "^7.0.0",
  "@capacitor/haptics": "^7.0.0",
  "@capacitor/keyboard": "^7.0.0",
  "@capacitor-community/fcm": "^5.0.0"
}
```

### ユーティリティ
```json
{
  "rxjs": "^7.8.1",
  "date-fns": "^3.6.0",
  "lodash-es": "^4.17.21",
  "uuid": "^10.0.0"
}
```

## バックエンド（Node.js）

### コアライブラリ
```json
{
  "express": "^5.1.0",
  "socket.io": "^4.8.1",
  "cors": "^2.8.5",
  "helmet": "^8.0.0",
  "compression": "^1.7.5",
  "typescript": "^5.8.3"
}
```

### SSH接続
```json
{
  "ssh2": "^1.16.0",
  "node-pty": "^1.0.0",
  "ssh2-streams": "^0.4.10"
}
```

### 認証・セキュリティ
```json
{
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "express-rate-limit": "^7.1.4",
  "express-validator": "^7.0.1"
}
```

### プッシュ通知
```json
{
  "firebase-admin": "^13.3.0",
  "node-pushnotifications": "^2.0.3"
}
```

### データベース（オプション）
```json
{
  "sqlite3": "^5.1.7",
  "knex": "^3.1.0",
  "redis": "^4.6.13"
}
```

### ユーティリティ
```json
{
  "winston": "^3.11.0",
  "dotenv": "^16.4.0",
  "node-cron": "^3.0.3",
  "p-queue": "^8.0.0"
}
```

## 開発ツール

### ビルドツール
```json
{
  "@ionic/cli": "^7.2.0",
  "@angular/cli": "^19.1.2",
  "typescript": "^5.8.3",
  "webpack": "^5.95.0",
  "@types/node": "^22.9.0"
}
```

### テスティング
```json
{
  "@angular/core/testing": "^19.1.2",
  "jasmine-core": "^5.4.0",
  "karma": "^6.4.4",
  "karma-jasmine": "^5.1.0",
  "karma-chrome-launcher": "^3.2.0",
  "@types/jasmine": "^5.1.4",
  "jest": "^29.7.0",
  "@types/jest": "^29.5.14"
}
```

### リンティング・フォーマッティング
```json
{
  "eslint": "^9.14.0",
  "@typescript-eslint/parser": "^8.15.0",
  "@typescript-eslint/eslint-plugin": "^8.15.0",
  "prettier": "^3.3.3",
  "husky": "^9.1.6",
  "lint-staged": "^15.2.10"
}
```

## システム要件

### 開発環境
- Node.js 20.x以上（Angular 19はNode.js 18以上必須）
- npm 10.x以上 または yarn 1.22.x以上
- Ionic CLI 7.x
- Android Studio Koala以上（Android開発の場合）
- Xcode 15+（iOS開発の場合）
- TypeScript 5.8以上（Angular 19必須）

### サーバー環境
- Linux (Ubuntu 20.04+ 推奨) または macOS
- tmux 3.0以上
- git 2.30以上
- GitHub CLI (gh) 2.x
- SSH Server (OpenSSH 8.x+)

### オプショナルツール
- fswatch (macOS) または inotify-tools (Linux)
- jq (JSONパース用)
- tree (ディレクトリ構造表示用)

## カスタムCapacitorプラグイン開発

### 必要な追加ライブラリ
```json
{
  "@capacitor/cli": "^7.0.0",
  "@capacitor/core": "^7.0.0",
  "@capacitor/android": "^7.0.0",
  "@capacitor/ios": "^7.0.0",
  "rimraf": "^5.0.5",
  "rollup": "^4.9.6"
}
```

### Android側実装用
```gradle
dependencies {
    implementation 'com.jcraft:jsch:0.1.55'
    implementation 'org.apache.sshd:sshd-core:2.11.0'
    implementation 'com.github.mwiede:jsch:0.2.9'
}
```

### iOS側実装用
```ruby
# Podfile
pod 'NMSSH', '~> 2.2.8'
pod 'libssh2', '~> 1.11.0'
```

## Docker環境（オプション）

### Dockerfile例
```dockerfile
FROM node:18-alpine

# 必要なシステムパッケージ
RUN apk add --no-cache \
    git \
    openssh-client \
    tmux \
    bash \
    python3 \
    make \
    g++

# GitHub CLI
RUN wget -qO- https://github.com/cli/cli/releases/download/v2.35.0/gh_2.35.0_linux_amd64.tar.gz | tar xz && \
    mv gh_2.35.0_linux_amd64/bin/gh /usr/local/bin/

WORKDIR /app
```

## インストールコマンド

### フロントエンド初期設定
```bash
# Ionicプロジェクト作成
ionic start claude-pal tabs --type=angular --capacitor

# 依存関係インストール
cd claude-pal
npm install --save ssh2 socket.io-client monaco-editor xterm @ngrx/store @ngrx/effects

# Capacitorプラットフォーム追加
ionic capacitor add ios
ionic capacitor add android
```

### バックエンド初期設定
```bash
# プロジェクト初期化
mkdir claude-pal-backend
cd claude-pal-backend
npm init -y

# 依存関係インストール
npm install --save express socket.io ssh2 node-pty firebase-admin
npm install --save-dev @types/node @types/express typescript nodemon
```

## セキュリティ考慮事項

1. **SSH鍵管理**: Ionic Secure Storageで暗号化保存
2. **通信暗号化**: WSS (WebSocket Secure) 使用必須
3. **認証トークン**: JWT with RS256
4. **入力検証**: すべてのユーザー入力をサニタイズ
5. **レート制限**: API呼び出しに制限を設定

## パフォーマンス最適化

1. **コード分割**: Angularのレイジーローディング活用
2. **画像最適化**: WebP形式使用、適切なサイズ
3. **キャッシング**: Service WorkerとIndexedDB活用
4. **バンドルサイズ**: Tree-shakingとminification
5. **仮想スクロール**: 大量データ表示時に必須