# ネイティブSSH実装ガイド - 段階的アプローチ

## 概要
アプリ内でSSH接続を実装し、どこからでもClaude Codeを使えるようにする実装ガイド。

## 1. SSH接続の実装方法

### Capacitorプラグインアプローチ（推奨）

#### Step 1: 既存のCapacitorプラグインを活用
```bash
# SSH機能を持つCapacitorプラグインを探す
npm install capacitor-ssh-plugin  # 仮想的な例
```

実際に使える可能性のあるプラグイン：
- `capacitor-secure-storage-plugin`（SSH鍵の保存）
- `@capacitor/filesystem`（ファイル操作）
- カスタムプラグインの作成が必要

#### Step 2: WebベースのSSHライブラリ
```typescript
// Browser-compatible SSH library
import { SSHClient } from 'browser-ssh2';  // 例

export class SSHService {
  private client: SSHClient;
  
  async connect(config: SSHConfig) {
    this.client = new SSHClient();
    
    // WebSocketプロキシ経由でSSH接続
    await this.client.connect({
      host: config.host,
      username: config.username,
      privateKey: config.privateKey,
      // WebSocketプロキシサーバー（自宅に設置）
      proxy: 'wss://home.example.com/ssh-proxy'
    });
  }
}
```

### 最も現実的な解決策：WebSocketプロキシ

```
[Ionicアプリ] ---(WebSocket)---> [自宅の軽量プロキシ] ---(SSH)---> [Mac]
```

**なぜこれが良いか**：
- プロキシは単純なSSH中継のみ（セキュリティ責任が最小）
- アプリ側でUI/UXに集中できる
- 既存のWeb技術で実装可能

## 2. どこからでもアクセスする方法

### Option A: Tailscale（推奨）

```bash
# 自宅のMacで実行
brew install tailscale
tailscale up

# スマホにもTailscaleアプリをインストール
# → 自動的にVPNで接続される
```

**メリット**:
- 設定が超簡単
- 無料で使える
- セキュア（WireGuardベース）

**アプリ側の実装**:
```typescript
// TailscaleのIPアドレスを使用
const config = {
  host: '100.64.0.1',  // Tailscale IP
  port: 22,
  username: 'your-username'
};
```

### Option B: Cloudflare Tunnel

```bash
# 自宅のMacで実行
brew install cloudflared
cloudflared tunnel create claude-pal
cloudflared tunnel route dns claude-pal claude-pal.example.com

# SSHをトンネル経由で公開
cloudflared tunnel run --url ssh://localhost:22 claude-pal
```

### Option C: 自宅ルーターのポート転送
- セキュリティリスクがあるため非推奨
- Dynamic DNSと組み合わせる必要あり

## 3. 段階的な実装計画

### Phase 1: ローカルネットワークで動作確認（1-2週間）

```typescript
// 最初はシンプルに同一WiFi内で動作確認
export class SimpleSSHService {
  async connectLocal() {
    // WebSocketプロキシ（ローカル）
    const ws = new WebSocket('ws://192.168.1.100:8080');
    
    ws.onopen = () => {
      // SSH接続コマンドを送信
      ws.send(JSON.stringify({
        action: 'connect',
        host: 'localhost',
        user: 'username'
      }));
    };
  }
}
```

### Phase 2: Tailscale統合（1週間）

```typescript
// Tailscale経由の接続
export class TailscaleSSHService {
  async connectViaVPN() {
    // Tailscale IPを自動検出
    const tailscaleIP = await this.detectTailscaleIP();
    
    return this.connect({
      host: tailscaleIP,
      port: 22
    });
  }
}
```

### Phase 3: 美しいターミナルUI（2-3週間）

```typescript
// xterm.jsを使用したターミナル表示
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

@Component({
  template: `
    <div class="terminal-container" #terminalDiv></div>
  `
})
export class TerminalComponent {
  private terminal: Terminal;
  
  ngOnInit() {
    this.terminal = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff'
      },
      fontFamily: 'Monaco, Menlo, monospace',
      fontSize: 14
    });
    
    this.terminal.open(this.terminalDiv.nativeElement);
  }
  
  writeData(data: string) {
    this.terminal.write(data);
  }
}
```

## 4. 軽量プロキシサーバー（自宅Mac用）

```javascript
// 自宅のMacで動かす最小限のプロキシ
const WebSocket = require('ws');
const { Client } = require('ssh2');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  let sshClient = new Client();
  
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    if (data.action === 'connect') {
      sshClient.connect({
        host: 'localhost',
        username: data.user,
        privateKey: require('fs').readFileSync('/Users/you/.ssh/id_rsa')
      });
    }
    
    if (data.action === 'command') {
      sshClient.exec(data.command, (err, stream) => {
        stream.on('data', (data) => {
          ws.send(JSON.stringify({
            type: 'output',
            data: data.toString()
          }));
        });
      });
    }
  });
});
```

## 5. 実装の簡略化テクニック

### テクニック1: 既存ライブラリの活用
```json
{
  "dependencies": {
    "xterm": "^5.4.0",
    "xterm-addon-fit": "^0.9.0",
    "xterm-addon-web-links": "^0.10.0",
    "@capacitor/storage": "^7.0.0"
  }
}
```

### テクニック2: プログレッシブエンハンスメント
1. 最初は基本的なコマンド実行のみ
2. 次にインタラクティブなセッション
3. 最後に高度な機能（ファイル転送など）

### テクニック3: コミュニティの活用
- Capacitorフォーラムで質問
- 既存のSSHアプリのオープンソース実装を参考に
- ChatGPT/Claudeでコード生成

## 6. セキュリティベストプラクティス

```typescript
// SSH鍵の安全な保存
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export class SecureKeyStorage {
  async savePrivateKey(key: string) {
    if (Capacitor.isNativePlatform()) {
      // ネイティブの安全なストレージを使用
      await Preferences.set({
        key: 'ssh_private_key',
        value: await this.encrypt(key)
      });
    }
  }
  
  private async encrypt(data: string): Promise<string> {
    // Face ID/Touch IDで保護
    // プラットフォーム固有の暗号化
    return encrypted;
  }
}
```

## まとめ

1. **Tailscale**を使えば、どこからでもアクセス可能
2. **軽量プロキシ**で実装の複雑さを軽減
3. **段階的実装**で着実に進める
4. **xterm.js**で美しいターミナルUI

この方法なら、フロントエンドの知識を活かしながら、段階的にSSH機能を実装できます。