# 既存SSHアプリを活用したアーキテクチャ

## 概要

SSH接続の複雑な実装を回避し、既存の成熟したSSHアプリを活用することで、Claude PALは高品質なUI/UXの提供に集中できます。

## 新しいアーキテクチャ提案

```
[Claude PAL] ---(URL Scheme/Shortcuts)---> [既存SSHアプリ] ---(SSH)---> [自宅Mac]
     ↓                                            ↓
  UI/UX特化                                  SSH接続管理
```

## 主要な既存SSHアプリとその特徴

### 1. Termius
- **URL Scheme**: `ssh://user@host:port`
- **長所**: 最も人気、多機能、クロスプラットフォーム
- **短所**: URL schemeの制限あり
- **料金**: 基本無料、Pro版あり

### 2. Blink Shell
- **URL Scheme**: `blinkshell://run?key=<key>&cmd=<command>`
- **長所**: x-callback-url対応、開発者フレンドリー
- **短所**: iOS専用、有料（$19.99）
- **特徴**: mosh対応、コード編集機能

### 3. Secure ShellFish
- **統合方式**: iOS Shortcuts、Files app
- **長所**: 最高のiOS統合、Shortcuts対応が充実
- **短所**: iOS専用
- **特徴**: Files appプロバイダー

## 実装アプローチ

### Option A: URL Scheme連携

```typescript
// Ionicアプリから既存SSHアプリを起動
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export class SSHLauncher {
  async launchTermius(host: string, user: string, command?: string) {
    const url = `ssh://${user}@${host}:22`;
    
    if (Capacitor.isNativePlatform()) {
      await App.openUrl({ url });
    }
  }
  
  async launchBlink(key: string, command: string) {
    const encodedCmd = encodeURIComponent(command);
    const url = `blinkshell://run?key=${key}&cmd=${encodedCmd}`;
    
    await App.openUrl({ url });
  }
}
```

### Option B: iOS Shortcuts統合

```typescript
// Shortcuts経由でコマンド実行
export class ShortcutsIntegration {
  async runClaudeCommand(message: string) {
    // 1. Shortcutを作成（ユーザー側で設定）
    // 2. x-callback-urlで結果を受け取る
    
    const shortcutName = 'RunClaudeCode';
    const callbackUrl = 'claudepal://result';
    
    const url = `shortcuts://run-shortcut?name=${shortcutName}` +
               `&input=${encodeURIComponent(message)}` +
               `&x-success=${callbackUrl}`;
    
    await App.openUrl({ url });
  }
}
```

### Option C: ハイブリッドアプローチ

```typescript
// 設定画面でSSHアプリを選択可能に
interface SSHAppConfig {
  app: 'termius' | 'blink' | 'shellfish' | 'custom';
  connectionMethod: 'url-scheme' | 'shortcuts';
  customUrlTemplate?: string;
}

export class SSHAppBridge {
  constructor(private config: SSHAppConfig) {}
  
  async sendCommand(command: string) {
    switch(this.config.app) {
      case 'termius':
        return this.sendViaTermius(command);
      case 'blink':
        return this.sendViaBlink(command);
      case 'shellfish':
        return this.sendViaShortcuts(command);
    }
  }
}
```

## Claude PALの役割（UI/UX特化）

### 1. 美しいチャット UI
```typescript
// Claude Code用に最適化されたUI
@Component({
  template: `
    <ion-content>
      <div class="chat-container">
        <app-message *ngFor="let msg of messages" [message]="msg">
          <app-syntax-highlight [code]="msg.code" [language]="msg.language">
          </app-syntax-highlight>
        </app-message>
      </div>
      
      <ion-footer>
        <app-smart-input 
          [suggestions]="contextualSuggestions"
          (send)="sendToSSHApp($event)">
        </app-smart-input>
      </ion-footer>
    </ion-content>
  `
})
export class ClaudeChatPage {
  // 文脈に応じた入力補完
  contextualSuggestions: string[] = [];
  
