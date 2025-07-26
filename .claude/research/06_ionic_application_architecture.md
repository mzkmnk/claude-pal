# Ionicアプリケーション構成の調査

## 1. プロジェクト構造

### 推奨ディレクトリ構成
```
claude-pal/
├── src/
│   ├── app/
│   │   ├── core/                 # コアモジュール
│   │   │   ├── services/        # グローバルサービス
│   │   │   ├── guards/          # 認証ガード
│   │   │   └── interceptors/   # HTTPインターセプター
│   │   ├── shared/              # 共有モジュール
│   │   │   ├── components/     # 共有コンポーネント
│   │   │   ├── directives/     # 共有ディレクティブ
│   │   │   └── pipes/          # 共有パイプ
│   │   ├── features/            # 機能モジュール
│   │   │   ├── claude-chat/    # Claude対話画面
│   │   │   ├── file-browser/   # ファイルブラウザ
│   │   │   ├── git-operations/ # Git操作
│   │   │   ├── sessions/       # セッション管理
│   │   │   └── settings/       # 設定画面
│   │   └── app-routing.module.ts
│   ├── assets/
│   ├── environments/
│   └── theme/
├── capacitor.config.ts
├── ionic.config.json
└── package.json
```

## 2. コア機能の実装

### メインアプリモジュール
```typescript
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot({
      mode: 'md', // Material Designスタイル統一
      scrollAssist: false,
      scrollPadding: false
    }),
    IonicStorageModule.forRoot(),
    AppRoutingModule,
    CoreModule,
    SharedModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
```

### SSH接続サービス
```typescript
// core/services/ssh.service.ts
import { Injectable } from '@angular/core';
import { Client } from 'ssh2';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SSHService {
  private client: Client;
  private connected$ = new BehaviorSubject<boolean>(false);
  
  constructor(
    private storage: Storage,
    private platform: Platform
  ) {}
  
  async connect(config: SSHConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = new Client();
      
      this.client.on('ready', () => {
        this.connected$.next(true);
        resolve();
      });
      
      this.client.on('error', (err) => {
        this.connected$.next(false);
        reject(err);
      });
      
      // Capacitorネイティブプラグインを使用
      if (this.platform.is('capacitor')) {
        this.connectNative(config);
      } else {
        // Web版フォールバック
        this.connectWeb(config);
      }
    });
  }
  
  private async connectNative(config: SSHConfig) {
    // ネイティブSSHプラグイン使用
    const { SSHPlugin } = await import('@capacitor-community/ssh');
    await SSHPlugin.connect(config);
  }
  
  private connectWeb(config: SSHConfig) {
    // WebSocketプロキシ経由
    const wsUrl = `wss://${config.proxyHost}/ssh`;
    const ws = new WebSocket(wsUrl);
    // SSH over WebSocket実装
  }
}
```

## 3. UI/UXコンポーネント

### Claude対話コンポーネント
```typescript
// features/claude-chat/claude-chat.page.ts
@Component({
  selector: 'app-claude-chat',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Claude Code - {{ currentSession?.name }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="showSessions()">
            <ion-icon name="git-branch-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="terminal-output" #terminalOutput>
        <div *ngFor="let message of messages" 
             [class]="'message-' + message.type"
             [innerHTML]="message.html | safe">
        </div>
      </div>
    </ion-content>
    
    <ion-footer>
      <ion-toolbar>
        <ion-textarea
          [(ngModel)]="inputText"
          placeholder="Claude Codeにメッセージを送信..."
          [autoGrow]="true"
          [maxlength]="10000"
          (keydown.enter)="onEnterKey($event)">
        </ion-textarea>
        <ion-buttons slot="end">
          <ion-button (click)="sendMessage()" [disabled]="!inputText.trim()">
            <ion-icon name="send"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  `,
  styleUrls: ['./claude-chat.page.scss']
})
export class ClaudeChatPage implements OnInit, AfterViewChecked {
  messages: ClaudeMessage[] = [];
  inputText = '';
  currentSession: Session;
  
  constructor(
    private claudeService: ClaudeService,
    private sessionService: SessionService
  ) {}
  
  async sendMessage() {
    if (!this.inputText.trim()) return;
    
    const message = this.inputText;
    this.inputText = '';
    
    // ユーザーメッセージ追加
    this.messages.push({
      type: 'user',
      text: message,
      html: this.escapeHtml(message),
      timestamp: new Date()
    });
    
    // Claude Codeに送信
    await this.claudeService.sendMessage(this.currentSession.id, message);
  }
  
  ngAfterViewChecked() {
    this.scrollToBottom();
  }
}
```

### ファイルブラウザコンポーネント
```typescript
// features/file-browser/file-browser.component.ts
@Component({
  selector: 'app-file-browser',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-searchbar
          [(ngModel)]="searchTerm"
          (ionChange)="filterFiles()"
          placeholder="ファイル検索...">
        </ion-searchbar>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-split-pane contentId="file-content">
        <!-- ファイルツリー -->
        <ion-menu contentId="file-content">
          <ion-content>
            <ion-list>
              <app-file-tree
                [rootPath]="currentPath"
                (fileSelected)="onFileSelected($event)"
                (folderToggled)="onFolderToggled($event)">
              </app-file-tree>
            </ion-list>
          </ion-content>
        </ion-menu>
        
        <!-- ファイル内容表示 -->
        <ion-content id="file-content">
          <app-code-viewer
            *ngIf="selectedFile"
            [file]="selectedFile"
            [content]="fileContent"
            [language]="detectedLanguage">
          </app-code-viewer>
        </ion-content>
      </ion-split-pane>
    </ion-content>
  `
})
export class FileBrowserComponent {
  currentPath = '/';
  selectedFile: FileItem;
  fileContent: string;
  
  async onFileSelected(file: FileItem) {
    this.selectedFile = file;
    this.fileContent = await this.fileService.readFile(file.path);
    this.detectedLanguage = this.detectLanguage(file.name);
  }
}
```

## 4. 状態管理

### NgRx Store実装
```typescript
// store/app.state.ts
export interface AppState {
  ssh: SSHState;
  sessions: SessionState;
  files: FileState;
  claude: ClaudeState;
  notifications: NotificationState;
}

// store/ssh/ssh.reducer.ts
export interface SSHState {
  connected: boolean;
  connectionConfig: SSHConfig | null;
  error: string | null;
}

const initialState: SSHState = {
  connected: false,
  connectionConfig: null,
  error: null
};

export const sshReducer = createReducer(
  initialState,
  on(SSHActions.connectSuccess, (state, { config }) => ({
    ...state,
    connected: true,
    connectionConfig: config,
    error: null
  })),
  on(SSHActions.connectFailure, (state, { error }) => ({
    ...state,
    connected: false,
    error
  }))
);
```

## 5. ネイティブ機能統合

### Capacitorプラグイン設定
```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.claudepal.app',
  appName: 'Claude PAL',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e1e1e',
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Storage: {
      group: 'com.claudepal.app.storage'
    }
  }
};

