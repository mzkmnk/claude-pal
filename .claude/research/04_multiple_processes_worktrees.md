# 複数プロセス管理とWorktreesの技術調査

## 1. Git Worktreesの概要と活用

### Worktreesとは
Git worktreesは、同一リポジトリの複数のブランチを別々のディレクトリで同時に操作できる機能。

### 基本的なWorktree操作
```bash
# worktree追加
git worktree add ../project-feature-a feature-a

# worktree一覧
git worktree list

# worktree削除
git worktree remove ../project-feature-a
```

### プログラマティックな管理
```javascript
class WorktreeManager {
  constructor(sshClient, baseRepo) {
    this.ssh = sshClient;
    this.baseRepo = baseRepo;
  }
  
  async createWorktree(branchName, path) {
    // worktreeディレクトリ作成
    const worktreePath = `${this.baseRepo}-${branchName}`;
    const result = await this.ssh.execCommand(
      `cd ${this.baseRepo} && git worktree add ../${worktreePath} ${branchName}`
    );
    
    return {
      id: generateId(),
      branch: branchName,
      path: worktreePath,
      created: new Date()
    };
  }
  
  async listWorktrees() {
    const result = await this.ssh.execCommand(
      `cd ${this.baseRepo} && git worktree list --porcelain`
    );
    return this.parseWorktreeList(result.stdout);
  }
  
  async removeWorktree(path) {
    await this.ssh.execCommand(
      `cd ${this.baseRepo} && git worktree remove ${path}`
    );
  }
}
```

## 2. 複数Claude Codeインスタンスの管理

### tmuxを使用したセッション管理
```javascript
class ClaudeSessionManager {
  constructor(sshClient) {
    this.ssh = sshClient;
    this.sessions = new Map();
  }
  
  async createSession(sessionId, workingDirectory) {
    // tmuxセッション作成
    await this.ssh.execCommand(
      `tmux new-session -d -s claude-${sessionId} -c ${workingDirectory}`
    );
    
    // Claude Code起動
    await this.ssh.execCommand(
      `tmux send-keys -t claude-${sessionId} "claude" Enter`
    );
    
    this.sessions.set(sessionId, {
      id: sessionId,
      workingDirectory,
      status: 'active',
      created: new Date()
    });
    
    return sessionId;
  }
  
  async sendInput(sessionId, input) {
    // エスケープ処理
    const escapedInput = input.replace(/"/g, '\\"');
    await this.ssh.execCommand(
      `tmux send-keys -t claude-${sessionId} "${escapedInput}" Enter`
    );
  }
  
  async getOutput(sessionId) {
    const result = await this.ssh.execCommand(
      `tmux capture-pane -t claude-${sessionId} -p`
    );
    return result.stdout;
  }
  
  async listSessions() {
    const result = await this.ssh.execCommand(
      `tmux list-sessions -F "#{session_name}:#{session_created}:#{session_attached}"`
    );
    return this.parseTmuxSessions(result.stdout);
  }
  
  async killSession(sessionId) {
    await this.ssh.execCommand(`tmux kill-session -t claude-${sessionId}`);
    this.sessions.delete(sessionId);
  }
}
```

### systemdまたはsupervisorを使用したプロセス管理

#### systemdテンプレート
```ini
# /etc/systemd/system/claude-code@.service
[Unit]
Description=Claude Code Instance %i
After=network.target

[Service]
Type=simple
User=username
WorkingDirectory=/home/username/projects/%i
ExecStart=/usr/local/bin/claude
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### プログラマティック制御
```javascript
class SystemdClaudeManager {
  async startInstance(instanceId, workingDir) {
    // systemdサービスファイル作成
    const serviceContent = this.generateServiceFile(instanceId, workingDir);
    await this.ssh.execCommand(
      `echo '${serviceContent}' | sudo tee /etc/systemd/system/claude-${instanceId}.service`
    );
    
    // サービス開始
    await this.ssh.execCommand(`sudo systemctl start claude-${instanceId}`);
  }
  
  async stopInstance(instanceId) {
    await this.ssh.execCommand(`sudo systemctl stop claude-${instanceId}`);
  }
  