  async sendToSSHApp(message: string) {
    // 1. メッセージを整形
    const command = this.formatForClaude(message);
    
    // 2. 選択されたSSHアプリに送信
    await this.sshBridge.sendCommand(command);
    
    // 3. UIを更新
    this.addMessage({ type: 'user', content: message });
  }
}
```

### 2. プロジェクト管理UI
```typescript
// Git worktreesやセッション管理
@Component({
  template: `
    <ion-list>
      <ion-item-sliding *ngFor="let project of projects">
        <ion-item>
          <ion-avatar slot="start">
            <ion-icon [name]="project.icon"></ion-icon>
          </ion-avatar>
          <ion-label>
            <h2>{{ project.name }}</h2>
            <p>{{ project.branch }} - {{ project.lastActivity | timeAgo }}</p>
          </ion-label>
        </ion-item>
        
        <ion-item-options>
          <ion-item-option (click)="switchProject(project)">
            <ion-icon name="swap-horizontal"></ion-icon>
            切替
          </ion-item-option>
        </ion-item-options>
      </ion-item-sliding>
    </ion-list>
  `
})
export class ProjectManagerComponent {}
```

### 3. スマート機能
- **コマンド履歴管理**: よく使うコマンドを学習
- **テンプレート機能**: 定型タスクをワンタップで実行
- **コンテキスト認識**: 現在の作業に応じた提案
- **ビジュアルフィードバック**: 実行状況の可視化

## セットアップフロー

### 初回セットアップ
1. **SSHアプリの選択**
   ```
   どのSSHアプリをお使いですか？
   [ ] Termius
   [ ] Blink Shell
   [ ] Secure ShellFish
   [ ] その他
   ```

2. **接続設定**
   ```
   SSHアプリ側で以下を設定してください：
   - ホスト名: your-mac.local
   - ユーザー名: your-username
   - 認証: SSH鍵（推奨）
   ```

3. **Shortcuts設定**（iOS）
   ```
   Claude PAL用のShortcutを作成：
   1. Shortcutsアプリを開く
   2. 提供されたテンプレートをインポート
   3. SSHアプリと連携設定
   ```

## メリット

### 開発側のメリット
1. **開発速度の向上**
   - SSH実装不要
   - ネイティブコード最小限
   - UI/UXに集中

2. **メンテナンス性**
   - SSHライブラリの更新不要
   - セキュリティパッチは既存アプリ側
   - バグ修正の負担軽減

3. **クロスプラットフォーム対応**
   - Web技術のみで実装
   - プラットフォーム固有の問題を回避

### ユーザー側のメリット
1. **信頼性**
   - 実績あるSSHアプリを利用
   - 既存の設定を活用可能
   - セキュリティが確保済み

2. **柔軟性**
   - 好きなSSHアプリを選択可能
   - 既存のワークフローを維持
   - 追加の学習コスト最小

3. **高品質なUX**
   - Claude Code専用に最適化されたUI
   - モダンなデザイン
   - スマートな機能

## 技術的な課題と解決策

### 課題1: アプリ間のデータ受け渡し
**解決策**:
- URL Schemeでコマンド送信
- Clipboard経由でデータ共有
- ローカルストレージで状態管理

### 課題2: 実行結果の取得
**解決策**:
- Shortcuts の結果を x-callback-url で受信
- ユーザーにコピー&ペーストしてもらう
- OCR技術で画面から読み取り（将来的）

### 課題3: リアルタイム性
**解決策**:
- プッシュ通知で完了を通知
- バックグラウンド更新
- 定期的なポーリング

## 実装ロードマップ

### Phase 1: MVP（2-3週間）
- 基本的なURL Scheme連携
- シンプルなチャットUI
- Termius対応

### Phase 2: 拡張（2-3週間）
- 複数SSHアプリ対応
- Shortcuts統合
- プロジェクト管理機能

### Phase 3: スマート機能（3-4週間）
- コマンド学習
- テンプレート機能
- コンテキスト認識

## 結論

既存のSSHアプリを活用することで、Claude PALは複雑なSSH実装を回避し、優れたUI/UXの提供に集中できます。これにより、開発期間の短縮と品質の向上を両立できます。