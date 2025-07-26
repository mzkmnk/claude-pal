# ファイル/フォルダ表示とGitHub操作の技術調査

## 1. ファイル/フォルダブラウジング機能

### リモートファイルシステムの取得方法

#### 基本的なアプローチ
SSH経由でコマンドを実行し、結果をパースしてUIに表示:

```javascript
// ファイル一覧取得
async function listFiles(path) {
  const result = await ssh.execCommand(`ls -la --color=never ${path}`);
  return parseFileList(result.stdout);
}

// より詳細な情報を含むJSON形式で取得
async function getFileDetails(path) {
  const command = `find ${path} -maxdepth 1 -exec stat -c '{"name":"%n","size":%s,"type":"%F","modified":%Y,"permissions":"%a"}' {} \\; | jq -s '.'`;
  const result = await ssh.execCommand(command);
  return JSON.parse(result.stdout);
}
```

#### ツリー構造の効率的な取得
```javascript
// tree コマンドを使用したアプローチ
async function getDirectoryTree(path, depth = 3) {
  const result = await ssh.execCommand(
    `tree -J -L ${depth} ${path}`
  );
  return JSON.parse(result.stdout);
}

// カスタム実装
async function buildFileTree(basePath) {
  const script = `
    find "${basePath}" -type d -o -type f | head -1000 | while read path; do
      if [ -d "$path" ]; then
        echo "D:$path"
      else
        echo "F:$path:$(stat -c %s "$path")"
      fi
    done
  `;
  
  const result = await ssh.execCommand(script);
  return parseTreeOutput(result.stdout);
}
```

### ファイル内容の取得とストリーミング

#### 小さなファイルの読み取り
```javascript
async function readFile(filePath) {
  const result = await ssh.execCommand(`cat "${filePath}"`);
  return result.stdout;
}
```

#### 大きなファイルのストリーミング
```javascript
function streamFile(filePath, onData, onEnd) {
  ssh.exec(`cat "${filePath}"`, (err, stream) => {
    if (err) throw err;
    
    stream.on('data', (chunk) => {
      onData(chunk.toString());
    });
    
    stream.on('end', onEnd);
  });
}
```

### ファイル操作API

```javascript
class RemoteFileSystem {
  async createFile(path, content) {
    await ssh.execCommand(`echo '${escapeShellArg(content)}' > "${path}"`);
  }
  
  async deleteFile(path) {
    await ssh.execCommand(`rm -f "${path}"`);
  }
  
  async moveFile(source, destination) {
    await ssh.execCommand(`mv "${source}" "${destination}"`);
  }
  
  async createDirectory(path) {
    await ssh.execCommand(`mkdir -p "${path}"`);
  }
}
```

## 2. GitHub操作の実装

### Git操作のラッパー

```javascript
class GitOperations {
  constructor(sshClient, workingDirectory) {
    this.ssh = sshClient;
    this.cwd = workingDirectory;
  }
  
  async status() {
    const result = await this.ssh.execCommand('git status --porcelain=v2', {
      cwd: this.cwd
    });
    return this.parseGitStatus(result.stdout);
  }
  
  async branch() {
    const result = await this.ssh.execCommand('git branch -a --format="%(refname:short)|%(upstream:short)|%(committerdate:iso)"', {
      cwd: this.cwd
    });
    return this.parseBranches(result.stdout);
  }
  
  async log(options = {}) {
    const { limit = 20, branch = 'HEAD' } = options;
    const format = '--pretty=format:{"hash":"%H","author":"%an","date":"%ad","message":"%s"}';
    const result = await this.ssh.execCommand(
      `git log ${format} --date=iso -n ${limit} ${branch}`,
      { cwd: this.cwd }
    );
    return result.stdout.split('\n').map(line => JSON.parse(line));
  }
  
  async diff(file) {
    const result = await this.ssh.execCommand(`git diff ${file}`, {
      cwd: this.cwd
    });
    return result.stdout;
  }
}
```

### GitHub API統合

#### GitHub CLIを使用
```javascript
class GitHubOperations {
  async listPullRequests() {
    const result = await this.ssh.execCommand('gh pr list --json number,title,state,author');
    return JSON.parse(result.stdout);
  }
  
  async createPullRequest(title, body, branch) {
    const result = await this.ssh.execCommand(
      `gh pr create --title "${title}" --body "${body}" --base main --head ${branch}`
    );
    return result.stdout;
  }
  
  async listIssues() {
    const result = await this.ssh.execCommand('gh issue list --json number,title,state,assignees');
    return JSON.parse(result.stdout);
  }
}
```

### リアルタイム変更検知

#### ファイル監視
```javascript
// inotifywait (Linux) または fswatch (macOS) を使用
class FileWatcher {
  constructor(sshClient, path) {
    this.ssh = sshClient;
    this.path = path;
    this.watchers = new Map();
  }
  
  watch(callback) {
    const command = process.platform === 'darwin' 
      ? `fswatch -r "${this.path}"`
      : `inotifywait -mr -e modify,create,delete "${this.path}"`;
    
    this.ssh.exec(command, (err, stream) => {
      if (err) throw err;
      
      stream.on('data', (data) => {
        const changes = this.parseWatcherOutput(data.toString());
        callback(changes);
      });
    });
  }
}
```

## 3. UI実装の考慮事項

### Ionicコンポーネントでのファイルブラウザ
```typescript
// ファイルツリーコンポーネント
@Component({
  selector: 'app-file-browser',
  template: `
    <ion-list>
      <ion-item *ngFor="let item of items" (click)="onItemClick(item)">
        <ion-icon [name]="getIcon(item)" slot="start"></ion-icon>
        <ion-label>{{ item.name }}</ion-label>
        <ion-note slot="end">{{ formatSize(item.size) }}</ion-note>
      </ion-item>
    </ion-list>
  `
})
export class FileBrowserComponent {
  // 実装
}
```

### 差分表示コンポーネント
```typescript
// Monaco EditorまたはCodeMirrorを使用
import * as monaco from 'monaco-editor';

export class DiffViewerComponent {
  initializeDiffEditor() {
    this.diffEditor = monaco.editor.createDiffEditor(
      this.editorContainer.nativeElement,
      {
        readOnly: true,
        renderSideBySide: true
      }
    );
  }
}
```

## 4. パフォーマンス最適化

### キャッシング戦略
```javascript
class FileSystemCache {
  constructor(ttl = 60000) { // 1分
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  async get(path, fetcher) {
    const cached = this.cache.get(path);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    const data = await fetcher(path);
    this.cache.set(path, { data, timestamp: Date.now() });
    return data;
  }
}
```

### 遅延ローディング
```javascript
// 大きなディレクトリの段階的読み込み
async function* loadDirectoryLazy(path, batchSize = 100) {
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const result = await ssh.execCommand(
      `ls -la "${path}" | tail -n +${offset + 2} | head -n ${batchSize}`
    );
    
    const files = parseFileList(result.stdout);
    if (files.length < batchSize) hasMore = false;
    
    yield files;
    offset += batchSize;
  }
}
```

## 推奨実装

1. **効率的なファイルシステムAPI**: `tree`コマンドとカスタムスクリプトの組み合わせ
2. **Git操作**: GitHub CLIとgitコマンドの直接実行
3. **リアルタイム更新**: WebSocketとファイル監視ツールの組み合わせ
4. **UIコンポーネント**: Ionicの標準コンポーネントとMonaco Editor
5. **キャッシング**: インメモリキャッシュとIndexedDBの併用