export default config;
```

### カスタムCapacitorプラグイン
```typescript
// plugins/ssh-plugin/definitions.ts
export interface SSHPlugin {
  connect(options: SSHConnectOptions): Promise<{ connected: boolean }>;
  execute(options: { command: string }): Promise<{ output: string }>;
  disconnect(): Promise<void>;
  createPTY(options: PTYOptions): Promise<{ ptyId: string }>;
  writeToPTY(options: { ptyId: string; data: string }): Promise<void>;
  readFromPTY(options: { ptyId: string }): Promise<{ data: string }>;
}
```

## 6. パフォーマンス最適化

### 仮想スクロール実装
```typescript
// ファイルリストの仮想スクロール
@Component({
  template: `
    <ion-content>
      <ion-virtual-scroll [items]="files" [itemHeight]="itemHeightFn">
        <ion-item *virtualItem="let file">
          <ion-icon [name]="getFileIcon(file)" slot="start"></ion-icon>
          <ion-label>{{ file.name }}</ion-label>
        </ion-item>
      </ion-virtual-scroll>
    </ion-content>
  `
})
export class VirtualFileListComponent {
  files: FileItem[] = [];
  
  itemHeightFn = (item: FileItem, index: number) => {
    return 44; // 固定高さ
  };
}
```

### レイジーローディング
```typescript
// app-routing.module.ts
const routes: Routes = [
  {
    path: 'claude',
    loadChildren: () => import('./features/claude-chat/claude-chat.module')
      .then(m => m.ClaudeChatPageModule)
  },
  {
    path: 'files',
    loadChildren: () => import('./features/file-browser/file-browser.module')
      .then(m => m.FileBrowserPageModule)
  },
  {
    path: 'sessions',
    loadChildren: () => import('./features/sessions/sessions.module')
      .then(m => m.SessionsPageModule)
  }
];
```

## 7. テーマとスタイリング

### ダークテーマ対応
```scss
// theme/variables.scss
:root {
  --ion-color-primary: #3880ff;
  --ion-color-secondary: #3dc2ff;
  
  // Claude Code風のターミナルカラー
  --terminal-bg: #1e1e1e;
  --terminal-fg: #d4d4d4;
  --terminal-cursor: #ffffff;
  --terminal-selection: #264f78;
}

@media (prefers-color-scheme: dark) {
  body {
    --ion-background-color: var(--terminal-bg);
    --ion-text-color: var(--terminal-fg);
  }
}

// カスタムコンポーネントスタイル
.terminal-output {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.5;
  padding: 16px;
  background: var(--terminal-bg);
  color: var(--terminal-fg);
  
  .message-user {
    color: #569cd6;
    &::before {
      content: '> ';
    }
  }
  
  .message-claude {
    color: #d4d4d4;
    white-space: pre-wrap;
  }
  
  .message-error {
    color: #f48771;
  }
}
```

## 推奨実装アプローチ

1. **Ionic 8.6 + Angular 19** を使用した最新スタック
2. **Capacitor 7** でネイティブ機能統合
3. **NgRx 19** で状態管理を一元化
4. **仮想スクロール** で大量データを効率的に表示
5. **PWA対応** でWebブラウザでも動作可能に