  async getStatus(instanceId) {
    const result = await this.ssh.execCommand(
      `systemctl status claude-${instanceId} --no-pager --output=json`
    );
    return JSON.parse(result.stdout);
  }
}
```

## 3. プロセス間通信と協調

### Named Pipesを使用した通信
```javascript
class ClaudePipeManager {
  async createPipe(sessionId) {
    const inputPipe = `/tmp/claude-${sessionId}-input`;
    const outputPipe = `/tmp/claude-${sessionId}-output`;
    
    await this.ssh.execCommand(`mkfifo ${inputPipe} ${outputPipe}`);
    
    // Claude Codeをパイプと接続
    await this.ssh.execCommand(
      `tmux send-keys -t claude-${sessionId} "claude < ${inputPipe} > ${outputPipe}" Enter`
    );
  }
  
  async sendToPipe(sessionId, message) {
    const inputPipe = `/tmp/claude-${sessionId}-input`;
    await this.ssh.execCommand(`echo "${message}" > ${inputPipe}`);
  }
  
  async readFromPipe(sessionId) {
    const outputPipe = `/tmp/claude-${sessionId}-output`;
    const result = await this.ssh.execCommand(`cat ${outputPipe}`);
    return result.stdout;
  }
}
```

## 4. リソース管理と制限

### cgroups v2を使用したリソース制限
```javascript
class ResourceManager {
  async createResourceGroup(groupName, limits) {
    const cgroupPath = `/sys/fs/cgroup/claude/${groupName}`;
    
    // cgroup作成
    await this.ssh.execCommand(`sudo mkdir -p ${cgroupPath}`);
    
    // メモリ制限
    if (limits.memory) {
      await this.ssh.execCommand(
        `echo ${limits.memory} | sudo tee ${cgroupPath}/memory.max`
      );
    }
    
    // CPU制限
    if (limits.cpu) {
      await this.ssh.execCommand(
        `echo ${limits.cpu} | sudo tee ${cgroupPath}/cpu.max`
      );
    }
  }
  
  async assignProcessToGroup(pid, groupName) {
    const cgroupPath = `/sys/fs/cgroup/claude/${groupName}`;
    await this.ssh.execCommand(
      `echo ${pid} | sudo tee ${cgroupPath}/cgroup.procs`
    );
  }
}
```

## 5. 状態管理とモニタリング

### プロセス状態の追跡
```javascript
class ProcessMonitor {
  constructor(sshClient) {
    this.ssh = sshClient;
    this.processes = new Map();
  }
  
  async monitorProcess(sessionId) {
    const script = `
      while true; do
        PID=$(tmux list-panes -t claude-${sessionId} -F "#{pane_pid}" 2>/dev/null)
        if [ -n "$PID" ]; then
          ps -p $PID -o pid,vsz,rss,pcpu,comm --no-headers
        fi
        sleep 5
      done
    `;
    
    this.ssh.exec(script, (err, stream) => {
      stream.on('data', (data) => {
        const stats = this.parseProcessStats(data.toString());
        this.processes.set(sessionId, stats);
        this.emit('stats-update', sessionId, stats);
      });
    });
  }
  
  async getSystemResources() {
    const result = await this.ssh.execCommand(
      `top -bn1 | head -5 && df -h && free -m`
    );
    return this.parseSystemStats(result.stdout);
  }
}
```

## 6. UI統合

### Ionicでのセッション管理UI
```typescript
@Component({
  selector: 'app-claude-sessions',
  template: `
    <ion-content>
      <ion-grid>
        <ion-row>
          <ion-col size="4" *ngFor="let session of sessions">
            <ion-card [color]="session.active ? 'primary' : 'medium'">
              <ion-card-header>
                <ion-card-title>{{ session.branch }}</ion-card-title>
                <ion-card-subtitle>{{ session.status }}</ion-card-subtitle>
              </ion-card-header>
              <ion-card-content>
                <ion-button (click)="switchToSession(session)">
                  切り替え
                </ion-button>
                <ion-button (click)="terminateSession(session)" color="danger">
                  終了
                </ion-button>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  `
})
export class ClaudeSessionsComponent {
  sessions: ClaudeSession[] = [];
  
  async createNewSession(branch: string) {
    const worktree = await this.worktreeManager.createWorktree(branch);
    const sessionId = await this.sessionManager.createSession(
      worktree.id,
      worktree.path
    );
    
    this.sessions.push({
      id: sessionId,
      branch,
      worktreePath: worktree.path,
      status: 'active',
      active: false
    });
  }
}
```

## 推奨実装アプローチ

1. **tmux** を主要なセッション管理ツールとして使用
2. **Git worktrees** で独立した作業環境を提供
3. **WebSocket** でリアルタイムなセッション切り替え
4. **リソース監視** でシステムの安定性を確保
5. **セッション永続化** でクラッシュ耐性を実現