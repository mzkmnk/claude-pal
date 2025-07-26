# SSH接続とClaude Code操作の技術調査

## 技術要件
Claude CodeをSSH経由でリモート操作するために必要な技術要素と実装方法。

## 1. SSH接続技術

### Node.js環境での実装オプション

#### ssh2 (推奨)
```javascript
const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.shell((err, stream) => {
    if (err) throw err;
    
    // Claude Codeの起動
    stream.write('claude\n');
    
    stream.on('data', (data) => {
      console.log('OUTPUT: ' + data);
    });
  });
}).connect({
  host: '192.168.1.100',
  port: 22,
  username: 'user',
  privateKey: privateKey
});
```

**特徴**:
- 純粋なJavaScript実装
- PTY (擬似端末) サポート
- インタラクティブなシェル操作可能
- ストリーミング対応

#### node-ssh
より高レベルなAPIを提供:
```javascript
const {NodeSSH} = require('node-ssh');
const ssh = new NodeSSH();

await ssh.connect({
  host: 'localhost',
  username: 'user',
  privateKey: '/path/to/key'
});

// コマンド実行
const result = await ssh.execCommand('claude --version');
```

### TypeScriptでの統一実装

#### ssh2-promise（TypeScript向けラッパー）
```typescript
import { SSH2Promise } from 'ssh2-promise';

const ssh = new SSH2Promise({
  host: '192.168.1.100',
  username: 'user',
  privateKey: privateKey
});

// インタラクティブシェル
const shell = await ssh.shell();
shell.write('claude\n');

shell.on('data', (data: Buffer) => {
  const output = data.toString('utf-8');
  // クライアントに送信
});
```

## 2. Claude Code操作の技術的実装

### PTY (擬似端末) の使用が必須

Claude CodeはインタラクティブなCLIツールのため、PTYの使用が必要:

```javascript
// ssh2でのPTY割り当て
conn.exec('claude', { pty: true }, (err, stream) => {
  stream.on('data', (data) => {
    // Claude Codeの出力を処理
    processClaudeOutput(data.toString());
  });
  
  // ユーザー入力をClaude Codeに送信
  stream.write(userInput + '\n');
});
```

### 入出力の処理

#### ANSI エスケープシーケンスの処理
Claude Codeは色付き出力を使用するため、処理が必要:

```javascript
const stripAnsi = require('strip-ansi');
const AnsiToHtml = require('ansi-to-html');

// プレーンテキストに変換
const plainText = stripAnsi(claudeOutput);

// HTMLに変換（UIで色を保持）
const convert = new AnsiToHtml();
const html = convert.toHtml(claudeOutput);
```

#### ストリーム処理とバッファリング
```javascript
class ClaudeOutputProcessor {
  constructor() {
    this.buffer = '';
  }
  
  process(chunk) {
    this.buffer += chunk;
    
    // 改行で分割して処理
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // 最後の不完全な行を保持
    
    return lines.map(line => ({
      type: detectLineType(line),
      content: line,
      timestamp: Date.now()
    }));
  }
}
```

## 3. セッション管理

### tmuxを使用したセッション永続化

```bash
# tmuxセッション作成
tmux new-session -d -s claude-session-1

# Claude Code起動
tmux send-keys -t claude-session-1 "claude" Enter

# セッションにアタッチ
tmux attach -t claude-session-1
```

Node.jsからの制御:
```javascript
// tmux経由でClaude Codeを操作
await ssh.execCommand('tmux send-keys -t claude-session-1 "Hello Claude" Enter');

// 出力を取得
const output = await ssh.execCommand('tmux capture-pane -t claude-session-1 -p');
```

## 4. 実装上の考慮事項

### 接続の信頼性
```javascript
class SSHConnectionManager {
  constructor(config) {
    this.config = config;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }
  
  async connect() {
    try {
      await this.client.connect(this.config);
      this.reconnectAttempts = 0;
    } catch (error) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), 5000);
      }
    }
  }
}
```

### セキュリティ
- SSH鍵の安全な保管（Ionic Secure Storage）
- 接続情報の暗号化
- セッションタイムアウト管理

### パフォーマンス最適化
- 接続プーリング
- 出力のバッファリングと圧縮
- 差分更新によるデータ転送量削減

## 推奨実装アプローチ

1. **ssh2** ライブラリを使用したNode.jsバックエンド
2. **tmux** によるセッション管理
3. **WebSocket** でクライアントとリアルタイム通信
4. **PTY** でClaude Codeとのインタラクティブ通信
5. **ANSI処理** ライブラリで出力を適切に変換