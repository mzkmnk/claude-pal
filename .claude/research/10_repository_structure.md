# Claude PAL リポジトリ構成案

## モノレポ構成の提案

1つのリポジトリですべてのコンポーネントを管理するモノレポ構成を提案します。

```
claude-pal/
├── .claude/                      # Claude Code用ドキュメント
│   ├── research/                 # 技術調査（現在のドキュメント）
│   └── CLAUDE.md                 # プロジェクト固有の指示
│
├── apps/                         # アプリケーション
│   ├── mobile/                   # Ionicモバイルアプリ
│   │   ├── src/
│   │   ├── capacitor.config.ts
│   │   ├── ionic.config.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── backend/                  # Node.jsバックエンド（オプション）
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                     # 共有パッケージ
│   ├── shared/                   # 共通型定義・ユーティリティ
│   │   ├── src/
│   │   │   ├── types/          # 共通型定義
│   │   │   ├── utils/          # 共通ユーティリティ
│   │   │   └── constants/      # 共通定数
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ssh-client/              # SSH接続ロジック
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── plugins/                      # Capacitorプラグイン
│   └── capacitor-ssh/           # カスタムSSHプラグイン
│       ├── android/             # Android実装
│       ├── ios/                 # iOS実装
│       ├── src/                 # TypeScript定義
│       ├── package.json
│       └── tsconfig.json
│
├── scripts/                      # ビルド・デプロイスクリプト
│   ├── build.ts
│   ├── deploy.ts
│   └── setup.ts
│
├── docs/                         # プロジェクトドキュメント
│   ├── architecture.md
│   ├── development.md
│   └── deployment.md
│
├── .github/                      # GitHub Actions
│   └── workflows/
│       ├── ci.yml
│       ├── release.yml
│       └── claude-code-review.yml
│
├── nx.json                       # Nxモノレポ設定（推奨）
├── package.json                  # ルートpackage.json
├── tsconfig.base.json           # 共通TypeScript設定
├── .gitignore
├── .prettierrc
├── .eslintrc.json
└── README.md
```

## 各ディレクトリの役割

### `/apps/mobile/` - Ionicモバイルアプリ
```
mobile/
├── src/
│   ├── app/
│   │   ├── core/               # コアモジュール
│   │   ├── features/           # 機能モジュール
│   │   │   ├── claude-chat/
│   │   │   ├── file-browser/
│   │   │   ├── git-operations/
│   │   │   └── sessions/
│   │   └── shared/             # 共有コンポーネント
│   ├── assets/
│   └── environments/
├── android/                     # Androidプロジェクト
├── ios/                        # iOSプロジェクト
└── www/                        # ビルド出力
```

### `/apps/backend/` - Node.jsバックエンド（オプション）
```
backend/
├── src/
│   ├── controllers/            # APIコントローラー
│   ├── services/              # ビジネスロジック
│   ├── websocket/             # WebSocketハンドラー
│   ├── utils/                 # ユーティリティ
│   └── index.ts               # エントリーポイント
└── dist/                       # ビルド出力
```

### `/packages/` - 共有パッケージ
- **shared**: フロントエンド・バックエンド間で共有する型定義とユーティリティ
- **ssh-client**: SSH接続ロジックを抽象化したライブラリ

### `/plugins/capacitor-ssh/` - カスタムCapacitorプラグイン
```
capacitor-ssh/
├── android/
│   └── src/main/java/com/claudepal/ssh/
│       └── SSHPlugin.kt        # Kotlin実装
├── ios/
│   └── Plugin/
│       └── SSHPlugin.swift     # Swift実装
└── src/
    ├── definitions.ts          # TypeScript定義
    └── index.ts               # エクスポート
```

## パッケージ管理戦略

### 1. Nx（推奨）を使用したモノレポ管理

#### ✅ Nxの公式サポート状況（2025年1月確認）

**Ionic Angular**
- `@nxext/ionic-angular` プラグインで完全サポート
- 月間39,000ダウンロード
- Capacitor統合も含む

**Express/Node.js**
- `@nx/express` - 公式Expressプラグイン
- `@nx/node` - 公式Node.jsプラグイン
- TypeScript、ESBuild、Webpack対応

```json
// nx.json
{
  "workspaceLayout": {
    "appsDir": "apps",
    "libsDir": "packages"
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"]
    }
  }
}
```

#### セットアップコマンド
```bash
# Nxワークスペース作成
npx create-nx-workspace@latest claude-pal --preset=empty

# Ionic Angularアプリ追加
npm install -D @nxext/ionic-angular
nx g @nxext/ionic-angular:app mobile

# Expressバックエンド追加
nx g @nx/express:app backend

# 共有ライブラリ作成
nx g @nx/js:lib shared

# Capacitorプラグイン用ライブラリ
nx g @nx/js:lib capacitor-ssh --buildable
```

### 2. ルートpackage.json
```json
{
  "name": "claude-pal",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "plugins/*"
  ],
  "scripts": {
    "dev:mobile": "nx serve mobile",
    "dev:backend": "nx serve backend",
    "build:all": "nx run-many --target=build --all",
    "test:all": "nx run-many --target=test --all",
    "lint:all": "nx run-many --target=lint --all"
  }
}
```

## 依存関係の管理

### 共通依存関係（ルート）
```json
{
  "devDependencies": {
    "@nx/workspace": "^21.0.0",
    "@nxext/ionic-angular": "^21.0.0",
    "@nx/express": "^21.0.0",
    "@nx/node": "^21.0.0",
    "@nx/js": "^21.0.0",
    "@types/node": "^22.9.0",
    "typescript": "^5.8.3",
    "eslint": "^9.14.0",
    "prettier": "^3.3.3"
  }
}
```

### アプリ固有の依存関係
各アプリ（mobile、backend）は独自のpackage.jsonで管理

## 開発フロー

### 1. 初期セットアップ
```bash
# リポジトリクローン
git clone https://github.com/username/claude-pal.git
cd claude-pal

# 依存関係インストール
npm install

# 開発環境セットアップ
npm run setup
```

### 2. 開発サーバー起動
```bash
# モバイルアプリ開発
npm run dev:mobile

# バックエンド開発（使用する場合）
npm run dev:backend

# 同時起動
npm run dev:all
```

### 3. ビルド
```bash
# すべてビルド
npm run build:all

# 個別ビルド
nx build mobile
nx build backend
```

## CI/CD設定

### GitHub Actions例
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint:all
      - run: npm run test:all
      - run: npm run build:all
```

## メリット

1. **一元管理**: すべてのコードが1つのリポジトリに
2. **コード共有**: 型定義やユーティリティを簡単に共有
3. **統一された開発体験**: 共通のツールチェーン
4. **原子的なコミット**: 関連する変更を1つのPRで管理
5. **簡単なリファクタリング**: プロジェクト全体の変更が容易
6. **Nxの恩恵**: 
   - スマートキャッシング（ビルド高速化）
   - 影響分析（変更の影響範囲を自動検出）
   - 並列実行（タスクの並列処理）

## デメリットと対策

1. **リポジトリサイズ**: 
   - 対策: Git LFSの活用、不要なビルド成果物の.gitignore

2. **ビルド時間**:
   - 対策: Nxのキャッシュ機能、並列ビルド

3. **権限管理**:
   - 対策: CODEOWNERSファイルでディレクトリ別の権限設定