# Claude PAL 🤖

モバイル端末からSSH経由でClaude Codeを快適に操作するためのアプリケーション

## 概要

Claude PALは、SSH鍵の安全な管理と、Claude Code用に最適化されたターミナルUIを提供するIonicアプリケーションです。ユーザーは自分の好きな方法（Tailscale、VPN、ポート転送など）でMacに接続でき、アプリはSSH鍵の管理と美しいUIの提供に専念します。

## 特徴

- 🔐 **安全なSSH鍵管理** - 生体認証で保護された鍵ストレージ
- 🎨 **美しいターミナルUI** - Claude Code用に最適化
- 📱 **クロスプラットフォーム** - iOS、Android、Web対応
- 🚀 **柔軟な接続方法** - ユーザーが接続方法を自由に選択
- 💾 **プロファイル管理** - 複数の接続設定を保存

## 技術スタック

- **フロントエンド**: Ionic 8.6 + Angular 20 + Capacitor 7.4
- **ターミナル**: xterm.js
- **SSH**: ssh2
- **セキュリティ**: Capacitor Secure Storage

## クイックスタート

### 前提条件
- Node.js 20.x以上
- npm 10.x以上
- Ionic CLI

### インストール
```bash
# リポジトリのクローン
git clone https://github.com/yourusername/claude-pal.git
cd claude-pal

# 依存関係のインストール
npm install

# 開発サーバーの起動
ionic serve
```

詳細な開発手順は [`.claude/plan/03_quick_start_guide.md`](.claude/plan/03_quick_start_guide.md) を参照してください。

## 使い方

### 1. SSH鍵の生成
アプリ内で安全なSSH鍵を生成し、生体認証で保護します。

### 2. 公開鍵の登録
生成された公開鍵をMacの `~/.ssh/authorized_keys` に追加します。

### 3. 接続
お好みの方法でMacに接続：
- 同一WiFi内: IPアドレスまたは `.local` ホスト名
- Tailscale経由: `hostname.tailscale`
- その他: VPN、ポート転送など

## 開発

### プロジェクト構造
```
claude-pal/
├── src/app/
│   ├── core/          # コアサービス
│   ├── shared/        # 共有コンポーネント
│   └── features/      # 機能モジュール
├── .claude/
│   ├── plan/          # 実装計画
│   └── research/      # 技術調査
```

### 実装計画
- [アーキテクチャ](.claude/plan/01_architecture_and_tech_stack.md)
- [実装TODO](.claude/plan/02_implementation_todo.md)
- [クイックスタート](.claude/plan/03_quick_start_guide.md)

## ライセンス

[MITライセンス](LICENSE)

## 貢献

プルリクエストを歓迎します！大きな変更を行う場合は、まずissueを開いて変更内容について議論してください。

## サポート

問題や質問がある場合は、[Issues](https://github.com/yourusername/claude-pal/issues)を開いてください。